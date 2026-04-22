'use client';

import React, { useRef, useImperativeHandle } from 'react';
import clsx from 'clsx';
import ArticleView from '../article/ArticleView';
import type { ArticleViewHandle } from '../article/ArticleView';
import type { Article } from '../../types/article';

export interface SidebarHandle {
  viewUserArticles: (userId: string, name: string, profileImage: string, source: 'qiita' | 'dev') => void;
  searchByTag: (tag: string) => void;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onSelectArticle: (article: Article) => void;
}

const Sidebar = React.forwardRef<SidebarHandle, SidebarProps>(function Sidebar(
  { open, onClose, onSelectArticle },
  ref
) {
  const articleViewRef = useRef<ArticleViewHandle>(null);

  useImperativeHandle(ref, () => ({
    viewUserArticles(userId, name, profileImage, source) {
      articleViewRef.current?.viewUserArticles(userId, name, profileImage, source);
    },
    searchByTag(tag) {
      articleViewRef.current?.searchByTag(tag);
    },
  }));

  return (
    <aside className={clsx(
      'transition-all duration-300 flex-shrink-0 flex flex-col border-r border-slate-800 bg-[#0F172A]',
      open ? 'w-80' : 'w-0 overflow-hidden'
    )}>
      <div className="h-14 flex items-center justify-between px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sidebar-logo-grad" x1="4" y1="8" x2="28" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <path d="M4 26 L4 8 L16 20 L28 8 L28 26" stroke="url(#sidebar-logo-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-base font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Merge</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-700 rounded transition-colors"
          title="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <ArticleView ref={articleViewRef} onSelectArticle={onSelectArticle} />
      </div>
    </aside>
  );
});

export default Sidebar;
