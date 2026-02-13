'use client';

import { useState, useEffect, useRef } from "react";
import hljs from 'highlight.js';
import 'highlight.js/styles/nord.css';
import ArticleView from "../components/ArticleView";
import MemoEditor from "../components/MemoEditor";

interface ArticleTab {
  id: string;
  article: any;
  lastViewed: number;
}

interface HistoryEntry {
  article: any;
  timestamp: number;
  tabId: string;
}

const MAX_TABS = 5;
const MAX_HISTORY = 50;

// 記事のソースを判定する
const getArticleSource = (article: any): 'database' | 'qiita' | 'dev' => {
  if (article.url?.includes('qiita.com')) return 'qiita';
  if (article.url?.includes('dev.to')) return 'dev';
  return 'database';
};

// ソースに応じたバッジスタイルを取得
const getBadgeClasses = (source: 'database' | 'qiita' | 'dev') => {
  switch (source) {
    case 'qiita':
      return 'bg-green-900/80 text-green-200 border-green-700/60';
    case 'dev':
      return 'bg-purple-900/80 text-purple-200 border-purple-700/60';
    case 'database':
    default:
      return 'bg-blue-900/80 text-blue-200 border-blue-700/60';
  }
};

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
        const response = await fetch(`http://localhost:8080/api/qiita/article/${article.id}`);
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
        const response = await fetch(`http://localhost:8080/api/dev/article/${article.id}`);
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
    
    // 履歴に追加
    addToHistory(tab.article, tabId);
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
      // スクロール位置をトップにリセット
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      setTimeout(() => {
        document.querySelectorAll('pre code').forEach((block: any) => {
          hljs.highlightElement(block);
        });
      }, 0);
    }
  }, [activeTabId]);

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
    <div className="flex h-screen w-full bg-[#0B1120] text-slate-300 font-sans selection:bg-indigo-500/30" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      
      {/* Left Sidebar */}
      <aside className={`transition-all duration-300 flex-shrink-0 flex flex-col border-r border-slate-800 bg-[#0F172A] ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
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
               className={`text-[10px] px-3 py-1 rounded transition-all ${viewMode === 'normal' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
               title="通常表示"
             >
               📄
             </button>
             <button
               onClick={() => setViewMode('history')}
               className={`text-[10px] px-3 py-1 rounded transition-all ${viewMode === 'history' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
               title="履歴"
             >
               🕐
             </button>
             <button
               onClick={() => setViewMode('graph')}
               className={`text-[10px] px-3 py-1 rounded transition-all ${viewMode === 'graph' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
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
              const badgeLabel = { database: 'DB', qiita: 'Qiita', dev: 'Dev.to' }[source];
              const isInSplitView = splitViewTabs && (splitViewTabs[0] === tab.id || splitViewTabs[1] === tab.id);
              return (
                <div
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`group flex items-center gap-2 px-3 py-2.5 border-r border-slate-800 cursor-pointer transition-all min-w-0 max-w-xs ${
                    activeTabId === tab.id
                      ? 'bg-[#0B1120] text-indigo-400'
                      : isInSplitView
                      ? 'bg-purple-900/30 text-purple-300'
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800/70 hover:text-slate-300'
                  }`}
                >
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border flex-shrink-0 ${getBadgeClasses(source)}`}>
                    {badgeLabel}
                  </span>
                  <span className="text-xs font-mono truncate flex-1 min-w-0">
                    {tab.article.title || 'Untitled'}
                  </span>
                  <button
                    onClick={(e) => toggleSplitView(tab.id, e)}
                    className={`p-0.5 rounded transition-colors flex-shrink-0 ${
                      isInSplitView ? 'bg-purple-600/50 text-purple-200' : 'opacity-0 group-hover:opacity-100 hover:bg-slate-700/50'
                    }`}
                    title="比較モード"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-18v18m0-18l6-0m-6 0v18m6-18h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m0-18v18" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className={`p-0.5 rounded hover:bg-slate-700/50 transition-colors flex-shrink-0 ${
                      activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
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
            className={`w-1 bg-slate-700 hover:bg-indigo-500 transition-colors cursor-col-resize ${isResizing ? 'bg-indigo-500' : ''}`}
          />
          <aside style={{ width: memoWidth }} className="flex-shrink-0 flex flex-col border-l border-slate-800 bg-[#0F172A] z-20 hidden lg:flex overflow-hidden">
            <MemoEditor targetArticle={selectedArticle} />
          </aside>
        </div>
      </main>

      {/* Mobile Memo Editor */}
      <aside className="lg:hidden w-full h-96 flex-shrink-0 flex flex-col border-t border-slate-800 bg-[#0F172A] z-20">
        <MemoEditor targetArticle={selectedArticle} />
      </aside>

    </div>
  );
}

// 記事コンテンツ表示コンポーネント
function ArticleContent({ article, className }: { article: any; className?: string }) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (article && (article.rendered_body || article.body_html)) {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      setTimeout(() => {
        document.querySelectorAll('pre code').forEach((block: any) => {
          hljs.highlightElement(block);
        });
      }, 0);
    }
  }, [article]);

  return (
    <div ref={contentRef} className={`overflow-y-auto scroll-smooth flex justify-center ${className}`}>
      <div className="w-full max-w-7xl px-8 lg:px-12 py-8">
        {article ? (
          <div className="w-full">
            {(article.cover_image || article.coverImage) && (
              <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
                <img 
                  src={article.cover_image || article.coverImage} 
                  alt={article.title}
                  className="w-full h-auto object-cover max-h-96"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-slate-100 mb-6 text-center">{article.title}</h1>
            <a href={article.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all font-mono text-base block mb-8 text-center">
              {article.url}
            </a>

            {article.rendered_body || article.body_html ? (
              <div 
                dangerouslySetInnerHTML={{ __html: article.rendered_body || article.body_html }} 
                className="qiita-content w-full text-slate-300
                  [&_*]:m-0 [&_*]:p-0
                  [&_p]:text-slate-300 [&_p]:mb-3 [&_p]:leading-relaxed
                  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-100 [&_h1]:mt-6 [&_h1]:mb-3
                  [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-100 [&_h2]:mt-5 [&_h2]:mb-3
                  [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-4 [&_h3]:mb-2
                  [&_h4]:font-bold [&_h4]:text-slate-200 [&_h4]:mt-3 [&_h4]:mb-2
                  [&_strong]:text-slate-200 [&_strong]:font-bold
                  [&_em]:text-slate-300 [&_em]:italic
                  [&_code]:text-amber-300 [&_code]:bg-slate-800 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-sm
                  [&_pre]:bg-slate-900 [&_pre]:text-slate-300 [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-4
                  [&_blockquote]:text-slate-400 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-3
                  [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_a]:underline
                  [&_img]:rounded [&_img]:shadow-lg [&_img]:my-4 [&_img]:max-w-full
                  [&_li]:text-slate-300 [&_li]:ml-5 [&_li]:mb-2
                  [&_ul]:my-3 [&_ol]:my-3
                  [&_table]:border [&_table]:border-slate-700 [&_table]:my-4 [&_table]:w-full
                  [&_thead]:bg-slate-800
                  [&_th]:border [&_th]:border-slate-700 [&_th]:text-slate-200 [&_th]:p-2 [&_th]:text-left
                  [&_td]:border [&_td]:border-slate-700 [&_td]:p-2
                  [&_iframe]:w-full [&_iframe]:rounded [&_iframe]:my-4 [&_iframe]:max-w-full
                  [&_video]:w-full [&_video]:rounded [&_video]:my-4 [&_video]:max-w-full
                "
              />
            ) : (
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-md">
                <p className="text-sm text-slate-300 font-mono">
                  <span className="text-yellow-400">Warning:</span> この記事は本文データを持っていません。
                  <br/>
                  Qiita/Dev.to検索から選択した記事のみ、プレビューが表示されます。
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-600 mt-20 font-mono text-sm">
            <p>&gt; Select an article from the explorer</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 履歴ビューコンポーネント
function HistoryView({ history, onSelectArticle, className }: { history: HistoryEntry[]; onSelectArticle: (a: any) => void; className?: string }) {
  const groupByDate = (entries: HistoryEntry[]) => {
    const groups: { [key: string]: HistoryEntry[] } = {};
    entries.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString('ja-JP', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  };

  const grouped = groupByDate(history);

  return (
    <div className={`overflow-y-auto ${className} bg-[#0B1120]`}>
      <div className="w-full max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-3xl font-bold text-slate-100 mb-8 flex items-center gap-3">
          <span>🕐</span>
          <span>閲覧履歴</span>
        </h2>
        
        {history.length === 0 ? (
          <div className="text-center text-slate-500 mt-20 font-mono text-sm">
            <p>まだ履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, entries]) => (
              <div key={date}>
                <h3 className="text-sm font-bold text-indigo-400 mb-3 sticky top-0 bg-[#0B1120]/95 backdrop-blur py-2 border-b border-slate-800">
                  {date}
                </h3>
                <div className="space-y-2">
                  {entries.map((entry, idx) => {
                    const source = getArticleSource(entry.article);
                    const badgeLabel = { database: 'DB', qiita: 'Qiita', dev: 'Dev.to' }[source];
                    const time = new Date(entry.timestamp).toLocaleTimeString('ja-JP', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                    
                    return (
                      <div
                        key={`${entry.tabId}-${idx}`}
                        onClick={() => onSelectArticle(entry.article)}
                        className="p-4 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-indigo-500/50 rounded-lg cursor-pointer transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-slate-500 font-mono mt-1">{time}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border flex-shrink-0 ${getBadgeClasses(source)}`}>
                            {badgeLabel}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2">
                              {entry.article.title || 'Untitled'}
                            </h4>
                            {entry.article.url && (
                              <p className="text-xs text-slate-500 mt-1 truncate">{entry.article.url}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// グラフビューコンポーネント（ネットワークグラフ）
function GraphView({ tabs, history, onSelectArticle, setViewMode, className }: { tabs: ArticleTab[]; history: HistoryEntry[]; onSelectArticle: (a: any) => void; setViewMode: (mode: 'normal' | 'history' | 'graph') => void; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [dbArticles, setDbArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // パン機能用の状態
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // DB保存記事を取得
  useEffect(() => {
    const fetchDbArticles = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8080/api/articles');
        if (response.ok) {
          const articles = await response.json();
          setDbArticles(articles);
        }
      } catch (error) {
        console.error('Failed to fetch DB articles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDbArticles();
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setDimensions({
            width: container.clientWidth,
            height: container.clientHeight
          });
        }
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // パン操作のハンドラ
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // ノードやエッジをクリックした場合はパンを開始しない
    if ((e.target as SVGElement).tagName === 'circle' || (e.target as SVGElement).tagName === 'line') {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  // HTMLタグを除去してテキストを抽出
  const extractText = (html: string): string => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // 技術分野向けキーワード辞書（日本語/英語）
  const TECH_TERM_ALIASES: Record<string, string[]> = {
    typescript: ['typescript', 'type script'],
    javascript: ['javascript', 'ecmascript'],
    python: ['python'],
    java: ['java'],
    'c++': ['c++', 'cpp'],
    'c#': ['c#', 'csharp'],
    golang: ['golang', 'go言語'],
    rust: ['rust'],
    kotlin: ['kotlin'],
    swift: ['swift'],
    php: ['php'],
    ruby: ['ruby'],
    react: ['react', 'reactjs', 'react.js'],
    nextjs: ['next.js', 'nextjs'],
    vue: ['vue', 'vue.js', 'vuejs'],
    angular: ['angular'],
    nodejs: ['node.js', 'nodejs'],
    spring: ['spring', 'spring boot', 'springboot'],
    django: ['django'],
    flask: ['flask'],
    fastapi: ['fastapi', 'fast api'],
    api: ['api', 'rest', 'restful', 'graphql'],
    database: ['database', 'データベース'],
    sql: ['sql', 'postgresql', 'postgres', 'mysql', 'sqlite', 'sqlserver'],
    nosql: ['nosql', 'mongodb', 'redis', 'cassandra'],
    docker: ['docker', 'コンテナ'],
    kubernetes: ['kubernetes', 'k8s'],
    devops: ['devops', 'ci/cd', 'continuous integration', 'continuous delivery'],
    aws: ['aws', 'amazon web services'],
    gcp: ['gcp', 'google cloud'],
    azure: ['azure'],
    linux: ['linux', 'unix'],
    git: ['git', 'github', 'gitlab'],
    security: ['security', 'セキュリティ', 'oauth', 'jwt', '認証', '認可'],
    algorithm: ['algorithm', 'アルゴリズム'],
    datastructure: ['data structure', 'データ構造'],
    ai: ['人工知能', 'machine learning', 'deep learning', 'llm'],
    frontend: ['frontend', 'フロントエンド'],
    backend: ['backend', 'バックエンド'],
    network: ['network', 'ネットワーク', 'tcp/ip', 'http', 'https'],
    testing: ['test', 'testing', 'テスト', 'tdd', 'jest', 'pytest'],
    architecture: ['architecture', '設計', 'アーキテクチャ', 'microservices', 'マイクロサービス']
  };

  const GENERIC_EN_STOPWORDS = new Set([
    'this', 'that', 'these', 'those', 'when', 'where', 'what', 'which', 'just', 'like', 'very',
    'have', 'has', 'had', 'will', 'would', 'could', 'should', 'there', 'their', 'then', 'than',
    'about', 'after', 'before', 'into', 'over', 'under', 'with', 'from', 'using', 'used', 'example'
  ]);

  const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const countOccurrences = (text: string, term: string): number => {
    if (!term) return 0;
    const hasJapanese = /[\u3040-\u30FF\u4E00-\u9FFF]/.test(term);
    const pattern = hasJapanese
      ? new RegExp(escapeRegExp(term), 'gi')
      : new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi');
    return (text.match(pattern) || []).length;
  };

  // 技術記事向けキーワード抽出（日本語/英語対応）
  const extractKeywords = (text: string): string[] => {
    const normalized = text.toLowerCase();
    const scores = new Map<string, number>();

    Object.entries(TECH_TERM_ALIASES).forEach(([canonical, aliases]) => {
      const occurrences = aliases.reduce((sum, alias) => sum + countOccurrences(normalized, alias.toLowerCase()), 0);
      if (occurrences > 0) {
        const weightedScore = occurrences * (1 + Math.log(canonical.length + 1));
        scores.set(canonical, weightedScore);
      }
    });

    // 辞書漏れの英語技術語を補完（一般語は除外）
    const tokenCandidates = normalized.match(/\b[a-z][a-z0-9+#.-]{3,}\b/g) || [];
    const techSignals = ['api', 'sql', 'http', 'auth', 'cache', 'cloud', 'infra', 'deploy', 'server', 'client', 'model'];
    tokenCandidates.forEach(token => {
      if (GENERIC_EN_STOPWORDS.has(token)) return;
      if (!techSignals.some(signal => token.includes(signal))) return;
      if (token.length < 4) return;
      if (scores.has(token)) return;
      scores.set(token, 0.8);
    });

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([keyword]) => keyword);
  };

  // コンテンツベースの類似度計算
  const calculateContentSimilarity = (article1: any, article2: any): number => {
    const text1 = extractText(article1.rendered_body || article1.body_html || '') + ' ' + (article1.title || '');
    const text2 = extractText(article2.rendered_body || article2.body_html || '') + ' ' + (article2.title || '');
    
    const keywords1 = new Set(extractKeywords(text1));
    const keywords2 = new Set(extractKeywords(text2));
    
    if (keywords1.size === 0 || keywords2.size === 0) return 0;
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    
    return intersection.size / union.size;
  };

  // 全記事から興味分野を抽出（記事横断で安定した技術キーワードのみ）
  const extractInterests = (dbTabs: ArticleTab[]) => {
    const documentFrequency = new Map<string, number>();

    dbTabs.forEach(tab => {
      const text = extractText(tab.article.rendered_body || tab.article.renderedBody || tab.article.body_html || '') + ' ' + (tab.article.title || '');
      const uniqueKeywords = new Set(extractKeywords(text));
      uniqueKeywords.forEach(keyword => {
        documentFrequency.set(keyword, (documentFrequency.get(keyword) || 0) + 1);
      });
    });

    const minSupport = Math.max(2, Math.ceil(dbTabs.length * 0.25));

    return Array.from(documentFrequency.entries())
      .filter(([_, docCount]) => docCount >= minSupport)
      .map(([word, docCount]) => ({
        word,
        count: docCount,
        score: docCount * (1 + Math.log(word.length + 1))
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ word, count }) => ({ word, count }));
  };

  // DB保存記事全体をグラフ用データに変換（タブに開いているかどうかは関係なし）
  const dbTabs: ArticleTab[] = dbArticles.map((article, idx) => ({
    id: String(article.id || article.url || idx),
    article: article,
    lastViewed: 0
  }));
  
  const interests = extractInterests(dbTabs);

  // ノードとエッジを生成（蜘蛛の巣状レイアウト）
  const generateGraph = () => {
    const nodes: Array<{ id: string; article: any; x: number; y: number; source: string }> = [];
    const edges: Array<{ from: string; to: string; strength: number; keywords: string[] }> = [];

    if (dbTabs.length === 0) return { nodes, edges };

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const nodeCount = dbTabs.length;
    const baseSize = Math.min(dimensions.width, dimensions.height);

    // 仮ノードを作成して先にエッジを計算（接続数を知るため）
    const tempNodes = dbTabs.map((tab, idx) => ({ id: String(tab.id), article: tab.article, index: idx }));
    const connectionCount = new Map<string, number>();
    tempNodes.forEach(n => connectionCount.set(n.id, 0));

    // エッジを作成して各ノードの接続数を計算
    for (let i = 0; i < tempNodes.length; i++) {
      for (let j = i + 1; j < tempNodes.length; j++) {
        const text1 = extractText(tempNodes[i].article.rendered_body || tempNodes[i].article.renderedBody || tempNodes[i].article.body_html || '') + ' ' + (tempNodes[i].article.title || '');
        const text2 = extractText(tempNodes[j].article.rendered_body || tempNodes[j].article.renderedBody || tempNodes[j].article.body_html || '') + ' ' + (tempNodes[j].article.title || '');
        const keywords1 = new Set(extractKeywords(text1));
        const keywords2 = new Set(extractKeywords(text2));
        const commonKeywords = Array.from(keywords1).filter(k => keywords2.has(k));
        
        const similarity = commonKeywords.length > 0 ? commonKeywords.length / Math.sqrt(keywords1.size * keywords2.size) : 0;
        
        if (similarity > 0.15 && commonKeywords.length > 0) {
          edges.push({
            from: tempNodes[i].id,
            to: tempNodes[j].id,
            strength: similarity,
            keywords: commonKeywords.slice(0, 3)
          });
          connectionCount.set(tempNodes[i].id, (connectionCount.get(tempNodes[i].id) || 0) + 1);
          connectionCount.set(tempNodes[j].id, (connectionCount.get(tempNodes[j].id) || 0) + 1);
        }
      }
    }

    // 接続数でソート（多い順）
    const sortedNodes = tempNodes.sort((a, b) => 
      (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0)
    );

    // 蜘蛛の巣状配置：同心円の層を作る
    const layers = Math.min(5, Math.ceil(Math.sqrt(nodeCount))); // 最大5層
    const nodesPerLayer = Math.ceil(nodeCount / layers);
    
    sortedNodes.forEach((tempNode, idx) => {
      const layerIndex = Math.floor(idx / nodesPerLayer);
      const positionInLayer = idx % nodesPerLayer;
      const totalInLayer = Math.min(nodesPerLayer, nodeCount - layerIndex * nodesPerLayer);
      
      // 層ごとに半径を変える（中心から外側へ）
      const layerRadius = layerIndex === 0 
        ? 0 // 中心ノード
        : (baseSize * 0.15) + (layerIndex * baseSize * 0.15);
      
      // 各層内で均等に角度を配分
      const angle = (positionInLayer / totalInLayer) * 2 * Math.PI;
      
      const x = layerIndex === 0 && positionInLayer === 0
        ? centerX
        : centerX + layerRadius * Math.cos(angle);
      const y = layerIndex === 0 && positionInLayer === 0
        ? centerY
        : centerY + layerRadius * Math.sin(angle);

      nodes.push({
        id: tempNode.id,
        article: tempNode.article,
        x,
        y,
        source: getArticleSource(tempNode.article)
      });
    });

    return { nodes, edges };
  };

  const { nodes, edges } = generateGraph();

  const getNodeColor = (source: string) => {
    switch (source) {
      case 'qiita': return '#10b981';
      case 'dev': return '#a855f7';
      case 'database': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getNodeStroke = (source: string) => {
    switch (source) {
      case 'qiita': return '#059669';
      case 'dev': return '#7c3aed';
      case 'database': return '#2563eb';
      default: return '#475569';
    }
  };

  return (
    <div className={`${className} bg-[#0B1120] flex flex-col`}>
      <div className="px-8 py-6 border-b border-slate-800">
        <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <span>🕸️</span>
          <span>知識マップ</span>
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          DB保存記事のコンテンツを分析して関連性を可視化。あなたの興味分野も表示します
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400 font-mono text-sm">
            <p>📊 DB記事を読み込み中...</p>
          </div>
        </div>
      ) : dbTabs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-500 font-mono text-sm">
            <p>DB保存記事がありません</p>
            <p className="mt-2 text-xs">Qiita/Dev.toから記事を検索してDBに保存してください</p>
            {dbArticles.length > 0 && tabs.length > 0 && (
              <p className="mt-2 text-xs text-yellow-500">
                💡 DB記事: {dbArticles.length}件、開いているタブ: {tabs.length}件
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <g transform={`translate(${panOffset.x}, ${panOffset.y})`}>
            {/* 蜘蛛の巣ガイドライン（同心円） */}
            <g className="web-circles">
              {[1, 2, 3, 4, 5].map((layer) => {
                const baseSize = Math.min(dimensions.width, dimensions.height);
                const radius = (baseSize * 0.15) * layer;
                return (
                  <circle
                    key={layer}
                    cx={dimensions.width / 2}
                    cy={dimensions.height / 2}
                    r={radius}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    strokeDasharray={layer === 5 ? "none" : "4 4"}
                  />
                );
              })}
            </g>

            {/* 放射状のガイドライン */}
            <g className="web-radials">
              {Array.from({ length: 8 }).map((_, idx) => {
                const angle = (idx / 8) * 2 * Math.PI;
                const baseSize = Math.min(dimensions.width, dimensions.height);
                const maxRadius = baseSize * 0.75;
                const centerX = dimensions.width / 2;
                const centerY = dimensions.height / 2;
                return (
                  <line
                    key={idx}
                    x1={centerX}
                    y1={centerY}
                    x2={centerX + maxRadius * Math.cos(angle)}
                    y2={centerY + maxRadius * Math.sin(angle)}
                    stroke="#1e293b"
                    strokeWidth={1}
                    strokeOpacity={0.2}
                  />
                );
              })}
            </g>

            {/* エッジ（線） */}
            <g className="edges">
              {edges.map((edge, idx) => {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                const edgeId = `${edge.from}-${edge.to}`;
                const isHighlighted = hoveredNode === edge.from || hoveredNode === edge.to || hoveredEdge === edgeId;

                return (
                  <g key={idx}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isHighlighted ? '#818cf8' : '#334155'}
                      strokeWidth={isHighlighted ? 2 : Math.max(1, edge.strength * 8)}
                      strokeOpacity={isHighlighted ? 0.8 : 0.4}
                      className="transition-all duration-200"
                    />
                    {/* 透明なホバーエリア */}
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke="transparent"
                      strokeWidth={10}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredEdge(edgeId)}
                      onMouseLeave={() => setHoveredEdge(null)}
                    />
                  </g>
                );
              })}
            </g>

            {/* ノード（記事） */}
            <g className="nodes">
              {nodes.map((node) => {
                const isHovered = hoveredNode === node.id;
                const connectedEdges = edges.filter(e => e.from === node.id || e.to === node.id);
                const hasConnections = connectedEdges.length > 0;

                return (
                  <g key={node.id} className="cursor-pointer">
                    {/* 外側の輪（接続数を示す） */}
                    {hasConnections && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? 32 : 28}
                        fill="none"
                        stroke={getNodeStroke(node.source)}
                        strokeWidth={1}
                        strokeOpacity={isHovered ? 0.5 : 0.3}
                        className="transition-all duration-200"
                      />
                    )}

                    {/* メインの円 */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={20}
                      fill={getNodeColor(node.source)}
                      fillOpacity={isHovered ? 0.9 : 0.7}
                      stroke={getNodeStroke(node.source)}
                      strokeWidth={isHovered ? 3 : 2}
                      onClick={() => {
                        onSelectArticle(node.article);
                        setViewMode('normal');
                      }}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="transition-all duration-200"
                    />

                    {/* 中央のアイコン */}
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={12}
                      className="pointer-events-none select-none"
                    >
                      📙
                    </text>

                    {/* ホバー時のみタイトル表示 */}
                    {isHovered && (
                      <g>
                        <rect
                          x={node.x - 120}
                          y={node.y + 30}
                          width={240}
                          height={45}
                          fill="#0f172a"
                          stroke="#4f46e5"
                          strokeWidth={2}
                          rx={6}
                          className="pointer-events-none"
                        />
                        <text
                          x={node.x}
                          y={node.y + 48}
                          textAnchor="middle"
                          fill="#e2e8f0"
                          fontSize={11}
                          fontWeight="600"
                          className="pointer-events-none select-none"
                        >
                          {(node.article.title || 'Untitled').substring(0, 40)}
                        </text>
                        <text
                          x={node.x}
                          y={node.y + 63}
                          textAnchor="middle"
                          fill="#94a3b8"
                          fontSize={9}
                          className="pointer-events-none select-none"
                        >
                          接続: {connectedEdges.length}件 | クリックで開く
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
            </g>
          </svg>

          {/* エッジホバー時のツールチップ（接続理由） */}
          {hoveredEdge && (() => {
            const edge = edges.find(e => `${e.from}-${e.to}` === hoveredEdge);
            if (!edge) return null;
            const fromNode = nodes.find(n => n.id === edge.from);
            const toNode = nodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            return (
              <div
                className="absolute bg-slate-900/95 backdrop-blur border border-indigo-500/50 rounded-lg p-3 pointer-events-none shadow-xl"
                style={{
                  left: `${midX}px`,
                  top: `${midY}px`,
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '250px',
                  zIndex: 1000
                }}
              >
                <div className="text-xs font-bold text-indigo-300 mb-1.5">
                  🔗 共通分野
                </div>
                <div className="flex flex-wrap gap-1">
                  {edge.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-indigo-900/50 text-indigo-200 border border-indigo-700/50 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5">
                  類似度: {(edge.strength * 100).toFixed(0)}%
                </div>
              </div>
            );
          })()}

          {/* 興味分野パネル */}
          {interests.length > 0 && (
            <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-4 max-w-xs">
              <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                <span>💡</span>
                <span>あなたの興味分野</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {interests.map(({ word, count }) => (
                  <span
                    key={word}
                    className="text-xs px-2 py-1 bg-indigo-900/50 text-indigo-200 border border-indigo-700/50 rounded-full"
                  >
                    {word}
                    <span className="ml-1 text-indigo-400 text-[10px]">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 統計パネル */}
          <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-4">
            <h4 className="text-xs font-bold text-slate-300 mb-2">統計</h4>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex items-center justify-between gap-4">
                <span>記事数:</span>
                <span className="font-mono text-indigo-300">{dbTabs.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>関連性:</span>
                <span className="font-mono text-indigo-300">{edges.length}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>孤立記事:</span>
                <span className="font-mono text-indigo-300">
                  {nodes.filter(n => !edges.some(e => e.from === n.id || e.to === n.id)).length}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
              <p className="text-xs text-slate-500">💡 ノードをホバーでタイトル表示</p>
              <p className="text-xs text-slate-500">🔗 線をホバーで共通分野表示</p>
              <p className="text-xs text-slate-500">👆 ノードクリックで記事を開く</p>
              <p className="text-xs text-slate-500">🖐️ ドラッグで画面を移動</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}