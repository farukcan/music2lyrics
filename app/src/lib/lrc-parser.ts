import type { LrcLine } from "../types";

export function parseLrc(content: string): LrcLine[] {
  const lines = content.split("\n");
  const result: LrcLine[] = [];
  const regex = /\[(\d{2}):(\d{2}\.\d{2})\](.*)/;

  for (const line of lines) {
    const match = regex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = match[3].trim();
      if (text.length > 0) {
        result.push({ time, text });
      }
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}
