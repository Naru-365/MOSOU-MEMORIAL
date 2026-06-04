# 新コンセプト実装アーキテクチャ

> 実装(beta) — コードは完成。実機ブラウザ検証はこれから。

---

## (a) 二つのフェーズ: onboarding → playing

キャラクターは **実体なし（フォームレス）** の状態で生まれる。`Character.currentLookId` が `null` または `looks` が空のとき、そのキャラはフォームレスと見なされる（`lib/onboarding.ts: isFormless()`）。

```
[作成] → phase: onboarding → 約10ラリーのヒアリング会話
    → onboarding.complete == true OR onboardingTurn >= 12
    → POST /api/generate-look で初回立ち絵を生成
    → addLook() + setCurrentLook() → phase: playing
```

| フェーズ | 条件 | `/api/chat` の動作 |
|---|---|---|
| `onboarding` | `isFormless(character) == true` | オンボーディングプロンプトで好みをヒアリング、`onboarding.complete` を返す |
| `playing` | `currentLookId` が確定済み | 通常の会話・嫉妬度・感情判定 |

フォームレス→誕生の遷移は `app/chat/page.tsx` 側で管理する。`onboarding.complete` を受け取り `/api/generate-look` を呼び出し、返ってきた `Look` を `addLook()` で書き込んで `setPhase('playing')` する。

---

## (b) lookId データモデル

### Look の構造 (`lib/types.ts`)

```ts
interface Look {
  id: string;
  label: string;           // 例: "初期" / "ボブにした" / "犬になった"
  attributes: LookAttributes; // 差分属性（hair/outfit/age/species/vibe/extra）
  images: Partial<Record<Emotion, string>>; // emotion -> data URL (ランタイムのみ)
  referenceImage?: string; // neutral data URL — 次の look の edit 参照 (ランタイムのみ)
  basePrompt?: string;     // 生成に使ったベースプロンプト（デバッグ/再生成用）
  createdAt: number;
}
```

`Character.looks` に全 Look の配列を保持し、`Character.currentLookId` でアクティブな Look を指す。

### identity と look を分離する理由

- **identity（その子であること）** は `CharacterProfile`（onboarding で収集）と `Look.referenceImage`（neutralの顔）に宿る。
- **look（外見スナップショット）** は変更可能な属性群。美容院・服・加齢・タイムスリップ・種族変化など、ストーリー上の変化のたびに新しい Look が生まれる。
- `gpt-image-2 edits` は直前 Look の `referenceImage`（neutral）を入力として受け取り、顔と雰囲気を維持しながら差分だけを変更する。これにより同一人物性を保ちつつ外見を動的に変えられる。
- `mergeLookAttributes(prev, change)` で変わらない属性は前の Look から引き継ぐため、「髪型だけ変えた」のに服装が消えるという問題を防ぐ。

---

## (c) エンドポイント

### `POST /api/chat` — onboarding モード

**リクエスト（抜粋）:**
```ts
{
  character: Character;
  userMessage: string;
  phase?: 'onboarding' | 'playing'; // 'onboarding' を指定
  onboardingTurn?: number;          // 経過ラリー数 (0-indexed)
  history: Message[];
  // ...
}
```

**レスポンス（onboarding 付き）:**
```ts
{
  reply: string;
  emotion: Emotion;
  affinityChange: number;
  jealousyChange: number;
  onboarding?: {
    complete: boolean;
    profile?: CharacterProfile; // complete == true のとき収集済みプロファイル
  };
}
```

- `onboardingTurn >= ONBOARDING_MAX_RALLIES (12)` のときはクライアント側が強制的に `complete` 扱いにする（`shouldCompleteOnboarding()` in `lib/onboarding.ts`）。
- `ONBOARDING_TARGET_RALLIES (10)` はモデルへのガイダンス（soft target）であり、モデルが十分と判断したら早期に `complete: true` を返せる。

### `POST /api/generate-look` — gpt-image-2 による立ち絵生成

**リクエスト:**
```ts
{
  characterName: string;
  profile?: CharacterProfile;     // onboarding 収集結果（初回 look で使用）
  attributes?: LookAttributes;    // hair/outfit/age/species/vibe/extra
  changeInstruction?: string;     // 自然言語の変更指示 (edits モードで使用)
  referenceImage?: string;        // 前 look の neutral データURL → edits モード
  emotions?: Emotion[];           // 省略時は ['neutral']
  size?: string;                  // デフォルト '1024x1536'（縦長バストアップ）
  quality?: 'low'|'medium'|'high'|'auto'; // デフォルト 'low'
}
```

**レスポンス:**
```ts
{
  images: Partial<Record<Emotion, string>>; // emotion -> data URL
  referenceImage: string;  // neutral の data URL（次回 edit の参照として保存）
  basePrompt: string;      // 使用したベースプロンプト
  attributes: LookAttributes;
}
```

**generations vs edits の分岐:**
- `referenceImage` なし → `POST /v1/images/generations` （初回 look）
- `referenceImage` あり → `POST /v1/images/edits` （外見変更）。FormData で前 look の neutral PNG を `image[]` として添付し、`same person, keep face and identity identical. <changeInstruction>. <emotionSuffix>` というプロンプトで差分生成する。

