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
  isTranslated: boolean,
  processedHtml: string,
  containerRef: React.RefObject<HTMLElement | null>,
  translatedHtml: string | null,
) {
  const [popup, setPopup] = useState<SelectionPopupState>(INITIAL_STATE);
  const dismissRef = useRef(false);
  const isTranslatedRef = useRef(isTranslated);
  const translatedHtmlRef = useRef(translatedHtml);

  // isTranslatedRef / translatedHtmlRef を最新値に同期（クロージャ問題を回避）
  useEffect(() => { isTranslatedRef.current = isTranslated; }, [isTranslated]);
  useEffect(() => { translatedHtmlRef.current = translatedHtml; }, [translatedHtml]);

  // 指定した HTML ソースから選択範囲に対応するブロック要素のテキストを取り出す
  const findBlockTextInHtml = useCallback((selection: Selection, sourceHtml: string): string | null => {
    if (!sourceHtml || !containerRef.current) return null;
    const range = selection.getRangeAt(0);

    // ArticleBody の <article> 要素に絞る（ヘッダー・コメントとインデックスがずれないように）
    const articleEl = containerRef.current.querySelector('article') ?? containerRef.current;
    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, pre';
    const doc = new DOMParser().parseFromString(sourceHtml, 'text/html');
    const allBlocksInArticle = Array.from(articleEl.querySelectorAll(blockSelector));
    const allBlocksInDoc = Array.from(doc.querySelectorAll(blockSelector));

    // 選択範囲と交差するブロック要素を抽出
    const selectedBlocks = allBlocksInArticle.filter((el) => range.intersectsNode(el));
    if (selectedBlocks.length === 0) return null;

    const texts = selectedBlocks.map((blockEl) => {
      const id = blockEl.getAttribute('id');
      if (id) {
        return doc.getElementById(id)?.textContent?.trim() ?? null;
      }
      const index = allBlocksInArticle.indexOf(blockEl as HTMLElement);
      return allBlocksInDoc[index]?.textContent?.trim() ?? null;
    }).filter(Boolean) as string[];

    return texts.length > 0 ? texts.join('\n') : null;
  }, [containerRef]);

  const findBlockTextInHtmlRef = useRef(findBlockTextInHtml);
  // findBlockTextInHtmlRef を最新値に同期
  useEffect(() => { findBlockTextInHtmlRef.current = findBlockTextInHtml; }, [findBlockTextInHtml]);

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

      // 全体翻訳中は元HTMLから対応テキストを即抽出して表示（APIコール不要）
      if (isTranslatedRef.current) {
        const originalText = findBlockTextInHtmlRef.current(selection!, processedHtml);
        setPopup({
          visible: true,
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
          selectedText: text,
          translatedText: originalText ?? null,
          isTranslating: false,
          error: originalText === null ? '原文を取得できませんでした' : null,
        });
        return;
      }

      // 全体翻訳キャッシュがあれば翻訳済みHTMLから対応テキストを即抽出（APIコール不要）
      if (translatedHtmlRef.current) {
        const cachedText = findBlockTextInHtmlRef.current(selection!, translatedHtmlRef.current);
        setPopup({
          visible: true,
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
          selectedText: text,
          translatedText: cachedText ?? null,
          isTranslating: false,
          error: cachedText === null ? '翻訳文を取得できませんでした' : null,
        });
        return;
      }

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
        setPopup((prev) => {
          if (!prev.visible) return prev;
          // 翻訳済みモードの原文表示 or 通常の翻訳前ボタン表示中 → 選択解除で閉じる
          // 翻訳中 or 通常翻訳後の結果表示中 → ユーザが読んでいるので閉じない
          if (prev.isTranslating) return prev;
          if (!isTranslatedRef.current && prev.translatedText !== null) return prev;
          return INITIAL_STATE;
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

  return { popup, translate, dismiss, isTranslated };
}
