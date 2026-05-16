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
  const requestIdRef = useRef(0);
  const isTranslatedRef = useRef(isTranslated);
  const translatedHtmlRef = useRef(translatedHtml);
  const processedHtmlRef = useRef(processedHtml);

  // isTranslatedRef / translatedHtmlRef / processedHtmlRef を最新値に同期（クロージャ問題を回避）
  useEffect(() => { isTranslatedRef.current = isTranslated; }, [isTranslated]);
  useEffect(() => { translatedHtmlRef.current = translatedHtml; }, [translatedHtml]);
  useEffect(() => { processedHtmlRef.current = processedHtml; }, [processedHtml]);

  // 指定した HTML ソースから選択範囲に対応するセンテンス単位のテキストを取り出す
  const findSentenceTextInHtml = useCallback((selection: Selection, sourceHtml: string): string | null => {
    if (!sourceHtml || !containerRef.current) return null;
    const range = selection.getRangeAt(0);

    // ArticleBody の <article> 要素に絞る（ヘッダー・コメントとインデックスがずれないように）
    const articleEl = containerRef.current.querySelector('article') ?? containerRef.current;
    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, pre';
    const doc = new DOMParser().parseFromString(sourceHtml, 'text/html');
    const allBlocksInArticle = Array.from(articleEl.querySelectorAll(blockSelector));
    const allBlocksInDoc = Array.from(doc.querySelectorAll(blockSelector));

    const selectedBlocks = allBlocksInArticle.filter((el) => range.intersectsNode(el));
    if (selectedBlocks.length === 0) return null;

    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

    // 括弧・引用符の深さを追跡して内部の句読点では分割しない
    const splitSentences = (text: string): string[] => {
      const OPEN  = '「『（(【［"';
      const CLOSE = '」』）)】］"';
      const results: string[] = [];
      let depth = 0;
      let inStraightQuote = false;
      let start = 0;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
          const wasInQuote = inStraightQuote;
          inStraightQuote = !inStraightQuote;
          // 文末句読点で終わる閉じ引用符 + 次が大文字/日本語/文末 → 文境界として扱う
          // 例: "...happened." I'd seen it → split / "Are you ok?" Then → split
          // 例: She said "hello." and waved → no split（次が小文字）
          if (wasInQuote && i > 0) {
            const prev = text[i - 1];
            const isEndPunct = prev === '?' || prev === '!' || prev === '.' ||
                               prev === '？' || prev === '！' || prev === '。';
            if (isEndPunct) {
              let nextNonSpace = i + 1;
              while (nextNonSpace < text.length && /\s/.test(text[nextNonSpace])) nextNonSpace++;
              const nextChar = text[nextNonSpace];
              if (!nextChar || /[A-Z\u3040-\u9FFF]/.test(nextChar)) {
                const sentence = text.slice(start, i + 1).trim();
                if (sentence) results.push(sentence);
                start = nextNonSpace;
                i = start - 1;
              }
            }
          }
          continue;
        }
        if (OPEN.includes(ch))               { depth++; continue; }
        if (CLOSE.includes(ch) && depth > 0) { depth--; continue; }
        if (depth > 0 || inStraightQuote) continue;
        const isJpEnd = ch === '。' || ch === '！' || ch === '？';
        const isEnEnd = ch === '.' || ch === '!' || ch === '?';
        if (!isJpEnd && !isEnEnd) continue;
        // 英語句読点はスペース（または文末）が続く場合のみ文末とみなす
        if ((isEnEnd && i + 1 < text.length && !/\s/.test(text[i + 1]))) continue;
        // 句読点直後の閉じ括弧をスキップして文の終端位置を確定
        let j = i + 1;
        while (j < text.length && CLOSE.includes(text[j])) j++;
        const sentence = text.slice(start, j).trim();
        if (sentence) results.push(sentence);
        while (j < text.length && /\s/.test(text[j])) j++;
        start = j;
        i = start - 1;
      }
      const last = text.slice(start).trim();
      if (last) results.push(last);
      return results;
    };

    // 各センテンスの [start, end) をテキスト内から特定
    const getSentenceRanges = (text: string, sentences: string[]): Array<[number, number]> => {
      const ranges: Array<[number, number]> = [];
      let from = 0;
      for (const s of sentences) {
        const idx = text.indexOf(s, from);
        if (idx !== -1) {
          ranges.push([idx, idx + s.length]);
          from = idx + s.length;
        } else {
          ranges.push([from, from]);
        }
      }
      return ranges;
    };

    const texts = selectedBlocks.flatMap((blockEl): string[] => {
      // ソース側の対応ブロックを取得
      const id = blockEl.getAttribute('id');
      const sourceEl = id
        ? doc.getElementById(id)
        : allBlocksInDoc[allBlocksInArticle.indexOf(blockEl as HTMLElement)] ?? null;
      if (!sourceEl) return [];

      const srcText = normalize(sourceEl.textContent ?? '');
      const domText = normalize(blockEl.textContent ?? '');
      if (!srcText || !domText) return [];

      // このブロック内で選択されているテキストを取得（範囲をブロックにクランプ）
      const clampedRange = range.cloneRange();
      if (!blockEl.contains(range.startContainer) && blockEl !== range.startContainer) {
        clampedRange.setStart(blockEl, 0);
      }
      if (!blockEl.contains(range.endContainer) && blockEl !== range.endContainer) {
        clampedRange.setEnd(blockEl, blockEl.childNodes.length);
      }
      const selectedInBlock = normalize(clampedRange.toString());

      if (!selectedInBlock) return [srcText];

      // domText 内の選択位置を特定
      const selStart = domText.indexOf(selectedInBlock);
      if (selStart === -1) return [srcText]; // 完全一致なし → ブロック全体を返す

      const selEnd = selStart + selectedInBlock.length;
      const domSentences = splitSentences(domText);
      const srcSentences = splitSentences(srcText);
      const sentenceRanges = getSentenceRanges(domText, domSentences);

      // 選択範囲と重なるセンテンスのインデックスを抽出
      const matchingIndices = sentenceRanges
        .map(([s, e], i) => (e > selStart && s < selEnd ? i : -1))
        .filter((i): i is number => i !== -1);

      const matched = matchingIndices
        .filter(i => i < srcSentences.length)
        .map(i => srcSentences[i]);

      return matched.length > 0 ? matched : [srcText];
    });

    const result = texts.filter(Boolean).join('\n');
    return result || null;
  }, [containerRef]);

  const findSentenceTextInHtmlRef = useRef(findSentenceTextInHtml);
  // findSentenceTextInHtmlRef を最新値に同期
  useEffect(() => { findSentenceTextInHtmlRef.current = findSentenceTextInHtml; }, [findSentenceTextInHtml]);

  const dismiss = useCallback(() => {
    requestIdRef.current++;
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

      if (!selection || selection.rangeCount === 0) {
        dismiss();
        return;
      }

      const range = selection.getRangeAt(0);

      // コンテナ外の選択はポップアップを閉じて無視
      if (containerRef.current && !containerRef.current.contains(range.commonAncestorContainer)) {
        dismiss();
        return;
      }

      const rect = range.getBoundingClientRect();

      // 全体翻訳中は元HTMLから対応テキストを即抽出して表示（APIコール不要）
      if (isTranslatedRef.current) {
        const originalText = findSentenceTextInHtmlRef.current(selection, processedHtmlRef.current);
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
        const cachedText = findSentenceTextInHtmlRef.current(selection, translatedHtmlRef.current);
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
    const selectedText = popup.selectedText.trim();
    if (!selectedText) return;
    const requestId = ++requestIdRef.current;
    setPopup((prev) => ({ ...prev, isTranslating: true, error: null, translatedText: null }));
    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [selectedText],
          targetLang,
          tagHandling: false,
        }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          const errData = await res.json().catch(() => ({})) as { error?: string };
          if (errData.error === 'quota_exceeded') {
            throw new Error('DeepLの翻訳上限に達しました。今月の文字数上限を超えています。');
          }
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const translated: string = data.translations?.[0] ?? '';
      setPopup((prev) => {
        if (requestId !== requestIdRef.current || prev.selectedText !== selectedText) return prev;
        return { ...prev, isTranslating: false, translatedText: translated };
      });
    } catch (err) {
      setPopup((prev) => {
        if (requestId !== requestIdRef.current) return prev;
        return {
          ...prev,
          isTranslating: false,
          error: err instanceof Error ? err.message : '翻訳に失敗しました',
        };
      });
    }
  }, [popup.selectedText, targetLang]);

  return { popup, translate, dismiss, isTranslated };
}
