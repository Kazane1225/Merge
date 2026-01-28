'use client';

import { useEffect, useState } from 'react';

export default function ArticleView({ onSelectArticle }: { onSelectArticle: (a: any) => void }) {
  const [activeTab, setActiveTab] = useState<'db' | 'search'>('db');
  const [articles, setArticles] = useState([]);
  const [keyword, setKeyword] = useState('');

  const fetchDbArticles = () => {
    fetch('http://localhost:8080/api/articles')
      .then(res => res.json())
      .then(data => setArticles(data));
  };

  const searchQiita = () => {
    if (!keyword) return;
    fetch(`http://localhost:8080/api/qiita/search?keyword=${keyword}`)
      .then(res => res.json())
      .then(data => setArticles(data));
  };

  useEffect(() => {
    if (activeTab === 'db') {
      fetchDbArticles();
    } else {
      setArticles([]);
    }
  }, [activeTab]);

  return (
    <div className="w-full h-full bg-[#0F172A] flex flex-col">
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => setActiveTab('db')}
          className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'db' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          DATABASE
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'search' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Qiita SEARCH
        </button>
      </div>

      {activeTab === 'search' && (
        <div className="p-3 border-b border-slate-800 flex gap-2">
          <input 
            type="text" 
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none"
            placeholder="Search keywords..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchQiita()}
          />
          <button onClick={searchQiita} className="bg-slate-700 text-slate-300 px-3 py-1 rounded text-xs hover:bg-slate-600">
            Go
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {articles.map((article: any, index) => (
          <div 
            key={index}
            onClick={() => onSelectArticle(article)}
            className="group px-3 py-2 rounded hover:bg-slate-800 cursor-pointer transition-all border border-transparent hover:border-slate-700"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1 rounded ${activeTab === 'db' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}`}>
                {activeTab === 'db' ? 'DB' : 'Qiita'}
              </span>
              <h3 className="text-sm font-medium text-slate-300 group-hover:text-white truncate">
                {article.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}