import { useEffect, useRef } from "react";
import { useAppContext } from "../AppContext";

export function LogPanel() {
  const { state } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [state.logs.length]);

  if (state.logs.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-y-auto font-mono text-xs p-4 pointer-events-none select-none z-0"
    >
      {state.logs.map((log, i) => (
        <div
          key={i}
          className={
            log.stream === "stderr"
              ? "text-yellow-500/15"
              : "text-zinc-500/15"
          }
        >
          {log.line}
        </div>
      ))}
    </div>
  );
}
