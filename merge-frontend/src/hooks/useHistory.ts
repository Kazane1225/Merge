import { useState, useEffect } from 'react';
import type { Article, HistoryEntry } from '../types/article';

const MAX_HISTORY = 50;

/**
 * 記事閲覧履歴を管理するフック。
 * localStorage への永続化も担う。
 */
export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // 初回マウント時に localStorage から復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem('article-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  const addToHistory = (article: Article, tabId: string) => {
    const newEntry: HistoryEntry = { article, timestamp: Date.now(), tabId };
    setHistory(prev => {
      const updated = [newEntry, ...prev.filter(h => h.tabId !== tabId)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem('article-history', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save history', e);
      }
      return updated;
    });
  };

  return { history, addToHistory };
}
