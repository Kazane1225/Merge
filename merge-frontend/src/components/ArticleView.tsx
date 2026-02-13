'use client';

import { useEffect, useState, useRef } from 'react';

const API_BASE = 'http://localhost:8080/api';

export default function ArticleView({ onSelectArticle }: { onSelectArticle: (a: any) => void }) {
  const [activeMain, setActiveMain] = useState<'database' | 'qiita' | 'dev'>('database');
  const [activeSub, setActiveSub] = useState<'search' | 'trending' | 'timeline'>('search');
  const [articles, setArticles] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState<'rel' | 'count' | 'created'>('rel');
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all');
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSort = (v: typeof sort) => {
    setSort(v);
  };

  const handlePeriod = (v: typeof period) => {
    setPeriod(v);
  };

  const resetState = () => {
    setArticles([]);
    setKeyword('');
    setLoading(false);
  };

  const fetchArticles = (opts?: { sort?: typeof sort; period?: typeof period; keyword?: string }) => {
    const s = opts?.sort ?? sort;
    const p = opts?.period ?? period;
    const kw = opts?.keyword ?? keyword;

    setLoading(true);
    setArticles([]);

    // 前の fetch をキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 新しい AbortController を作成
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let url = '';
    if (activeMain === 'database') {
      if (activeSub === 'search') {
        url = `${API_BASE}/articles/search?keyword=${encodeURIComponent(kw)}&sort=${s}&period=${p}`;
      } else {
        url = `${API_BASE}/articles`;
      }
    } else if (activeMain === 'qiita') {
      if (activeSub === 'search') {
        url = `${API_BASE}/qiita/search?keyword=${encodeURIComponent(kw)}&sort=${s}&period=${p}`;
      } else if (activeSub === 'trending') {
        url = `${API_BASE}/qiita/hot?period=${p}`;
      } else {
        url = `${API_BASE}/qiita/timeline`;
      }
    } else {
      if (activeSub === 'search') {
        url = `${API_BASE}/dev/search?keyword=${encodeURIComponent(kw)}&sort=${s}&period=${p}`;
      } else if (activeSub === 'trending') {
        url = `${API_BASE}/dev/hot?period=${p}`;
      } else {
        url = `${API_BASE}/dev/timeline`;
      }
    }

    fetch(url, { signal: abortController.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        let sorted = [...data];
        if (s === 'count') {
          sorted.sort((a, b) => 
            (b.likes_count ?? b.positive_reactions_count ?? 0) - 
            (a.likes_count ?? a.positive_reactions_count ?? 0)
          );
        } else if (s === 'created') {
          sorted.sort((a, b) => 
            new Date(b.created_at ?? b.published_at ?? 0).getTime() - 
            new Date(a.created_at ?? a.published_at ?? 0).getTime()
          );
        }
        console.log('API Response:', sorted);
        setArticles(sorted);
      })
      .catch(err => {
        // AbortError は無視（キャンセルされたリクエスト）
        if (err.name !== 'AbortError') {
          console.error('Fetch error:', err);
        }
      })
      .finally(() => setLoading(false));
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('この記事を削除しますか？')) return;

    fetch(`${API_BASE}/articles/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          setArticles(articles.filter(a => a.id !== id));
        } else {
          alert('削除に失敗しました');
        }
      })
      .catch(() => alert('削除中にエラーが発生しました'));
  };

  const switchTab = (main: typeof activeMain, sub?: typeof activeSub) => {
    setActiveMain(main);
    if (sub) setActiveSub(sub);
    resetState();
  };

  useEffect(() => {
    resetState();
  }, [activeMain, activeSub]);

  // cleanup: コンポーネント アンマウント時に pending requests をキャンセル
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const showSearch = (activeMain === 'qiita' || activeMain === 'dev' || activeMain === 'database') && activeSub === 'search';
  const showTrendingFilter = (activeMain === 'qiita' || activeMain === 'dev') && activeSub === 'trending';
  const showSimpleGo = (activeMain === 'qiita' || activeMain === 'dev') && activeSub === 'timeline';

  return (
    <div className="w-full h-full bg-[#0F172A] flex flex-col">
      {/* メインタブ */}
      <div className="flex border-b border-slate-800 bg-slate-900/50">
        {['database', 'qiita', 'dev'].map(tab => (
          <button
            key={tab}
            onClick={() => switchTab(tab as typeof activeMain, 'search')}
            className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
              activeMain === tab
                ? 'text-indigo-400 border-indigo-400'
                : 'text-slate-500 hover:text-slate-300 border-transparent'
            }`}
          >
            {tab === 'database' ? 'Database' : tab === 'qiita' ? 'Qiita' : 'Dev.to'}
          </button>
        ))}
      </div>

      {/* サブタブ */}
      {(activeMain === 'qiita' || activeMain === 'dev') && (
        <div className="flex border-b border-slate-800 bg-slate-800/30 px-4">
          {['search', 'trending', 'timeline'].map(sub => (
            <button
              key={sub}
              onClick={() => switchTab(activeMain, sub as typeof activeSub)}
              className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                activeSub === sub
                  ? 'text-indigo-300 border-indigo-300'
                  : 'text-slate-400 hover:text-slate-300 border-transparent'
              }`}
            >
              {sub === 'search' ? '検索' : sub === 'trending' ? 'トレンド' : 'タイムライン'}
            </button>
          ))}
        </div>
      )}

      {/* 検索フォーム */}
      {showSearch && (
        <div className="border-b border-slate-800 bg-slate-900/30">
          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none disabled:opacity-60"
                placeholder={activeMain === 'database' ? 'Search DB articles...' : 'Search articles...'}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchArticles()}
                disabled={loading}
              />
              <button
                onClick={() => fetchArticles()}
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-500 disabled:opacity-60"
              >
                {loading ? <Spinner /> : 'Go'}
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={sort}
                onChange={(e) => handleSort(e.target.value as any)}
                disabled={loading}
                className="flex-1 bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1.5 outline-none disabled:opacity-60"
              >
                <option value="rel">関連度順</option>
                <option value="count">{activeMain === 'database' ? '新着順' : activeMain === 'qiita' ? 'いいね順' : '反応順'}</option>
                <option value="created">新着順</option>
              </select>

              <select
                value={period}
                onChange={(e) => handlePeriod(e.target.value as any)}
                disabled={loading}
                className="flex-1 bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1.5 outline-none disabled:opacity-60"
              >
                <option value="all">全期間</option>
                <option value="month">1ヶ月以内</option>
                <option value="week">1週間以内</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* トレンドフィルター */}
      {showTrendingFilter && (
        <div className="border-b border-slate-800 bg-slate-900/30 p-3">
          <div className="space-y-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              disabled={loading}
              className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1.5 outline-none disabled:opacity-60"
            >
              <option value="all">全期間</option>
              <option value="month">1ヶ月以内</option>
              <option value="week">1週間以内</option>
            </select>
            <button
              onClick={() => fetchArticles()}
              disabled={loading}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading ? <Spinner /> : 'Go'}
            </button>
          </div>
        </div>
      )}

      {/* Timeline用Goボタン */}
      {showSimpleGo && (
        <div className="border-b border-slate-800 bg-slate-900/30 p-3">
          <button
            onClick={() => fetchArticles()}
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? <Spinner /> : 'Go'}
          </button>
        </div>
      )}

      {/* 記事リスト */}
      <div className="flex-1 overflow-y-auto">
        {loading && articles.length === 0 ? (
          <EmptyState>読み込み中...</EmptyState>
        ) : articles.length === 0 ? (
          <EmptyState>記事が見つかりません</EmptyState>
        ) : (
          <div className="space-y-3 p-3">
            {articles.map((article: any) => (
              <ArticleCard
                key={article.id}
                article={article}
                source={activeMain}
                onSelect={() => onSelectArticle(article)}
                onDelete={activeMain === 'database' ? (e) => handleDelete(e, article.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const EmptyState = ({ children }: { children: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-slate-500">{children}</div>
  </div>
);

interface ArticleCardProps {
  article: any;
  source: 'database' | 'qiita' | 'dev';
  onSelect: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

const ArticleCard = ({ article, source, onSelect, onDelete }: ArticleCardProps) => {
  const badge = { database: 'DB', qiita: 'Qiita', dev: 'Dev.to' }[source];

  const getBadgeClasses = () => {
    switch (source) {
      case 'qiita':
        return 'bg-green-900/60 text-green-200 border-green-700/50';
      case 'dev':
        return 'bg-purple-900/60 text-purple-200 border-purple-700/50';
      case 'database':
      default:
        return 'bg-blue-900/60 text-blue-200 border-blue-700/50';
    }
  };

  return (
    <div
      onClick={onSelect}
      className="p-4 bg-gradient-to-r from-slate-800/60 to-slate-800/40 hover:from-slate-700/80 hover:to-slate-700/60 border border-slate-700/50 hover:border-indigo-500/50 rounded-lg cursor-pointer transition-all duration-200 group relative shadow-md hover:shadow-lg hover:shadow-indigo-500/10"
    >
      <div className="flex gap-3 items-start">
        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase border flex-shrink-0 h-fit ${getBadgeClasses()}`}>
          {badge}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-100 line-clamp-2 group-hover:text-indigo-300 transition-colors">
            {article.title || article.name || 'No title'}
          </h3>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2 line-clamp-1 truncate">{article.url || article.link || ''}</p>
      <div className="text-xs text-slate-500 mt-2 flex gap-4 flex-wrap">
        {(article.likes_count !== undefined || article.positive_reactions_count !== undefined) && (
          <span>❤️ {article.likes_count ?? article.positive_reactions_count ?? 0}</span>
        )}
        {article.views !== undefined && <span>👁 {article.views}</span>}
        {(article.created_at || article.published_at) && (
          <span>{new Date(article.created_at || article.published_at).toLocaleDateString('ja-JP')}</span>
        )}
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-3 right-3 p-1.5 bg-red-600/30 hover:bg-red-500/60 text-red-300 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-all duration-200 border border-red-600/40"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
          </svg>
        </button>
      )}
    </div>
  );
};
