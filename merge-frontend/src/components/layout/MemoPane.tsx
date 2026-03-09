'use client';

import React from 'react';
import clsx from 'clsx';
import type { MouseEvent } from 'react';
import MemoEditor from '../MemoEditor';
import type { Article } from '../../types/article';

interface MemoPaneProps {
  selectedArticle: Article | null;
  memoWidth: number;
  isResizing: boolean;
  onMouseDown: () => void;
  onArticleSaved: (article: Article) => void;
}

const resizer = {
  base: 'w-1 bg-slate-700 hover:bg-indigo-500 transition-colors cursor-col-resize',
  active: 'bg-indigo-500',
} as const;

export default function MemoPane({ selectedArticle, memoWidth, isResizing, onMouseDown, onArticleSaved }: MemoPaneProps) {
  return (
    <>
      {/* Resizer handle */}
      <div
        onMouseDown={onMouseDown}
        className={clsx(resizer.base, isResizing && resizer.active)}
      />

      {/* Desktop memo panel */}
      <aside
        style={{ width: memoWidth }}
        className="flex-shrink-0 flex flex-col border-l border-slate-800 bg-[#0F172A] z-20 hidden lg:flex overflow-hidden"
      >
        <MemoEditor targetArticle={selectedArticle} onArticleSaved={onArticleSaved} />
      </aside>
    </>
  );
}
