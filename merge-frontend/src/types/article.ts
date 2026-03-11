// ----- 著者ユーザー -----

/** Qiita / Dev.to 両方に対応する著者ユーザー型 */
export interface ArticleUser {
  id?: string;
  login?: string;               // Qiita ログインID
  name?: string;                // Qiita / Dev.to 表示名
  username?: string;            // Dev.to ユーザー名
  profile_image_url?: string;   // Qiita アバター
  profile_image?: string;       // Dev.to アバター
}

// ----- タグ -----

/** Qiita タグ形式 */
export interface QiitaTag {
  name: string;
  versions?: string[];
}

// ----- コメント -----

/** Qiita コメント */
export interface QiitaComment {
  id: string | number;
  rendered_body?: string;
  body?: string;
  created_at?: string;
  user?: Pick<ArticleUser, 'id' | 'login' | 'name' | 'profile_image_url'>;
}

/** Dev.to コメントのユーザー */
export interface DevCommentUser {
  name?: string;
  username?: string;
  id_code?: string;             // Dev.to ユニーク識別子
  profile_image?: string;
  profile_image_90?: string;
}

/** Dev.to コメント（children で再帰的にネスト） */
export interface DevComment {
  id: number;
  id_code?: string;
  body_html?: string;
  body?: string;
  created_at?: string;
  user?: DevCommentUser;
  children?: DevComment[];
}

// ----- 記事本体 -----

/**
 * Database・Qiita・Dev.to 三ソース共通の Article 型。
 *
 * - `id: number`   → DB 保存済み記事 or Dev.to 記事
 * - `id: string`   → Qiita 記事
 * - `rendered_body` → DB / Qiita 本文 HTML
 * - `body_html`     → Dev.to 本文 HTML
 * - `tags: QiitaTag[]` → Qiita / `tags: string[]` → Dev.to
 */
export interface Article {
  id: number | string;
  url: string;
  title: string;

  // 本文 HTML（ソースによってフィールド名が異なる）
  rendered_body?: string;   // DB / Qiita
  body_html?: string;       // Dev.to

  // カバー画像
  cover_image?: string;
  coverImage?: string;      // Java camelCase フォールバック

  // 公開日時
  created_at?: string;      // Qiita / DB
  published_at?: string;    // Dev.to

  // エンゲージメント
  likes_count?: number;               // Qiita
  likesCount?: number;                // Dev.to
  views?: number;                     // Dev.to

  // 著者・タグ
  user?: ArticleUser;
  tags?: (QiitaTag | string)[];

  // DB 保存済みコメント
  comments?: QiitaComment[];
  devComments?: DevComment[];
}

// ----- タブ / 履歴 -----

export interface ArticleTab {
  id: string;
  article: Article;
  lastViewed: number;
}

export interface HistoryEntry {
  article: Article;
  timestamp: number;
  tabId: string;
}
