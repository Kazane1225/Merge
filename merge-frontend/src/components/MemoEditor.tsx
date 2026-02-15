'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

export default function MemoEditor({ targetArticle }: { targetArticle: any }) {
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);
  const [showArticleBody, setShowArticleBody] = useState(false);

  useEffect(() => {
    // No-op effect to trigger when targetArticle changes
  }, [targetArticle]);

  useEffect(() => {
    if (!targetArticle) {
      setContent('');
      return;
    }
    
    // DBの記事（数値ID）
    if (typeof targetArticle.id === 'number') {
      fetch(`http://localhost:8080/api/article/${targetArticle.id}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setContent(data && data.length > 0 ? data[0].content : ''))
        .catch(() => {});
    } 
    // QiitaまたはDev.toの記事（URL）
    else if (targetArticle.url) {
      const safeUrl = encodeURIComponent(targetArticle.url);
      fetch(`http://localhost:8080/api/memos/search?url=${safeUrl}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setContent(data && data.length > 0 ? data[0].content : ''))
        .catch(() => {});
    } else {
      setContent('');
    }
  }, [targetArticle]);

  useEffect(() => {
    if (showArticleBody && (targetArticle?.rendered_body || targetArticle?.body_html)) {
      // Twitter Embed スクリプトをロード
      if (typeof window !== 'undefined' && (window as any).twttr) {
        setTimeout(() => {
          (window as any).twttr.widgets.load();
        }, 0);
      } else {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [showArticleBody, targetArticle?.rendered_body, targetArticle?.body_html]);

  const handleSave = async () => {
    if (!content) return;
    if (!targetArticle) {
      alert("記事が選択されていません");
      return;
    }
    try {
      const response = await fetch('http://localhost:8080/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: content,
          article: {
            id: typeof targetArticle.id === 'number' ? targetArticle.id : null,
            title: targetArticle.title,
            url: targetArticle.url,
            rendered_body: targetArticle.rendered_body || targetArticle.body_html,
            cover_image: targetArticle.cover_image || targetArticle.coverImage
          }
        }),
      });
      if (response.ok) alert('Saved successfully!');
    } catch (error) {
      // Handle error silently
    }
  };

  const insertMarkdown = (before: string, after: string = '') => {
    if (!textareaRef) return;
    const textarea = textareaRef;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selected + after + content.substring(end);
    setContent(newContent);
    
    setTimeout(() => {
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
      textarea.focus();
    }, 0);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0F172A] text-slate-300">
      <div className="flex items-center justify-between px-4 border-b border-slate-800 bg-[#0F172A] min-h-[56px]">
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded">
          <button
            onClick={() => setIsPreview(false)}
            className={`text-[10px] px-3 py-1 rounded transition-all ${!isPreview ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            WRITE
          </button>
          <button
            onClick={() => { setIsPreview(true); setShowArticleBody(false); }}
            className={`text-[10px] px-3 py-1 rounded transition-all ${isPreview && !showArticleBody ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            PREVIEW
          </button>
          {targetArticle && (targetArticle.rendered_body || targetArticle.body_html) && (
            <button
              onClick={() => { setIsPreview(true); setShowArticleBody(true); }}
              className={`text-[10px] px-3 py-1 rounded transition-all ${isPreview && showArticleBody ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ARTICLE
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-slate-400 hover:text-slate-200 text-xs px-3 py-1 rounded transition-colors"
            title="Markdownヘルプ"
          >
            ❔ ヘルプ
          </button>
          <button 
            onClick={handleSave}
            disabled={!targetArticle}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-sm transition-colors font-medium tracking-wide"
          >
            SAVE
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="border-b border-slate-800 bg-slate-800/30 p-4 text-xs text-slate-300 space-y-2 max-h-40 overflow-y-auto">
          <div className="font-bold text-slate-200 mb-2">📝 Markdownの基本</div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-slate-400"># 見出し</span></div>
            <div><span className="text-slate-400">**太字**</span></div>
            <div><span className="text-slate-400">- リスト</span></div>
            <div><span className="text-slate-400">- [ ] チェック</span></div>
            <div><span className="text-slate-400">`コード`</span></div>
            <div><span className="text-slate-400">[リンク](URL)</span></div>
          </div>
        </div>
      )}

      {!isPreview && (
        <div className="flex gap-1 px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex-wrap">
          <button onClick={() => insertMarkdown('# ', '')} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors" title="見出し">H</button>
          <button onClick={() => insertMarkdown('**', '**')} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors font-bold" title="太字">B</button>
          <button onClick={() => insertMarkdown('*', '*')} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors italic" title="斜体">I</button>
          <button onClick={() => insertMarkdown('- ')} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors" title="リスト">• リスト</button>
          <button onClick={() => insertMarkdown('- [ ] ')} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors" title="チェックリスト">☑ 項目</button>
          <button onClick={() => insertMarkdown('`', '`')} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors font-mono" title="インラインコード">&lt;&gt;</button>
          <button onClick={() => insertMarkdown('[', '](URL)')} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors" title="リンク">🔗</button>
          <div className="flex-1" />
          <button 
            onClick={() => insertMarkdown('\n```\n', '\n```\n')} 
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors" 
            title="コードブロック"
          >
            &lt;/&gt;
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        {!isPreview ? (
          <textarea 
            ref={setTextareaRef}
            className="w-full h-full p-4 bg-[#0F172A] text-slate-200 resize-none focus:outline-none font-mono text-sm leading-relaxed custom-scrollbar placeholder-slate-600"
            placeholder={targetArticle ? "// クリックして入力...\n// 上のボタンでフォーマットできます\n\n- 例えば、このように\n- リストが作れます\n\n**太字**や *斜体* も使えます" : "// Select an article..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        ) : showArticleBody && (targetArticle.rendered_body || targetArticle.body_html) ? (
          <div className="w-full h-full p-6 overflow-y-auto custom-scrollbar bg-[#0B1120]">
            <div className="article-body text-sm text-slate-300 prose prose-invert max-w-none">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: targetArticle.rendered_body || targetArticle.body_html || ''
                }} 
                className="prose prose-invert max-w-none
                  prose-p:text-slate-300 prose-p:mb-3
                  prose-headings:text-slate-100 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                  prose-strong:text-slate-200 prose-strong:font-bold
                  prose-em:text-slate-300 prose-em:italic
                  prose-code:text-amber-300 prose-code:bg-slate-800 prose-code:px-2 prose-code:py-1 prose-code:rounded
                  prose-pre:bg-slate-800 prose-pre:text-slate-300 prose-pre:p-4 prose-pre:rounded prose-pre:overflow-x-auto
                  prose-blockquote:text-slate-400 prose-blockquote:border-l-4 prose-blockquote:border-slate-600 prose-blockquote:pl-4 prose-blockquote:italic
                  prose-a:text-indigo-400 prose-a:hover:text-indigo-300 prose-a:underline
                  prose-img:rounded prose-img:shadow-lg
                  prose-li:text-slate-300
                  prose-table:border prose-table:border-slate-700
                  prose-thead:bg-slate-800
                  prose-th:border prose-th:border-slate-700 prose-th:text-slate-200 prose-th:p-2
                  prose-td:border prose-td:border-slate-700 prose-td:p-2
                  [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400
                  [&_iframe]:w-full [&_iframe]:rounded [&_iframe]:mt-4 [&_iframe]:mb-4
                "
              />
            </div>
          </div>
        ) : (
          <div className="w-full h-full p-6 overflow-y-auto custom-scrollbar bg-[#0B1120]">
            <div className="qiita-content text-sm">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code(props: any) {
                    const {node, inline, className, children, ...rest} = props;
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : 'text';
                    
                    if (!inline && match) {
                      return (
                        <SyntaxHighlighter
                          style={atomOneDark as any}
                          language={language}
                          PreTag="div"
                          className="rounded-lg my-3 !bg-slate-900 !p-4"
                          {...rest}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      );
                    }
                    return (
                      <code className="bg-slate-800 text-amber-300 px-2 py-1 rounded text-xs font-mono" {...rest}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {content || '*No content*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      
      <div className="h-8 border-t border-slate-800 flex items-center px-4 gap-4 text-[10px] text-slate-500 font-mono bg-[#0B1120]">
        <span>{content.length} chars</span>
        <div className="flex-1" />
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${targetArticle ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
          {targetArticle ? 'Linked' : 'Waiting'}
        </span>
      </div>
    </div>
  );
}