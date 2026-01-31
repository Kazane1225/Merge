'use client';

import { useState } from "react";
import ArticleView from "../components/ArticleView";
import MemoEditor from "../components/MemoEditor";

export default function Home() {
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [memoWidth, setMemoWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);

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
    if (article.id && !article.rendered_body) {
      try {
        const response = await fetch(`http://localhost:8080/api/qiita/article/${article.id}`);
        if (response.ok && response.headers.get('content-length') !== '0') {
          const detailArticle = await response.json();
          if (detailArticle && detailArticle.id) {
            setSelectedArticle(detailArticle);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching article detail:", err);
      }
    }
    setSelectedArticle(article);
  };

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
        </header>

        <div className="flex-1 overflow-hidden flex min-w-0">
          <div className="flex-1 overflow-y-auto scroll-smooth flex justify-center">
            <div className="w-full max-w-7xl px-8 lg:px-12 py-8">
              {selectedArticle ? (
                <div className="w-full">
                  <h1 className="text-3xl font-bold text-slate-100 mb-6">{selectedArticle.title}</h1>
                <a href={selectedArticle.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all font-mono text-sm block mb-8">
                  {selectedArticle.url}
                </a>

                {selectedArticle.rendered_body ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedArticle.rendered_body }} 
                    className="qiita-content"
                  />
                ) : (
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-md">
                    <p className="text-sm text-slate-300 font-mono">
                      <span className="text-yellow-400">Warning:</span> この記事は本文データを持っていません。
                      <br/>
                      Qiita検索から選択した記事のみ、プレビューが表示されます。
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