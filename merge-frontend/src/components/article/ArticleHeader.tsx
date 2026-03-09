'use client';

import type { Article } from '../../types/article';
import { getBadgeClasses, getSourceLabel, getArticleSource } from '../../lib/articleHelpers';

interface ArticleHeaderProps {
  article: Article;
}

/**
 * 記事のカバー画像・タイトル・ソースバッジを表示するコンポーネント。
 */
export default function ArticleHeader({ article }: ArticleHeaderProps) {
  const source = getArticleSource(article);
  const sourceBadge = getSourceLabel(source);
  const badgeClass = `inline-block text-xs px-3 py-1.5 rounded-full font-bold uppercase border mb-4 ${getBadgeClasses(source)}`;

  if (article.cover_image || article.coverImage) {
    return (
      <div className="mb-10">
        <div className="relative rounded-xl overflow-hidden shadow-2xl">
          <div className="relative">
            <img
              src={article.cover_image || article.coverImage}
              alt={article.title}
              className="w-full h-auto object-cover max-h-[500px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/70 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <span className={badgeClass}>{sourceBadge}</span>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3 drop-shadow-lg">
              {article.title}
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <span className={badgeClass}>{sourceBadge}</span>
      <h1 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-4">{article.title}</h1>
    </div>
  );
}
