# Qiita ユーザー別記事一覧機能

## 背景
- バックエンド: `GET /api/qiita/user/{userId}/articles` 実装済み
- フロント: 記事カードにプロフ画像を表示 → クリックでユーザー記事一覧に遷移する機能を追加

## 実装計画

- [x] 1. `ArticleUser` 型に`profile_image_url`があることを確認 → `Article.user` 型チェック
- [x] 2. `ArticleCard` に Qiita 用アバター表示 + `onUserClick` prop 追加
- [x] 3. `ArticleView` に `userView` state 追加、ユーザー記事フェッチ、ユーザーヘッダー + 記事一覧UI

## 完了条件
- Qiita タブの記事カードにアバター表示 ✅
- アバタークリック → ユーザー記事一覧に遷移（戻るボタンで元のリストへ）✅
- 型エラーなし ✅

## レビュー
- 実装ファイル: `src/components/ArticleView.tsx` のみ（変更を最小化）
- `userView` state で userId/name/profileImage を保持、fetchUserArticles で `/api/qiita/user/{userId}/articles` を呼び出し
- 遷移前の articles を `savedArticles` にバックアップ → 戻る時に復元
- アバターボタンは `e.stopPropagation()` で記事選択と分離
