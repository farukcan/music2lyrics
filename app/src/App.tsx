import "./App.css";
import { AppProvider } from "./AppContext";
import { useLogStream } from "./hooks/useLogStream";
import { FileSelector } from "./components/FileSelector";
import { BatchQueue } from "./components/BatchQueue";
import { LogPanel } from "./components/LogPanel";
import { SongList } from "./components/SongList";
import { ResultViewer } from "./components/ResultViewer";
import { LrcPlayer } from "./components/LrcPlayer";

function AppContent() {
  useLogStream();

  return (
    <div className="h-screen flex flex-col bg-zinc-900 text-zinc-100">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-zinc-700 bg-zinc-900/95 z-10">
        <h1 className="text-lg font-bold tracking-tight">music2lyrics</h1>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <SongList />

        {/* Main content - relative for log background */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Background log overlay */}
          <LogPanel />

          {/* Foreground content */}
          <div className="flex-1 flex flex-col min-h-0 relative z-10">
            <FileSelector />
            <BatchQueue />
            <ResultViewer />
            <LrcPlayer />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
