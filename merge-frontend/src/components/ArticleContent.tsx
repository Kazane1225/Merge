'use client';

import React, { useEffect, useRef, useState, useMemo } from "react";
import hljs from 'highlight.js';
import { getArticleSource, getBadgeClasses, getSourceLabel } from "../lib/articleHelpers";

interface ArticleContentProps {
  article: any;
  className?: string;
}

const ArticleContent = React.memo(function ArticleContent({ article, className }: ArticleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [processedHtml, setProcessedHtml] = useState<string>('');

  // HTMLを前処理してQiita埋め込みを変換
  useEffect(() => {
    if (article && (article.rendered_body || article.body_html)) {
      let html = article.rendered_body || article.body_html;

      // QiitaのTwitter埋め込みiframeをblockquoteに変換
      html = html.replace(
        /<iframe[^>]*id="([^"]*)"[^>]*src="https:\/\/qiita\.com\/embed-contents\/tweet[^"]*"[^>]*data-content="([^"]*)"[^>]*>[\s\S]*?<\/iframe>/gi,
        (_: string, __: string, dataContent: string) => {
          const twitterUrl = decodeURIComponent(dataContent);
          return `<blockquote class="twitter-tweet" data-lang="ja" data-dnt="true" data-theme="dark"><a href="${twitterUrl}" target="_blank" rel="noopener noreferrer">ツイートを表示</a></blockquote>`;
        }
      );

      // Qiitaのリンクカード埋め込みを独自カードに変換
      html = html.replace(
        /<iframe[^>]*src="https:\/\/qiita\.com\/embed-contents\/link-card[^"]*"[^>]*data-content="([^"]*)"[^>]*>[\s\S]*?<\/iframe>/gi,
        (_: string, dataContent: string) => {
          const linkUrl = decodeURIComponent(dataContent);
          return `
            <div class="custom-link-card my-6">
              <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="block p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg transition-all hover:border-indigo-500/50 group">
                <div class="flex items-start gap-3">
                  <svg class="w-5 h-5 text-indigo-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                  </svg>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors mb-1 truncate">
                      関連記事
                    </div>
                    <div class="text-xs text-slate-400 truncate">${linkUrl}</div>
                  </div>
                  <svg class="w-4 h-4 text-slate-500 group-hover:text-indigo-400 flex-shrink-0 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </a>
            </div>
          `;
        }
      );

      // YouTubeサムネイル画像を高解像度版に置き換え
      // maxresdefault.jpg (1280x720) -> sddefault.jpg (640x480) -> hqdefault.jpg (480x360) の順でフォールバック
      html = html.replace(
        /src="https:\/\/(?:img|i)\.youtube\.com\/vi\/([^/]+)\/(?:default|mqdefault|sddefault|hqdefault|maxresdefault)\.(?:jpg|webp)"/gi,
        'src="https://i.ytimg.com/vi/$1/maxresdefault.jpg" onerror="this.onerror=null;this.src=\'https://i.ytimg.com/vi/$1/sddefault.jpg\';this.onerror=function(){this.onerror=null;this.src=\'https://i.ytimg.com/vi/$1/hqdefault.jpg\';};"'
      );

      setProcessedHtml(html);

      // スクロール位置をリセット
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    } else {
      setProcessedHtml('');
    }
  }, [article]);

  // Twitter埋め込みスクリプトの読み込みと再レンダリング
  useEffect(() => {
    if (!processedHtml.includes('twitter-tweet')) {
      return;
    }

    const loadTwitterWidgets = () => {
      const twttr = (window as any).twttr;
      if (!twttr || !twttr.widgets) {
        return false;
      }
      
      // contentRef内のツイートを確認
      if (contentRef.current) {
        const tweetContainers = contentRef.current.querySelectorAll('.twitter-tweet');
        
        tweetContainers.forEach((blockquote, index) => {
          // 既にレンダリング済みかチェック
          if (blockquote.hasAttribute('data-tweet-rendered')) {
            return;
          }
          
          const link = blockquote.querySelector('a');
          const tweetUrl = link?.getAttribute('href');
          
          if (!tweetUrl) {
            return;
          }
          
          // ツイートIDを抽出
          const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
          if (!tweetId) {
            return;
          }
          
          // レンダリング中フラグを立てる
          blockquote.setAttribute('data-tweet-rendered', 'true');
          
          // blockquoteの親要素を取得
          const parent = blockquote.parentElement;
          if (!parent) {
            return;
          }
          
          // 新しいコンテナを作成してblockquoteと置き換え
          const container = document.createElement('div');
          container.className = 'twitter-embed-wrapper';
          container.style.cssText = 'margin: 1.5rem auto; max-width: 550px;';
          
          // blockquoteを置き換え
          parent.replaceChild(container, blockquote);
          
          // ツイートをレンダリング
          twttr.widgets.createTweet(
            tweetId,
            container,
            {
              theme: 'dark',
              conversation: 'none',
              dnt: true,
              align: 'center'
            }
          ).then((element: any) => {
            if (!element) {
              // nullの場合、元のblockquoteを復元
              container.appendChild(blockquote);
            }
          }).catch((err: any) => {
            // エラーの場合、元のblockquoteを復元
            container.appendChild(blockquote);
          });
        });
      }
      
      return true;
    };

    // スクリプトの読み込みと初期化
    const existingScript = document.getElementById('twitter-wjs');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      
      script.onload = () => {
        setTimeout(() => {
          loadTwitterWidgets();
        }, 150);
      };
      
      document.body.appendChild(script);
    } else {
      // スクリプトが既にロードされている場合
      if ((window as any).twttr?.widgets) {
        setTimeout(() => {
          loadTwitterWidgets();
        }, 50);
      } else {
        // ロード中の可能性があるので待機
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          if (loadTwitterWidgets()) {
            clearInterval(checkInterval);
          }
          if (attempts >= 30) {
            clearInterval(checkInterval);
          }
        }, 200);
      }
    }
  }, [processedHtml]);

  // 記事内のリンクを別タブで開くように設定
  useEffect(() => {
    if (!contentRef.current) return;
    
    const links = contentRef.current.querySelectorAll('a');
    links.forEach((link) => {
      // 既に設定済みか、内部リンク（#で始まる）の場合はスキップ
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      
      if (!link.hasAttribute('target')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }, [processedHtml]);

  // コードハイライトの適用（requestAnimationFrameで最適化）
  useEffect(() => {
    if (processedHtml && contentRef.current) {
      requestAnimationFrame(() => {
        const codeBlocks = contentRef.current?.querySelectorAll('pre code') || [];
        codeBlocks.forEach((block: any) => {
          if (!block.classList.contains('hljs')) {
            hljs.highlightElement(block);
          }
        });
      });
    }
  }, [processedHtml]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight - element.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

    // Ref経由で直接DOMを更新、state更新による再レンダリングを避ける
    if (progressRef.current) {
      progressRef.current.style.width = `${progress}%`;
    }
  };

  // 読了時間を計算（日本語400文字/分、英語200単語/分）- useMemoで最適化
  const readingTime = useMemo(() => {
    if (!processedHtml) return 0;
    const plainText = processedHtml.replace(/<[^>]*>/g, '');
    const japaneseChars = (plainText.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/g) || []).length;
    const englishWords = plainText.split(/\s+/).filter(w => w.length > 0).length;
    return Math.ceil((japaneseChars / 400) + (englishWords / 200));
  }, [processedHtml]);

  const source = article ? getArticleSource(article) : 'database';
  const sourceBadge = getSourceLabel(source);

  return (
    <div ref={contentRef} onScroll={handleScroll} className={`overflow-y-auto scroll-smooth flex justify-center relative ${className}`}>
      {/* スクロール進捗バー */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-800/50 z-50">
        <div
          ref={progressRef}
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-150"
          style={{ width: '0%' }}
        />
      </div>

      <div className="w-full max-w-4xl px-6 lg:px-8 py-8">
        {article ? (
          <div className="w-full">
            {/* カバー画像とタイトルオーバーレイ */}
            {(article.cover_image || article.coverImage) ? (
              <div className="relative mb-10 rounded-xl overflow-hidden shadow-2xl">
                <div className="relative">
                  <img
                    src={article.cover_image || article.coverImage}
                    alt={article.title}
                    className="w-full h-auto object-cover max-h-[500px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/70 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className={`inline-block text-xs px-3 py-1.5 rounded-full font-bold uppercase border mb-4 ${getBadgeClasses(source)}`}>
                    {sourceBadge}
                  </span>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white mb-3 drop-shadow-lg">{article.title}</h1>
                </div>
              </div>
            ) : (
              <div className="mb-10">
                <span className={`inline-block text-xs px-3 py-1.5 rounded-full font-bold uppercase border mb-4 ${getBadgeClasses(source)}`}>
                  {sourceBadge}
                </span>
                <h1 className="text-4xl lg:text-5xl font-bold text-slate-100 mb-4">{article.title}</h1>
              </div>
            )}

            {/* メタ情報エリア */}
            <div className="mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                {/* 公開日 */}
                {(article.created_at || article.published_at) && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(article.created_at || article.published_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                )}

                {/* いいね数・反応数 */}
                {(article.likes_count !== undefined || article.positive_reactions_count !== undefined) && (
                  <div className="flex items-center gap-2 text-red-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span className="font-semibold">{article.likes_count ?? article.positive_reactions_count ?? 0}</span>
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
                    <span className="font-medium text-slate-300">{article.user?.name || article.user?.login || article.user?.username}</span>
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

            {/* URLリンク */}
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

            {/* 本文 */}
            {processedHtml ? (
              <article
                dangerouslySetInnerHTML={{ __html: processedHtml }}
                className="qiita-content w-full prose prose-invert prose-lg max-w-none
                  [&_*]:m-0 [&_*]:p-0

                  /* 段落 */
                  [&_p]:text-slate-300 [&_p]:text-base [&_p]:leading-[1.8] [&_p]:mb-5 [&_p]:tracking-wide

                  /* 見出し */
                  [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-100 [&_h1]:mt-12 [&_h1]:mb-5 [&_h1]:pb-3 [&_h1]:border-b-2 [&_h1]:border-indigo-500/30
                  [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-100 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-slate-700
                  [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-8 [&_h3]:mb-3
                  [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-slate-200 [&_h4]:mt-6 [&_h4]:mb-2
                  [&_h5]:text-base [&_h5]:font-semibold [&_h5]:text-slate-300 [&_h5]:mt-5 [&_h5]:mb-2
                  [&_h6]:text-sm [&_h6]:font-semibold [&_h6]:text-slate-400 [&_h6]:mt-4 [&_h6]:mb-2

                  /* テキスト装飾 */
                  [&_strong]:text-slate-100 [&_strong]:font-bold
                  [&_em]:text-slate-300 [&_em]:italic
                  [&_del]:text-slate-500 [&_del]:line-through

                  /* インラインコード */
                  [&_code]:text-amber-300 [&_code]:bg-slate-800/80 [&_code]:px-2 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_code]:border [&_code]:border-slate-700/50

                  /* コードブロック */
                  [&_pre]:bg-gradient-to-br [&_pre]:from-slate-900 [&_pre]:to-slate-800 [&_pre]:text-slate-300 [&_pre]:p-5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:shadow-xl
                  [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:border-0 [&_pre_code]:text-sm

                  /* 引用（通常の引用・Twitter埋め込みを含む） */
                  [&_blockquote]:text-slate-300 [&_blockquote]:bg-slate-900/30 [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-5 [&_blockquote]:pr-4 [&_blockquote]:py-3 [&_blockquote]:my-6 [&_blockquote]:rounded-r [&_blockquote]:min-h-[50px]
                  [&_blockquote_p]:mb-2 [&_blockquote_p]:last:mb-0
                  [&_blockquote_a]:text-indigo-300

                  /* Twitter埋め込み専用スタイル */
                  [&_.twitter-tweet]:bg-transparent [&_.twitter-tweet]:border-0 [&_.twitter-tweet]:p-0 [&_.twitter-tweet]:min-h-[200px]
                  [&_.twitter-tweet_p]:not-italic [&_.twitter-tweet_p]:text-slate-300

                  /* リンク */
                  [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-indigo-500/50 [&_a:hover]:decoration-indigo-400 [&_a]:transition-colors

                  /* 画像 */
                  [&_img]:rounded-lg [&_img]:shadow-2xl [&_img]:my-6 [&_img]:max-w-full [&_img]:border [&_img]:border-slate-700/50

                  /* リスト */
                  [&_li]:text-slate-300 [&_li]:ml-6 [&_li]:mb-2 [&_li]:leading-[1.8] [&_li]:pl-2
                  [&_ul]:my-4 [&_ul]:space-y-1
                  [&_ol]:my-4 [&_ol]:space-y-1
                  [&_ul_li]:list-disc
                  [&_ol_li]:list-decimal
                  [&_ul_ul]:mt-2 [&_ul_ul]:mb-1
                  [&_ol_ol]:mt-2 [&_ol_ol]:mb-1

                  /* テーブル */
                  [&_table]:border-collapse [&_table]:border [&_table]:border-slate-700 [&_table]:my-6 [&_table]:w-full [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:shadow-lg
                  [&_thead]:bg-gradient-to-r [&_thead]:from-slate-800 [&_thead]:to-slate-700
                  [&_th]:border [&_th]:border-slate-700 [&_th]:text-slate-100 [&_th]:font-semibold [&_th]:p-3 [&_th]:text-left
                  [&_td]:border [&_td]:border-slate-700 [&_td]:p-3 [&_td]:text-slate-300
                  [&_tbody_tr:hover]:bg-slate-800/50 [&_tbody_tr]:transition-colors

                  /* 水平線 */
                  [&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-gradient-to-r [&_hr]:from-transparent [&_hr]:via-slate-700 [&_hr]:to-transparent [&_hr]:my-8

                  /* メディア・埋め込みコンテンツ */
                  [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:my-6 [&_iframe]:max-w-full [&_iframe]:border [&_iframe]:border-slate-700/50 [&_iframe]:shadow-lg [&_iframe]:min-h-[400px]
                  [&_video]:w-full [&_video]:rounded-lg [&_video]:my-6 [&_video]:max-w-full [&_video]:border [&_video]:border-slate-700/50 [&_video]:shadow-lg

                  /* 埋め込みカード・スクリプト埋め込み */
                  [&_div.embed-card]:my-6 [&_div.embed-card]:border [&_div.embed-card]:border-slate-700 [&_div.embed-card]:rounded-lg [&_div.embed-card]:overflow-hidden
                  [&_.custom-link-card]:my-6 [&_.custom-link-card]:block
                  [&_.speakerdeck-embed]:my-6
                  [&_.codepen]:my-6
                  [&_.instagram-media]:my-6 [&_.instagram-media]:mx-auto
                "
              />
            ) : (
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
            )}
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
  );
});

export default ArticleContent;
