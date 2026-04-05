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
import ErrorBoundary from "../components/ErrorBoundary";

type ViewMode = 'home' | 'normal' | 'history' | 'graph';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const sidebarRef = useRef<SidebarHandle>(null);

  const { history, addToHistory } = useHistory();
  const { tabs, activeTabId, splitViewTabs, openTab, closeTab, clickTab, toggleSplitView, clearSplitView, updateArticle, openSplitView } = useTabManager(addToHistory);
  const { memoWidth, isResizing, handleMouseDown, handleMouseMove: handleMemoMouseMove, handleMouseUp: handleMemoMouseUp } = useResizer();

  // Split view resize
  const [splitRatio, setSplitRatio] = useState(0.5);
  const isSplitResizingRef = useRef(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Drag-to-split
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);

  const selectedArticle = tabs.find(tab => tab.id === activeTabId)?.article ?? null;

  const handleSelectArticle = async (article: Article) => {
    const finalArticle = await fetchArticleDetail(article);
    openTab(finalArticle);
    setViewMode('normal');
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode !== 'normal') clearSplitView();
    setViewMode(mode);
  };

  const handleViewUserArticles = (article: Article) => {
    const source: 'qiita' | 'dev' = article.url?.includes('dev.to') ? 'dev' : 'qiita';
    // Qiita: userId = login ID, Dev.to: userId = username (handle)
    const userId = source === 'dev'
      ? (article.user?.username ?? article.user?.id ?? '')
      : (article.user?.id ?? article.user?.login ?? '');
    if (!userId) return;
    const name = article.user?.name ?? userId;
    const profileImage = article.user?.profile_image_url ?? article.user?.profile_image ?? '';
    setSidebarOpen(true);
    sidebarRef.current?.viewUserArticles(userId, name, profileImage, source);
  };

  const handleDropSplit = (side: 'left' | 'right') => {
    if (!draggingTabId) return;
    const otherTabId = tabs.find(t => t.id !== draggingTabId)?.id;
    if (!otherTabId) return;
    const [left, right] = side === 'right'
      ? [activeTabId ?? otherTabId, draggingTabId]
      : [draggingTabId, activeTabId ?? otherTabId];
    openSplitView(left, right);
    setSplitRatio(0.5);
    setDraggingTabId(null);
    setViewMode('normal');
  };

  const handleSplitResizerMouseDown = () => {
    isSplitResizingRef.current = true;
  };

  const handleGlobalMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    handleMemoMouseMove(e);
    if (isSplitResizingRef.current && splitContainerRef.current) {
      const rect = splitContainerRef.current.getBoundingClientRect();
      const ratio = Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width));
      setSplitRatio(ratio);
    }
  };

  const handleGlobalMouseUp = () => {
    handleMemoMouseUp();
    isSplitResizingRef.current = false;
  };

  const handleOpenSearch = () => {
    setSidebarOpen(true);
    setViewMode('normal');
  };

  return (
    <div
      className="app-shell flex h-screen w-full bg-[#0B1120] text-slate-300 font-sans selection:bg-indigo-500/30"
      onMouseMove={handleGlobalMouseMove}
      onMouseUp={handleGlobalMouseUp}
      onMouseLeave={handleGlobalMouseUp}
    >
      {/* Left Sidebar — ホーム画面では非表示 */}
      {viewMode !== 'home' && (
        <Sidebar
          ref={sidebarRef}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectArticle={handleSelectArticle}
        />
      )}

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
            draggingTabId={draggingTabId}
            onTabClick={clickTab}
            onTabClose={closeTab}
            onToggleSplitView={toggleSplitView}
            onDragStart={setDraggingTabId}
            onDragEnd={() => setDraggingTabId(null)}
          />
        )}

        <div className="flex-1 overflow-hidden flex min-w-0">
          <div className="flex-1 overflow-hidden flex relative min-w-0" ref={splitContainerRef}>
            <ErrorBoundary>
              <MainContentSwitcher
                viewMode={viewMode}
                tabs={tabs}
                splitViewTabs={splitViewTabs}
                selectedArticle={selectedArticle}
                history={history}
                onViewUserArticles={handleViewUserArticles}
                onSelectArticle={openTab}
                onHistorySelect={handleSelectArticle}
                onOpenSearch={handleOpenSearch}
                setViewMode={setViewMode}
                splitRatio={splitRatio}
                onSplitResizerMouseDown={handleSplitResizerMouseDown}
              />
            </ErrorBoundary>

            {/* Drag-to-split overlay */}
            {draggingTabId && tabs.length >= 2 && (
              <div className="absolute inset-0 z-50 flex pointer-events-none">
                <div
                  className="w-1/2 h-full flex items-center justify-center bg-indigo-500/10 border-r-2 border-indigo-500/60 hover:bg-indigo-500/25 transition-colors pointer-events-auto"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleDropSplit('left'); }}
                >
                  <div className="bg-indigo-700/90 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg pointer-events-none select-none">
                    ← 左に分割
                  </div>
                </div>
                <div
                  className="w-1/2 h-full flex items-center justify-center bg-indigo-500/10 border-l-2 border-indigo-500/60 hover:bg-indigo-500/25 transition-colors pointer-events-auto"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleDropSplit('right'); }}
                >
                  <div className="bg-indigo-700/90 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-lg pointer-events-none select-none">
                    右に分割 →
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* メモペイン — ホーム画面では非表示 */}
          {viewMode !== 'home' && (
            <MemoPane
              selectedArticle={selectedArticle}
              memoWidth={memoWidth}
              isResizing={isResizing}
              onMouseDown={handleMouseDown}
              onArticleSaved={updateArticle}
            />
          )}
        </div>
      </main>

      {/* Mobile Memo Editor — ホーム画面では非表示 */}
      {viewMode !== 'home' && (
        <aside className="lg:hidden w-full h-96 flex-shrink-0 flex flex-col border-t border-slate-800 bg-[#0F172A] z-20">
          <MemoEditor targetArticle={selectedArticle} onArticleSaved={updateArticle} />
        </aside>
      )}
    </div>
  );
}