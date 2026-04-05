'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE } from '../lib/api';
import { fetchArticleDetail } from '../lib/articleApi';
import type { Article, QiitaTag } from '../types/article';
import { getArticleSource, getBadgeClasses, getSourceLabel } from '../lib/articleHelpers';
import ArticleContent from './article/ArticleContent';

type Period = '1day' | 'week' | 'month';
type SourceFilter = 'all' | 'qiita' | 'dev';

interface HomeViewProps {
  onSelectArticle: (article: Article) => void;
  onOpenSearch: () => void;
  className?: string;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: '1day', label: '今日' },
  { value: 'week', label: '今週' },
  { value: 'month', label: '今月' },
];

const TAG_COLORS = [
  'text-indigo-300 bg-indigo-900/40 border-indigo-700/50',
  'text-purple-300 bg-purple-900/40 border-purple-700/50',
  'text-sky-300 bg-sky-900/40 border-sky-700/50',
  'text-emerald-300 bg-emerald-900/40 border-emerald-700/50',
  'text-amber-300 bg-amber-900/40 border-amber-700/50',
];

function tagColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return TAG_COLORS[hash % TAG_COLORS.length];
}

function getTagNames(tags?: (QiitaTag | string)[]): string[] {
  if (!tags) return [];
  return tags.slice(0, 3).map(t => (typeof t === 'string' ? t : t.name));
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}日前`;
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

function ArticleCard({ article, onSelect }: { article: Article; onSelect: () => void }) {
  const source = getArticleSource(article);
  const date = article.created_at ?? article.published_at;
  const likes = article.likes_count ?? article.likesCount ?? 0;
  const cover = article.cover_image ?? article.coverImage;
  const avatar = article.user?.profile_image_url ?? article.user?.profile_image;
  const authorName = article.user?.name ?? article.user?.username ?? article.user?.login ?? 'Unknown';
  const tags = getTagNames(article.tags);

  return (
    <article
      onClick={onSelect}
      className="group cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-indigo-500/60 rounded-xl overflow-hidden transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-0.5"
    >
      {cover ? (
        <div className="h-36 overflow-hidden bg-slate-900">
          <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="h-2 bg-gradient-to-r from-indigo-600/60 via-purple-600/60 to-sky-600/60" />
      )}
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {avatar ? (
            <img src={avatar} alt={authorName} className="w-6 h-6 rounded-full flex-shrink-0 object-cover ring-1 ring-slate-600" />
          ) : (
            <div className="w-6 h-6 rounded-full flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-slate-400 truncate font-medium">{authorName}</span>
          {date && <span className="text-xs text-slate-600 flex-shrink-0 ml-auto">{formatDate(date)}</span>}
        </div>
        <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors leading-snug line-clamp-2">
          {article.title}
        </h3>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded border font-medium ${tagColor(tag)}`}>#{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span className="text-pink-400">♥</span>
            <span>{likes.toLocaleString()}</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getBadgeClasses(source)}`}>
            {getSourceLabel(source)}
          </span>
        </div>
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/30 animate-pulse">
      <div className="h-2 bg-slate-700/50" />
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-700/60" />
          <div className="h-3 bg-slate-700/60 rounded w-24" />
        </div>
        <div className="h-4 bg-slate-700/60 rounded w-full" />
        <div className="h-4 bg-slate-700/60 rounded w-3/4" />
        <div className="flex gap-1.5">
          <div className="h-4 bg-slate-700/40 rounded w-12" />
          <div className="h-4 bg-slate-700/40 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

// ── Left panel ────────────────────────────────────────────────

interface LeftPanelProps {
  period: Period;
  onPeriod: (p: Period) => void;
  source: SourceFilter;
  onSource: (s: SourceFilter) => void;
  activeTag: string | null;
  onTag: (t: string | null) => void;
  hotTags: { name: string; count: number }[];
  onOpenSearch: () => void;
}

function LeftPanel({ period, onPeriod, source, onSource, activeTag, onTag, hotTags, onOpenSearch }: LeftPanelProps) {
  return (
    <aside className="w-52 flex-shrink-0 flex flex-col gap-6 py-6 px-4 overflow-y-auto border-r border-slate-800/60">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-indigo-500/30">M</div>
        <span className="text-sm font-bold text-slate-200">Merge</span>
      </div>

      {/* Search */}
      <button
        onClick={onOpenSearch}
        className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-indigo-500/50 transition-all w-full"
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        検索・保存記事
      </button>

      {/* Period */}
      <div>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">期間</p>
        <div className="flex flex-col gap-1">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onPeriod(value)}
              className={`text-left text-xs px-3 py-2 rounded-lg transition-all font-medium ${
                period === value
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-600/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Source */}
      <div>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">ソース</p>
        <div className="flex flex-col gap-1">
          {([['all', 'すべて'], ['qiita', 'Qiita'], ['dev', 'Dev.to']] as [SourceFilter, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => onSource(v)}
              className={`text-left text-xs px-3 py-2 rounded-lg transition-all font-medium ${
                source === v
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-600/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hot tags */}
      {hotTags.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">人気タグ</p>
          <div className="flex flex-col gap-1">
            {hotTags.map(({ name, count }) => (
              <button
                key={name}
                onClick={() => onTag(activeTag === name ? null : name)}
                className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg transition-all ${
                  activeTag === name
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-600/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>#{name}</span>
                <span className="text-[10px] text-slate-600">{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

// ── Right panel ───────────────────────────────────────────────

interface RightPanelProps {
  articles: Article[];
  loading: boolean;
  onSelect: (a: Article) => void;
}

function RightPanel({ articles, loading, onSelect }: RightPanelProps) {
  const ranked = useMemo(
    () => [...articles].sort((a, b) => (b.likes_count ?? b.likesCount ?? 0) - (a.likes_count ?? a.likesCount ?? 0)).slice(0, 8),
    [articles]
  );

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col gap-5 py-6 px-4 overflow-y-auto border-l border-slate-800/60">
      <div>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">♥ 人気ランキング</p>
        <div className="flex flex-col gap-2">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-2 animate-pulse">
                  <div className="w-5 h-5 bg-slate-700/50 rounded flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3 bg-slate-700/60 rounded w-full" />
                    <div className="h-3 bg-slate-700/40 rounded w-2/3" />
                  </div>
                </div>
              ))
            : ranked.map((a, i) => {
                const source = getArticleSource(a);
                const likes = a.likes_count ?? a.likesCount ?? 0;
                const rankColor = i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600';
                return (
                  <button
                    key={`${source}-${a.id}`}
                    onClick={() => onSelect(a)}  
                    className="flex items-start gap-2.5 text-left group hover:bg-slate-800/50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                  >
                    <span className={`text-xs font-black w-4 flex-shrink-0 mt-0.5 ${rankColor}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug font-medium">
                        {a.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase ${getBadgeClasses(source)}`}>
                          {getSourceLabel(source)}
                        </span>
                        <span className="text-[10px] text-slate-600">♥ {likes.toLocaleString()}</span>
                      </div>
                    </div>
                  </button>
                );
              })
          }
        </div>
      </div>
    </aside>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function HomeView({ onSelectArticle, onOpenSearch, className = '' }: HomeViewProps) {
  const [period, setPeriod] = useState<Period>('week');
  const [source, setSource] = useState<SourceFilter>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [qiitaArticles, setQiitaArticles] = useState<Article[]>([]);
  const [devArticles, setDevArticles] = useState<Article[]>([]);
  const [loadingQiita, setLoadingQiita] = useState(true);
  const [loadingDev, setLoadingDev] = useState(true);
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleCardClick = useCallback(async (article: Article) => {
    setLoadingPreview(true);
    setPreviewArticle(article); // 先にセットしてローディング表示
    const detail = await fetchArticleDetail(article);
    setPreviewArticle(detail);
    setLoadingPreview(false);
  }, []);

  const handleBackToFeed = useCallback(() => {
    setPreviewArticle(null);
    setLoadingPreview(false);
  }, []);

  useEffect(() => {
    setLoadingQiita(true);
    fetch(`${API_BASE}/qiita/hot?period=${period}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => setQiitaArticles(Array.isArray(data) ? data.slice(0, 15) : []))
      .catch(() => setQiitaArticles([]))
      .finally(() => setLoadingQiita(false));
  }, [period]);

  useEffect(() => {
    setLoadingDev(true);
    fetch(`${API_BASE}/dev/hot?period=${period}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => setDevArticles(Array.isArray(data) ? data.slice(0, 15) : []))
      .catch(() => setDevArticles([]))
      .finally(() => setLoadingDev(false));
  }, [period]);

  // いいね数でソートして真にミックス（ソースで左右に分かれないように）
  const mergedFeed = useMemo(() => {
    return [...qiitaArticles, ...devArticles].sort(
      (a, b) => (b.likes_count ?? b.likesCount ?? 0) - (a.likes_count ?? a.likesCount ?? 0)
    );
  }, [qiitaArticles, devArticles]);

  // ソース・タグフィルター適用後フィード
  const filteredFeed = useMemo(() => {
    let feed = mergedFeed;
    if (source !== 'all') feed = feed.filter(a => getArticleSource(a) === source);
    if (activeTag) feed = feed.filter(a => getTagNames(a.tags).some(t => t.toLowerCase() === activeTag.toLowerCase()));
    return feed;
  }, [mergedFeed, source, activeTag]);

  // 人気タグ集計
  const hotTags = useMemo(() => {
    const counts: Record<string, number> = {};
    mergedFeed.forEach(a => getTagNames(a.tags).forEach(t => { counts[t] = (counts[t] ?? 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [mergedFeed]);

  const loading = loadingQiita || loadingDev;

  // ── インライン記事プレビュー表示 ──
  if (previewArticle) {
    return (
      <div className={`flex flex-col h-full overflow-hidden bg-[#0B1120] ${className}`}>
        {/* 戻るバー */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 bg-[#0F172A]">
          <button
            onClick={handleBackToFeed}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            トレンドに戻る
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-xs text-slate-500 truncate">{previewArticle.title}</span>
        </div>
        {/* 記事本文 */}
        <ArticleContent
          article={loadingPreview ? null : previewArticle}
          className="flex-1"
          onSelectArticle={handleCardClick}
        />
      </div>
    );
  }

  return (
    <div className={`flex h-full overflow-hidden bg-[#0B1120] ${className}`}>

      {/* ── Left panel ── */}
      <LeftPanel
        period={period}
        onPeriod={p => { setPeriod(p); setActiveTag(null); }}
        source={source}
        onSource={setSource}
        activeTag={activeTag}
        onTag={setActiveTag}
        hotTags={hotTags}
        onOpenSearch={onOpenSearch}
      />

      {/* ── Center feed ── */}
      <main className="flex-1 overflow-y-auto py-6 px-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {/* Title bar */}
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-sm font-bold text-slate-200">
            {source === 'all' ? 'トレンド' : source === 'qiita' ? 'Qiita トレンド' : 'Dev.to トレンド'}
            {activeTag && <span className="ml-2 text-indigo-400">#{activeTag}</span>}
          </h2>
          {!loading && (
            <span className="text-xs text-slate-600">{filteredFeed.length}件</span>
          )}
          {activeTag && (
            <button onClick={() => setActiveTag(null)} className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors">
              × フィルター解除
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="text-center text-slate-600 text-sm py-24">記事が見つかりません</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredFeed.map(a => (
              <ArticleCard key={`${getArticleSource(a)}-${a.id}`} article={a} onSelect={() => handleCardClick(a)} />
            ))}
          </div>
        )}
      </main>

      {/* ── Right panel ── */}
      <RightPanel articles={mergedFeed} loading={loading} onSelect={onSelectArticle} />

    </div>
  );
}
