'use client';

import React, { useEffect, useRef, useState, useMemo } from "react";
import hljs from 'highlight.js';
import { getArticleSource, getBadgeClasses, getSourceLabel } from "../lib/articleHelpers";

hljs.configure({ ignoreUnescapedHTML: true });

interface ArticleContentProps {
  article: any;
  className?: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const ArticleContent = React.memo(function ArticleContent({ article, className }: ArticleContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const tocNavRef = useRef<HTMLElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const headingElementsRef = useRef<HTMLElement[]>([]);
  const activeHeadingIdRef = useRef<string>('');
  const [processedHtml, setProcessedHtml] = useState<string>('');
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // HTMLを前処理してQiita埋め込みを変換
  useEffect(() => {
    if (article && (article.rendered_body || article.body_html)) {
      let html = article.rendered_body || article.body_html;

      const decodeHtmlEntities = (value: string) => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = value;
        return textarea.value;
      };

      // QiitaのTwitter埋め込みiframeをblockquoteに変換
      html = html.replace(
        /<iframe[^>]*id="([^"]*)"[^>]*src="https:\/\/qiita\.com\/embed-contents\/tweet[^"]*"[^>]*data-content="([^"]*)"[^>]*>[\s\S]*?<\/iframe>/gi,
        (_: string, __: string, dataContent: string) => {
          const twitterUrl = decodeURIComponent(dataContent);
          return `<blockquote class="twitter-tweet" data-lang="ja" data-dnt="true" data-theme="dark"><a href="${twitterUrl}" target="_blank" rel="noopener noreferrer">ツイートを表示</a></blockquote>`;
        }
      );

      // 見出しにIDを付与して目次を生成
      const toc: TocItem[] = [];
      let headingCounter = 0;
      
      html = html.replace(
        /<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi,
        (match: string, tag: string, attributes: string, text: string) => {
          headingCounter++;
          // 既存のIDがあるか確認
          const existingIdMatch = attributes.match(/id=["']([^"']*)["']/);
          const id = existingIdMatch ? existingIdMatch[1] : `heading-${headingCounter}`;
          const level = parseInt(tag.substring(1));
          const plainText = text.replace(/<[^>]*>/g, '').trim();
          
          if (plainText) {
            toc.push({ id, text: plainText, level });
          }
          
          // 既存のID属性を削除して、新しいIDを付与
          const cleanAttributes = attributes.replace(/id=["'][^"']*["']/g, '').trim();
          const finalAttributes = cleanAttributes ? ` ${cleanAttributes}` : '';
          
          return `<${tag} id="${id}"${finalAttributes}>${text}</${tag}>`;
        }
      );
      
      console.log('TOC Items:', toc);
      setTocItems(toc);

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
      // サムネイル品質：maxresdefault (1280x720) -> sddefault (640x480) -> hqdefault (480x360)
      html = html.replace(
        /src="https:\/\/(?:img|i)\.youtube\.com\/vi\/([^/]+)\/(?:default|mqdefault|sddefault|hqdefault|maxresdefault)\.(?:jpg|webp)"/gi,
        'src="https://i.ytimg.com/vi/$1/maxresdefault.jpg" loading="lazy" decoding="async" onerror="this.onerror=null;const id=\'$1\';const sizes=[\'sddefault\',\'hqdefault\'];let idx=0;const tryNext=()=>{if(idx<sizes.length){this.src=`https://i.ytimg.com/vi/${id}/${sizes[idx]}.jpg`;idx++;}};this.onerror=tryNext;"'
      );

      html = html.replace(
        /<pre([^>]*)>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi,
        (_match: string, preAttrs: string, codeAttrs: string, codeContent: string) => {
          const classMatch = codeAttrs.match(/class=["']([^"']*)["']/i);
          const originalClasses = classMatch ? classMatch[1] : '';
          const languageClass = originalClasses
            .split(/\s+/)
            .find((className) => className.startsWith('language-') || className.startsWith('lang-'));

          const normalizedLanguage = languageClass
            ? languageClass.replace(/^language-/, '').replace(/^lang-/, '').toLowerCase()
            : undefined;

          const decodedCode = decodeHtmlEntities(codeContent);

          try {
            const highlighted = normalizedLanguage && hljs.getLanguage(normalizedLanguage)
              ? hljs.highlight(decodedCode, { language: normalizedLanguage, ignoreIllegals: true })
              : hljs.highlightAuto(decodedCode);

            const finalClasses = originalClasses
              .split(/\s+/)
              .filter(Boolean)
              .filter((className) => className !== 'hljs')
              .concat(['hljs']);

            const detectedLanguage = highlighted.language ? ` language-${highlighted.language}` : '';
            return `<pre${preAttrs}><code class="${finalClasses.join(' ')}${detectedLanguage}">${highlighted.value}</code></pre>`;
          } catch {
            const safeCode = decodedCode
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            return `<pre${preAttrs}><code class="${originalClasses}">${safeCode}</code></pre>`;
          }
        }
      );

      setProcessedHtml(html);

      // スクロール位置をリセット
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    } else {
      setProcessedHtml('');
      setTocItems([]);
    }
  }, [article]);

  // Qiitaコメントを記事選択後すぐに非同期取得
  useEffect(() => {
    const isQiita = article?.url?.includes('qiita.com') && article?.id;
    const isDev = article?.url?.includes('dev.to') && article?.id;
    if (!isQiita && !isDev) {
      setComments([]);
      setCommentsLoading(false);
      return;
    }
    let cancelled = false;
    setComments([]);
    setCommentsLoading(true);
    const apiUrl = isQiita
      ? `http://localhost:8080/api/qiita/article/${article.id}/comments`
      : `http://localhost:8080/api/dev/article/${article.id}/comments`;
    fetch(apiUrl)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { if (!cancelled) setComments(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setCommentsLoading(false); });
    return () => { cancelled = true; };
  }, [article]);

  useEffect(() => {
    if (!contentRef.current || tocItems.length === 0) {
      headingElementsRef.current = [];
      return;
    }

    headingElementsRef.current = tocItems
      .map((item) => contentRef.current?.querySelector(`#${item.id}`))
      .filter(Boolean) as HTMLElement[];
  }, [processedHtml, tocItems]);

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;

    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

      if (progressRef.current) {
        progressRef.current.style.width = `${progress}%`;
      }

      if (tocItems.length > 0 && contentRef.current) {
        const headings = headingElementsRef.current;

        let currentId = '';
        const offset = 100;
        const containerRect = contentRef.current.getBoundingClientRect();

        for (let i = headings.length - 1; i >= 0; i--) {
          const heading = headings[i];
          const rect = heading.getBoundingClientRect();
          if (rect.top - containerRect.top <= offset) {
            currentId = heading.id;
            break;
          }
        }

        if (currentId !== activeHeadingIdRef.current) {
          activeHeadingIdRef.current = currentId;
          setActiveHeadingId(currentId);
        }
      }
    });
  };

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const scrollToHeading = (id: string) => {
    if (!contentRef.current) return;
    
    const heading = contentRef.current.querySelector(`#${id}`);
    if (heading) {
      const containerRect = contentRef.current.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const offset = headingRect.top - containerRect.top + contentRef.current.scrollTop - 80;
      
      contentRef.current.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
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

  // 目次を見出しにスムーズスクロール
  useEffect(() => {
    if (!activeHeadingId || !tocNavRef.current) return;

    const activeButton = tocNavRef.current.querySelector(`button[data-heading-id="${activeHeadingId}"]`);
    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeHeadingId]);

  const source = article ? getArticleSource(article) : 'database';
  const sourceBadge = getSourceLabel(source);

  const renderedArticleContent = useMemo(() => {
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

    return (
      <article
        dangerouslySetInnerHTML={{ __html: processedHtml }}
        className="qiita-content w-full max-w-none
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

          /* コードブロック */
          [&_pre]:bg-gradient-to-br [&_pre]:from-slate-900 [&_pre]:to-slate-800 [&_pre]:p-5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:shadow-xl

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
    );
  }, [processedHtml]);

  return (
    <div ref={contentRef} onScroll={handleScroll} className={`overflow-y-auto scroll-smooth relative w-full h-full ${className || ''}`}>
      {/* スクロール進捗バー */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-800/50 z-50">
        <div
          ref={progressRef}
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-150"
          style={{ width: '0%' }}
        />
      </div>

      <div className="flex min-h-full">
        {/* メインコンテンツ */}
        <div className="flex-1 flex justify-center">
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
            {renderedArticleContent}

            {/* Qiitaコメントセクション */}
            {source === 'qiita' && article.id && (
              <div className="mt-14">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Comments</h2>
                  </div>
                  {!commentsLoading && comments.length > 0 && (
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-900/40 border border-indigo-700/40 px-2 py-0.5 rounded-full">{comments.length}</span>
                  )}
                  <div className="flex-1 h-px bg-slate-700/50" />
                </div>

                {commentsLoading ? (
                  <div className="space-y-5">
                    {[1, 2, 3].map(i => (
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
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">まだコメントはありません</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {comments.map((comment: any, idx: number) => {
                      const user = comment.user as any;
                      const initial = (user?.id ?? '?')[0].toUpperCase();
                      return (
                        <div
                          key={comment.id ?? `qiita-comment-${idx}`}
                          className="group flex gap-4 py-5 border-b border-slate-800/60 last:border-0"
                        >
                          {/* アバター */}
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

                          {/* 本文エリア */}
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
                              <div
                                dangerouslySetInnerHTML={{ __html: comment.rendered_body }}
                                className="text-sm text-slate-300 leading-[1.75]
                                  [&_p]:mb-3 [&_p]:last:mb-0
                                  [&_code]:bg-slate-900/80 [&_code]:text-indigo-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:border [&_code]:border-slate-700/50 [&_code]:font-mono
                                  [&_pre]:bg-slate-900/80 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:text-xs [&_pre]:font-mono
                                  [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors
                                  [&_ul]:my-2 [&_ul]:pl-4 [&_li]:list-disc [&_li]:mb-1
                                  [&_ol]:my-2 [&_ol]:pl-4 [&_ol_li]:list-decimal
                                  [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-500/50 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:my-3 [&_blockquote]:italic [&_blockquote]:bg-slate-900/30 [&_blockquote]:py-1 [&_blockquote]:rounded-r
                                  [&_strong]:text-slate-100 [&_strong]:font-semibold
                                  [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-3 [&_img]:border [&_img]:border-slate-700/40
                                  [&_h1]:text-slate-100 [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2
                                  [&_h2]:text-slate-100 [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                                  [&_h3]:text-slate-200 [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1
                                "
                              />
                            ) : (
                              <p className="text-sm text-slate-300 leading-[1.75] whitespace-pre-wrap">{comment.body}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* Devコメントセクション */}
            {source === 'dev' && article.id && (
              <div className="mt-14">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Comments</h2>
                  </div>
                  {!commentsLoading && comments.length > 0 && (
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-900/40 border border-indigo-700/40 px-2 py-0.5 rounded-full">{comments.length}</span>
                  )}
                  <div className="flex-1 h-px bg-slate-700/50" />
                </div>

                {commentsLoading ? (
                  <div className="space-y-5">
                    {[1, 2, 3].map(i => (
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
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-3">
                      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">まだコメントはありません</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {comments.map((comment: any, idx: number) => {
                      const commentBodyClass = `text-sm text-slate-300 leading-[1.75]
                        [&_p]:mb-3 [&_p]:last:mb-0
                        [&_code]:bg-slate-900/80 [&_code]:text-indigo-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:border [&_code]:border-slate-700/50 [&_code]:font-mono
                        [&_pre]:bg-slate-900/80 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre]:border [&_pre]:border-slate-700/50 [&_pre]:text-xs [&_pre]:font-mono
                        [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors
                        [&_ul]:my-2 [&_ul]:pl-4 [&_li]:list-disc [&_li]:mb-1
                        [&_ol]:my-2 [&_ol]:pl-4 [&_ol_li]:list-decimal
                        [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-500/50 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:my-3 [&_blockquote]:italic [&_blockquote]:bg-slate-900/30 [&_blockquote]:py-1 [&_blockquote]:rounded-r
                        [&_strong]:text-slate-100 [&_strong]:font-semibold
                        [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-3 [&_img]:border [&_img]:border-slate-700/40
                      `;

                      const renderComment = (c: any, depth: number = 0) => {
                        const user = c.user as any;
                        const initial = (user?.id_code ?? '?')[0].toUpperCase();
                        return (
                          <div key={c.id_code ?? `dev-comment-${idx}-${depth}`}>
                            <div className={`group flex gap-4 py-5 ${ depth === 0 ? 'border-b border-slate-800/60 last:border-0' : ''}`}>
                              {/* アバター */}
                              <div className="flex-shrink-0">
                                {user?.profile_image ? (
                                  <img
                                    src={user.profile_image}
                                    alt={user.id_code}
                                    className="w-9 h-9 rounded-full border-2 border-slate-700/60 group-hover:border-indigo-600/50 transition-colors"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-800/60 to-purple-800/60 border-2 border-slate-700/60 group-hover:border-indigo-600/50 transition-colors flex items-center justify-center">
                                    <span className="text-xs text-indigo-200 font-bold">{initial}</span>
                                  </div>
                                )}
                              </div>

                              {/* 本文エリア */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-2.5">
                                  <span className="text-sm font-semibold text-slate-200">{user?.name ?? user?.id_code ?? '不明'}</span>
                                  {c.created_at && (
                                    <span className="text-xs text-slate-500">
                                      {new Date(c.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>

                                {c.body_html ? (
                                  <div dangerouslySetInnerHTML={{ __html: c.body_html }} className={commentBodyClass} />
                                ) : (
                                  <p className="text-sm text-slate-300 leading-[1.75] whitespace-pre-wrap">{c.body}</p>
                                )}

                                {/* 子コメント */}
                                {c.children && c.children.length > 0 && (
                                  <div className="mt-4 pl-4 border-l-2 border-slate-700/50 space-y-1">
                                    {c.children.map((child: any) => renderComment(child, depth + 1))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      };

                      return renderComment(comment, 0);
                    })}
                  </div>
                )}
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

      {/* 目次 (Table of Contents) */}
      {article && tocItems.length > 0 && (
        <div className="w-64 flex-shrink-0 pl-6 pr-6 py-8">
          <div className="sticky top-8">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  目次 ({tocItems.length})
                </h3>
              </div>
              <nav ref={tocNavRef} className="p-3 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide">
                {tocItems.map((item, index) => {
                  const isActive = item.id === activeHeadingId;
                  const indent = (item.level - 1) * 12;
                  
                  return (
                    <button
                      key={index}
                      data-heading-id={item.id}
                      onClick={() => scrollToHeading(item.id)}
                      className={`
                        w-full text-left text-base py-1.5 px-2 rounded transition-all
                        ${isActive 
                          ? 'text-indigo-300 bg-indigo-900/30 border-l-2 border-indigo-400 font-semibold' 
                          : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 border-l-2 border-transparent'
                        }
                      `}
                      style={{ paddingLeft: `${indent + 8}px` }}
                    >
                      <span className="line-clamp-2">{item.text}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
});

export default ArticleContent;
