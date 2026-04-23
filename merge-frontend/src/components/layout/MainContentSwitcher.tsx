'use client';

import React from 'react';
import ArticleContent from '../article/ArticleContent';
import HistoryView from '../HistoryView';
import LibraryView from '../LibraryView';
import HomeView from '../HomeView';
import type { Article, ArticleTab, HistoryEntry } from '../../types/article';

type ViewMode = 'home' | 'normal' | 'history' | 'library';

interface MainContentSwitcherProps {
  viewMode: ViewMode;
  tabs: ArticleTab[];
  splitViewTabs: [string, string] | null;
  selectedArticle: Article | null;
  history: HistoryEntry[];
  onViewUserArticles: (article: Article) => void;
  onSelectArticle: (article: Article) => void;
  onHistorySelect: (article: Article) => void;
  onOpenSearch: () => void;
  onSearchTag?: (tag: string) => void;
  setViewMode: (mode: ViewMode) => void;
  splitRatio?: number;
  onSplitResizerMouseDown?: () => void;
}

export default function MainContentSwitcher({
  viewMode,
  tabs,
  splitViewTabs,
  selectedArticle,
  history,
  onViewUserArticles,
  onSelectArticle,
  onHistorySelect,
  onOpenSearch,
  onSearchTag,
  setViewMode,
  splitRatio = 0.5,
  onSplitResizerMouseDown,
}: MainContentSwitcherProps) {
  if (viewMode === 'home') {
    return <HomeView onSelectArticle={onHistorySelect} onOpenSearch={onOpenSearch} onSearchTag={onSearchTag} history={history} className="flex-1" />;
  }

  if (viewMode === 'history') {
    return <HistoryView history={history} onSelectArticle={onHistorySelect} className="flex-1" />;
  }

  if (viewMode === 'library') {
    return <LibraryView onSelectArticle={onHistorySelect} className="flex-1" />;
  }

  // normal モード — Split View か通常表示
  if (splitViewTabs && splitViewTabs[1]) {
    return (
      <>
        <div style={{ flex: splitRatio }} className="overflow-hidden flex flex-col min-w-0">
          <ArticleContent
            article={tabs.find(t => t.id === splitViewTabs[0])?.article ?? null}
            className="flex-1"
            hideToc
            onViewUserArticles={onViewUserArticles}
            onSelectArticle={onSelectArticle}
          />
        </div>
        <div
          className="w-1.5 flex-shrink-0 bg-slate-700 hover:bg-indigo-500 cursor-col-resize transition-colors"
          onMouseDown={onSplitResizerMouseDown}
        />
        <div style={{ flex: 1 - splitRatio }} className="overflow-hidden flex flex-col min-w-0">
          <ArticleContent
            article={tabs.find(t => t.id === splitViewTabs[1])?.article ?? null}
            className="flex-1"
            hideToc
            onViewUserArticles={onViewUserArticles}
            onSelectArticle={onSelectArticle}
          />
        </div>
      </>
    );
  }

  return (
    <ArticleContent
      article={selectedArticle}
      className="flex-1"
      onViewUserArticles={onViewUserArticles}
      onSelectArticle={onSelectArticle}
    />
  );
}

