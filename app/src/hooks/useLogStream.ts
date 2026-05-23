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
    const unlisteners: Array<() => void> = [];

    listen<LogLineEvent>("log-line", (event) => {
      dispatch({
        type: "ADD_LOG_LINE",
        log: {
          jobId: event.payload.job_id,
          line: event.payload.line,
          stream: event.payload.stream as "stdout" | "stderr",
        },
      });
    }).then((fn) => unlisteners.push(fn));

    listen<JobCompleteEvent>("job-complete", (event) => {
      dispatch({ type: "JOB_COMPLETE", jobId: event.payload.job_id });
    }).then((fn) => unlisteners.push(fn));

    listen<JobErrorEvent>("job-error", (event) => {
      dispatch({
        type: "JOB_ERROR",
        jobId: event.payload.job_id,
        error: event.payload.error,
      });
    }).then((fn) => unlisteners.push(fn));

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [dispatch]);
}
