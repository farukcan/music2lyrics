use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

fn get_project_root(_app: &AppHandle) -> Result<PathBuf, String> {
    // CARGO_MANIFEST_DIR = app/src-tauri at compile time
    // Project root = app/src-tauri/../../ = two levels up
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(project_root) = manifest_dir.parent().and_then(|p| p.parent()) {
        if project_root.join("transcribe.sh").exists() {
            return Ok(project_root.to_path_buf());
        }
    }

    // Fallback: walk up from executable location
    if let Ok(exe) = std::env::current_exe() {
        let mut current = exe.as_path();
        for _ in 0..10 {
            if let Some(parent) = current.parent() {
                if parent.join("transcribe.sh").exists() {
                    return Ok(parent.to_path_buf());
                }
                current = parent;
            } else {
                break;
            }
        }
    }

    // Fallback: walk up from cwd
    if let Ok(cwd) = std::env::current_dir() {
        let mut current = cwd.as_path();
        for _ in 0..10 {
            if current.join("transcribe.sh").exists() {
                return Ok(current.to_path_buf());
            }
            if let Some(parent) = current.parent() {
                current = parent;
            } else {
                break;
            }
        }
    }

    Err("Could not find project root (transcribe.sh not found)".into())
}

#[derive(Serialize, Clone)]
struct LogLinePayload {
    job_id: String,
    line: String,
    stream: String,
}

#[derive(Serialize, Clone)]
struct JobCompletePayload {
    job_id: String,
    song_name: String,
}

#[derive(Serialize, Clone)]
struct JobErrorPayload {
    job_id: String,
    error: String,
}

async fn run_script_with_streaming(
    app: &AppHandle,
    project_root: &Path,
    command_str: &str,
    job_id: &str,
) -> Result<(), String> {
    let activate_path = project_root.join("venv/bin/activate");
    let full_command = format!("source '{}' && {}", activate_path.display(), command_str);

    let mut child = Command::new("bash")
        .arg("-c")
        .arg(&full_command)
        .current_dir(project_root)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_stdout = app.clone();
    let job_id_stdout = job_id.to_string();
    let stdout_handle = tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_stdout.emit(
                "log-line",
                LogLinePayload {
                    job_id: job_id_stdout.clone(),
                    line,
                    stream: "stdout".into(),
                },
            );
        }
    });

    let app_stderr = app.clone();
    let job_id_stderr = job_id.to_string();
    let stderr_handle = tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_stderr.emit(
                "log-line",
                LogLinePayload {
                    job_id: job_id_stderr.clone(),
                    line,
                    stream: "stderr".into(),
                },
            );
        }
    });

    let _ = stdout_handle.await;
    let _ = stderr_handle.await;

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait for process: {}", e))?;

    if !status.success() {
        return Err(format!(
            "Process exited with code: {}",
            status.code().unwrap_or(-1)
        ));
    }

    Ok(())
}

#[tauri::command]
async fn transcribe(
    app: AppHandle,
    file_path: String,
    language: String,
    job_id: String,
) -> Result<(), String> {
    let project_root = get_project_root(&app)?;

    let abs_path = if Path::new(&file_path).is_absolute() {
        PathBuf::from(&file_path)
    } else {
        project_root.join(&file_path)
    };

    if !abs_path.exists() {
        return Err(format!("File not found: {}", abs_path.display()));
    }

    let base_name = abs_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    let ext = abs_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("mp3");

    // Find unique name if output already exists
    let mut song_name = base_name.clone();
    let mut counter = 2u32;
    while project_root.join("output").join(&song_name).exists() {
        song_name = format!("{}_{}", base_name, counter);
        counter += 1;
    }

    // If name changed, create a symlink so transcribe.sh uses the new name
    let mut symlink_path: Option<PathBuf> = None;
    let input_path = if song_name != base_name {
        let link = project_root
            .join("raw")
            .join(format!("{}.{}", song_name, ext));
        // Remove stale symlink from a previous run
        if link.symlink_metadata().is_ok() {
            let _ = std::fs::remove_file(&link);
        }
        std::os::unix::fs::symlink(&abs_path, &link)
            .map_err(|e| format!("Failed to create symlink: {}", e))?;
        symlink_path = Some(link.clone());
        link
    } else {
        abs_path
    };

    let command_str = format!(
        "'{}' '{}' '{}'",
        project_root.join("transcribe.sh").display(),
        input_path.display(),
        language
    );

    let result = run_script_with_streaming(&app, &project_root, &command_str, &job_id).await;

    // Clean up symlink
    if let Some(link) = &symlink_path {
        let _ = std::fs::remove_file(link);
    }

    match result {
        Ok(()) => {
            let _ = app.emit(
                "job-complete",
                JobCompletePayload {
                    job_id,
                    song_name,
                },
            );
            Ok(())
        }
        Err(e) => {
            let _ = app.emit(
                "job-error",
                JobErrorPayload {
                    job_id: job_id.clone(),
                    error: e.clone(),
                },
            );
            Err(e)
        }
    }
}

