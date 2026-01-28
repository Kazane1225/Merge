'use client';

import { useState } from "react";
import ArticleView from "../components/ArticleView";
import MemoEditor from "../components/MemoEditor";

export default function Home() {
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  return (
    <div className="flex h-screen w-full bg-[#0B1120] text-slate-300 font-sans selection:bg-indigo-500/30">
      
      <aside className="w-80 flex-shrink-0 flex flex-col border-r border-slate-800 bg-[#0F172A]">
        <div className="h-14 flex items-center px-5 border-b border-slate-800">
          <h1 className="text-lg font-mono font-bold text-indigo-400">
            <span className="text-slate-500 mr-2">$</span>Merge_
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ArticleView onSelectArticle={(article) => setSelectedArticle(article)} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#0B1120] relative">
        <header className="h-14 border-b border-slate-800 flex items-center px-8 bg-[#0B1120]/95 backdrop-blur z-10">
           <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
             <span>reading:</span>
             <span className="text-slate-300 truncate max-w-md">
               {selectedArticle ? selectedArticle.title : "No Article Selected"}
             </span>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 scroll-smooth">
          <div className="max-w-3xl mx-auto">
            {selectedArticle ? (
              <div className="w-full max-w-none">
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
      </main>

      <aside className="w-[450px] flex-shrink-0 flex flex-col border-l border-slate-800 bg-[#0F172A] z-20">
        <MemoEditor targetArticle={selectedArticle} />
      </aside>

    </div>
  );
}