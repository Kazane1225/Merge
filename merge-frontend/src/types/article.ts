export interface ArticleTab {
  id: string;
  article: any;
  lastViewed: number;
}

export interface HistoryEntry {
  article: any;
  timestamp: number;
  tabId: string;
}
