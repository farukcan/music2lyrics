import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppContext } from "../AppContext";

export function useTranscribe() {
  const { state, dispatch } = useAppContext();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    if (activeJobId) return;

    const nextItem = state.queue.find((item) => item.status === "pending");
    if (!nextItem) return;

    setActiveJobId(nextItem.id);
    dispatch({ type: "START_JOB", id: nextItem.id });

    (async () => {
      try {
        await invoke("transcribe", {
          filePath: nextItem.filePath,
          language: nextItem.language,
          jobId: nextItem.id,
        });
      } catch (e) {
        dispatch({
          type: "JOB_ERROR",
          jobId: nextItem.id,
          error: String(e),
        });
      } finally {
        setActiveJobId(null);
      }
    })();
  }, [state.queue, activeJobId, dispatch]);

  const addToQueue = useCallback(
    (files: Array<{ path: string; name: string }>, language: string) => {
      const items = files.map((file) => ({
        id: crypto.randomUUID(),
        filePath: file.path,
        fileName: file.name,
        language,
        status: "pending" as const,
        songName: file.name.replace(/\.[^.]*$/, ""),
      }));
      dispatch({ type: "ADD_TO_QUEUE", items });
    },
    [dispatch]
  );

  const removeFromQueue = useCallback(
    (id: string) => {
      dispatch({ type: "REMOVE_FROM_QUEUE", id });
    },
    [dispatch]
  );

  return { addToQueue, removeFromQueue };
}
