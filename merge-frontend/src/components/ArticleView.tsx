'use client';

import { useEffect, useState, useRef } from 'react';

export default function ArticleView({ onSelectArticle }: { onSelectArticle: (a: any) => void }) {
  const [activeTab, setActiveTab] = useState<'db' | 'search'>('db');
  const [articles, setArticles] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState<'rel' | 'count' | 'created'>('rel');
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all');
  const [loading, setLoading] = useState(false);
  const debouncedSearchRef = useRef<NodeJS.Timeout | null>(null);

  const handleSortChange = (v: typeof sort) => {
    setSort(v);
    if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current);
    debouncedSearchRef.current = setTimeout(() => {
      if (activeTab === 'db') {
        searchDbArticles({ sort: v });
      } else {
        searchQiita({ sort: v });
      }
    }, 300);
  };

  const handlePeriodChange = (v: typeof period) => {
    setPeriod(v);
    if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current);
    debouncedSearchRef.current = setTimeout(() => {
      if (activeTab === 'db') {
        searchDbArticles({ period: v });
      } else {
        searchQiita({ period: v });
      }
    }, 300);
  };

  const fetchDbArticles = () => {
    setLoading(true);
    fetch('http://localhost:8080/api/articles')
      .then(res => res.json())
      .then(data => setArticles(data))
      .catch(err => console.error("DB Fetch Error:", err))
      .finally(() => setLoading(false));
  };

  const searchDbArticles = (opts?: { sort?: typeof sort; period?: typeof period; keyword?: string }) => {
    const s = opts?.sort ?? sort;
    const p = opts?.period ?? period;
    const kw = opts?.keyword ?? keyword;
    
    const url = `http://localhost:8080/api/articles/search?keyword=${encodeURIComponent(kw)}&sort=${s}&period=${p}`;
    setLoading(true);
    setArticles([]);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // フロント側でもソート処理を追加（念のため）
        let sorted = [...data];
        if (s === 'created') {
          sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        }
        setArticles(sorted);
      })
      .catch(err => console.error("DB Search Error:", err))
      .finally(() => setLoading(false));
  };

  const searchQiita = (opts?: { sort?: typeof sort; period?: typeof period; keyword?: string }) => {
    const s = opts?.sort ?? sort;
    const p = opts?.period ?? period;
    const kw = opts?.keyword ?? keyword;
    if (!kw) return;

    // ソートと期間をクエリパラメータに含める
    const url = `http://localhost:8080/api/qiita/search?keyword=${encodeURIComponent(kw)}&sort=${s}&period=${p}`;
    setLoading(true);
    setArticles([]);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // フロント側でソート処理
        let sorted = [...data];
        if (s === 'count') {
          sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        } else if (s === 'created') {
          sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        }
        setArticles(sorted);
      })
      .catch(err => console.error("Qiita Search Error:", err))
      .finally(() => setLoading(false));
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
      {/* タブ切り替え */}
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

      {/* 検索フォーム & オプション */}
      {(activeTab === 'search' || activeTab === 'db') && (
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-wait"
              placeholder={activeTab === 'db' ? "Search DB articles..." : "Search keywords..."}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'db' ? searchDbArticles() : searchQiita())}
              disabled={loading}
            />
            <button onClick={() => activeTab === 'db' ? searchDbArticles() : searchQiita()} disabled={loading} className={`bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors ${loading ? 'opacity-60 cursor-wait' : 'hover:bg-indigo-500'}`}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Loading
                </span>
              ) : 'Go'}
            </button>
          </div>
          
          <div className="flex gap-2">
            {/* ソート選択 */}
            <select 
              value={sort} 
              onChange={(e) => handleSortChange(e.target.value as any)}
              disabled={loading}
              className="flex-1 bg-slate-800 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-1 outline-none disabled:opacity-60 disabled:cursor-wait"
            >
              <option value="rel">関連度順</option>
              {activeTab === 'db' && <option value="count">新着順</option>}
              {activeTab === 'search' && (
                <>
                  <option value="count">いいね順</option>
                  <option value="created">新着順</option>
                </>
              )}
            </select>

            {/* 期間選択 */}
            <select 
              value={period} 
              onChange={(e) => handlePeriodChange(e.target.value as any)}
              disabled={loading}
              className="flex-1 bg-slate-800 border border-slate-700 text-[10px] text-slate-300 rounded px-1 py-1 outline-none disabled:opacity-60 disabled:cursor-wait"
            >
              <option value="all">全期間</option>
              <option value="week">1週間以内</option>
              <option value="month">1ヶ月以内</option>
            </select>
          </div>
        </div>
      )}

      {/* 記事リスト表示 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="text-center py-10 text-slate-600 text-xs flex items-center justify-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            Loading...
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-xs">No articles found.</div>
        )}

        {!loading && articles.map((article: any, index) => (
          <div 
            key={index}
            onClick={() => onSelectArticle(article)}
            className="group px-3 py-2 rounded hover:bg-slate-800 cursor-pointer transition-all border border-transparent hover:border-slate-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${activeTab === 'db' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}`}>
                {activeTab === 'db' ? 'DB' : 'Qiita'}
              </span>
              {article.likes_count !== undefined && (
                <span className="text-[10px] text-slate-500">
                  ♥ {article.likes_count}
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-300 group-hover:text-indigo-300 line-clamp-2 transition-colors">
              {article.title}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
}