'use client';

import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import ArticleView from "../components/ArticleView";
import MemoEditor from "../components/MemoEditor";
import ArticleContent from "../components/ArticleContent";
import HistoryView from "../components/HistoryView";
import GraphView from "../components/GraphView";
import { getArticleSource, getBadgeClasses, getSourceLabel } from "../lib/articleHelpers";
import { ArticleTab, HistoryEntry } from "../types/article";
import { API_BASE } from "../lib/api";

const styles = {
  tab: {
    base: "group flex items-center gap-2 px-3 py-2.5 border-r border-slate-800 cursor-pointer transition-all min-w-0 max-w-xs",
    active: "bg-[#0B1120] text-indigo-400",
    splitView: "bg-purple-900/30 text-purple-300",
    inactive: "bg-slate-900/50 text-slate-400 hover:bg-slate-800/70 hover:text-slate-300",
  },
  viewModeBtn: {
    base: "text-[10px] px-3 py-1 rounded transition-all",
    active: "bg-indigo-600 text-white shadow",
    inactive: "text-slate-400 hover:text-slate-200",
  },
  splitBtn: {
    active: "p-0.5 rounded transition-colors flex-shrink-0 bg-purple-600/50 text-purple-200",
    inactive: "p-0.5 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-slate-700/50",
  },
  closeBtn: "p-0.5 rounded hover:bg-slate-700/50 transition-colors flex-shrink-0",
  resizer: "w-1 bg-slate-700 hover:bg-indigo-500 transition-colors cursor-col-resize",
};

const MAX_TABS = 5;
const MAX_HISTORY = 50;

