'use client';

import React from "react";
import clsx from 'clsx';
import { getArticleSource, getBadgeClasses, getSourceLabel } from "../lib/articleHelpers";
import { HistoryEntry, Article } from "../types/article";

const styles = {
  card: "p-4 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-indigo-500/50 rounded-lg cursor-pointer transition-all group",
  badge: "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border flex-shrink-0",
  dateHeader: "text-sm font-bold text-indigo-400 mb-3 sticky top-0 bg-[#0B1120]/95 backdrop-blur py-2 border-b border-slate-800",
};

interface HistoryViewProps {
  history: HistoryEntry[];
  onSelectArticle: (a: Article) => void;
  className?: string;
}

export default function HistoryView({ history, onSelectArticle, className }: HistoryViewProps) {
  const groupByDate = (entries: HistoryEntry[]) => {
    const groups: { [key: string]: HistoryEntry[] } = {};
    entries.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  };

  const grouped = groupByDate(history);

  return (
    <div className={clsx('overflow-y-auto bg-[#0B1120] custom-scrollbar', className)}>
      <div className="w-full max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-3xl font-bold text-slate-100 mb-8 flex items-center gap-3">
          <span>🕐</span>
          <span>閲覧履歴</span>
        </h2>

        {history.length === 0 ? (
          <div className="text-center text-slate-500 mt-20 font-mono text-sm">
            <p>まだ履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, entries]) => (
              <div key={date}>
                <h3 className={styles.dateHeader}>
                  {date}
                </h3>
                <div className="space-y-2">
                  {entries.map((entry, idx) => {
                    const source = getArticleSource(entry.article);
                    const badgeLabel = getSourceLabel(source);
                    const time = new Date(entry.timestamp).toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={`${entry.tabId}-${idx}`}
                        onClick={() => onSelectArticle(entry.article)}
                        className={styles.card}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-slate-500 font-mono mt-1">{time}</span>
                          <span className={clsx(styles.badge, getBadgeClasses(source))}>
                            {badgeLabel}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2">
                              {entry.article.title || 'Untitled'}
                            </h4>
                            {entry.article.url && (
                              <p className="text-xs text-slate-500 mt-1 truncate">{entry.article.url}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
