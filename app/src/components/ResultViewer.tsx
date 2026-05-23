import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppContext } from "../AppContext";

type FileTab = "lrc" | "srt" | "txt" | "vtt" | "json";

const TABS: FileTab[] = ["lrc", "srt", "txt", "vtt", "json"];

export function ResultViewer() {
  const { state } = useAppContext();
  const [activeTab, setActiveTab] = useState<FileTab>("lrc");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const erroredItems = state.queue.filter((item) => item.status === "error");

  useEffect(() => {
    if (!state.selectedSong) {
      setContent("");
      return;
    }

    setLoading(true);
    invoke<string>("read_output_file", {
      songName: state.selectedSong,
      fileType: activeTab,
    })
      .then(setContent)
      .catch(() => setContent("File not available"))
      .finally(() => setLoading(false));
  }, [state.selectedSong, activeTab]);

  // Show errors when no song is selected
  if (!state.selectedSong) {
    if (erroredItems.length > 0) {
      return (
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
          {erroredItems.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-red-950/50 border border-red-800/50"
            >
              <div className="text-sm font-medium text-red-300">
                {item.fileName}
              </div>
              <div className="text-xs text-red-400/80 mt-1 font-mono whitespace-pre-wrap">
                {item.error}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Select a song to view results
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-700">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-zinc-300 bg-zinc-950/50">
        {loading ? (
          <span className="text-zinc-500">Loading...</span>
        ) : (
          <pre className="whitespace-pre-wrap">{content}</pre>
        )}
      </div>
    </div>
  );
}
