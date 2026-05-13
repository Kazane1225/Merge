'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '../lib/api';

export interface SelectionPopupState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  translatedText: string | null;
  isTranslating: boolean;
  error: string | null;
}

const INITIAL_STATE: SelectionPopupState = {
  visible: false,
  x: 0,
  y: 0,
  selectedText: '',
  translatedText: null,
  isTranslating: false,
  error: null,
};

export function useSelectionTranslation(
  targetLang: 'JA' | 'EN',
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const [popup, setPopup] = useState<SelectionPopupState>(INITIAL_STATE);
  const dismissRef = useRef(false);

  const dismiss = useCallback(() => {
    dismissRef.current = true;
    setPopup(INITIAL_STATE);
  }, []);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // ポップアップ内のクリックは無視
      const target = e.target as HTMLElement;
      if (target.closest('[data-selection-popup]')) return;

      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? '';

      if (!text) {
        dismiss();
        return;
      }

      // コンテナ外の選択はポップアップを閉じて無視
      if (containerRef.current && selection?.rangeCount) {
        const range = selection.getRangeAt(0);
        if (!containerRef.current.contains(range.commonAncestorContainer)) {
          dismiss();
          return;
        }
      }

      const rect = selection!.getRangeAt(0).getBoundingClientRect();
      setPopup({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        selectedText: text,
        translatedText: null,
        isTranslating: false,
        error: null,
      });
    };

    // 選択解除を確実に検知: mouseup だけでは拾えないケースをカバー
    const handleSelectionChange = () => {
      const text = window.getSelection()?.toString().trim() ?? '';
      if (!text) {
        // 翻訳中・翻訳結果表示中・エラー表示中はユーザが読んでいるので閉じない
        setPopup((prev) => {
          if (prev.visible && !prev.isTranslating && prev.translatedText === null && prev.error === null) {
            return INITIAL_STATE;
          }
          return prev;
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, dismiss]);

  const translate = useCallback(async () => {
    setPopup((prev) => ({ ...prev, isTranslating: true, error: null, translatedText: null }));
    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [popup.selectedText],
          targetLang,
          tagHandling: false,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated: string = data.translations?.[0] ?? '';
      setPopup((prev) => ({ ...prev, isTranslating: false, translatedText: translated }));
    } catch (err) {
      setPopup((prev) => ({
        ...prev,
        isTranslating: false,
        error: err instanceof Error ? err.message : '翻訳に失敗しました',
      }));
    }
  }, [popup.selectedText, targetLang]);

  return { popup, translate, dismiss };
}
