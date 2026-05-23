import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppContext } from "../AppContext";
import type { SongOutput } from "../types";

export function SongList() {
  const [songs, setSongs] = useState<SongOutput[]>([]);
  const { state, dispatch } = useAppContext();

  const loadSongs = useCallback(async () => {
    try {
      const result = await invoke<SongOutput[]>("list_output_songs");
      setSongs(result);
    } catch (e) {
      console.error("Failed to load songs:", e);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  useEffect(() => {
    const completedCount = state.queue.filter(
      (item) => item.status === "complete"
    ).length;
    if (completedCount > 0) {
      loadSongs();
    }
  }, [state.queue, loadSongs]);

  async function handleDelete(songName: string) {
    try {
      await invoke("delete_song", { songName });
      if (state.selectedSong === songName) {
        dispatch({ type: "SELECT_SONG", name: null });
      }
      loadSongs();
    } catch (e) {
      console.error("Failed to delete song:", e);
    }
  }

  return (
    <div className="w-56 border-r border-zinc-700 flex flex-col bg-zinc-900/50">
      <div className="flex items-center justify-between p-3 border-b border-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-300">Songs</h2>
        <button
          onClick={loadSongs}
          className="text-xs text-zinc-500 hover:text-zinc-300"
          title="Refresh"
        >
          ↻
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {songs.length === 0 ? (
          <p className="p-3 text-xs text-zinc-500">No songs yet</p>
        ) : (
          songs.map((song) => (
            <div
              key={song.name}
              className={`group flex items-center border-b border-zinc-800 transition-colors ${
                state.selectedSong === song.name
                  ? "bg-blue-600/20"
                  : "hover:bg-zinc-800"
              }`}
            >
              <button
                onClick={() =>
                  dispatch({ type: "SELECT_SONG", name: song.name })
                }
                className={`flex-1 text-left px-3 py-2 text-sm ${
                  state.selectedSong === song.name
                    ? "text-blue-300"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div className="truncate font-medium">{song.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {[
                    song.has_lrc && "LRC",
                    song.has_srt && "SRT",
                    song.has_txt && "TXT",
                    song.has_json && "JSON",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </button>
              <button
                onClick={() => handleDelete(song.name)}
                className="px-2 py-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
