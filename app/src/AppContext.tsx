import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { QueueItem, LogLine } from "./types";

interface AppState {
  queue: QueueItem[];
  logs: LogLine[];
  selectedSong: string | null;
  isProcessing: boolean;
}

type Action =
  | { type: "ADD_TO_QUEUE"; items: QueueItem[] }
  | { type: "REMOVE_FROM_QUEUE"; id: string }
  | { type: "START_JOB"; id: string }
  | { type: "JOB_COMPLETE"; jobId: string }
  | { type: "JOB_ERROR"; jobId: string; error: string }
  | { type: "ADD_LOG_LINE"; log: LogLine }
  | { type: "CLEAR_LOGS" }
  | { type: "SELECT_SONG"; name: string | null }
  | { type: "SET_PROCESSING"; value: boolean };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_TO_QUEUE": {
      const activeItems = state.queue.filter(
        (item) => item.status === "pending" || item.status === "processing"
      );
      return {
        ...state,
        queue: [...activeItems, ...action.items],
        logs: activeItems.length === 0 ? [] : state.logs,
      };
    }
    case "REMOVE_FROM_QUEUE":
      return {
        ...state,
        queue: state.queue.filter((item) => item.id !== action.id),
      };
    case "START_JOB":
      return {
        ...state,
        isProcessing: true,
        queue: state.queue.map((item) =>
          item.id === action.id ? { ...item, status: "processing" } : item
        ),
      };
    case "JOB_COMPLETE": {
      const newQueue = state.queue.map((item) =>
        item.id === action.jobId ? { ...item, status: "complete" as const } : item
      );
      const stillActive = newQueue.some(
        (item) => item.status === "pending" || item.status === "processing"
      );
      return {
        ...state,
        queue: newQueue,
        isProcessing: stillActive,
        logs: stillActive ? state.logs : [],
      };
    }
    case "JOB_ERROR": {
      const newQueue = state.queue.map((item) =>
        item.id === action.jobId
          ? { ...item, status: "error" as const, error: action.error }
          : item
      );
      const stillActive = newQueue.some(
        (item) => item.status === "pending" || item.status === "processing"
      );
      return { ...state, queue: newQueue, isProcessing: stillActive };
    }
    case "ADD_LOG_LINE": {
      const maxLogs = 5000;
      const newLogs =
        state.logs.length >= maxLogs
          ? [...state.logs.slice(-maxLogs + 1), action.log]
          : [...state.logs, action.log];
      return { ...state, logs: newLogs };
    }
    case "CLEAR_LOGS":
      return { ...state, logs: [] };
    case "SELECT_SONG":
      return { ...state, selectedSong: action.name };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.value };
    default:
      return state;
  }
}

const initialState: AppState = {
  queue: [],
  logs: [],
  selectedSong: null,
  isProcessing: false,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => {} });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
