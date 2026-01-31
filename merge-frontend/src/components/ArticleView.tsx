'use client';

import { useEffect, useState, useRef } from 'react';

export default function ArticleView({ onSelectArticle }: { onSelectArticle: (a: any) => void }) {
  const [activeTab, setActiveTab] = useState<'database' | 'qiita-search' | 'qiita-trending'>('database');
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
      if (activeTab === 'database') {
        searchDbArticles({ sort: v });
      } else if (activeTab === 'qiita-search') {
        searchQiita({ sort: v });
      }
    }, 300);
  };

  const handlePeriodChange = (v: typeof period) => {
    setPeriod(v);
    if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current);
    debouncedSearchRef.current = setTimeout(() => {
      if (activeTab === 'database') {
        searchDbArticles({ period: v });
      } else if (activeTab === 'qiita-search') {
        searchQiita({ period: v });
      } else if (activeTab === 'qiita-trending') {
        fetchTrendingArticles(v);
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

  const fetchTrendingArticles = (p?: string) => {
    const periodParam = p ?? period;
    setLoading(true);
    setArticles([]);
    const url = `http://localhost:8080/api/qiita/hot?period=${periodParam}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        setArticles(sorted);
      })
      .catch(err => console.error("Trending Fetch Error:", err))
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

    const url = `http://localhost:8080/api/qiita/search?keyword=${encodeURIComponent(kw)}&sort=${s}&period=${p}`;
    setLoading(true);
    setArticles([]);
    fetch(url)
      .then(res => res.json())
      .then(data => {
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

  const handleDeleteArticle = (e: React.MouseEvent, articleId: number) => {
    e.stopPropagation();
    if (confirm('この記事を削除しますか？')) {
      fetch(`http://localhost:8080/api/articles/${articleId}`, {
        method: 'DELETE',
      })
      .then(res => {
        if (res.ok) {
          setArticles(articles.filter((a: any) => a.id !== articleId));
        } else {
          alert('削除に失敗しました');
        }
      })
      .catch(err => {
        console.error("Delete Error:", err);
        alert('削除中にエラーが発生しました');
      });
    }
  };

  useEffect(() => {
    setArticles([]);
    setKeyword('');
    setLoading(false);
    
    if (activeTab === 'database') {
      fetchDbArticles();
    } else if (activeTab === 'qiita-trending') {
      fetchTrendingArticles();
    }
  }, [activeTab]);

  return (
    <div className="w-full h-full bg-[#0F172A] flex flex-col">
      <div className="flex border-b border-slate-800">
        <button 
          onClick={() => {
            setArticles([]);
            setKeyword('');
            setLoading(false);
            setActiveTab('database');
          }}
          className={`px-4 py-3 text-xs font-bold transition-colors border-b-2 ${activeTab === 'database' ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
        >
          DATABASE
        </button>
        <button 
          onClick={() => {
            setArticles([]);
            setKeyword('');
            setLoading(false);
            setActiveTab('qiita-search');
          }}
          className={`px-4 py-3 text-xs font-bold transition-colors border-b-2 ${activeTab === 'qiita-search' ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
        >
          Qiita: 検索
        </button>
        <button 
          onClick={() => {
            setArticles([]);
            setKeyword('');
            setLoading(false);
            setActiveTab('qiita-trending');
          }}
          className={`px-4 py-3 text-xs font-bold transition-colors border-b-2 ${activeTab === 'qiita-trending' ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 hover:text-slate-300 border-transparent'}`}
        >
          トレンド
        </button>
      </div>

      {(activeTab === 'qiita-search' || activeTab === 'database') && (
        <div className="border-b border-slate-800 bg-slate-900/30">
          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-wait"
                placeholder={activeTab === 'database' ? "Search DB articles..." : "Search Qiita articles..."}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (activeTab === 'database' ? searchDbArticles() : searchQiita())}
                disabled={loading}
              />
              <button onClick={() => activeTab === 'database' ? searchDbArticles() : searchQiita()} disabled={loading} className={`bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold transition-colors ${loading ? 'opacity-60 cursor-wait' : 'hover:bg-indigo-500'}`}>
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                ) : 'Go'}
              </button>
            </div>
            
            <div className="flex gap-2">
              <select 
                value={sort} 
                onChange={(e) => handleSortChange(e.target.value as any)}
                disabled={loading}
                className="flex-1 bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1.5 outline-none disabled:opacity-60 disabled:cursor-wait"
              >
                <option value="rel">関連度順</option>
                {activeTab === 'database' && <option value="count">新着順</option>}
                {activeTab === 'qiita-search' && (
                  <>
                    <option value="count">いいね順</option>
                    <option value="created">新着順</option>
                  </>
                )}
              </select>

              <select 
                value={period} 
                onChange={(e) => handlePeriodChange(e.target.value as any)}
                disabled={loading}
                className="flex-1 bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1.5 outline-none disabled:opacity-60 disabled:cursor-wait"
              >
                <option value="all">全期間</option>
                <option value="week">1週間以内</option>
                <option value="month">1ヶ月以内</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'qiita-trending' && (
        <div className="border-b border-slate-800 bg-slate-900/30 p-3">
          <select 
            value={period} 
            onChange={(e) => handlePeriodChange(e.target.value as any)}
            disabled={loading}
            className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1.5 outline-none disabled:opacity-60 disabled:cursor-wait"
          >
            <option value="all">全期間</option>
            <option value="week">1週間以内</option>
            <option value="month">1ヶ月以内</option>
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && articles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-500">読み込み中...</div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-500">記事が見つかりません</div>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {articles.map((article: any) => (
              <div 
                key={article.id} 
                onClick={() => onSelectArticle(article)}
                className="p-3 bg-slate-800/50 hover:bg-slate-700 rounded cursor-pointer transition-colors group relative"
              >
                <div className="flex gap-2 items-start">
                  {activeTab === 'database' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-900/50 text-blue-300 flex-shrink-0 h-fit">
                      DB
                    </span>
                  )}
                  {(activeTab === 'qiita-search' || activeTab === 'qiita-trending') && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-green-900/50 text-green-300 flex-shrink-0 h-fit">
                      Qiita
                    </span>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-indigo-300 line-clamp-2 group-hover:text-indigo-200">
                      {article.title || article.name || 'No title'}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                  {article.url || article.link || ''}
                </p>
                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                  {article.likes_count !== undefined && <span>❤️ {article.likes_count}</span>}
                  {article.views !== undefined && <span>👁 {article.views}</span>}
                  {article.created_at && <span>{new Date(article.created_at).toLocaleDateString()}</span>}
                </div>
                {activeTab === 'database' && (
                  <button 
                    onClick={(e) => handleDeleteArticle(e, article.id)}
                    className="absolute top-2 right-2 p-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
