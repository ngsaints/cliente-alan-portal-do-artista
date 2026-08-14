import React from 'react';
import { Home, Compass, Library, Smartphone } from 'lucide-react';

export type TabType = 'feed' | 'explore' | 'library' | 'local';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'feed' as TabType, label: 'Início', icon: Home },
    { id: 'explore' as TabType, label: 'Explorar', icon: Compass },
    { id: 'library' as TabType, label: 'Biblioteca', icon: Library },
    { id: 'local' as TabType, label: 'No Aparelho', icon: Smartphone },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 px-3 py-2 sm:py-3 max-w-lg mx-auto">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-[#f5c518] scale-105 font-bold'
                  : 'text-white/50 hover:text-white/80 font-medium'
              }`}
            >
              <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-[#f5c518]/10' : ''}`}>
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#f5c518] shadow-[0_0_8px_#f5c518]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
