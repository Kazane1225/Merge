'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MemoEditor({ targetArticle }: { targetArticle: any }) {
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    if (!targetArticle) {
      setContent('');
      return;
    }
    if (typeof targetArticle.id === 'number') {
      fetch(`http://localhost:8080/api/article/${targetArticle.id}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setContent(data && data.length > 0 ? data[0].content : ''))
        .catch(console.error);
    } else if (targetArticle.url) {
      const safeUrl = encodeURIComponent(targetArticle.url);
      fetch(`http://localhost:8080/api/memos/search?url=${safeUrl}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setContent(data && data.length > 0 ? data[0].content : ''))
        .catch(console.error);
    } else {
      setContent('');
    }
  }, [targetArticle]);

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
            rendered_body: targetArticle.rendered_body
          }
        }),
      });
      if (response.ok) alert('Saved successfully!');
    } catch (error) {
      console.error('Error:', error);
    }
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
            onClick={() => setIsPreview(true)}
            className={`text-[10px] px-3 py-1 rounded transition-all ${isPreview ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            PREVIEW
          </button>
        </div>

        <button 
          onClick={handleSave}
          disabled={!targetArticle}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-sm transition-colors font-medium tracking-wide ml-4"
        >
          SAVE
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {!isPreview ? (
          <textarea 
            className="w-full h-full p-4 bg-[#0F172A] text-slate-200 resize-none focus:outline-none font-mono text-sm leading-relaxed custom-scrollbar placeholder-slate-600"
            placeholder={targetArticle ? "// Markdown supported.\n- List item\n- [ ] Task\n\n```python\nprint('Hello')\n```" : "// Select an article..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        ) : (
          <div className="w-full h-full p-6 overflow-y-auto custom-scrollbar bg-[#0B1120]">
            <div className="qiita-content text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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