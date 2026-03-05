import { useState, useEffect } from 'react';
import type { Article, QiitaComment, DevComment } from '../types/article';
import { API_BASE } from '../lib/api';

interface UseArticleCommentsResult {
  comments: QiitaComment[] | DevComment[];
  commentsLoading: boolean;
}

/**
 * 記事に対するコメントを取得・管理するフック。
 * 保存済み記事は article.comments / article.devComments を直接参照し、
 * 未保存記事は外部APIから取得する。
 */
export function useArticleComments(article: Article | null): UseArticleCommentsResult {
  const [comments, setComments] = useState<QiitaComment[] | DevComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    if (!article) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }
    const isQiita = article?.url?.includes('qiita.com');
    const isDev = article?.url?.includes('dev.to');

    if (!isQiita && !isDev) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }

    // 保存済み記事: 埋め込み済みコメントを使う
    if (isQiita && article.comments !== undefined) {
      setComments(Array.isArray(article.comments) ? article.comments : []);
      setCommentsLoading(false);
      return;
    }
    if (isDev && article.devComments !== undefined) {
      setComments(Array.isArray(article.devComments) ? article.devComments : []);
      setCommentsLoading(false);
      return;
    }

    // 未保存記事: 外部APIから取得
    if (!article?.id) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }

    let cancelled = false;
    setComments([]);
    setCommentsLoading(true);

    const apiUrl = isQiita
      ? `${API_BASE}/qiita/article/${article.id}/comments`
      : `${API_BASE}/dev/article/${article.id}/comments`;

    fetch(apiUrl)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data) => { if (!cancelled) setComments(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setCommentsLoading(false); });

    return () => { cancelled = true; };
  }, [article?.url, article?.id]);

  return { comments, commentsLoading };
}
