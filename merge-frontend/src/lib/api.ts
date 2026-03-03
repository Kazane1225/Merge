// API ベース URL を一元管理。本番では環境変数 NEXT_PUBLIC_API_BASE で上書き可能
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080/api';
