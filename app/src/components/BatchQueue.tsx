import { useAppContext } from "../AppContext";
import { useTranscribe } from "../hooks/useTranscribe";

const STATUS_ICONS: Record<string, string> = {
  pending: "○",
  processing: "⏳",
  complete: "✓",
  error: "✗",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-zinc-400",
  processing: "text-yellow-400",
  complete: "text-green-400",
  error: "text-red-400",
};

export function BatchQueue() {
  const { state } = useAppContext();
  const { removeFromQueue } = useTranscribe();

  if (state.queue.length === 0) return null;

  return (
    <div className="p-4 border-b border-zinc-700">
      <h3 className="text-sm font-medium text-zinc-400 mb-2">Queue</h3>
      <div className="space-y-1">
        {state.queue.map((item) => (
          <div key={item.id}>
            <div className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-zinc-800/50">
              <span className={STATUS_COLORS[item.status]}>
                {STATUS_ICONS[item.status]}
              </span>
              <span className="flex-1 truncate text-zinc-300">
                {item.fileName}
              </span>
              {item.status === "pending" && (
                <button
                  onClick={() => removeFromQueue(item.id)}
                  className="text-zinc-500 hover:text-red-400 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            {item.status === "error" && item.error && (
              <pre className="text-red-400 text-xs mt-1 mx-2 p-2 rounded bg-red-950/30 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {item.error}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
