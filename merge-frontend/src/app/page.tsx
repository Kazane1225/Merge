'use client';

import { useState, useEffect } from "react";
import hljs from 'highlight.js';
import 'highlight.js/styles/nord.css';
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
    // Qiitaの記事詳細取得（IDが数値で、本文がない場合）
    if (article.id && typeof article.id === 'number' && !article.rendered_body && !article.body_html) {
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
    // Dev.toの記事詳細取得（Qiitaではない場合で、本文がない場合）
    if (article.id && !article.body_html && !article.rendered_body) {
      try {
        const response = await fetch(`http://localhost:8080/api/dev/article/${article.id}`);
        if (response.ok) {
          const detailArticle = await response.json();
          if (detailArticle && detailArticle.id) {
            setSelectedArticle(detailArticle);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching Dev.to article detail:", err);
      }
    }
    setSelectedArticle(article);
  };

  useEffect(() => {
    if (selectedArticle && (selectedArticle.rendered_body || selectedArticle.body_html)) {
      setTimeout(() => {
        document.querySelectorAll('pre code').forEach((block: any) => {
          hljs.highlightElement(block);
        });
      }, 0);
    }
  }, [selectedArticle]);

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
                  {selectedArticle.url?.includes('dev.to') && selectedArticle.cover_image && (
                    <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={selectedArticle.cover_image} 
                        alt={selectedArticle.title}
                        className="w-full h-auto object-cover max-h-96"
                      />
                    </div>
                  )}
                  <h1 className="text-4xl font-bold text-slate-100 mb-6 text-center">{selectedArticle.title}</h1>
                <a href={selectedArticle.url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline break-all font-mono text-base block mb-8 text-center">
                  {selectedArticle.url}
                </a>

                {selectedArticle.rendered_body || selectedArticle.body_html ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: selectedArticle.rendered_body || selectedArticle.body_html }} 
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