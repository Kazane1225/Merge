'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../lib/api';
import type { Article, QiitaTag, HistoryEntry } from '../types/article';
import { getArticleSource, getBadgeClasses, getSourceLabel } from '../lib/articleHelpers';

type Period = '1day' | 'week' | 'month';

const FEED_LIMIT = 15;
const RANKING_LIMIT = 20;

interface HomeViewProps {
  onSelectArticle: (article: Article) => void;
  onOpenSearch: () => void;
  history: HistoryEntry[];
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

// ── History card (compact, for horizontal scroll) ─────────────

function HistoryCard({ article, onSelect }: { article: Article; onSelect: () => void }) {
  const source = getArticleSource(article);
  const cover = article.cover_image ?? article.coverImage;
  const avatar = article.user?.profile_image_url ?? article.user?.profile_image;
  const authorName = article.user?.name ?? article.user?.username ?? article.user?.login ?? 'Unknown';

  return (
    <button
      onClick={onSelect}
      className="flex-shrink-0 w-56 group cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/40 hover:border-indigo-500/60 rounded-xl overflow-hidden transition-all duration-200 text-left"
    >
      {cover ? (
        <div className="h-24 overflow-hidden bg-slate-900">
          <img src={cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="h-1.5 bg-gradient-to-r from-indigo-600/60 via-purple-600/60 to-sky-600/60" />
      )}
      <div className="p-3 flex flex-col gap-1.5">
        <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
          {article.title}
        </h4>
        <div className="flex items-center gap-1.5">
          {avatar ? (
            <img src={avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[8px] font-bold text-white">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-[10px] text-slate-500 truncate">{authorName}</span>
          <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${getBadgeClasses(source)}`}>
            {getSourceLabel(source)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Trend section for a single source ─────────────────────────

function TrendSection({ label, badgeClass, articles, loading, onSelect }: {
  label: string;
  badgeClass: string;
  articles: Article[];
  loading: boolean;
  onSelect: (a: Article) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${badgeClass}`}>{label}</span>
        {!loading && <span className="text-xs text-slate-600">{articles.length}件</span>}
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-slate-600 py-8 text-center">記事が見つかりません</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {articles.map(a => (
            <ArticleCard key={a.id} article={a} onSelect={() => onSelect(a)} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Ranking panel (mixed Qiita + Dev.to) ─────────────────────

function RankingPanel({ articles, loading, onSelect }: {
  articles: Article[];
  loading: boolean;
  onSelect: (a: Article) => void;
}) {
  const ranked = useMemo(
    () => [...articles]
      .sort((a, b) => (b.likes_count ?? b.likesCount ?? 0) - (a.likes_count ?? a.likesCount ?? 0))
      .slice(0, RANKING_LIMIT),
    [articles],
  );

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col py-6 px-4 overflow-y-auto border-l border-slate-800/60 custom-scrollbar">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">♥ 人気ランキング</p>
      <div className="flex flex-col gap-1.5">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-2 animate-pulse py-1.5">
                <div className="w-4 h-4 bg-slate-700/50 rounded flex-shrink-0" />
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
    </aside>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function HomeView({ onSelectArticle, onOpenSearch, history, className = '' }: HomeViewProps) {
  const [period, setPeriod] = useState<Period>('week');
  const [qiitaArticles, setQiitaArticles] = useState<Article[]>([]);
  const [devArticles, setDevArticles] = useState<Article[]>([]);
  const [loadingQiita, setLoadingQiita] = useState(true);
  const [loadingDev, setLoadingDev] = useState(true);

  useEffect(() => {
    setLoadingQiita(true);
    fetch(`${API_BASE}/qiita/hot?period=${period}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => setQiitaArticles(Array.isArray(data) ? data.slice(0, FEED_LIMIT) : []))
      .catch(() => setQiitaArticles([]))
      .finally(() => setLoadingQiita(false));
  }, [period]);

  useEffect(() => {
    setLoadingDev(true);
    fetch(`${API_BASE}/dev/hot?period=${period}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => setDevArticles(Array.isArray(data) ? data.slice(0, FEED_LIMIT) : []))
      .catch(() => setDevArticles([]))
      .finally(() => setLoadingDev(false));
  }, [period]);

  // Mixed ranking (Qiita + Dev.to sorted by likes)
  const mergedRanking = useMemo(
    () => [...qiitaArticles, ...devArticles],
    [qiitaArticles, devArticles],
  );

  const loading = loadingQiita || loadingDev;

  // Deduplicated recent history
  const recentHistory = useMemo(() => {
    const seen = new Set<string>();
    return history.filter(h => {
      if (seen.has(h.article.url)) return false;
      seen.add(h.article.url);
      return true;
    }).slice(0, 8);
  }, [history]);

  return (
    <div className={`flex h-full overflow-hidden bg-[#0B1120] ${className}`}>
      {/* ── Main feed (scrollable) ── */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl w-full mx-auto px-6 py-8 flex flex-col gap-8">

          {/* ── Hero + Search ── */}
          <div className="flex flex-col items-center gap-4 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-indigo-500/30">M</div>
              <h1 className="text-2xl font-bold text-slate-100">Merge</h1>
            </div>
            <p className="text-sm text-slate-500">記事と知見を、ひとつにマージする</p>
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2.5 text-sm px-5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-indigo-500/50 hover:bg-slate-800 transition-all w-full max-w-md"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              記事を検索…
            </button>
          </div>

          {/* ── Recent History ── */}
          {recentHistory.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">最近読んだ記事</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {recentHistory.map(h => (
                  <HistoryCard
                    key={h.article.url}
                    article={h.article}
                    onSelect={() => onSelectArticle(h.article)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Trend header + period toggle ── */}
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-200">トレンド</h2>
            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg ml-auto">
              {PERIODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${
                    period === value
                      ? 'bg-indigo-600/40 text-indigo-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Qiita Trends ── */}
          <TrendSection
            label="Qiita"
            badgeClass="bg-green-900/80 text-green-200 border-green-700/60"
            articles={qiitaArticles}
            loading={loadingQiita}
            onSelect={onSelectArticle}
          />

          {/* ── Dev.to Trends ── */}
          <TrendSection
            label="Dev.to"
            badgeClass="bg-purple-900/80 text-purple-200 border-purple-700/60"
            articles={devArticles}
            loading={loadingDev}
            onSelect={onSelectArticle}
          />

        </div>
      </main>

      {/* ── Right ranking panel ── */}
      <RankingPanel articles={mergedRanking} loading={loading} onSelect={onSelectArticle} />
    </div>
  );
}
