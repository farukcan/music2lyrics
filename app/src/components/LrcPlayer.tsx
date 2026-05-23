import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAppContext } from "../AppContext";
import { useLrcPlayer } from "../hooks/useLrcPlayer";
import { parseLrc } from "../lib/lrc-parser";
import type { LrcLine, SongOutput } from "../types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LrcPlayer() {
  const { state } = useAppContext();
  const [lines, setLines] = useState<LrcLine[]>([]);
  const [songData, setSongData] = useState<SongOutput | null>(null);
  const [useVocals, setUseVocals] = useState(true);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const { audioRef, isPlaying, currentTime, duration, currentLineIndex, seek, toggle } =
    useLrcPlayer(lines);

  // Load LRC content when song changes
  useEffect(() => {
    if (!state.selectedSong) {
      setLines([]);
      setSongData(null);
      return;
    }

    invoke<string>("read_output_file", {
      songName: state.selectedSong,
      fileType: "lrc",
    })
      .then((content) => setLines(parseLrc(content)))
      .catch(() => setLines([]));

    invoke<SongOutput[]>("list_output_songs").then((songs) => {
      const song = songs.find((s) => s.name === state.selectedSong);
      if (song) setSongData(song);
    });
  }, [state.selectedSong]);

  // Auto-scroll to active line
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentLineIndex]);

  if (!state.selectedSong) return null;

  const audioPath = songData
    ? useVocals
      ? songData.vocals_path
      : songData.audio_path
    : "";

  const audioSrc = audioPath ? convertFileSrc(audioPath) : "";

  return (
    <div className="border-t border-zinc-700">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700/50">
        <h3 className="text-sm font-medium text-zinc-400">LRC Player</h3>
        {songData?.vocals_path && (
          <button
            onClick={() => setUseVocals(!useVocals)}
            className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            {useVocals ? "Vocals" : "Original"}
          </button>
        )}
      </div>

      {/* Audio controls */}
      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50">
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs text-zinc-500 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-blue-500"
          />
          <span className="text-xs text-zinc-500 w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Lyrics display */}
      {lines.length > 0 && (
        <div className="h-48 overflow-y-auto px-4 py-2">
          {lines.map((line, i) => (
            <div
              key={i}
              ref={i === currentLineIndex ? activeLineRef : undefined}
              onClick={() => seek(line.time)}
              className={`py-1 px-2 rounded cursor-pointer text-sm transition-all ${
                i === currentLineIndex
                  ? "bg-blue-600/30 text-blue-200 font-medium scale-105"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span className="text-xs text-zinc-600 mr-2">
                [{formatTime(line.time)}]
              </span>
              {line.text}
            </div>
          ))}
        </div>
      )}

      <audio ref={audioRef} src={audioSrc} preload="metadata" />
    </div>
  );
}
