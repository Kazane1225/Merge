'use client';

import { useState, useEffect } from 'react';
import type { Article, QiitaComment, DevComment } from '../types/article';
import type { TocItem } from '../lib/articleProcessor';
import { API_BASE } from '../lib/api';

interface TranslationCache {
  title: string;
  html: string;
  tocItems: TocItem[];
  comments: QiitaComment[] | DevComment[];
}

function extractTocFromHtml(html: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRe = /<(h[1-6])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = headingRe.exec(html)) !== null) {
    const tag = match[1];
    const id = match[2];
    const text = match[3].replace(/<[^>]*>/g, '').trim();
    const level = parseInt(tag[1], 10);
    if (text) toc.push({ id, text, level });
  }
  return toc;
}

export interface UseTranslationResult {
  isTranslated: boolean;
  isTranslating: boolean;
  error: string | null;
  targetLang: 'JA' | 'EN';
  toggle: () => void;
  translatedTitle: string | null;
  translatedHtml: string | null;
  translatedTocItems: TocItem[] | null;
  translatedComments: QiitaComment[] | DevComment[] | null;
}

export function useTranslation(
  article: Article | null,
  processedHtml: string,
  comments: QiitaComment[] | DevComment[],
): UseTranslationResult {
  const [isTranslated, setIsTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<TranslationCache | null>(null);

  // 記事が切り替わったらリセット
  useEffect(() => {
    setIsTranslated(false);
    setCache(null);
    setError(null);
  }, [article?.url]);

  // Qiita → 英語へ翻訳、それ以外 → 日本語へ翻訳
  const targetLang: 'JA' | 'EN' = article?.url?.includes('qiita.com') ? 'EN' : 'JA';

  const toggle = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }
    // キャッシュがあればそのまま表示
    if (cache) {
      setIsTranslated(true);
      return;
    }
    if (!processedHtml || isTranslating) return;

    setIsTranslating(true);
    setError(null);

    try {
      // [0] = タイトル, [1] = 記事HTML, [2..n] = コメント本文HTML
      const commentBodiesRaw = comments.map(c => {
        const qc = c as QiitaComment;
        const dc = c as DevComment;
        return qc.rendered_body ?? dc.body_html ?? qc.body ?? dc.body ?? '';
      });

      const texts = [article!.title ?? '', processedHtml, ...commentBodiesRaw];

      const res = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, targetLang, tagHandling: true }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { translations: string[] };
      const [transTitle, transHtml, ...transCommentBodies] = data.translations;

      // コメントに翻訳本文をマージ
      const translatedComments = comments.map((c, i) => {
        const body = transCommentBodies[i] ?? '';
        if ('rendered_body' in c) {
          return { ...(c as QiitaComment), rendered_body: body };
        }
        return { ...(c as DevComment), body_html: body };
      });

      setCache({
        title: transTitle ?? '',
        html: transHtml,
        tocItems: extractTocFromHtml(transHtml),
        comments: translatedComments as QiitaComment[] | DevComment[],
      });
      setIsTranslated(true);
    } catch {
      setError('翻訳に失敗しました。しばらく経ってから再試行してください。');
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    isTranslated,
    isTranslating,
    error,
    targetLang,
    toggle,
    translatedTitle: isTranslated ? (cache?.title ?? null) : null,
    translatedHtml: isTranslated ? (cache?.html ?? null) : null,
    translatedTocItems: isTranslated ? (cache?.tocItems ?? null) : null,
    translatedComments: isTranslated ? (cache?.comments ?? null) : null,
  };
}
