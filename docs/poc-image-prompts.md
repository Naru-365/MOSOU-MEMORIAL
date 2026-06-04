# PoC 画像生成プロンプト集

方針：B案（AI画像生成）。**採用モデルは `gpt-image-2`（OpenAI GPT Image）**。
最重要は **同一人物の一貫性**で、`gpt-image-2` の **画像参照（reference images）による
編集（Edits）** を主軸にする。
そのため「キャラ基礎プロンプト（毎回固定）＋表情差分（可変）＋リファレンス顔を参照画像で渡す」
の構造にする。

> なぜ gpt-image-2（OpenAI公式仕様ベース）：
> - **Edits エンドポイント**に確定リファレンス顔を**参照画像**として渡し、新しい表情を生成できる。
> - `gpt-image-2` は **入力画像を常に高忠実度（high fidelity）で処理**するため `input_fidelity` の指定は不要（＝顔のディテールが保たれやすい）。
> - **Responses API のマルチターン編集**で「same person, change expression to ...」と反復指示でき、表情差分の作り込みに向く。
>
> ⚠️ 限界（公式明記）：それでも**複数回の生成で recurring character の見た目が揺れる**ことはある。だからリファレンス顔を固定し、ブレたら作り直す運用が前提。Midjourney / Imagen / SDXL は代替手段として後述。

## トーン共通アンカー

すべての画像に下記ニュアンスを通す：

- Photorealistic, 35mm, natural lighting, slight film grain
- Japanese TV drama still 風（広告・グラビア寄りにしない）
- 大衆向け、過度にセクシャルにしない
- 構図はキャラ表情＝バストアップ、背景＝引き

## 1. ヒロイン：清楚系（PoC本命）

### 基礎プロンプト（毎回固定で先頭に置く）

```
Photo of a 22-year-old Japanese woman, soft oval face, monolid eyes,
dark brown shoulder-length straight hair with bangs, minimal natural
makeup, wearing a white blouse with a beige cardigan, photorealistic,
35mm film photo, soft natural daylight from a window on the left,
plain light beige interior wall background, bust-up portrait, candid
amateur photography aesthetic, gentle film grain
```

### 表情差分（基礎の末尾に追加）

| キー | 追加プロンプト |
|---|---|
| `neutral` | `calm soft expression, looking at camera, mouth closed, relaxed shoulders` |
| `happy` | `bright open-mouth smile showing teeth, eyes squinted in joy, head slightly tilted` |
| `tsun` | `slight pout, looking away to the side, arms loosely crossed, mildly annoyed` |
| `blush` | `shy half-smile, light blush on cheeks, eyes glancing downward, hand near collarbone` |
| `angry` | `frowning hard, knit brows, lips pressed thin, direct glare into camera` |
| `surprised` | `eyes wide open, mouth slightly agape, eyebrows raised high, hands lifted near face` |
| `laugh` | `laughing out loud with one hand covering mouth, eyes closed, shoulders shaking` |
| `sad` | `downcast eyes, slight frown, looking at the floor, shoulders slumped` |

### ネガティブプロンプト（SD/SDXL系）

```
anime, manga, cartoon, illustration, 3d render, cgi, plastic skin,
airbrushed, glamour shot, high fashion editorial, oversexualized,
cleavage, swimwear, lingerie, low quality, blurry, deformed face,
extra limbs, extra fingers, watermark, text, logo, jpeg artifacts
```

## 2. 邪魔者：ツッコミ系（PoC本命）

ヒロインと**同じ照明・背景・画調**で並べたいので、共通アンカーは流用。

### 基礎プロンプト

```
Photo of a 25-year-old Japanese man, lean build, slightly messy black
hair, thin black-framed glasses, casual gray hoodie over a white tee,
photorealistic, 35mm film photo, soft natural daylight from a window
on the left, plain light beige interior wall background, bust-up,
candid amateur photography aesthetic, gentle film grain
```

### 表情差分

| キー | 追加プロンプト |
|---|---|
| `intro` | `leaning into frame from the right edge, mouth open mid-shout, index finger pointing forward, energetic tsukkomi gesture` |
| `peeved` | `frowning with hand on forehead, deep sigh expression, looking off-camera in exasperation` |
| `smug` | `slight smirk, arms crossed over chest, satisfied confident look` |

## 3. 背景

人物なし、登場人物の画調と馴染ませるため同じ画質感で生成する。

### `school`（PoC必須1枚）

```
Photo of an empty Japanese high school classroom in the afternoon,
rows of wooden desks and chairs, golden sunlight streaming through
large windows, chalkboard at the front, no people, photorealistic,
35mm film, slight film grain, wide shot, 16:9
```

### `night_park`（推奨）

```
Photo of a quiet Japanese suburban park at night, dim warm street
lamp, faint mist in the air, empty bench, no people, melancholy
atmosphere, photorealistic, 35mm film, shallow depth of field, 16:9
```