**エラーコード:**
| コード | HTTP | 意味 |
|---|---|---|
| `NO_IMAGE_API` | 503 | `OPENAI_API_KEY` 未設定 |
| `OPENAI_FAILED` | 502 | OpenAI API 呼び出しに失敗 |
| `BAD_REQUEST` | 400 | 必須フィールド不足 / JSON パース失敗 |

---

## (d) 環境変数とグレースフルデグラデーション

| 変数 | 必須 | 用途 |
|---|---|---|
| `GEMINI_API_KEY` | 必須 | `/api/chat` — Gemini 2.5 Flash による会話生成 |
| `OPENAI_API_KEY` | 任意 | `/api/generate-look` — gpt-image-2 による立ち絵生成 |

`OPENAI_API_KEY` が未設定の場合、`/api/generate-look` は HTTP 503 / `{ code: 'NO_IMAGE_API' }` を返す。フロントエンド（`app/chat/page.tsx`）はこのレスポンスをシルエット維持として扱い、`phase` を `onboarding` のまま通常チャットに移行させる（ゲームは止まらない）。`components/character-display.tsx` はフォームレス時にシルエット/名前イニシャル円を表示する。

---

## (e) 永続化とbase64の扱い

Zustand の `persist` ミドルウェア（`lib/store.ts`）は `partialize` でストレージ書き込み前にbase64画像を除去する。

```ts
partialize: (state) => ({
  ...state,
  characters: state.characters.map((c) => ({
    ...c,
    looks: (c.looks ?? []).map((l) => ({
      ...l,
      images: {},            // 全 emotion 画像を除去
      referenceImage: undefined,
    })),
  })),
  gameState: { ...state.gameState, isGeneratingLook: false },
}),
```

- **理由**: localStorage の容量上限は約 5–10 MB。1枚でも base64 PNG が入ると容量超過でデータ全体が消失するリスクがある。
- **結果**: リロード後は Look のメタデータ（`id`, `label`, `attributes`, `basePrompt`）は残るが `images` は空になる。アクティブな Look は `currentLookId` で特定できるため、UI 上で「再生成」を促すことが可能。
- ストアのバージョンは `v3`。古いスキーマからのマイグレーション（`migrate` 関数）も実装済み。

---

## (f) 新規・変更ファイルマップ

```
lib/
├ types.ts              // CharacterProfile / LookAttributes / Look / GamePhase を追加
├ store.ts              // Look CRUD (addLook/setCurrentLook/updateLookImages)、
│                       //   phase/onboarding state、v3 migration、partialize 追加
├ looks.ts              // NEW: createLook / getCurrentLook / mergeLookAttributes /
│                       //         detectLookChange / LookChangeIntent / LOOK_TRIGGERS
├ onboarding.ts         // NEW: isFormless / shouldCompleteOnboarding /
│                       //         ONBOARDING_TARGET_RALLIES / ONBOARDING_TOPICS
├ onboarding-prompt.ts  // NEW: Gemini へのオンボーディングシステムプロンプト構築
├ image-prompt.ts       // NEW: buildBaseLookPrompt / buildLookPromptForEmotion /
│                       //         buildEditPrompt / EMOTION_SUFFIX / TONE_ANCHOR
├ character-asset.ts    // resolveCharacterAsset() を追加
│                       //   (generatedSrc / pathSrc / formless の3段階解決)
└ api-types.ts          // GenerateLookRequest/Response/Error を追加

app/api/
├ chat/route.ts         // onboarding モード分岐を追加
└ generate-look/route.ts // NEW: gpt-image-2 generations / edits エンドポイント

app/
├ chat/page.tsx         // onboarding フロー + look 変更 + 生成スピナーを追加
└ characters/new/page.tsx // フォームレス作成エントリを追加

components/
└ character-display.tsx  // フォームレスシルエット + 生成画像表示を追加
```

---

## (g) 未検証/TODO

- **実機ブラウザ検証**: onboarding フローのターン感、立ち絵確定タイミング、外見変更のUI/UX。コードは完成しているが実際のブラウザ上での動作確認はこれから。
- **コスト制御**: 現状はラリーごと・外見変更ごとに `/api/generate-look` を呼び得る。レート制限・呼び出し上限・コスト監視の仕組みが未実装。`quality: 'low'` がデフォルトだが、1枚あたり $0.005（low）〜$0.165（high）かかる。
- **画像の永続化**: base64 は localStorage から除外されるためリロードで失われる。IndexedDB（例: Dexie.js）や R2/S3 への保存を将来的に検討する。
- **プロンプトのアイデンティティ一貫性**: `gpt-image-2` の edits は referenceImage を使っても顔のブレが起きうる（OpenAI 公式も明記）。プロンプトの調整・複数候補生成・リファレンス画像の作り直し運用が必要。
- **onboarding プロンプトチューニング**: 10ラリーでの収集項目の優先順位、モデルが早期 `complete` を返す条件の精度調整。
- **感情セット**: 現状の `/api/generate-look` は `emotions` を任意指定できるが、onboarding 完了時は `neutral` 1枚のみ生成するのがデフォルト。他の表情を生成するタイミング・コスト配分の設計が未確定。
