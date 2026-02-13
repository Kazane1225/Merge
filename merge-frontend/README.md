# Merge Frontend

Merge のフロントエンド（Next.js）です。Backend（Spring Boot）と通信して記事検索・メモ保存を行います。

- Frontend: http://localhost:3000
- Backend(API): http://localhost:8080

## Requirements

- Node.js
- Backend が起動していること（ルートで `docker compose up --build -d`）

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` 開発サーバ起動
- `npm run build` ビルド
- `npm run start` 本番起動（build後）
- `npm run lint` ESLint

## API

フロントは主に以下のエンドポイントを利用します。

- `GET /api/articles` / `GET /api/articles/search`
- `GET /api/qiita/search|hot|timeline|article/{id}`
- `GET /api/dev/search|hot|timeline|article/{id}`
- `GET /api/memos/search?url=...`
- `POST /api/memos`

## Where to look

- UI本体: `src/app/page.tsx`
- 左サイドバー（記事一覧/検索）: `src/components/ArticleView.tsx`
- メモ: `src/components/MemoEditor.tsx`

## Notes

- API のベースURLは現状 `http://localhost:8080/api` を前提にしています。
- リポジトリ全体の起動方法はルートの README を参照してください。
