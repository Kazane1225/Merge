'use client';

import React from 'react';
import clsx from 'clsx';
import type { MouseEvent } from 'react';
import type { ArticleTab } from '../../types/article';
import { getArticleSource, getBadgeClasses, getSourceLabel } from '../../lib/articleHelpers';

interface TabBarProps {
  tabs: ArticleTab[];
  activeTabId: string | null;
  splitViewTabs: [string, string] | null;
  draggingTabId?: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string, e: MouseEvent) => void;
  onToggleSplitView: (tabId: string, e: MouseEvent) => void;
  onDragStart?: (tabId: string) => void;
  onDragEnd?: () => void;
}

const tab = {
  base: 'group flex items-center gap-2 px-3 py-2.5 border-r border-slate-800 cursor-pointer transition-all min-w-0 max-w-xs',
  active:    'bg-[#0B1120] text-indigo-400',
  splitView: 'bg-purple-900/30 text-purple-300',
  inactive:  'bg-slate-900/50 text-slate-400 hover:bg-slate-800/70 hover:text-slate-300',
} as const;

const splitBtn = {
  active:   'p-0.5 rounded transition-colors flex-shrink-0 bg-purple-600/50 text-purple-200',
  inactive: 'p-0.5 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-slate-700/50',
} as const;

const closeBtn = 'p-0.5 rounded hover:bg-slate-700/50 transition-colors flex-shrink-0';

export default function TabBar({ tabs, activeTabId, splitViewTabs, draggingTabId, onTabClick, onTabClose, onToggleSplitView, onDragStart, onDragEnd }: TabBarProps) {
  return (
    <div className="border-b border-slate-800 bg-[#0F172A]/95 backdrop-blur flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      {tabs.map((t) => {
        const source = getArticleSource(t.article);
        const isActive = t.id === activeTabId;
        const isInSplitView = splitViewTabs && (splitViewTabs[0] === t.id || splitViewTabs[1] === t.id);

        return (
          <div
            key={t.id}
            draggable
            onClick={() => onTabClick(t.id)}
            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(t.id); }}
            onDragEnd={onDragEnd}
            className={clsx(
              tab.base,
              isActive        ? tab.active
              : isInSplitView ? tab.splitView
              :                 tab.inactive,
              draggingTabId === t.id && 'opacity-40'
            )}
          >
            <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border flex-shrink-0', getBadgeClasses(source))}>
              {getSourceLabel(source)}
            </span>
            <span className="text-xs font-mono truncate flex-1 min-w-0">
              {t.article.title || 'Untitled'}
            </span>
            <button
              onClick={(e) => onToggleSplitView(t.id, e)}
              className={isInSplitView ? splitBtn.active : splitBtn.inactive}
              title={isInSplitView ? '分割を解除' : 'クリックで分割 / タブをドラッグして分割'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-18v18m0-18l6-0m-6 0v18m6-18h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m0-18v18" />
              </svg>
            </button>
            <button
              onClick={(e) => onTabClose(t.id, e)}
              className={clsx(closeBtn, isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
