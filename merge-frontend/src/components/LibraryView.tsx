'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { BookOpen, ChevronDown, ChevronRight, Tag, Library, Search, Clock, Heart } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { getArticleSource, getBadgeClasses, getSourceLabel } from '../lib/articleHelpers';
import type { Article, QiitaTag } from '../types/article';

// ─── ユーティリティ ───────────────────────────────────────────────

function getTagNames(tags?: (QiitaTag | string)[]): string[] {
  if (!tags) return [];
  return tags.map(t => (typeof t === 'string' ? t : t.name)).filter(Boolean);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

// ソースごとの「棚板」アクセントカラー（既存テーマに合わせた indigo / green / purple 系）
function shelfAccentClass(source: string): string {
  switch (source) {
    case 'qiita': return 'border-emerald-600/70 bg-emerald-950/30';
    case 'dev':   return 'border-purple-600/70 bg-purple-950/30';
    default:      return 'border-indigo-600/70 bg-indigo-950/30';
  }
}

function spineAccentClass(source: string): string {
  switch (source) {
    case 'qiita': return 'bg-emerald-700/80 hover:bg-emerald-600';
    case 'dev':   return 'bg-purple-700/80 hover:bg-purple-600';
    default:      return 'bg-indigo-700/80 hover:bg-indigo-600';
  }
}

// ─── 型 ─────────────────────────────────────────────────────────

interface ShelfSection {
  tag: string;
  articles: Article[];
}

interface LibraryViewProps {
  onSelectArticle: (article: Article) => void;
  className?: string;
}

// ─── 本の背表紙カード ──────────────────────────────────────────

function BookSpine({
  article,
  onSelect,
}: {
  article: Article;
  onSelect: () => void;
}) {
  const source = getArticleSource(article);
  const likes = article.likes_count ?? article.likesCount ?? 0;
  const date = article.created_at ?? article.published_at;

  return (
    <button
      onClick={onSelect}
      title={article.title}
      className={clsx(
        'group relative w-full text-left rounded-lg border-l-4 px-4 py-3 transition-all duration-150',
        'bg-slate-800/50 hover:bg-slate-700/70 border-slate-700/40 hover:border-indigo-400/60',
        'hover:shadow-lg hover:shadow-indigo-950/40 hover:-translate-x-0.5',
      )}
    >
      {/* ソースバッジ */}
      <span
        className={clsx(
          'inline-flex items-center text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border mb-1.5',
          getBadgeClasses(source),
        )}
      >
        {getSourceLabel(source)}
      </span>

      {/* タイトル（2行まで） */}
      <p className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
        {article.title || 'Untitled'}
      </p>

      {/* メタ情報 */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
        {likes > 0 && (
          <span className="flex items-center gap-1">
            <Heart className="w-2.5 h-2.5" />
            {likes}
          </span>
        )}
        {date && (
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDate(date)}
          </span>
        )}
      </div>

      {/* ホバー時の読む矢印 */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <BookOpen className="w-4 h-4 text-indigo-400" />
      </div>
    </button>
  );
}

// ─── 棚（タグ別セクション） ────────────────────────────────────

function ShelfRow({
  section,
  onSelectArticle,
  indexRef,
}: {
  section: ShelfSection;
  onSelectArticle: (a: Article) => void;
  indexRef?: (el: HTMLDivElement | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const firstSource = section.articles[0] ? getArticleSource(section.articles[0]) : 'database';

  return (
    <div ref={indexRef} className="scroll-mt-4">
      {/* ── 棚板ヘッダー ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={clsx(
          'w-full flex items-center gap-3 px-5 py-3 rounded-t-lg border-l-4 transition-colors',
          shelfAccentClass(firstSource),
          'hover:brightness-110',
        )}
      >
        {open
          ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        }
        <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <span className="font-bold text-sm text-slate-200 tracking-wide">{section.tag}</span>
        <span className="ml-auto text-xs text-slate-500 font-mono">{section.articles.length} 冊</span>
      </button>

      {/* ── 棚板の本一覧 ── */}
      {open && (
        <div
          className={clsx(
            'border border-t-0 rounded-b-lg px-4 pt-3 pb-4',
            'border-slate-700/40 bg-slate-900/40',
          )}
        >
          {/* 棚板ライン（木目イメージ） */}
          <div className="h-px bg-gradient-to-r from-transparent via-slate-600/60 to-transparent mb-3" />
          <div className="grid grid-cols-1 gap-2">
            {section.articles.map(article => (
              <BookSpine
                key={String(article.id ?? article.url)}
                article={article}
                onSelect={() => onSelectArticle(article)}
              />
            ))}
          </div>
          {/* 棚下板 */}
          <div className="h-1.5 mt-4 rounded bg-gradient-to-r from-slate-700/60 via-slate-600/80 to-slate-700/60 shadow-sm" />
        </div>
      )}
    </div>
  );
}

// ─── ライブラリビュー本体 ─────────────────────────────────────

export default function LibraryView({ onSelectArticle, className }: LibraryViewProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const shelfRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // DB 保存記事を取得
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/articles`);
        if (res.ok) setArticles(await res.json());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // タグ別に記事を分類（タグなし記事は「未分類」棚へ）
  const shelves = useMemo<ShelfSection[]>(() => {
    const filtered = searchQuery
      ? articles.filter(a =>
          a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          getTagNames(a.tags).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : articles;

    const tagMap = new Map<string, Article[]>();

    for (const article of filtered) {
      const tags = getTagNames(article.tags);
      if (tags.length === 0) {
        const bucket = tagMap.get('未分類') ?? [];
        bucket.push(article);
        tagMap.set('未分類', bucket);
      } else {
        for (const tag of tags) {
          const bucket = tagMap.get(tag) ?? [];
          bucket.push(article);
          tagMap.set(tag, bucket);
        }
      }
    }

    // 記事数の多い棚を上に（未分類は最後）
    return Array.from(tagMap.entries())
      .sort(([tagA, a], [tagB, b]) => {
        if (tagA === '未分類') return 1;
        if (tagB === '未分類') return -1;
        return b.length - a.length;
      })
      .map(([tag, arts]) => ({ tag, articles: arts }));
  }, [articles, searchQuery]);

  // 索引パネルのタグ一覧（検索フィルター後）
  const indexTags = useMemo(() => shelves.map(s => s.tag), [shelves]);

  const scrollToShelf = (tag: string) => {
    shelfRefs.current.get(tag)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className={clsx(className, 'flex items-center justify-center bg-[#0B1120]')}>
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Library className="w-10 h-10 animate-pulse" />
          <p className="text-sm font-mono">蔵書を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={clsx(className, 'flex items-center justify-center bg-[#0B1120]')}>
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <Library className="w-16 h-16 opacity-30" />
          <p className="text-sm">まだ蔵書がありません</p>
          <p className="text-xs text-slate-600">Qiita / Dev.to から記事を保存すると、ここに棚が並びます</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(className, 'flex h-full bg-[#0B1120] overflow-hidden')}>

      {/* ── 左：索引パネル ── */}
      <aside className="hidden lg:flex w-52 flex-shrink-0 flex-col border-r border-slate-800 bg-[#0A1020]">
        {/* ヘッダー */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 mb-4">
            <Library className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100 tracking-tight">ライブラリ</h2>
          </div>
          <p className="text-[11px] text-slate-500">
            {articles.length} 冊 · {indexTags.length} 棚
          </p>
        </div>

        {/* タグ索引 */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-3">
          <p className="px-5 text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">棚一覧</p>
          {indexTags.map(tag => (
            <button
              key={tag}
              onClick={() => scrollToShelf(tag)}
              className="w-full text-left px-5 py-1.5 text-xs text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/40 transition-colors truncate"
            >
              {tag}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── 右：メインエリア ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ヘッダー + 検索 */}
        <div className="flex-shrink-0 px-8 pt-7 pb-5 border-b border-slate-800">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
                <Library className="w-6 h-6 text-indigo-400" />
                蔵書一覧
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                保存した記事をタグ別の棚で管理
              </p>
            </div>
            {/* 検索バー */}
            <div className="relative ml-auto w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="タイトル・タグで絞り込み..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-800/60 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:bg-slate-800 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* 棚エリア */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
          {shelves.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <Search className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">「{searchQuery}」に一致する蔵書が見つかりません</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {shelves.map(section => (
                <ShelfRow
                  key={section.tag}
                  section={section}
                  onSelectArticle={onSelectArticle}
                  indexRef={el => {
                    if (el) shelfRefs.current.set(section.tag, el);
                    else shelfRefs.current.delete(section.tag);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
