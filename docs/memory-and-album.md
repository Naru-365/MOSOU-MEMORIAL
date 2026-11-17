# 長期記憶＋アルバム（改善3）

「直近10件しか見ていないので昔の話を忘れる」と「Look履歴が保存されているのに見返す画面がない（＝メモリアルが回収できていない）」への対応。

## 3a アルバム（メモリアル画面）
- 新ルート `/memorial`（下部ナビに「メモリアル」を追加）
- キャラごとに Look を新しい順のタイムラインで表示：画像（neutral）、ラベル、日付、属性チップ（髪／服／年齢／種族／雰囲気／メモ）、表情の所持数、「今の姿」バッジ
- **共有画像**: カードごとに「共有画像を保存」— 1080×1440 のキャンバスに画像＋名前＋ラベル＋日付を焼き込んだ PNG をダウンロードする（lib/share-image.ts）。CORS でキャンバスが汚染される場合は元画像のダウンロードにフォールバック
- 画像が無い Look（生成失敗の仮Look）は既存のフォールバック表示になる
- 関連: lib/memorial.ts（表示用ヘルパー）、app/memorial/page.tsx

## 3b 長期記憶
- `Character.memory`（lib/types.ts `CharacterMemory`）: 要約 summary＋ durable な facts（最大12件）＋要約済みターン数
- **蒸留**: プレイ中20ターンごと（lib/memory.ts `MEMORY_SUMMARY_INTERVAL`）に、直近40メッセージと既存メモリを `/api/memory/summarize`（Gemini、構造化出力）へ送り、統合された新しいメモリで置き換える。バックグラウンド実行で会話はブロックしない、失敗時は無音で次回再試行
- **注入**: チャットのヒロイン用システムプロンプトに「長期記憶」節を追加（lib/memory.ts `buildMemoryPromptSection`）。「自然に活かす／読み上げない／無い話は正直に」の指示付き
- **表示**: メモリアル画面には要約だけを「思い出ノート」として出す。facts の箇条書き生表示は彼女の内面をデータとして見せてしまい没入を壊すため、UIには出さない（Claudeレビュー＋改善1作り直しで変更）。facts はプロンプト注入専用
- **再試行の間引き**: 蒸留が失敗しても毎ターンは再試行しない。失敗から5ターン空ける（MEMORY_RETRY_INTERVAL）
- 保存範囲の注意:
  - ローカル（zustand persist）にはそのまま保存される
  - クラウド同期にはまだ載らない（characters テーブルに memory 列が無いため）。applyCloudData ではローカルの memory を id で引き継ぎ、クラウド読み込みで消えないようにしてある
  - クラウド対応する時は下記マイグレーションで jsonb 列を足し、sync ルートの行マッピングに memory を追加する

```sql
alter table characters add column if not exists memory jsonb;
```

## 未検証・残り
- 実機での蒸留品質（盛らない要約になっているか）と注入後の会話の自然さは verification-checklist と合わせて確認
- 共有画像は端末ダウンロードまで。OS共有シート（navigator.share）対応は将来
- 記憶のプレイヤー側編集（間違った記憶を消す等）は未実装