#[derive(Serialize)]
struct SongOutput {
    name: String,
    has_lrc: bool,
    has_srt: bool,
    has_txt: bool,
    has_vtt: bool,
    has_json: bool,
    audio_path: String,
    vocals_path: String,
}

#[tauri::command]
async fn list_output_songs(app: AppHandle) -> Result<Vec<SongOutput>, String> {
    let project_root = get_project_root(&app)?;
    let output_dir = project_root.join("output");

    if !output_dir.exists() {
        return Ok(vec![]);
    }

    let mut songs = Vec::new();
    let entries = std::fs::read_dir(&output_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
            let name = entry.file_name().to_string_lossy().to_string();
            let dir = entry.path();

            let vocals_path = project_root
                .join("separated/htdemucs")
                .join(&name)
                .join("vocals.wav");

            songs.push(SongOutput {
                has_lrc: dir.join(format!("{}.lrc", name)).exists(),
                has_srt: dir.join("vocals.srt").exists(),
                has_txt: dir.join("vocals.txt").exists(),
                has_vtt: dir.join("vocals.vtt").exists(),
                has_json: dir.join("vocals.json").exists(),
                audio_path: String::new(),
                vocals_path: vocals_path.to_string_lossy().to_string(),
                name,
            });
        }
    }

    songs.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(songs)
}

#[tauri::command]
async fn read_output_file(
    app: AppHandle,
    song_name: String,
    file_type: String,
) -> Result<String, String> {
    let project_root = get_project_root(&app)?;
    let output_dir = project_root.join("output").join(&song_name);

    let file_path = match file_type.as_str() {
        "lrc" => output_dir.join(format!("{}.lrc", song_name)),
        "srt" => output_dir.join("vocals.srt"),
        "txt" => output_dir.join("vocals.txt"),
        "vtt" => output_dir.join("vocals.vtt"),
        "json" => output_dir.join("vocals.json"),
        _ => return Err(format!("Unknown file type: {}", file_type)),
    };

    std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read {}: {}", file_path.display(), e))
}

#[derive(Serialize)]
struct SetupStatus {
    venv_exists: bool,
    transcribe_exists: bool,
    project_root: String,
}

#[tauri::command]
async fn check_setup(app: AppHandle) -> Result<SetupStatus, String> {
    let project_root = get_project_root(&app)?;

    Ok(SetupStatus {
        venv_exists: project_root.join("venv/bin/activate").exists(),
        transcribe_exists: project_root.join("transcribe.sh").exists(),
        project_root: project_root.to_string_lossy().to_string(),
    })
}

#[tauri::command]
async fn run_setup(app: AppHandle, job_id: String) -> Result<(), String> {
    let project_root = get_project_root(&app)?;
    let command_str = format!("'{}'", project_root.join("setup.sh").display());
    run_script_with_streaming(&app, &project_root, &command_str, &job_id).await
}

#[tauri::command]
async fn delete_song(app: AppHandle, song_name: String) -> Result<(), String> {
    let project_root = get_project_root(&app)?;

    let output_dir = project_root.join("output").join(&song_name);
    if output_dir.exists() {
        std::fs::remove_dir_all(&output_dir)
            .map_err(|e| format!("Failed to delete output: {}", e))?;
    }

    let separated_dir = project_root.join("separated/htdemucs").join(&song_name);
    if separated_dir.exists() {
        std::fs::remove_dir_all(&separated_dir)
            .map_err(|e| format!("Failed to delete separated: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            transcribe,
            list_output_songs,
            read_output_file,
            check_setup,
            run_setup,
            delete_song,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
