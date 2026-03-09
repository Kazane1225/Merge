import { API_BASE } from './api';
import type { Article } from '../types/article';

/**
 * 記事の本文HTMLが未取得の場合、APIから詳細を取得して返す。
 * すでに本文がある場合はそのまま返す。
 */
export async function fetchArticleDetail(article: Article): Promise<Article> {
  if (!article.id || article.rendered_body || article.body_html) return article;

  // id が数値 → Qiita 記事として詳細取得
  if (typeof article.id === 'number') {
    try {
      const res = await fetch(`${API_BASE}/qiita/article/${article.id}`);
      if (res.ok && res.headers.get('content-length') !== '0') {
        const detail = await res.json();
        if (detail?.id) return detail;
      }
    } catch (err) {
      console.error('Error fetching article detail:', err);
    }
    return article;
  }

  // id が文字列 → Dev.to 記事として詳細取得
  try {
    const res = await fetch(`${API_BASE}/dev/article/${article.id}`);
    if (res.ok) {
      const detail = await res.json();
      if (detail?.id) return detail;
    }
  } catch (err) {
    console.error('Error fetching Dev.to article detail:', err);
  }

  return article;
}
