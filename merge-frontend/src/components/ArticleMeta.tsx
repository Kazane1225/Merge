'use client';

interface ArticleMetaProps {
  article: any;
  readingTime: number;
}

/**
 * 記事の公開日・いいね数・閲覧数・読了時間・著者・タグを表示するコンポーネント。
 */
export default function ArticleMeta({ article, readingTime }: ArticleMetaProps) {
  return (
    <div className="mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">

        {/* 公開日 */}
        {(article.created_at || article.published_at) && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {new Date(article.created_at || article.published_at).toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* いいね数・反応数 */}
        {(article.likes_count !== undefined || article.positive_reactions_count !== undefined) && (
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="font-semibold">
              {article.likes_count ?? article.positive_reactions_count ?? 0}
            </span>
          </div>
        )}

        {/* 閲覧数 */}
        {article.views !== undefined && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{article.views.toLocaleString()}</span>
          </div>
        )}

        {/* 読了時間 */}
        {readingTime > 0 && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{readingTime}分で読めます</span>
          </div>
        )}

        {/* 著者 */}
        {(article.user?.name || article.user?.login || article.user?.username) && (
          <div className="flex items-center gap-2 ml-auto">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium text-slate-300">
              {article.user?.name || article.user?.login || article.user?.username}
            </span>
          </div>
        )}
      </div>

      {/* タグ */}
      {article.tags && article.tags.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex flex-wrap gap-2">
            {article.tags.slice(0, 8).map((tag: any, idx: number) => (
              <span
                key={idx}
                className="text-xs px-3 py-1 bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 rounded-full hover:bg-indigo-800/50 transition-colors"
              >
                #{typeof tag === 'string' ? tag : tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
