'use client';

import { RefObject } from 'react';
import clsx from 'clsx';
import { TocItem } from '../lib/articleProcessor';

interface TableOfContentsProps {
  tocItems: TocItem[];
  activeHeadingId: string;
  onHeadingClick: (id: string) => void;
  navRef: RefObject<HTMLElement | null>;
}

/**
 * 記事の目次パネル。アクティブな見出しをハイライトし、クリックでスムーズスクロール。
 */
export default function TableOfContents({
  tocItems,
  activeHeadingId,
  onHeadingClick,
  navRef,
}: TableOfContentsProps) {
  if (tocItems.length === 0) return null;

  return (
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
          <nav
            ref={navRef}
            className="p-3 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide"
          >
            {tocItems.map((item, index) => {
              const isActive = item.id === activeHeadingId;
              const indent = (item.level - 1) * 12;
              return (
                <button
                  key={index}
                  data-heading-id={item.id}
                  onClick={() => onHeadingClick(item.id)}
                  style={{ paddingLeft: `${indent + 8}px` }}
                  className={clsx(
                    'w-full text-left text-base py-1.5 px-2 rounded transition-all border-l-2',
                    isActive
                      ? 'text-indigo-300 bg-indigo-900/30 border-indigo-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 border-transparent'
                  )}
                >
                  <span className="line-clamp-2">{item.text}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
