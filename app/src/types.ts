export interface QueueItem {
  id: string;
  filePath: string;
  fileName: string;
  language: string;
  status: "pending" | "processing" | "complete" | "error";
  songName: string;
  error?: string;
}

export interface LogLine {
  jobId: string;
  line: string;
  stream: "stdout" | "stderr";
}

export interface SongOutput {
  name: string;
  has_lrc: boolean;
  has_srt: boolean;
  has_txt: boolean;
  has_vtt: boolean;
  has_json: boolean;
  audio_path: string;
  vocals_path: string;
}

export interface LrcLine {
  time: number;
  text: string;
}

export interface SetupStatus {
  venv_exists: boolean;
  transcribe_exists: boolean;
  project_root: string;
}