export default function Home() {
  const [tabs, setTabs] = useState<ArticleTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [memoWidth, setMemoWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Split View (比較モード)
  const [splitViewTabs, setSplitViewTabs] = useState<[string, string] | null>(null);
  
  // 履歴機能
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  
  // ビューモード: 'normal' | 'history' | 'graph'
  const [viewMode, setViewMode] = useState<'normal' | 'history' | 'graph'>('normal');

  const selectedArticle = tabs.find(tab => tab.id === activeTabId)?.article || null;

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.max(300, Math.min(800, window.innerWidth - e.clientX));
    setMemoWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  const handleSelectArticle = async (article: any) => {
    let finalArticle = article;
    
    // Qiitaの記事詳細取得（IDが数値で、本文がない場合）
    if (article.id && typeof article.id === 'number' && !article.rendered_body && !article.body_html) {
      try {
        const response = await fetch(`${API_BASE}/qiita/article/${article.id}`);
        if (response.ok && response.headers.get('content-length') !== '0') {
          const detailArticle = await response.json();
          if (detailArticle && detailArticle.id) {
            finalArticle = detailArticle;
          }
        }
      } catch (err) {
        console.error("Error fetching article detail:", err);
      }
    }
    // Dev.toの記事詳細取得（Qiitaではない場合で、本文がない場合）
    else if (article.id && !article.body_html && !article.rendered_body) {
      try {
        const response = await fetch(`${API_BASE}/dev/article/${article.id}`);
        if (response.ok) {
          const detailArticle = await response.json();
          if (detailArticle && detailArticle.id) {
            finalArticle = detailArticle;
          }
        }
      } catch (err) {
        console.error("Error fetching Dev.to article detail:", err);
      }
    }

    // タブの追加または更新
    const articleId = String(finalArticle.id || finalArticle.url || Math.random());
    const existingTab = tabs.find(tab => tab.id === articleId);

    if (existingTab) {
      // 既存のタブがある場合は、そのタブをアクティブにして最終閲覧時刻を更新
      setTabs(tabs.map(tab => 
        tab.id === articleId 
          ? { ...tab, lastViewed: Date.now() }
          : tab
      ));
      setActiveTabId(articleId);
    } else {
      // 新しいタブを追加
      const newTab: ArticleTab = {
        id: articleId,
        article: finalArticle,
        lastViewed: Date.now()
      };

      // 履歴に追加
      addToHistory(finalArticle, newTab.id);

      if (tabs.length >= MAX_TABS) {
        // タブ上限に達している場合、最も古いタブを削除
        const oldestTab = tabs.reduce((oldest, current) => 
          current.lastViewed < oldest.lastViewed ? current : oldest
        );
        setTabs([...tabs.filter(tab => tab.id !== oldestTab.id), newTab]);
      } else {
        setTabs([...tabs, newTab]);
      }
      setActiveTabId(articleId);
    }

    // ビューモードを通常表示に切り替え
    setViewMode('normal');
  };

  const handleArticleSaved = (savedArticle: any) => {
    setTabs(prev =>
      prev.map(tab =>
        tab.article?.url === savedArticle.url
          ? { ...tab, article: savedArticle }
          : tab
      )
    );
  };

  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Split Viewから削除
    if (splitViewTabs && (splitViewTabs[0] === tabId || splitViewTabs[1] === tabId)) {
      setSplitViewTabs(null);
    }
    
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    if (activeTabId === tabId) {
      // 閉じたタブがアクティブだった場合、最後に閲覧したタブをアクティブに
      if (newTabs.length > 0) {
        const mostRecent = newTabs.reduce((recent, current) => 
          current.lastViewed > recent.lastViewed ? current : recent
        );
        setActiveTabId(mostRecent.id);
      } else {
        setActiveTabId(null);
      }
    }
  };

  const handleTabClick = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    setActiveTabId(tabId);
    setTabs(tabs.map(t => 
      t.id === tabId 
        ? { ...t, lastViewed: Date.now() }
        : t
    ));
  };
  
  const addToHistory = (article: any, tabId: string) => {
    const newEntry: HistoryEntry = {
      article,
      timestamp: Date.now(),
      tabId
    };
    
    setHistory(prev => {
      const updated = [newEntry, ...prev.filter(h => h.tabId !== tabId)].slice(0, MAX_HISTORY);
      // localStorageに保存
      try {
        localStorage.setItem('article-history', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save history', e);
      }
      return updated;
    });
  };
  
  // Split View用の関数
  const toggleSplitView = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!splitViewTabs) {
      // Split View未選択 - 最初のタブを選択
      setSplitViewTabs([tabId, '']);
    } else if (splitViewTabs[0] === tabId || splitViewTabs[1] === tabId) {
      // 既に選択されているタブ - 選択解除
      setSplitViewTabs(null);
    } else if (splitViewTabs[1] === '') {
      // 1つ目が選択済み - 2つ目を選択
      setSplitViewTabs([splitViewTabs[0], tabId]);
    } else {
      // 2つとも選択済み - リセットして新しいタブを選択
      setSplitViewTabs([tabId, '']);
    }
  };

  useEffect(() => {
    if (selectedArticle && (selectedArticle.rendered_body || selectedArticle.body_html)) {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [activeTabId, selectedArticle]);

  // 履歴をlocalStorageから読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem('article-history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  return (
    <div className="app-shell flex h-screen w-full bg-[#0B1120] text-slate-300 font-sans selection:bg-indigo-500/30" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      
      {/* Left Sidebar */}
      <aside className={clsx('transition-all duration-300 flex-shrink-0 flex flex-col border-r border-slate-800 bg-[#0F172A]', sidebarOpen ? 'w-80' : 'w-0 overflow-hidden')}>
        <div className="h-14 flex items-center justify-between px-5 border-b border-slate-800">
          <h1 className="text-lg font-mono font-bold text-indigo-400">
            <span className="text-slate-500 mr-2">$</span>Merge_
          </h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
            title="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ArticleView onSelectArticle={handleSelectArticle} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#0B1120] relative">
        <header className="h-14 border-b border-slate-800 flex items-center px-8 bg-[#0B1120]/95 backdrop-blur z-10 gap-4">
          {!sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(true)}
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
               {selectedArticle ? selectedArticle.title : "No Article Selected"}
             </span>
           </div>
           
           {/* ビューモード切り替えボタン */}
           <div className="ml-auto flex gap-1 bg-slate-800/50 p-1 rounded">
             <button
               onClick={() => { setViewMode('normal'); setSplitViewTabs(null); }}
               className={clsx(styles.viewModeBtn.base, viewMode === 'normal' ? styles.viewModeBtn.active : styles.viewModeBtn.inactive)}
               title="通常表示"
             >
               📄
             </button>
             <button
               onClick={() => setViewMode('history')}
               className={clsx(styles.viewModeBtn.base, viewMode === 'history' ? styles.viewModeBtn.active : styles.viewModeBtn.inactive)}
               title="履歴"
             >
               🕐
             </button>
             <button
               onClick={() => setViewMode('graph')}
               className={clsx(styles.viewModeBtn.base, viewMode === 'graph' ? styles.viewModeBtn.active : styles.viewModeBtn.inactive)}
               title="グラフビュー"
             >
               🕸️
             </button>
           </div>
        </header>

        {/* タブバー */}
        {tabs.length > 0 && viewMode === 'normal' && (
          <div className="border-b border-slate-800 bg-[#0F172A]/95 backdrop-blur flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {tabs.map((tab) => {
              const source = getArticleSource(tab.article);
              const badgeLabel = getSourceLabel(source);
              const isInSplitView = splitViewTabs && (splitViewTabs[0] === tab.id || splitViewTabs[1] === tab.id);
              return (
                <div
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={clsx(
                    styles.tab.base,
                    activeTabId === tab.id ? styles.tab.active
                    : isInSplitView        ? styles.tab.splitView
                    :                        styles.tab.inactive
                  )}
                >
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border flex-shrink-0 ${getBadgeClasses(source)}`}>
                    {badgeLabel}
                  </span>
                  <span className="text-xs font-mono truncate flex-1 min-w-0">
                    {tab.article.title || 'Untitled'}
                  </span>
                  <button
                    onClick={(e) => toggleSplitView(tab.id, e)}
                    className={isInSplitView ? styles.splitBtn.active : styles.splitBtn.inactive}
                    title="比較モード"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-18v18m0-18l6-0m-6 0v18m6-18h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m0-18v18" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className={clsx(styles.closeBtn, activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-hidden flex min-w-0">
          {viewMode === 'normal' && (
            splitViewTabs && splitViewTabs[1] ? (
              // Split Viewモード
              <>
                <ArticleContent 
                  article={tabs.find(t => t.id === splitViewTabs[0])?.article} 
                  className="flex-1"
                />
                <div className="w-1 bg-indigo-500/50" />
                <ArticleContent 
                  article={tabs.find(t => t.id === splitViewTabs[1])?.article}
                  className="flex-1"
                />
              </>
            ) : (
              // 通常モード
              <ArticleContent article={selectedArticle} className="flex-1" />
            )
          )}
          
          {viewMode === 'history' && (
            <HistoryView history={history} onSelectArticle={handleSelectArticle} className="flex-1" />
          )}
          
          {viewMode === 'graph' && (
            <GraphView tabs={tabs} history={history} onSelectArticle={handleSelectArticle} setViewMode={setViewMode} className="flex-1" />
          )}

          <div 
            onMouseDown={handleMouseDown}
            className={clsx(styles.resizer, isResizing && 'bg-indigo-500')}
          />
          <aside style={{ width: memoWidth }} className="flex-shrink-0 flex flex-col border-l border-slate-800 bg-[#0F172A] z-20 hidden lg:flex overflow-hidden">
            <MemoEditor targetArticle={selectedArticle} onArticleSaved={handleArticleSaved} />
          </aside>
        </div>
      </main>

      {/* Mobile Memo Editor */}
      <aside className="lg:hidden w-full h-96 flex-shrink-0 flex flex-col border-t border-slate-800 bg-[#0F172A] z-20">
        <MemoEditor targetArticle={selectedArticle} onArticleSaved={handleArticleSaved} />
      </aside>

    </div>
  );
}