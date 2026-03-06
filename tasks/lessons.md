# Lessons Learned

## 2026-03-06

### UIのどこに機能を置くかを事前に確認する

**状況**: Qiitaユーザーの記事一覧機能を実装する際、「ユーザーアイコンをクリックして記事一覧を表示」という要件を受けたが、アイコンの設置場所を確認しなかった。

**ミス**: 記事カード（ArticleCard）にアバターを実装したが、ユーザーが意図していたのは記事読み取り画面のヘッダー（ArticleHeader）への実装だった。

**正しい対応**: UIの「どの画面の、どの位置に」表示するかを先に確認または参考画像を求めてから実装する。参考スクリーンショットがあれば事前に見せてもらう。

**教訓**: 機能を「どこに置くか」は実装と同じくらい重要。特に複数のコンポーネントに実装できる場合は、ユーザーの意図を最初に確認する。

---

### forwardRef + useImperativeHandle パターン

異なるコンポーネントツリーにいるコンポーネント間でメソッドを呼び出す場合：

- 子コンポーネント（ArticleView）を `React.forwardRef` でラップ
- `useImperativeHandle` でメソッドを公開
- 親（page.tsx）で `useRef<HandleType>(null)` を作成して ref を渡す
- ステールクロージャを避けるため、state を参照する関数は `useRef` で最新値を保持する

```tsx
// 公開する型を export する
export interface ArticleViewHandle {
  viewUserArticles: (userId: string, name: string, profileImage: string) => void;
}

// articlesRef で常に最新の articles を保持
const articlesRef = useRef<Article[]>([]);
useEffect(() => { articlesRef.current = articles; }, [articles]);

useImperativeHandle(ref, () => ({ viewUserArticles }), []);
```
