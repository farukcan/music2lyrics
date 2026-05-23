import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppContext } from "../AppContext";

interface LogLineEvent {
  job_id: string;
  line: string;
  stream: string;
}

interface JobCompleteEvent {
  job_id: string;
  song_name: string;
}

interface JobErrorEvent {
  job_id: string;
  error: string;
}

export function useLogStream() {
  const { dispatch } = useAppContext();

  useEffect(() => {
    let cancelled = false;

    const promises = [
      listen<LogLineEvent>("log-line", (event) => {
        dispatch({
          type: "ADD_LOG_LINE",
          log: {
            jobId: event.payload.job_id,
            line: event.payload.line,
            stream: event.payload.stream as "stdout" | "stderr",
          },
        });
      }),
      listen<JobCompleteEvent>("job-complete", (event) => {
        dispatch({ type: "JOB_COMPLETE", jobId: event.payload.job_id, songName: event.payload.song_name });
      }),
      listen<JobErrorEvent>("job-error", (event) => {
        dispatch({
          type: "JOB_ERROR",
          jobId: event.payload.job_id,
          error: event.payload.error,
        });
      }),
    ];

    Promise.all(promises).then((unlisteners) => {
      if (cancelled) {
        unlisteners.forEach((fn) => fn());
      }
    });

    return () => {
      cancelled = true;
      Promise.all(promises).then((unlisteners) => {
        unlisteners.forEach((fn) => fn());
      });
    };
  }, [dispatch]);
}
