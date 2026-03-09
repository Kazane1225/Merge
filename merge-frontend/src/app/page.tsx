'use client';

import React, { useState, useRef } from "react";
import Sidebar from "../components/layout/Sidebar";
import type { SidebarHandle } from "../components/layout/Sidebar";
import AppHeader from "../components/layout/AppHeader";
import TabBar from "../components/layout/TabBar";
import MainContentSwitcher from "../components/layout/MainContentSwitcher";
import MemoPane from "../components/layout/MemoPane";
import MemoEditor from "../components/MemoEditor";
import { Article } from "../types/article";
import { fetchArticleDetail } from "../lib/articleApi";
import { useHistory } from "../hooks/useHistory";
import { useTabManager } from "../hooks/useTabManager";
import { useResizer } from "../hooks/useResizer";

type ViewMode = 'normal' | 'history' | 'graph';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const sidebarRef = useRef<SidebarHandle>(null);

  const { history, addToHistory } = useHistory();
  const { tabs, activeTabId, splitViewTabs, openTab, closeTab, clickTab, toggleSplitView, clearSplitView, updateArticle } = useTabManager(addToHistory);
  const { memoWidth, isResizing, handleMouseDown, handleMouseMove, handleMouseUp } = useResizer();

  const selectedArticle = tabs.find(tab => tab.id === activeTabId)?.article ?? null;

  const handleSelectArticle = async (article: Article) => {
    const finalArticle = await fetchArticleDetail(article);
    openTab(finalArticle);
    setViewMode('normal');
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'normal') clearSplitView();
    setViewMode(mode);
  };

  const handleViewUserArticles = (article: Article) => {
    const userId = article.user?.id ?? article.user?.login;
    if (!userId) return;
    const name = article.user?.name ?? article.user?.login ?? userId;
    const profileImage = article.user?.profile_image_url ?? '';
    setSidebarOpen(true);
    sidebarRef.current?.viewUserArticles(userId, name, profileImage);
  };

  return (
    <div
      className="app-shell flex h-screen w-full bg-[#0B1120] text-slate-300 font-sans selection:bg-indigo-500/30"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Left Sidebar */}
      <Sidebar
        ref={sidebarRef}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectArticle={handleSelectArticle}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#0B1120] relative">
        <AppHeader
          sidebarOpen={sidebarOpen}
          selectedArticleTitle={selectedArticle?.title ?? null}
          viewMode={viewMode}
          onToggleSidebar={() => setSidebarOpen(true)}
          onViewModeChange={handleViewModeChange}
        />

        {tabs.length > 0 && viewMode === 'normal' && (
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            splitViewTabs={splitViewTabs}
            onTabClick={clickTab}
            onTabClose={closeTab}
            onToggleSplitView={toggleSplitView}
          />
        )}

        <div className="flex-1 overflow-hidden flex min-w-0">
          <MainContentSwitcher
            viewMode={viewMode}
            tabs={tabs}
            splitViewTabs={splitViewTabs}
            selectedArticle={selectedArticle}
            history={history}
            onViewUserArticles={handleViewUserArticles}
            onSelectArticle={openTab}
            onHistorySelect={handleSelectArticle}
            setViewMode={setViewMode}
          />

          <MemoPane
            selectedArticle={selectedArticle}
            memoWidth={memoWidth}
            isResizing={isResizing}
            onMouseDown={handleMouseDown}
            onArticleSaved={updateArticle}
          />
        </div>
      </main>

      {/* Mobile Memo Editor */}
      <aside className="lg:hidden w-full h-96 flex-shrink-0 flex flex-col border-t border-slate-800 bg-[#0F172A] z-20">
        <MemoEditor targetArticle={selectedArticle} onArticleSaved={updateArticle} />
      </aside>
    </div>
  );
}