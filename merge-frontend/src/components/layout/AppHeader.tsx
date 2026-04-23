'use client';

import React from 'react';

type ViewMode = 'home' | 'normal' | 'history' | 'library';

interface AppHeaderProps {
  sidebarOpen: boolean;
  selectedArticleTitle: string | null;
  onToggleSidebar: () => void;
}

export default function AppHeader({ sidebarOpen, selectedArticleTitle, onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="h-14 border-b border-slate-800 flex items-center px-8 bg-[#0B1120]/95 backdrop-blur z-10 gap-4">
      {!sidebarOpen && (
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-slate-800 rounded transition-colors"
          title="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <span>reading:</span>
        <span className="text-slate-300 truncate max-w-md">
          {selectedArticleTitle ?? 'No Article Selected'}
        </span>
      </div>
    </header>
  );
}
