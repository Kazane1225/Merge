'use client';

import React from 'react';
import clsx from 'clsx';

type ViewMode = 'home' | 'normal' | 'history' | 'graph';

interface AppHeaderProps {
  sidebarOpen: boolean;
  selectedArticleTitle: string | null;
  viewMode: ViewMode;
  onToggleSidebar: () => void;
  onViewModeChange: (mode: ViewMode) => void;
}

const viewModeBtn = {
  base: 'text-[10px] px-3 py-1 rounded transition-all',
  active: 'bg-indigo-600 text-white shadow',
  inactive: 'text-slate-400 hover:text-slate-200',
} as const;

const VIEW_MODES: { mode: ViewMode; icon: string; title: string }[] = [
  { mode: 'home',    icon: '🏠', title: 'ホーム' },
  { mode: 'normal',  icon: '📄', title: '通常表示' },
  { mode: 'history', icon: '🕐', title: '履歴' },
  { mode: 'graph',   icon: '🕸️', title: 'グラフビュー' },
];

export default function AppHeader({ sidebarOpen, selectedArticleTitle, viewMode, onToggleSidebar, onViewModeChange }: AppHeaderProps) {
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

      <div className="ml-auto flex gap-1 bg-slate-800/50 p-1 rounded">
        {VIEW_MODES.map(({ mode, icon, title }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={clsx(viewModeBtn.base, viewMode === mode ? viewModeBtn.active : viewModeBtn.inactive)}
            title={title}
          >
            {icon}
          </button>
        ))}
      </div>
    </header>
  );
}
