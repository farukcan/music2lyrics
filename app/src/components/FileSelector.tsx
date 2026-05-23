import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranscribe } from "../hooks/useTranscribe";

const LANGUAGES = [
  { code: "tr", label: "Turkish" },
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
];

export function FileSelector() {
  const [language, setLanguage] = useState("tr");
  const { addToQueue } = useTranscribe();

  async function handleSelectFiles() {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Audio",
          extensions: ["mp3", "wav", "m4a", "flac", "ogg", "wma"],
        },
      ],
    });

    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];
    const files = paths.map((p) => ({
      path: p,
      name: p.split("/").pop() || p,
    }));

    addToQueue(files, language);
  }

  return (
    <div className="flex items-center gap-3 p-4 border-b border-zinc-700">
      <button
        onClick={handleSelectFiles}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
      >
        Select Files
      </button>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
