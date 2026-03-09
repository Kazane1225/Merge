import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { Article, ArticleTab } from '../types/article';

const MAX_TABS = 5;

/**
 * タブの開閉・選択・Split View を管理するフック。
 * @param onNewTab 新規タブが追加された際に呼ばれるコールバック（履歴追加用）
 */
export function useTabManager(onNewTab: (article: Article, tabId: string) => void) {
  const [tabs, setTabs] = useState<ArticleTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [splitViewTabs, setSplitViewTabs] = useState<[string, string] | null>(null);

  const openTab = (article: Article) => {
    const id = String(article.id || article.url || Math.random());
    const existing = tabs.find(t => t.id === id);

    if (existing) {
      setTabs(prev => prev.map(t => t.id === id ? { ...t, lastViewed: Date.now() } : t));
      setActiveTabId(id);
      return;
    }

    const newTab: ArticleTab = { id, article, lastViewed: Date.now() };
    onNewTab(article, id);
    setTabs(prev => {
      if (prev.length >= MAX_TABS) {
        const oldest = prev.reduce((a, b) => b.lastViewed < a.lastViewed ? b : a);
        return [...prev.filter(t => t.id !== oldest.id), newTab];
      }
      return [...prev, newTab];
    });
    setActiveTabId(id);
  };

  const closeTab = (tabId: string, e?: MouseEvent) => {
    e?.stopPropagation();
    if (splitViewTabs && (splitViewTabs[0] === tabId || splitViewTabs[1] === tabId)) {
      setSplitViewTabs(null);
    }
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      const mostRecent = newTabs.length > 0
        ? newTabs.reduce((a, b) => b.lastViewed > a.lastViewed ? b : a)
        : null;
      setActiveTabId(mostRecent?.id ?? null);
    }
  };

  const clickTab = (tabId: string) => {
    setActiveTabId(tabId);
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, lastViewed: Date.now() } : t));
  };

  const toggleSplitView = (tabId: string, e?: MouseEvent) => {
    e?.stopPropagation();
    if (!splitViewTabs) {
      setSplitViewTabs([tabId, '']);
    } else if (splitViewTabs[0] === tabId || splitViewTabs[1] === tabId) {
      setSplitViewTabs(null);
    } else if (splitViewTabs[1] === '') {
      setSplitViewTabs([splitViewTabs[0], tabId]);
    } else {
      setSplitViewTabs([tabId, '']);
    }
  };

  const clearSplitView = () => setSplitViewTabs(null);

  const updateArticle = (savedArticle: Article) => {
    setTabs(prev =>
      prev.map(t =>
        t.article?.url === savedArticle.url ? { ...t, article: savedArticle } : t
      )
    );
  };

  return {
    tabs,
    activeTabId,
    splitViewTabs,
    openTab,
    closeTab,
    clickTab,
    toggleSplitView,
    clearSplitView,
    updateArticle,
  };
}
