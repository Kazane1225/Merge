'use client';

import React, { useEffect, useRef } from 'react';
import type { SelectionPopupState } from '../../hooks/useSelectionTranslation';

interface SelectionTranslatePopupProps {
  popup: SelectionPopupState;
  targetLang: 'JA' | 'EN';
  isTranslated: boolean;
  onTranslate: () => void;
  onDismiss: () => void;
}

export default function SelectionTranslatePopup({
  popup,
  targetLang,
  isTranslated,
  onTranslate,
  onDismiss,
}: SelectionTranslatePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // ポップアップの位置をビューポート内に収める
  useEffect(() => {
    if (!popup.visible || !popupRef.current) return;
    const el = popupRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      el.style.transform = `translateX(calc(-50% - ${rect.right - window.innerWidth + 8}px))`;
    }
    if (rect.left < 8) {
      el.style.transform = `translateX(calc(-50% + ${8 - rect.left}px))`;
    }
  }, [popup.visible, popup.x]);

  if (!popup.visible) return null;

  const langLabel = targetLang === 'JA' ? '日本語' : '英語';

  return (
    <div
      ref={popupRef}
      data-selection-popup
      className="fixed z-50 -translate-x-1/2 -translate-y-full"
      style={{ left: popup.x, top: popup.y }}
    >
      {/* 吹き出し */}
      <div className="relative bg-slate-800 border border-slate-600/70 rounded-xl shadow-2xl shadow-black/60 overflow-hidden min-w-[180px] max-w-[400px]">
        {/* ヘッダー（通常モード: 翻訳ボタン） */}
        {popup.translatedText === null && !popup.isTranslating && !isTranslated && (
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              data-selection-popup
              onClick={onTranslate}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-white transition-colors whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {langLabel}に翻訳
            </button>
            <div className="w-px h-3 bg-slate-600" />
            <button
              data-selection-popup
              onClick={onDismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="閉じる"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 翻訳中 */}
        {popup.isTranslating && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            翻訳中…
          </div>
        )}

        {/* 翻訳結果 */}
        {popup.translatedText !== null && (
          <div className="flex flex-col" data-selection-popup>
            {isTranslated && (
              <div className="px-3 pt-2 pb-0">
                <span className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide">原文</span>
              </div>
            )}
            <div className="px-3 pt-2 pb-2">
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                {popup.translatedText}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-3 pb-2 border-t border-slate-700/60 pt-1.5">
              <span className="text-[10px] text-slate-500 mr-auto">DeepL</span>
              <button
                data-selection-popup
                onClick={onDismiss}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* エラー */}
        {popup.error && (
          <div className="px-3 py-2">
            <p className="text-xs text-red-400">{popup.error}</p>
            <button
              data-selection-popup
              onClick={onDismiss}
              className="mt-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              閉じる
            </button>
          </div>
        )}

        {/* 吹き出しの矢印 */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-600/70" />
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-[-1px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-800" />
      </div>
    </div>
  );
}