## 4. ツール別Tips

### 採用：`gpt-image-2`（OpenAI GPT Image）

| 項目 | 推奨 / 公式仕様 |
|---|---|
| API | 単発生成は **Image API**（`images.generate` / `images.edit`）。会話的に反復編集するなら **Responses API**（`image_generation` ツール、`previous_response_id` でマルチターン） |
| キャラ固定 | 確定した neutral を **参照画像**として **Edits（`images.edit`）** に渡し、新しい表情を生成。`gpt-image-2` は入力を**常に高忠実度で処理**（`input_fidelity` 指定不可・不要） |
| 表情差分 | 参照を付けたまま `"same person, change expression to <expr>, keep hair/outfit/lighting identical"`。複数枚は `n` パラメータで一括取得 |
| プロンプト | 先頭の `Photo of ...` を維持。語順は固定。基礎プロンプト＋表情差分の合成で投入 |
| 解像度 | 縦長は `1024x1536`、最大4K（`2160x3840`）まで。各辺16pxの倍数・長短比3:1以内。バストアップは縦長推奨 |
| 品質/コスト | `low/medium/high/auto`。1枚あたり概算（1024x1536）= low **$0.005** / medium **$0.041** / high **$0.165**。下書きは low、確定アセットは high |
| 注意 | gpt-image-2 は**透過背景 非対応**。複雑プロンプトは最大2分。`moderation: auto|low` で強度調整可（本作は健全用途なので auto で十分） |

### 代替（gpt-image-2 が使えない／コスト調整時）

| ツール | 推奨設定 |
|---|---|
| **Midjourney v6+** | 末尾に `--style raw --ar 3:4 --s 50`（ポートレート）／背景は `--ar 16:9`。一貫性は1枚目を生成後に `--cref <url> --cw 100` で固定 |
| **Imagen 3/4 (Gemini)** | 先頭の `Photo of` を維持。日本語混在OKだが英語のほうが安定。Aspect ratio はパラメータで指定 |
| **Stable Diffusion XL / Flux** | 上記ネガティブを必ず適用。CFG 5–7、steps 30。一貫性は **同一seed＋IP-Adapter / FaceID / Reference** を併用 |

### 一貫性Tips

> **identity（その子であること）と look（外見属性）を分けて考える**。本作は外見が動的に変わる
> コンセプトなので、固定するのは**顔=identity**、意図的に変えるのは**髪型/服/年齢/種族=look**。
> 外見が変わるたびに新しい **lookId** を発行し、その look の neutral をリファレンス顔として保存する。

1. **1枚目を「neutral」から作る**（`images.generate`）。これが全表情の**リファレンス顔**になる（最初の lookId）。
2. 表情差分は neutral を **参照画像として `images.edit` に渡し**、表情だけ差し替える（代替ツールなら `--cref` / IP-Adapter / FaceID）。
3. **同じ look の中では** 服・髪型・背景・照明を**完全に固定**（語順も変えない）。表情だけ動かす。
4. **look を変えるとき**（美容院/買い物/加齢/タイムスリップ/種族変化）は、**直前 look のリファレンス顔を参照画像に渡し**、変更点だけ指示（例：`"same person, new bob haircut"` / `"10 years older"` / `"as a shiba dog, keep her vibe"`）。生成物を**新しい lookId の neutral**として確定。
5. 公式も「recurring character の一貫性は揺れ得る」と明記。顔がブレ始めたら**そのlookのリファレンスを作り直す**。
6. **ランタイム生成（Phase 4）**：Responses API のマルチターン編集（`previous_response_id`）で「同一人物のまま外見/表情を会話的に更新」していくのが本命。会話イベント→ look 更新→立ち絵差し替え、を逐次回す。

## 5. 生成順序の推奨

1. ヒロイン `neutral` ×4枚生成 → ベスト1枚を選定（リファレンス確定）
2. ヒロイン残り表情を `--cref`参照でバッチ生成（happy, tsun, blush, angry, surprised）
3. 邪魔者 `intro` ×4枚生成 → ベスト1枚選定
4. 邪魔者残り表情を `--cref`参照でバッチ生成
5. 背景2枚を独立に生成
6. PoC不足分（laugh / sad / smug / night_park）は後追い

## 6. ファイル命名・保存先

生成画像は `public/images/` 配下に下記命名で保存：

```
public/images/
  characters/
    seiso/
      neutral.png
      happy.png
      tsun.png
      blush.png
      angry.png
      surprised.png
  interrupters/
    tsukkomi/
      intro.png
      peeved.png
  backgrounds/
    school.jpg
```

これで `getCharacterAsset(appearance, emotion)` が
`/images/characters/${appearance}/${emotion}.png` で機械的に解決可能。
