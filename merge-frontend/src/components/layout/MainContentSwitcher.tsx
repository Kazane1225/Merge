'use client';

import React from 'react';
import ArticleContent from '../article/ArticleContent';
import HistoryView from '../HistoryView';
import GraphView from '../GraphView';
import type { Article, ArticleTab, HistoryEntry } from '../../types/article';

type ViewMode = 'normal' | 'history' | 'graph';

interface MainContentSwitcherProps {
  viewMode: ViewMode;
  tabs: ArticleTab[];
  splitViewTabs: [string, string] | null;
  selectedArticle: Article | null;
  history: HistoryEntry[];
  onViewUserArticles: (article: Article) => void;
  onSelectArticle: (article: Article) => void;
  onHistorySelect: (article: Article) => void;
  setViewMode: (mode: ViewMode) => void;
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
  setViewMode,
}: MainContentSwitcherProps) {
  if (viewMode === 'history') {
    return <HistoryView history={history} onSelectArticle={onHistorySelect} className="flex-1" />;
  }

  if (viewMode === 'graph') {
    return <GraphView tabs={tabs} history={history} onSelectArticle={onHistorySelect} setViewMode={setViewMode} className="flex-1" />;
  }

  // normal モード — Split View か通常表示
  if (splitViewTabs && splitViewTabs[1]) {
    return (
      <>
        <ArticleContent
          article={tabs.find(t => t.id === splitViewTabs[0])?.article ?? null}
          className="flex-1"
          onViewUserArticles={onViewUserArticles}
          onSelectArticle={onSelectArticle}
        />
        <div className="w-1 bg-indigo-500/50" />
        <ArticleContent
          article={tabs.find(t => t.id === splitViewTabs[1])?.article ?? null}
          className="flex-1"
          onViewUserArticles={onViewUserArticles}
          onSelectArticle={onSelectArticle}
        />
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
