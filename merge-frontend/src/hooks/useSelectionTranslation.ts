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

      // コンテナ外の選択は無視
      if (containerRef.current && selection?.rangeCount) {
        const range = selection.getRangeAt(0);
        if (!containerRef.current.contains(range.commonAncestorContainer)) {
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

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
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
