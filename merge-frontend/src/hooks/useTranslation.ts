'use client';

import { useState, useEffect } from 'react';
import type { Article } from '../types/article';
import type { TocItem } from '../lib/articleProcessor';
import { API_BASE } from '../lib/api';

interface TranslationCache {
  title: string;
  html: string;
  tocItems: TocItem[];
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// 英語翻訳時に残存する日本語引用符を英語引用符に置換する
function normalizeQuotes(text: string, targetLang: 'JA' | 'EN'): string {
  if (targetLang !== 'EN') return text;
  return text.replace(/「/g, '\u201c').replace(/」/g, '\u201d');
}

function extractTocFromHtml(html: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRe = /<(h[1-6])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = headingRe.exec(html)) !== null) {
    const tag = match[1];
    const id = match[2];
    const rawText = match[3].replace(/<[^>]*>/g, '').trim();
    const text = decodeHtmlEntities(rawText);
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
  setTargetLang: (lang: 'JA' | 'EN') => void;
  toggle: () => void;
  translatedTitle: string | null;
  translatedHtml: string | null;
  translatedTocItems: TocItem[] | null;
}

export function useTranslation(
  article: Article | null,
  processedHtml: string,
): UseTranslationResult {
  const [isTranslated, setIsTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 言語ごとにキャッシュを保持（切り替え時に再フェッチ不要）
  const [caches, setCaches] = useState<Partial<Record<'JA' | 'EN', TranslationCache>>>({});

  // 記事が切り替わったらリセット
  useEffect(() => {
    setIsTranslated(false);
    setCaches({});
    setError(null);
  }, [article?.url]);

  // デフォルト: Qiita → 英語へ翻訳、それ以外 → 日本語へ翻訳
  const defaultLang: 'JA' | 'EN' = article?.url?.includes('qiita.com') ? 'EN' : 'JA';
  const [targetLang, setTargetLangState] = useState<'JA' | 'EN'>(defaultLang);

  // 記事が変わったらデフォルト言語に戻す
  useEffect(() => {
    setTargetLangState(defaultLang);
  }, [article?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTargetLang = (lang: 'JA' | 'EN') => {
    if (lang === targetLang) return;
    setTargetLangState(lang);
    // 翻訳表示中なら対象言語のキャッシュに切り替え（なければ原文に戻す）
    if (isTranslated) {
      setIsTranslated(!!caches[lang]);
    }
  };

  const toggle = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }
    // キャッシュがあればそのまま表示
    if (caches[targetLang]) {
      setIsTranslated(true);
      return;
    }
    if (!processedHtml || isTranslating) return;

    setIsTranslating(true);
    setError(null);

    try {
      // 記事（title + html）のみ翻訳（コメントは ArticleComments で独立して翻訳）
      const articleRes = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: [article!.title ?? '', processedHtml], targetLang, tagHandling: true }),
      });
      if (!articleRes.ok) throw new Error(`HTTP ${articleRes.status}`);
      const articleData = await articleRes.json() as { translations: string[] };
      const [transTitle, transHtml] = articleData.translations;

      const newCache: TranslationCache = {
        title: decodeHtmlEntities(normalizeQuotes(transTitle ?? '', targetLang)),
        html: normalizeQuotes(transHtml, targetLang),
        tocItems: extractTocFromHtml(normalizeQuotes(transHtml, targetLang)),
      };
      setCaches(prev => ({ ...prev, [targetLang]: newCache }));
      setIsTranslated(true);
    } catch {
      setError('翻訳に失敗しました。しばらく経ってから再試行してください。');
    } finally {
      setIsTranslating(false);
    }
  };

  const activeCache = caches[targetLang] ?? null;

  return {
    isTranslated,
    isTranslating,
    error,
    targetLang,
    setTargetLang,
    toggle,
    translatedTitle: isTranslated ? (activeCache?.title ?? null) : null,
    translatedHtml: isTranslated ? (activeCache?.html ?? null) : null,
    translatedTocItems: isTranslated ? (activeCache?.tocItems ?? null) : null,
  };
}
