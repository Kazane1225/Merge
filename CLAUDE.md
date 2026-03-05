<span class="gu">## ワークフロー設計</span>

<span class="gu">### 1. Planモードを基本とする</span>
<span class="p">-</span> 3ステップ以上 or アーキテクチャに関わるタスクは必ずPlanモードで開始する
<span class="p">-</span> 途中でうまくいかなくなったら、無理に進めずすぐに立ち止まって再計画する
<span class="p">-</span> 構築だけでなく、検証ステップにもPlanモードを使う
<span class="p">-</span> 曖昧さを減らすため、実装前に詳細な仕様を書く

<span class="gu">### 2. サブエージェント戦略</span>
<span class="p">-</span> メインのコンテキストウィンドウをクリーンに保つためにサブエージェントを積極的に活用する
<span class="p">-</span> リサーチ・調査・並列分析はサブエージェントに任せる
<span class="p">-</span> 複雑な問題には、サブエージェントを使ってより多くの計算リソースを投入する
<span class="p">-</span> 集中して実行するために、サブエージェント1つにつき1タスクを割り当てる

<span class="gu">### 3. 自己改善ループ</span>
<span class="p">-</span> ユーザーから修正を受けたら必ず <span class="sb">`.tasks/lessons.md`</span> にそのパターンを記録する
<span class="p">-</span> 同じミスを繰り返さないように、自分へのルールを書く
<span class="p">-</span> ミス率が下がるまで、ルールを徹底的に改善し続ける
<span class="p">-</span> セッション開始時に、そのプロジェクトに関連するlessonsをレビューする

<span class="gu">### 4. 完了前に必ず検証する</span>
<span class="p">-</span> 動作を証明できるまで、タスクを完了とマークしない
<span class="p">-</span> 必要に応じてmainブランチと自分の変更の差分を確認する
<span class="p">-</span> 「スタッフエンジニアはこれを承認するか？」と自問する
<span class="p">-</span> テストを実行し、ログを確認し、正しく動作することを示す

<span class="gu">### 5. エレガントさを追求する（バランスよく）</span>
<span class="p">-</span> 重要な変更をする前に「もっとエレガントな方法はないか？」と一度立ち止まる
<span class="p">-</span> ハック的な修正に感じたら「今知っていることをすべて踏まえて、エレガントな解決策を実装する」
<span class="p">-</span> シンプルで明白な修正にはこのプロセスをスキップする（過剰設計しない）
<span class="p">-</span> 提示する前に自分の作業に自問自答する

<span class="gu">### 6. 自律的なバグ修正</span>
<span class="p">-</span> バグレポートを受けたら、手取り足取り教えてもらわずにそのまま修正する
<span class="p">-</span> ログ・エラー・失敗しているテストを見て、自分で解決する
<span class="p">-</span> ユーザーのコンテキスト切り替えをゼロにする
<span class="p">-</span> 言われなくても、失敗しているCIテストを修正しに行く
<span class="p">
---
</span>
<span class="gu">## タスク管理</span>
<span class="p">
1.</span> <span class="gs">**まず計画を立てる**</span>：チェック可能な項目として <span class="sb">`.tasks/todo.md`</span> に計画を書く
<span class="p">2.</span> <span class="gs">**計画を確認する**</span>：実装を開始する前に確認する
<span class="p">3.</span> <span class="gs">**進捗を記録する**</span>：完了した項目を随時マークしていく
<span class="p">4.</span> <span class="gs">**変更を説明する**</span>：各ステップで高レベルのサマリーを提供する
<span class="p">5.</span> <span class="gs">**結果をドキュメント化する**</span>：<span class="sb">`.tasks/todo.md`</span> にレビューセクションを追加する
<span class="p">6.</span> <span class="gs">**学びを記録する**</span>：修正を受けた後に <span class="sb">`.tasks/lessons.md`</span> を更新する
<span class="p">
---
</span>
<span class="gu">## コア原則</span>
<span class="p">
-</span> <span class="gs">**シンプル第一**</span>：すべての変更をできる限りシンプルにする。影響するコードを最小限にする。
<span class="p">-</span> <span class="gs">**手を抜かない**</span>：根本原因を見つける。一時的な修正は避ける。シニアエンジニアの水準を保つ。
<span class="p">-</span> <span class="gs">**影響を最小化する**</span>：変更は必要な箇所のみにとどめる。バグを新たに引き込まない。