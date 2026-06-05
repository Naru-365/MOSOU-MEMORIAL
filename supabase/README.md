# Supabase セットアップ

本アプリの Supabase 連携（生成画像の Storage 保存 + セーブデータ同期）を有効にする手順。

## 前提（`.env.local`）

```
NEXT_PUBLIC_SUPABASE_URL=...        # プロジェクト URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # 予約（現状クライアントからは未使用）
SUPABASE_SERVICE_ROLE_KEY=...       # サーバー専用。絶対に公開しない
```

## 手順

1. **テーブル作成**: Supabase Dashboard → SQL Editor で `schema.sql` を実行する。
   `public.saves`（`id text pk`, `data jsonb`, `updated_at`）と RLS 有効化が入る。
2. **Storage バケット**: `look-images` バケットは初回アップロード時にアプリが自動作成する
   （`app/api/looks/upload` の `ensureLookImagesBucket`）。手動作成する場合は
   Dashboard → Storage → New bucket → 名前 `look-images`、Public = ON。

## アーキテクチャ / セキュリティ

- 書き込みはすべて **サーバー API ルート**（`runtime = 'nodejs'`）経由で、Service Role を使用する。
- ブラウザは Storage の **public URL を読むだけ**。Service Role キーはクライアントへ出さない。
- 所有者識別は匿名 `saveId`（クライアント生成 UUID, localStorage 永続）。推測不能なケーパビリティとして機能する。
- `saves` は RLS 有効・public ポリシー無し（Service Role のみ通過）。
- 真のマルチユーザー保護が必要になったら Supabase Auth を導入し、`saveId` を `auth.uid()` ベースの所有権 + RLS ポリシーへ置き換える（将来フェーズ）。

## 関連ルート

| ルート | メソッド | 役割 |
|--------|----------|------|
| `/api/save` | GET `?saveId=` / PUT `{saveId,data}` | セーブの読み込み / 保存（upsert） |
| `/api/looks/upload` | POST `{saveId,characterId,lookId,images,referenceImage}` | 立ち絵を Storage へ保存し public URL を返す |

Supabase 未設定時、各ルートは 503 `NO_SUPABASE` を返し、アプリはローカル（localStorage）のみで動作を継続する。
