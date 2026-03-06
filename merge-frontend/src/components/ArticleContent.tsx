'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Article } from '../types/article';
import { getArticleSource } from '../lib/articleHelpers';
import { useArticleHtml } from '../hooks/useArticleHtml';
import { useArticleComments } from '../hooks/useArticleComments';
import ArticleHeader from './ArticleHeader';
import ArticleMeta from './ArticleMeta';
import ArticleComments from './ArticleComments';
import TableOfContents from './TableOfContents';
import ArticleBody from './ArticleBody';
import { API_BASE } from '../lib/api';

interface ArticleContentProps {
  article: Article | null;
  className?: string;
  onViewUserArticles?: (article: Article) => void;
  onSelectArticle?: (article: Article) => void;
}

const ArticleContent = React.memo(function ArticleContent({ article, className, onViewUserArticles, onSelectArticle }: ArticleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const tocNavRef = useRef<HTMLElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const headingElementsRef = useRef<HTMLElement[]>([]);
  const activeHeadingIdRef = useRef<string>('');

  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  const { processedHtml, tocItems, readingTime } = useArticleHtml(article, contentRef);
  const { comments, commentsLoading } = useArticleComments(article);

  const source = article ? getArticleSource(article) : 'database';

  // TOC heading要素をキャッシュ
  useEffect(() => {
    if (!contentRef.current || tocItems.length === 0) {
      headingElementsRef.current = [];
      return;
    }
    headingElementsRef.current = tocItems
      .map((item) => contentRef.current?.querySelector(`#${item.id}`))
      .filter(Boolean) as HTMLElement[];
  }, [processedHtml, tocItems]);

  // TOCのアクティブ項目が見えるように自動スクロール
  useEffect(() => {
    if (!activeHeadingId || !tocNavRef.current) return;
    const activeButton = tocNavRef.current.querySelector(`button[data-heading-id="${activeHeadingId}"]`);
    activeButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeHeadingId]);

  // RAF クリーンアップ
  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);

    scrollRafRef.current = requestAnimationFrame(() => {
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? (element.scrollTop / scrollHeight) * 100 : 0;
      if (progressRef.current) progressRef.current.style.width = `${progress}%`;

      if (tocItems.length > 0 && contentRef.current) {
        const headings = headingElementsRef.current;
        const offset = 100;
        const containerRect = contentRef.current.getBoundingClientRect();
        let currentId = '';
        for (let i = headings.length - 1; i >= 0; i--) {
          const rect = headings[i].getBoundingClientRect();
          if (rect.top - containerRect.top <= offset) {
            currentId = headings[i].id;
            break;
          }
        }
        if (currentId !== activeHeadingIdRef.current) {
          activeHeadingIdRef.current = currentId;
          setActiveHeadingId(currentId);
        }
      }
    });
  };

  // 本文内のQiitaリンクをアプリ内で開く
  useEffect(() => {
    if (!contentRef.current || !processedHtml || !onSelectArticle) return;
    const container = contentRef.current;
    const qiitaItemRe = /https:\/\/qiita\.com\/[^/]+\/items\/([a-f0-9]+)/;

    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      const match = href.match(qiitaItemRe);
      if (!match) return;
      e.preventDefault();
      const itemId = match[1];
      fetch(`${API_BASE}/qiita/article/${itemId}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => onSelectArticle(data))
        .catch(() => window.open(href, '_blank', 'noopener,noreferrer'));
    };

    container.addEventListener('click', handleLinkClick);
    return () => container.removeEventListener('click', handleLinkClick);
  }, [processedHtml, onSelectArticle]);

  const scrollToHeading = (id: string) => {
    if (!contentRef.current) return;
    const heading = contentRef.current.querySelector(`#${id}`);
    if (heading) {
      const containerRect = contentRef.current.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const offset = headingRect.top - containerRect.top + contentRef.current.scrollTop - 80;
      contentRef.current.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={contentRef}
      onScroll={handleScroll}
      className={clsx('overflow-y-auto scroll-smooth relative w-full h-full', className)}
    >
      {/* スクロール進捗バー */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-800/50 z-50">
        <div
          ref={progressRef}
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-150"
          style={{ width: '0%' }}
        />
      </div>

      <div className="flex min-h-full">
        {/* メインコンテンツ */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-5xl px-6 lg:px-8 py-8">
            {article ? (
              <div className="w-full">
                <ArticleHeader article={article} />
                <ArticleMeta article={article} readingTime={readingTime} onViewUserArticles={onViewUserArticles} />

                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 hover:underline break-all font-mono text-sm mb-8 group"
                >
                  <svg className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>{article.url}</span>
                </a>

                <ArticleBody processedHtml={processedHtml} />

                <ArticleComments
                  source={source}
                  articleId={article.id}
                  comments={comments}
                  commentsLoading={commentsLoading}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md space-y-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                    <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">記事を選択してください</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      左側のサイドバーから記事を検索・選択すると、<br />
                      ここに記事の詳細が表示されます
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                    <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded">K</kbd>
                    <span className="ml-2">で検索</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 目次サイドバー */}
        {article && (
          <TableOfContents
            tocItems={tocItems}
            activeHeadingId={activeHeadingId}
            onHeadingClick={scrollToHeading}
            navRef={tocNavRef}
          />
        )}
      </div>
    </div>
  );
});

export default ArticleContent;
