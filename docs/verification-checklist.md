# 実機通し検証チェックリスト（③⑤①）

マージ後 `main` を手元で通し検証するための手順。CI/リモート環境には API キーが無いため、
ここは **ローカル（`.env.local` 設定済み）** での確認を前提とする。

## 前提

`.env.local` に以下を設定（詳細は `supabase/README.md`）：

| 変数 | 用途 |
|---|---|
| `GEMINI_API_KEY` | `/api/chat`（会話・③ Web検索グラウンディング） |
| `OPENAI_API_KEY` | `/api/generate-look`・`/api/generate-background`（⑤ 立ち絵/背景） |
| `NEXT_PUBLIC_SUPABASE_URL` ほか Supabase 一式 | `/api/sync`（① クラウドセーブ） |

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

## 静的確認（キー不要・このリポジトリでも実行可）

- [ ] `npx tsc --noEmit` が 0 エラー
- [ ] `pnpm build` 成功（全ルート生成）
- [ ] `/`・`/characters`・`/chat` がコンソールエラー 0 で描画

## ③ Web検索グラウンディング

- [ ] `設定` で **Web検索グラウンディング** を ON にする
- [ ] playing 中に現実話題（例：「最近のニュースは？」「今日の天気どう？」）を送る
- [ ] 返答に検索由来の事実が自然に織り込まれる
- [ ] OFF のとき、または grounding 失敗時は通常生成にフォールバックして会話が止まらない
- 参考：`app/api/chat/route.ts`（`extractGroundingQuery` / `fetchRealWorldContext`、2段構成）

## ⑤ シーン背景（会話駆動 + 手動）

- [ ] チャット開始直後の背景が **無地** であること（静的シーン画像が出ない）
- [ ] playing 中に場所/イベントの発話（例：「海に行きたい」「お祭り行こう」「カフェ行かない？」）を送ると
      背景が自動生成され切り替わる（`lib/scenes.ts: detectSceneChange` → `/api/generate-background`）
- [ ] キャラ画像エリア右上の **背景** ボタンでも生成できる（mood ベース）
- [ ] `OPENAI_API_KEY` 未設定時は 503/`NO_IMAGE_API` でエラー表示のみ、無地のままゲーム継続
- 参考：`lib/scenes.ts` / `lib/image-prompt.ts: buildBackgroundPrompt(…, sceneDescription)` / `app/chat/page.tsx: generateBackground()`

## ① クラウドセーブ

- [ ] 会話・好感度を進める
- [ ] リロード後に会話/好感度が復元される（`/api/sync` GET/PUT）
- [ ] 別デバイス（または別ブラウザ）でも復元される
- [ ] キャラを切り替えて戻ったとき、そのキャラの状態が初期化されない（`/api/sync/character`）
- 参考：`supabase/README.md`（`schema.sql` 実行、`look-images` バケット）

## ブランチ整理

- [ ] 旧フィーチャーブランチは削除済み（origin に `main` と作業ブランチのみ）
- [ ] 本変更の PR をマージしたら、作業ブランチ `claude/proceed-with-recommendations-vd7fln` も削除
