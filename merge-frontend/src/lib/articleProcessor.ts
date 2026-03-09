import hljs from 'highlight.js';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

// ブラウザのみで呼び出される（useEffect内から）
const decodeHtmlEntities = (value: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

/**
 * 記事の生HTMLを受け取り、各種埋め込み変換・シンタックスハイライトを適用する。
 * useEffect内（ブラウザ環境）でのみ呼び出すこと。
 */
export function processArticleHtml(rawHtml: string): { html: string; toc: TocItem[] } {
  let html = rawHtml;

  // 絵文字imgにインラインスタイルを付与（Tailwindの[&_img]スタイルを上書き）
  html = html.replace(
    /<img([^>]*class="[^"]*emoji[^"]*"[^>]*)>/gi,
    (_match: string, attrs: string) => {
      return `<img${attrs} style="display:inline;vertical-align:middle;margin:0 2px;border:none;border-radius:0;box-shadow:none;width:1.2em;height:1.2em;">`;
    }
  );

  // QiitaのTwitter埋め込みiframeをblockquoteに変換
  html = html.replace(
    /<iframe[^>]*id="([^"]*)"[^>]*src="https:\/\/qiita\.com\/embed-contents\/tweet[^"]*"[^>]*data-content="([^"]*)"[^>]*>[\s\S]*?<\/iframe>/gi,
    (_: string, __: string, dataContent: string) => {
      const twitterUrl = decodeURIComponent(dataContent);
      return `<blockquote class="twitter-tweet" data-lang="ja" data-dnt="true" data-theme="dark"><a href="${twitterUrl}" target="_blank" rel="noopener noreferrer">ツイートを表示</a></blockquote>`;
    }
  );

  // 見出しにIDを付与してTOCを生成
  const toc: TocItem[] = [];
  let headingCounter = 0;
  html = html.replace(
    /<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match: string, tag: string, attributes: string, text: string) => {
      headingCounter++;
      const existingIdMatch = attributes.match(/id=["']([^"']*)["']/);
      const id = existingIdMatch ? existingIdMatch[1] : `heading-${headingCounter}`;
      const level = parseInt(tag.substring(1));
      const plainText = text.replace(/<[^>]*>/g, '').trim();
      if (plainText) {
        toc.push({ id, text: plainText, level });
      }
      const cleanAttributes = attributes.replace(/id=["'][^"']*["']/g, '').trim();
      const finalAttributes = cleanAttributes ? ` ${cleanAttributes}` : '';
      return `<${tag} id="${id}"${finalAttributes}>${text}</${tag}>`;
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

  // YouTubeサムネイル画像を高解像度版に置き換え（onerrorはdata属性で後からアタッチ）
  html = html.replace(
    /src="https:\/\/(?:img|i)\.youtube\.com\/vi\/([^/]+)\/(?:default|mqdefault|sddefault|hqdefault|maxresdefault)\.(?:jpg|webp)"/gi,
    'src="https://i.ytimg.com/vi/$1/maxresdefault.jpg" loading="lazy" decoding="async" data-yt-id="$1"'
  );

  // シンタックスハイライト
  html = html.replace(
    /<pre([^>]*)>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_match: string, preAttrs: string, codeAttrs: string, codeContent: string) => {
      const classMatch = codeAttrs.match(/class=["']([^"']*)["']/i);
      const originalClasses = classMatch ? classMatch[1] : '';
      const languageClass = originalClasses
        .split(/\s+/)
        .find((c) => c.startsWith('language-') || c.startsWith('lang-'));
      const normalizedLanguage = languageClass
        ? languageClass.replace(/^language-/, '').replace(/^lang-/, '').toLowerCase()
        : undefined;
      // Qiitaのrendered_bodyはすでにハイライト済みHTMLスパンを含む場合があるため、
      // 既存のHTMLタグを取り除いてから再ハイライトする
      const strippedCode = codeContent.replace(/<[^>]*>/g, '');
      const decodedCode = decodeHtmlEntities(strippedCode);
      try {
        const highlighted =
          normalizedLanguage && hljs.getLanguage(normalizedLanguage)
            ? hljs.highlight(decodedCode, { language: normalizedLanguage, ignoreIllegals: true })
            : hljs.highlightAuto(decodedCode);
        const finalClasses = originalClasses
          .split(/\s+/)
          .filter(Boolean)
          .filter((c) => c !== 'hljs')
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

  return { html, toc };
}
