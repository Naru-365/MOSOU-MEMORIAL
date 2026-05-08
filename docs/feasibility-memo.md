# 妄想メモリアル フィジビリティ検討メモ

参考：[ひろちんくん 実況動画](https://youtu.be/hNCNG64ukGw?si=GSDKrbBotCz1VjGg)
ノリの参考：実写×カオス×乱入もの、ギャグ強めで大衆向けに。

## 方針

- 恋愛要素は弱め、ギャグ要素強めで大衆向けに舵切り。
- 邪魔者乱入を「クセのある個性」として見せたい。
- ビジュアルは段階的にリッチ化していく。

## ビジュアルのロードマップ

| Phase | 内容 | 採否 |
|---|---|---|
| 1 | 実写ストック画像（appearance × emotion マトリクス） | 採用、PoCはここから |
| 2 | 短尺動画ループ | **スキップ寄り**。乱入演出のカットインだけ部分採用は可 |
| 3 | フル3Dヌルヌル（VRM / Three.js + R3F / Ready Player Me） | vibe coding 待ちではなく、現行技術でも踏める |
| 4 | AI生成で動画/3Dをオンザフライ生成 | 将来 |

理由：画像→動画はコスト段差の割に表現幅頭打ち。3Dのほうが枚数あたりの表現力に伸びしろ。
"AIが全部作ってくれる"を待つと永遠に Phase 2 から動けないリスク。

## 抽象化方針

最初から `<CharacterRenderer mode="image" | "video" | "3d" />` を切っておき、
`getImageUrl` を `getCharacterAsset(character, emotion, mode)` に昇格させる。
フェーズ移行で chat 画面を書き直さずに済む。

## 邪魔者カスタマイズ

- 現状 `InterrupterType` 固定 union → CRUD エンティティに昇格。
- メッセージはテンプレ＋スロット辞書（`{char}` `{user}` `{topic}`）で穴埋め。
- トリガは「閾値 / 周期 / キーワード」の OR で発火させてキャラごとのクセを出す。
- 発展形：Claude API でテンプレ生成→保存。ランタイムはローカル選択でコストは初回のみ。

## ギャグ転換

- 選択肢ラベルを「優しく/普通/そっけなく」→「ボケ / ツッコミ / 不条理」に置換。
  `affinityChange` の数値構造は流用可、低リスク。
- メタ系邪魔者の第四の壁ネタは継続＋頻度上げ。
- 高 affinity 直球恋愛セリフはフリオチ構造に置換。

## データ永続化の注意

- Zustand persist の localStorage 上限（5–10MB）。
- 画像は Base64 直入れ NG、URL を持つか IndexedDB（idb-keyval）へ。
- AI生成採用時は Next.js Route Handler + R2/S3 等の外部保存。
