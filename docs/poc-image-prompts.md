# PoC 画像生成プロンプト集

方針：B案（AI画像生成）。最重要は **同一人物の一貫性**。
そのため「キャラ基礎プロンプト（毎回固定）＋表情差分（可変）」の構造にする。

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

| ツール | 推奨設定 |
|---|---|
| **Midjourney v6+** | 末尾に `--style raw --ar 3:4 --s 50`（ポートレート）／背景は `--ar 16:9`。一貫性は1枚目を生成後に `--cref <url> --cw 100` で固定 |
| **Imagen 3/4 (Gemini)** | 先頭の `Photo of` を維持。日本語混在OKだが英語のほうが安定。Aspect ratio はパラメータで指定 |
| **Stable Diffusion XL / Flux** | 上記ネガティブを必ず適用。CFG 5–7、steps 30。一貫性は **同一seed＋IP-Adapter / FaceID / Reference** を併用 |
| **Nano Banana / Gemini 2.5 Image** | 1枚目を作ったあと "same person, change expression to ..." で表情差分指示が効く |

### 一貫性Tips

1. **1枚目を「neutral」から作る**。これがリファレンス顔になる。
2. 2枚目以降は1枚目を `--cref` / IP-Adapter / FaceID で参照させて表情だけ差し替える。
3. 服・髪型・背景・照明は基礎プロンプトを **完全に固定**（語順も変えない）。
4. 顔がブレ始めたら、リファレンスを定期的に作り直す（neutralを再生成して採用）。

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
