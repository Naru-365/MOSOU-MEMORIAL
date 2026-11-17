# 表情差分（改善2: コア表情セット）

立ち絵が neutral 1枚しかなく、会話で表情が返ってきても顔が変わらなかった問題への対応。

## 仕様
- コア表情は **happy / blush / tsun** の3種（lib/emotion.ts `CORE_EXPRESSION_EMOTIONS`）。neutral と合わせて1つの Look が最低4表情を持つ
- 生成タイミングは2か所で共通（app/chat/page.tsx `generateCoreExpressions`）
  1. 誕生の確定直後（選ばれた候補の neutral を参照に）
  2. プレイ中の外見変化で新しい Look が確定した直後（新しい neutral を参照に）
- どちらも **バックグラウンド生成** で、誕生・変化の瞬間自体はブロックしない。**完全無音**（スピナーも告知ノートもなし）: 初めて happy の返事が来た時に笑顔が「もうそこにある」ことが演出になる（改善1作り直しで Claude レビューを受けて変更）
- 生成方法は参照画像の edits で、指示文は「服・髪型・髪色・背景はそのまま、表情だけ変える」（`EXPRESSION_ONLY_INSTRUCTION`）。同一人物性は参照画像と表情サフィックスで担保する
- 揃ったら無音で `updateLookImages` で Look に合成し、Storage へもアップロードする
- 失敗は無音でよい: 表示側（resolveCharacterAsset）は表情画像が無い場合に neutral へフォールバックする既存仕様なので、欠けた表情は neutral 表示のままになる

## API側の変更（app/api/generate-look/route.ts）
- 参照画像がある呼び出しでは neutral の再生成を強制しない。表情だけの呼び出し（emotions: ['happy','blush','tsun']）がそのまま通り、無駄な neutral 生成が1枚減る
- 参照画像がある場合、単一表情の失敗でリクエスト全体を 502 にしない（参照画像自体がフォールバックになる）
- レスポンスの referenceImage は、新しい neutral が無い場合は入力の参照画像をそのまま返す

## 残り
- angry / surprised / laugh / sad は未生成のままで neutral フォールバック。利用頻度を見て追加するか、オンデマンド生成（その表情が初めて必要になった時に生成してキャッシュ）にするかは今後の判断
- 実機での同一人物性・所要時間の確認は verification-checklist の実機確認と合わせて行う
