'use client';

import React, { useRef, useImperativeHandle } from 'react';
import clsx from 'clsx';
import ArticleView from '../ArticleView';
import type { ArticleViewHandle } from '../ArticleView';
import type { Article } from '../../types/article';

export interface SidebarHandle {
  viewUserArticles: (userId: string, name: string, profileImage: string) => void;
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
    viewUserArticles(userId, name, profileImage) {
      articleViewRef.current?.viewUserArticles(userId, name, profileImage);
    },
  }));

  return (
    <aside className={clsx(
      'transition-all duration-300 flex-shrink-0 flex flex-col border-r border-slate-800 bg-[#0F172A]',
      open ? 'w-80' : 'w-0 overflow-hidden'
    )}>
      <div className="h-14 flex items-center justify-between px-5 border-b border-slate-800">
        <h1 className="text-lg font-mono font-bold text-indigo-400">
          <span className="text-slate-500 mr-2">$</span>Merge_
        </h1>
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
      <div className="flex-1 overflow-y-auto">
        <ArticleView ref={articleViewRef} onSelectArticle={onSelectArticle} />
      </div>
    </aside>
  );
});

export default Sidebar;
