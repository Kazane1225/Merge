'use client';

import DOMPurify from 'dompurify';
import type { QiitaComment, DevComment } from '../../types/article';
import type { ArticleSource } from '../../lib/articleHelpers';

const sanitize = (html: string) => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

// コメント本文のHTML用スタイル（Qiita/Dev.to共通）
const commentBodyClass = [
  'text-sm text-slate-300 leading-[1.75]',
  '[&_p]:mb-3 [&_p]:last:mb-0',
  '[&_code]:bg-slate-900/80 [&_code]:text-indigo-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:border [&_code]:border-slate-700/50 [&_code]:font-mono',
  '[&_pre]:bg-slate-900/80 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:text-xs [&_pre]:font-mono',
  '[&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors',
  '[&_ul]:my-2 [&_ul]:pl-4 [&_li]:list-disc [&_li]:mb-1',
  '[&_ol]:my-2 [&_ol]:pl-4 [&_ol_li]:list-decimal',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-indigo-500/50 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:my-3 [&_blockquote]:italic [&_blockquote]:bg-slate-900/30 [&_blockquote]:py-1 [&_blockquote]:rounded-r',
  '[&_strong]:text-slate-100 [&_strong]:font-semibold',
  '[&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-3 [&_img]:border [&_img]:border-slate-700/40',
  '[&_h1]:text-slate-100 [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2',
  '[&_h2]:text-slate-100 [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2',
  '[&_h3]:text-slate-200 [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1',
].join(' ');

// ----- ローディング・空状態の共通UI -----

const CommentsLoading = () => (
  <div className="space-y-5">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-4 animate-pulse">
        <div className="w-9 h-9 bg-slate-700/80 rounded-full flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="flex gap-3 items-center">
            <div className="h-3 bg-slate-700 rounded w-20" />
            <div className="h-2.5 bg-slate-700/60 rounded w-14" />
          </div>
          <div className="h-3 bg-slate-700/80 rounded w-full" />
          <div className="h-3 bg-slate-700/60 rounded w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

const CommentsEmpty = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-3">
      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    </div>
    <p className="text-sm text-slate-500">まだコメントはありません</p>
  </div>
);

const CommentsHeader = ({ count }: { count: number }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Comments</h2>
    </div>
    {count > 0 && (
      <span className="text-xs font-semibold text-indigo-400 bg-indigo-900/40 border border-indigo-700/40 px-2 py-0.5 rounded-full">
        {count}
      </span>
    )}
    <div className="flex-1 h-px bg-slate-700/50" />
  </div>
);

// ----- Qiitaコメント -----

const QiitaCommentItem = ({ comment }: { comment: QiitaComment }) => {
  const user = comment.user;
  const initial = (user?.id ?? '?')[0].toUpperCase();

  return (
    <div className="group flex gap-4 py-5 border-b border-slate-800/60 last:border-0">
      <div className="flex-shrink-0">
        {user?.profile_image_url ? (
          <img
            src={user.profile_image_url}
            alt={user.id}
            className="w-9 h-9 rounded-full border-2 border-slate-700/60 group-hover:border-indigo-600/50 transition-colors"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-800/60 to-purple-800/60 border-2 border-slate-700/60 group-hover:border-indigo-600/50 transition-colors flex items-center justify-center">
            <span className="text-xs text-indigo-200 font-bold">{initial}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-2.5">
          <span className="text-sm font-semibold text-slate-200">{user?.id ?? '不明'}</span>
          {comment.created_at && (
            <span className="text-xs text-slate-500">
              {new Date(comment.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        {comment.rendered_body ? (
          <div dangerouslySetInnerHTML={{ __html: sanitize(comment.rendered_body) }} className={commentBodyClass} />
        ) : (
          <p className="text-sm text-slate-300 leading-[1.75] whitespace-pre-wrap">{comment.body}</p>
        )}
      </div>
    </div>
  );
};

// ----- Dev.toコメント（ネスト対応） -----

const DevCommentItem = ({ comment, depth = 0 }: { comment: DevComment; depth?: number }) => {
  const user = comment.user;
  const initial = (user?.id_code || user?.name || '?')[0].toUpperCase();
  const isReply = depth >= 1;
  const isNestedReply = depth >= 2;
  const avatarClass = `rounded-full border-2 border-slate-700/60 group-hover:border-indigo-600/50 transition-colors ${isReply ? 'w-7 h-7' : 'w-9 h-9'}`;

  return (
    <div>
      <div className={`group flex gap-4 py-4 ${depth === 0 ? 'border-b border-slate-800/60 last:border-0' : ''}`}>
        <div className="flex-shrink-0">
          {user?.profile_image ? (
            <img src={user.profile_image} alt={user.name ?? user.id_code} className={avatarClass} />
          ) : (
            <div className={`${avatarClass} bg-gradient-to-br from-indigo-800/60 to-purple-800/60 flex items-center justify-center`}>
              <span className="text-xs text-indigo-200 font-bold">{initial}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="text-sm font-semibold text-slate-200">{user?.name ?? user?.id_code ?? '不明'}</span>
            {comment.created_at && (
              <span className="text-xs text-slate-500">
                {new Date(comment.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          {comment.body_html ? (
            <div dangerouslySetInnerHTML={{ __html: sanitize(comment.body_html) }} className={commentBodyClass} />
          ) : (
            <p className="text-sm text-slate-300 leading-[1.75] whitespace-pre-wrap">{comment.body}</p>
          )}
          {comment.children && comment.children.length > 0 && (
            <div className="mt-3 pl-1 border-l border-slate-700/40 space-y-0">
              {comment.children.map((child: DevComment) => (
                <DevCommentItem
                  key={child.id_code}
                  comment={child}
                  depth={isNestedReply ? depth : depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ----- メインエクスポート -----

interface ArticleCommentsProps {
  source: ArticleSource;
  articleId: number | string;
  comments: QiitaComment[] | DevComment[];
  commentsLoading: boolean;
}

/**
 * Qiita / Dev.to 両方のコメントセクションを担当するコンポーネント。
 */
export default function ArticleComments({ source, articleId, comments, commentsLoading }: ArticleCommentsProps) {
  if ((source !== 'qiita' && source !== 'dev') || !articleId) return null;

  return (
    <div className="mt-14">
      <CommentsHeader count={commentsLoading ? 0 : comments.length} />
      {commentsLoading ? (
        <CommentsLoading />
      ) : comments.length === 0 ? (
        <CommentsEmpty />
      ) : (
        <div className="space-y-1">
          {source === 'qiita'
            ? (comments as QiitaComment[]).map((c) => <QiitaCommentItem key={c.id} comment={c} />)
            : (comments as DevComment[]).map((c, idx) => <DevCommentItem key={c.id_code ?? `dev-${idx}`} comment={c} />)
          }
        </div>
      )}
    </div>
  );
}
