import { useState, useRef, useCallback, useEffect } from "react";
import type { LrcLine } from "../types";

export function useLrcPlayer(lines: LrcLine[], src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const pendingSeek = useRef<number | null>(null);

  const updateCurrentLine = useCallback(
    (time: number) => {
      if (lines.length === 0) {
        setCurrentLineIndex(-1);
        return;
      }
      let idx = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (time >= lines[i].time) {
          idx = i;
          break;
        }
      }
      setCurrentLineIndex(idx);
    },
    [lines]
  );

  // Handle source changes: pause immediately, reload if valid src
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);

    if (!src) {
      audio.removeAttribute("src");
      setCurrentTime(0);
      setDuration(0);
      setCurrentLineIndex(-1);
      return;
    }

    audio.load();

    // If a seek was requested (vocal/original toggle), resume from that position
    const seekTime = pendingSeek.current;
    pendingSeek.current = null;

    if (seekTime === null) return;

    const onCanPlay = () => {
      audio.currentTime = seekTime;
      audio.play().catch(() => {});
      audio.removeEventListener("canplay", onCanPlay);
    };
    audio.addEventListener("canplay", onCanPlay);
    return () => {
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [src]);

  // Event listeners for playback state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      updateCurrentLine(audio.currentTime);
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentLineIndex(-1);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [updateCurrentLine]);

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);
  const pause = useCallback(() => audioRef.current?.pause(), []);
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);
  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Schedule a seek+play after next source load (for vocal/original toggle)
  const requestSeekOnLoad = useCallback((time: number) => {
    pendingSeek.current = time;
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    currentLineIndex,
    play,
    pause,
    seek,
    toggle,
    requestSeekOnLoad,
  };
}
