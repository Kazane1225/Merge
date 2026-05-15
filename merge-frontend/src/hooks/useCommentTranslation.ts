import { useState, useEffect, useCallback } from 'react';
import type { QiitaComment, DevComment } from '../types/article';
import type { ArticleSource } from '../lib/articleHelpers';
import { API_BASE } from '../lib/api';

function flattenDevComments(comments: DevComment[]): DevComment[] {
  const result: DevComment[] = [];
  for (const c of comments) {
    result.push(c);
    if (c.children?.length) result.push(...flattenDevComments(c.children));
  }
  return result;
}

function applyTranslatedBodiesToDev(
  comments: DevComment[],
  bodyMap: Map<number, string>,
): DevComment[] {
  return comments.map(c => ({
    ...c,
    body_html: bodyMap.has(c.id) ? bodyMap.get(c.id) : c.body_html,
    children: c.children ? applyTranslatedBodiesToDev(c.children, bodyMap) : undefined,
  }));
}

async function translateBatch(bodies: string[], targetLang: 'JA' | 'EN'): Promise<string[]> {
  const results: string[] = [];
  const BATCH = 5;
  for (let i = 0; i < bodies.length; i += BATCH) {
    const batch = bodies.slice(i, i + BATCH);
    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: batch, targetLang, tagHandling: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { translations: string[] };
      results.push(...data.translations);
    } catch {
      results.push(...batch);
    }
  }
  return results;
}

export interface UseCommentTranslationResult {
  isTranslated: boolean;
  isTranslating: boolean;
  error: string | null;
  displayComments: QiitaComment[] | DevComment[];
  toggle: () => Promise<void>;
}

export function useCommentTranslation(
  source: ArticleSource,
  articleId: number | string | undefined,
  comments: QiitaComment[] | DevComment[],
  targetLang: 'JA' | 'EN',
): UseCommentTranslationResult {
  const [isTranslated, setIsTranslated] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [caches, setCaches] = useState<Partial<Record<'JA' | 'EN', QiitaComment[] | DevComment[]>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsTranslated(false);
    setCaches({});
    setError(null);
  }, [articleId, source]);

  const toggle = useCallback(async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }
    if (caches[targetLang]) {
      setIsTranslated(true);
      return;
    }
    if (comments.length === 0 || isTranslating) return;

    setIsTranslating(true);
    setError(null);

    try {
      let translated: QiitaComment[] | DevComment[];

      if (source === 'dev') {
        const flat = flattenDevComments(comments as DevComment[]);
        const bodies = flat.map(c => c.body_html ?? c.body ?? '');
        const translatedBodies = await translateBatch(bodies, targetLang);
        const bodyMap = new Map(flat.map((c, i) => [c.id, translatedBodies[i] ?? ''] as [number, string]));
        translated = applyTranslatedBodiesToDev(comments as DevComment[], bodyMap);
      } else {
        const bodies = (comments as QiitaComment[]).map(c => c.rendered_body ?? c.body ?? '');
        const translatedBodies = await translateBatch(bodies, targetLang);
        translated = (comments as QiitaComment[]).map((c, i) => ({ ...c, rendered_body: translatedBodies[i] ?? '' }));
      }

      setCaches(prev => ({ ...prev, [targetLang]: translated as QiitaComment[] | DevComment[] }));
      setIsTranslated(true);
    } catch {
      setError('翻訳に失敗しました。しばらく経ってから再試行してください。');
    } finally {
      setIsTranslating(false);
    }
  }, [isTranslated, caches, targetLang, comments, isTranslating, source]);

  const displayComments = isTranslated ? (caches[targetLang] ?? comments) : comments;

  return { isTranslated, isTranslating, error, displayComments, toggle };
}
