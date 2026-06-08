# Supabase セットアップ

本アプリの Supabase 連携（生成画像の Storage 保存 + セーブデータの正規化同期）を有効にする手順。

## 前提（`.env.local`）

```
NEXT_PUBLIC_SUPABASE_URL=...        # プロジェクト URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # 予約（現状クライアントからは未使用）
SUPABASE_SERVICE_ROLE_KEY=...       # サーバー専用。絶対に公開しない
```

## 手順

1. **テーブル作成**: Supabase Dashboard → SQL Editor で `schema.sql` を実行する。
   `characters` / `looks` / `messages` / `game_states` の4テーブル、インデックス、RLS 有効化が入る
   （`create ... if not exists` のため既存テーブルがあっても安全に再実行できる）。
2. **Storage バケット**: `look-images` バケットは初回アップロード時にアプリが自動作成する
   （`app/api/looks/upload` の `ensureLookImagesBucket`）。手動作成する場合は
   Dashboard → Storage → New bucket → 名前 `look-images`、Public = ON。

## データモデル

セーブは `device_id`（= クライアントの匿名 `saveId`）でスコープされた正規化スキーマに保存される。

| テーブル | 内容 | 対応する型 |
|----------|------|-----------|
| `characters` | キャラ本体（device_id スコープ） | `Character` |
| `looks` | 立ち絵スナップショット（`images` jsonb = `{emotion: Storage URL}`、`reference_image` = 参照 URL） | `Look` |
| `messages` | アクティブキャラの会話ログ | `Message` |
| `game_states` | (device_id, character_id) ごとの好感度・嫉妬・ターン・フェーズ | `GameState` の一部 |

`interrupters` と `settings` は**アプリローカル設定**で DB テーブルを持たない（同期対象外）。

## アーキテクチャ / セキュリティ

- 書き込みはすべて **サーバー API ルート**（`runtime = 'nodejs'`）経由で、Service Role を使用する。
- ブラウザは Storage の **public URL を読むだけ**。Service Role キーはクライアントへ出さない。
- 所有者識別は匿名 `saveId`（クライアント生成 UUID, localStorage 永続、= `device_id`）。推測不能なケーパビリティとして機能する。
- 全テーブル RLS 有効・public ポリシー無し（Service Role のみ通過）。
- エンティティ ID は UUID（DB の uuid 列に一致）。既存 localStorage セーブは zustand persist の migrate v4 で UUID へ移行され、サーバー側でも UUID 形式を検証する。
- 真のマルチユーザー保護が必要になったら Supabase Auth を導入し、`device_id` を `auth.uid()` ベースの所有権 + RLS ポリシーへ置き換える（将来フェーズ）。

## 関連ルート

| ルート | メソッド | 役割 |
|--------|----------|------|
| `/api/sync` | GET `?saveId=` / PUT `{saveId,activeCharacterId,characters,gameState,messages,intent?}` | 正規化セーブの読み込み / 保存（characters/looks/messages/game_states を upsert・孤児削除） |
| `/api/looks/upload` | POST `{saveId,characterId,lookId,images,referenceImage}` | 立ち絵を Storage へ保存し public URL を返す |

Supabase 未設定時、各ルートは 503 `NO_SUPABASE` を返し、アプリはローカル（localStorage）のみで動作を継続する。

## 同期セマンティクス（既知の制限）

- **アクティブキャラ単位**: PUT はアクティブキャラの `game_states` と `messages` のみ書き込む。別端末ロード時は最新更新の `game_states` を「アクティブ」として復元する。
- **per-character 復元は将来送り**: `startSession` でキャラを切り替えると現状アプリは gameState を初期化する（既存挙動）。切替時に当該キャラの `game_states`/`messages` を再取得する機能は本マイルストーン対象外（フォローアップ）。
- **メッセージ置換**: アクティブキャラのログは delete+insert で全置換。署名（件数:末尾ID）が変化したときのみ送信。
- **リセット**: `resetAll` は次回 push で `intent:'reset'` を立て、空ロースター push でもリモートを消去できるようにする（誤った空 push はリモートを消さない）。
