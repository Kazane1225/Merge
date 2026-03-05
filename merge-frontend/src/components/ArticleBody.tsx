'use client';

import React, { memo } from 'react';

const articleBodyClass = [
  'qiita-content w-full max-w-none',
  '[&_*]:m-0 [&_*]:p-0',
  '[&_p]:text-slate-300 [&_p]:text-base [&_p]:leading-[1.8] [&_p]:mb-5 [&_p]:tracking-wide',
  '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-100 [&_h1]:mt-12 [&_h1]:mb-5 [&_h1]:pb-3 [&_h1]:border-b-2 [&_h1]:border-indigo-500/30',
  '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-100 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-slate-700',
  '[&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-8 [&_h3]:mb-3',
  '[&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-slate-200 [&_h4]:mt-6 [&_h4]:mb-2',
  '[&_h5]:text-base [&_h5]:font-semibold [&_h5]:text-slate-300 [&_h5]:mt-5 [&_h5]:mb-2',
  '[&_h6]:text-sm [&_h6]:font-semibold [&_h6]:text-slate-400 [&_h6]:mt-4 [&_h6]:mb-2',
  '[&_strong]:text-slate-100 [&_strong]:font-bold',
  '[&_em]:text-slate-300 [&_em]:italic',
  '[&_del]:text-slate-500 [&_del]:line-through',
  '[&_pre]:bg-gradient-to-br [&_pre]:from-slate-900 [&_pre]:to-slate-800 [&_pre]:p-5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:shadow-xl',
  '[&_blockquote]:text-slate-300 [&_blockquote]:bg-slate-900/30 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-5 [&_blockquote]:pr-4 [&_blockquote]:py-3 [&_blockquote]:my-6 [&_blockquote]:rounded-r [&_blockquote]:min-h-[50px]',
  '[&_blockquote_p]:mb-2 [&_blockquote_p]:last:mb-0',
  '[&_blockquote_a]:text-indigo-300',
  '[&_.twitter-tweet]:bg-transparent [&_.twitter-tweet]:border-0 [&_.twitter-tweet]:p-0 [&_.twitter-tweet]:min-h-[200px]',
  '[&_.twitter-tweet_p]:not-italic [&_.twitter-tweet_p]:text-slate-300',
  '[&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-indigo-500/50 [&_a:hover]:decoration-indigo-400 [&_a]:transition-colors',
  '[&_img]:rounded-lg [&_img]:shadow-2xl [&_img]:my-6 [&_img]:max-w-full [&_img]:border [&_img]:border-slate-700/50',
  '[&_li]:text-slate-300 [&_li]:ml-6 [&_li]:mb-2 [&_li]:leading-[1.8] [&_li]:pl-2',
  '[&_ul]:my-4 [&_ul]:space-y-1',
  '[&_ol]:my-4 [&_ol]:space-y-1',
  '[&_ul_li]:list-disc',
  '[&_ol_li]:list-decimal',
  '[&_ul_ul]:mt-2 [&_ul_ul]:mb-1',
  '[&_ol_ol]:mt-2 [&_ol_ol]:mb-1',
  '[&_table]:border-collapse [&_table]:border [&_table]:border-slate-700 [&_table]:my-6 [&_table]:w-full [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:shadow-lg',
  '[&_thead]:bg-gradient-to-r [&_thead]:from-slate-800 [&_thead]:to-slate-700',
  '[&_th]:border [&_th]:border-slate-700 [&_th]:text-slate-100 [&_th]:font-semibold [&_th]:p-3 [&_th]:text-left',
  '[&_td]:border [&_td]:border-slate-700 [&_td]:p-3 [&_td]:text-slate-300',
  '[&_tbody_tr:hover]:bg-slate-800/50 [&_tbody_tr]:transition-colors',
  '[&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-gradient-to-r [&_hr]:from-transparent [&_hr]:via-slate-700 [&_hr]:to-transparent [&_hr]:my-8',
  '[&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:my-6 [&_iframe]:max-w-full [&_iframe]:border [&_iframe]:border-slate-700/50 [&_iframe]:shadow-lg [&_iframe]:min-h-[400px]',
  '[&_video]:w-full [&_video]:rounded-lg [&_video]:my-6 [&_video]:max-w-full [&_video]:border [&_video]:border-slate-700/50 [&_video]:shadow-lg',
  '[&_div.embed-card]:my-6 [&_div.embed-card]:border [&_div.embed-card]:border-slate-700 [&_div.embed-card]:rounded-lg [&_div.embed-card]:overflow-hidden',
  '[&_.custom-link-card]:my-6 [&_.custom-link-card]:block',
  '[&_.speakerdeck-embed]:my-6',
  '[&_.codepen]:my-6',
  '[&_.instagram-media]:my-6 [&_.instagram-media]:mx-auto',
].join(' ');

interface ArticleBodyProps {
  processedHtml: string;
}

const ArticleBody = memo(function ArticleBody({ processedHtml }: ArticleBodyProps) {
  if (!processedHtml) {
    return (
      <div className="p-6 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm text-slate-300 font-semibold mb-2">本文データがありません</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Qiita/Dev.toの検索結果から記事を選択すると、本文プレビューが表示されます。<br />
              データベースに保存済みの記事は、URLのみが保存されています。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <article dangerouslySetInnerHTML={{ __html: processedHtml }} className={articleBodyClass} />;
});

export default ArticleBody;
