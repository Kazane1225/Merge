import { useState, useEffect, RefObject, useMemo } from 'react';
import type { Article } from '../types/article';
import { processArticleHtml, TocItem } from '../lib/articleProcessor';

interface UseArticleHtmlResult {
  processedHtml: string;
  tocItems: TocItem[];
  readingTime: number;
}

/**
 * 記事HTMLの前処理・状態管理・Twitter埋め込み・リンク外部開きを担うフック。
 * contentRef はリンク外部開き処理でDOM参照に使用する。
 */
export function useArticleHtml(
  article: Article | null,
  contentRef: RefObject<HTMLDivElement | null>
): UseArticleHtmlResult {
  const [processedHtml, setProcessedHtml] = useState('');
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  // 記事が変わったらHTML前処理 → state更新
  useEffect(() => {
    if (article && (article.rendered_body || article.body_html)) {
      const { html, toc } = processArticleHtml(article.rendered_body || article.body_html || '');
      setProcessedHtml(html);
      setTocItems(toc);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    } else {
      setProcessedHtml('');
      setTocItems([]);
    }
  }, [article]);

  // Twitter埋め込みスクリプトの読み込みと再レンダリング
  useEffect(() => {
    if (!processedHtml.includes('twitter-tweet')) return;

    const loadTwitterWidgets = (): boolean => {
      const twttr = (window as any).twttr;
      if (!twttr || !twttr.widgets) return false;

      if (!contentRef.current) return true;
      const tweetContainers = contentRef.current.querySelectorAll('.twitter-tweet');

      tweetContainers.forEach((blockquote) => {
        if (blockquote.hasAttribute('data-tweet-rendered')) return;
        const link = blockquote.querySelector('a');
        const tweetUrl = link?.getAttribute('href');
        if (!tweetUrl) return;
        const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
        if (!tweetId) return;

        blockquote.setAttribute('data-tweet-rendered', 'true');
        const parent = blockquote.parentElement;
        if (!parent) return;

        const container = document.createElement('div');
        container.className = 'twitter-embed-wrapper';
        container.style.cssText = 'margin: 1.5rem auto; max-width: 550px;';
        parent.replaceChild(container, blockquote);

        twttr.widgets
          .createTweet(tweetId, container, { theme: 'dark', conversation: 'none', dnt: true, align: 'center' })
          .then((el: any) => { if (!el) container.appendChild(blockquote); })
          .catch(() => { container.appendChild(blockquote); });
      });

      return true;
    };

    const existingScript = document.getElementById('twitter-wjs');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      script.onload = () => setTimeout(loadTwitterWidgets, 150);
      document.body.appendChild(script);
    } else if ((window as any).twttr?.widgets) {
      setTimeout(loadTwitterWidgets, 50);
    } else {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (loadTwitterWidgets() || attempts >= 30) clearInterval(checkInterval);
      }, 200);
    }
  }, [processedHtml]);

  // 記事内のリンクを別タブで開く
  useEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (!link.hasAttribute('target')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }, [processedHtml]);

  // 読了時間（日本語400文字/分、英語200単語/分）
  const readingTime = useMemo(() => {
    if (!processedHtml) return 0;
    const plainText = processedHtml.replace(/<[^>]*>/g, '');
    const japaneseChars = (
      plainText.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/g) || []
    ).length;
    const englishWords = plainText.split(/\s+/).filter((w) => w.length > 0).length;
    return Math.ceil(japaneseChars / 400 + englishWords / 200);
  }, [processedHtml]);

  return { processedHtml, tocItems, readingTime };
}
