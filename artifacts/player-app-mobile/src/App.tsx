import React, { useState } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import { Navigation, TabType } from './components/Navigation';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { FeedView } from './views/FeedView';
import { ExploreView } from './views/ExploreView';
import { LibraryView } from './views/LibraryView';
import { LocalSongsView } from './views/LocalSongsView';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('feed');

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col justify-between selection:bg-[#f5c518] selection:text-black">
      {/* Top Mobile Bar Status */}
      <header className="sticky top-0 z-30 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 max-w-lg mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#f5c518] to-amber-200 flex items-center justify-center text-black font-black text-xs shadow-md">
            PA
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            Portal do Artista <span className="text-[#f5c518] text-xs font-mono font-normal">Player</span>
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-white/50">
          v1.0 Demo
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4">
        {activeTab === 'feed' && <FeedView />}
        {activeTab === 'explore' && <ExploreView />}
        {activeTab === 'library' && <LibraryView />}
        {activeTab === 'local' && <LocalSongsView />}
      </main>

      {/* Floating Mini Player */}
      <MiniPlayer />

      {/* Expandable Full Screen Player */}
      <FullPlayer />

      {/* Bottom Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}
