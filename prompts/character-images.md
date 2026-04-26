# キャラ画像 生成プロンプト集

実写風（photorealistic）の美少女画像を、Midjourney / DALL-E 3 / Imagen / Stable Diffusion (Realistic Vision系) などで生成するためのプロンプトテンプレートです。

## 使い方

1. キャラの「見た目」と「性格」を選ぶ
2. 5つの感情ごとにベースプロンプト＋見た目＋性格＋感情を結合してコピペ
3. 生成された画像をスマホに保存
4. アプリのキャラ作成・編集画面で各感情スロットにアップロード

## ベースプロンプト（すべてに共通）

```
photorealistic portrait of a young Japanese woman in her early twenties,
{APPEARANCE}, {PERSONALITY}, {EMOTION},
soft natural lighting, shallow depth of field, 50mm lens,
professional photography, high detail, 4k, sharp focus,
upper body shot, plain warm beige background
```

否定プロンプト（SD系で使う場合）:
```
nsfw, nude, lowres, bad anatomy, bad hands, blurry, distorted, watermark, text, multiple people
```

---

## {APPEARANCE} — 見た目

| 種類 | プロンプト |
|---|---|
| **清楚系** | `wearing modest white blouse and beige cardigan, long straight black hair, minimal makeup, refined elegant features, delicate accessories` |
| **ギャル系** | `wearing trendy fashionable outfit, light brown wavy hair with highlights, polished makeup with glossy lips, statement earrings, confident posture` |
| **ナチュラル** | `wearing casual oversized cream sweater, shoulder-length soft brown hair, no-makeup look, relaxed natural beauty, simple silver necklace` |

## {PERSONALITY} — 性格

| 種類 | プロンプト |
|---|---|
| **優しい** | `warm gentle eyes, soft features, kind welcoming aura` |
| **クール** | `calm composed gaze, slight aloofness, intelligent sharp eyes` |
| **ツンデレ** | `slightly tense lips, sideways glance, subtle hint of blush, defensive posture` |

## {EMOTION} — 感情（5種類、すべての組み合わせで作成）

| キー | 用途 | プロンプト |
|---|---|---|
| **neutral** | デフォルト・中立 | `neutral calm expression, looking gently at camera, slight closed-mouth smile` |
| **happy** | 高好感度・嬉しい | `bright joyful smile showing teeth, eyes crinkled with happiness, head slightly tilted, cheerful energy` |
| **shy** | 照れ・赤面 | `cheeks visibly blushing pink, looking downward shyly, hand near mouth or hair, embarrassed expression` |
| **worried** | 困り・心配 | `worried troubled expression, slight frown, brows furrowed gently, hand resting near chin` |
| **angry** | 怒り・不機嫌 | `pouting upset expression, cheeks slightly puffed, arms crossed, looking away with mild frown` |

---

## 完全プロンプト例

### 例1: 清楚系 × 優しい × happy

```
photorealistic portrait of a young Japanese woman in her early twenties,
wearing modest white blouse and beige cardigan, long straight black hair, minimal makeup, refined elegant features, delicate accessories,
warm gentle eyes, soft features, kind welcoming aura,
bright joyful smile showing teeth, eyes crinkled with happiness, head slightly tilted, cheerful energy,
soft natural lighting, shallow depth of field, 50mm lens,
professional photography, high detail, 4k, sharp focus,
upper body shot, plain warm beige background
```

### 例2: ギャル系 × ツンデレ × shy

```
photorealistic portrait of a young Japanese woman in her early twenties,
wearing trendy fashionable outfit, light brown wavy hair with highlights, polished makeup with glossy lips, statement earrings, confident posture,
slightly tense lips, sideways glance, subtle hint of blush, defensive posture,
cheeks visibly blushing pink, looking downward shyly, hand near mouth or hair, embarrassed expression,
soft natural lighting, shallow depth of field, 50mm lens,
professional photography, high detail, 4k, sharp focus,
upper body shot, plain warm beige background
```

### 例3: ナチュラル × クール × angry

```
photorealistic portrait of a young Japanese woman in her early twenties,
wearing casual oversized cream sweater, shoulder-length soft brown hair, no-makeup look, relaxed natural beauty, simple silver necklace,
calm composed gaze, slight aloofness, intelligent sharp eyes,
pouting upset expression, cheeks slightly puffed, arms crossed, looking away with mild frown,
soft natural lighting, shallow depth of field, 50mm lens,
professional photography, high detail, 4k, sharp focus,
upper body shot, plain warm beige background
```

---

## 一貫性を保つコツ

同一キャラの5枚を作るときは、**最初の1枚（neutral）で生成された画像を「キャラリファレンス」として2枚目以降に渡す**と顔が安定します:

- **Midjourney**: `--cref <neutral画像URL> --cw 100`
- **Stable Diffusion**: ControlNet (Reference-only) または IP-Adapter
- **DALL-E 3**: 「上記キャラと同じ顔・髪型・服装で、表情だけ変えて」と日本語で追加指示

## 推奨サイズ

- アスペクト比: **3:4** または **4:5**（縦長ポートレート）
- 解像度: **768x1024** 以上
- アプリ側で512x512にリサイズして保存します

## アップロード手順（実装後）

1. キャラ作成画面で「画像を追加」→ 5つのスロット（neutral / happy / shy / worried / angry）
2. 各スロットにスマホから対応する画像を選択
3. AIの応答が `emotion: "happy"` を返したら自動で happy 画像を表示
