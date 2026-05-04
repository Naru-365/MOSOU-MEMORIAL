'use client';

// ── 基本周波数 ──────────────────────────────────────────
const C4_HZ = 261.63;

/** 半音 + 移調オフセット → 周波数 (Hz) */
function semToHz(semitones: number, transpose = 0): number {
  return C4_HZ * Math.pow(2, (semitones + transpose) / 12);
}

// ── コード定義（C4 からの半音）──────────────────────────
// 各エントリが1コード。4和音のクローズボイシング
const CHORD_SETS: Record<string, number[][]> = {
  neutral: [         // C major: I-V-vi-IV
    [0,  7, 12, 16], // Cmaj  C G C E
    [7, 11, 14, 19], // Gmaj  G B D G
    [9, 12, 16, 21], // Am    A C E A
    [5,  9, 12, 17], // Fmaj  F A C F
  ],
  romantic: [        // E major: Emaj7-Dmaj7-Gmaj-Emaj7（4半音上転調）
    [ 4, 11, 16, 20], // Emaj7 E B E G#
    [ 2,  9, 14, 18], // Dmaj7 D A D F#
    [ 7, 14, 19, 23], // Gmaj  G D G B
    [ 4, 11, 16, 20], // Emaj7
  ],
  tense: [           // A minor: Am-Gm-F-Em（-3半音転調）
    [ 9, 12, 16, 21], // Am    A C E A
    [ 7, 10, 14, 19], // Gm    G Bb D G
    [ 5,  9, 12, 17], // Fmaj  F A C F
    [ 4,  7, 11, 16], // Em    E G B E
  ],
  dramatic: [        // サスペンド系（選択肢シーン）
    [0,  5,  7, 12], // Csus4 C F G C
    [5,  9, 12, 17], // Fmaj  F A C F
    [4,  9, 11, 16], // Esus  E A B E
    [0,  4,  7, 12], // Cmaj  C E G C（解決）
  ],
  resolved: [        // C major（エンディング・大団円）
    [0,  7, 12, 16], // Cmaj
    [5,  9, 12, 17], // Fmaj
    [7, 11, 14, 19], // Gmaj
    [0,  7, 12, 16], // Cmaj
  ],
};

// ── メロディライン（上声部、C4 からの半音）──────────────
const MELODY_SETS: Record<string, number[]> = {
  neutral:  [12, 14, 16, 14, 12, 11,  9, 11],
  romantic: [16, 18, 19, 21, 19, 18, 16, 18],
  tense:    [ 9, 10,  9,  7,  9, 12, 11,  9],
  dramatic: [12, 11, 12, 14, 16, 14, 12, 11],
  resolved: [12, 14, 16, 19, 21, 19, 16, 14],
};

// ── mood ごとの設定（BPM＋転調量）──────────────────────
const MOOD_CONFIG: Record<string, { transpose: number; bpm: number }> = {
  neutral:  { transpose:  0, bpm: 76 }, // C major（基調）
  romantic: { transpose:  4, bpm: 68 }, // 4半音上→E major（転調）
  tense:    { transpose: -3, bpm: 84 }, // 3半音下→A minor（転調）
  dramatic: { transpose:  2, bpm: 60 }, // 2半音上→D area（劇的）
  resolved: { transpose:  0, bpm: 72 }, // C major（帰還）
};

export type AudioMood = keyof typeof CHORD_SETS;

// ── PianoEngine クラス ────────────────────────────────
class PianoEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private mood: AudioMood = 'neutral';
  private isPlaying = false;
  private timerID: ReturnType<typeof setTimeout> | null = null;
  private nextNoteTime = 0;
  private chordIdx = 0;
  private noteInChord = 0;
  private melodyIdx = 0;
  private readonly NOTES_PER_CHORD = 4;

  /** ユーザーインタラクション後に呼ぶ */
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.22;

      // 簡易リバーブ（インパルスレスポンス合成）
      this.reverbNode = this.buildReverb(this.ctx);
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = 0.25;
      this.reverbNode.connect(reverbGain);
      reverbGain.connect(this.ctx.destination);

      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('[PianoEngine] AudioContext unavailable', e);
    }
  }

  /** 簡易インパルスレスポンスでリバーブを生成 */
  private buildReverb(ctx: AudioContext): ConvolverNode {
    const node = ctx.createConvolver();
    const length = ctx.sampleRate * 1.5;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    node.buffer = impulse;
    return node;
  }

  /** 1音を合成してスケジュール */
  private playNote(hz: number, startTime: number, duration: number, vol = 0.2) {
    if (!this.ctx || !this.masterGain) return;

    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;

    gain.connect(filter);
    filter.connect(this.masterGain);
    if (this.reverbNode) {
      filter.connect(this.reverbNode);
    }

    // ピアノ音色：基音 (triangle) ＋ 第2倍音・第4倍音 (sine)
    const partials: [number, number, OscillatorType][] = [
      [1,    1.0,  'triangle'],
      [2,    0.35, 'sine'],
      [4,    0.1,  'sine'],
    ];

    for (const [mult, relVol, type] of partials) {
      const osc = this.ctx.createOscillator();
      const og  = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = hz * mult;
      og.gain.value = relVol;
      osc.connect(og);
      og.connect(gain);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.6);
    }

    // ADSR エンベロープ
    const t = startTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);          // Attack
    gain.gain.exponentialRampToValueAtTime(vol * 0.55, t + 0.09); // Decay
    gain.gain.setValueAtTime(vol * 0.55, t + duration - 0.04);  // Sustain
    gain.gain.linearRampToValueAtTime(0, t + duration + 0.25);  // Release
  }

  /** スケジューラー（先読み 150ms） */
  private scheduleNotes() {
    if (!this.ctx) return;
    const LOOK_AHEAD = 0.15;
    const now = this.ctx.currentTime;

    while (this.nextNoteTime < now + LOOK_AHEAD) {
      const cfg    = MOOD_CONFIG[this.mood];
      const spb    = 60 / cfg.bpm * 0.5; // 8分音符
      const chords = CHORD_SETS[this.mood];
      const chord  = chords[this.chordIdx % chords.length];
      const transp = cfg.transpose;

      // アルペジオ音
      const sem = chord[this.noteInChord % chord.length];
      this.playNote(semToHz(sem, transp), this.nextNoteTime, spb * 1.8, 0.18);

      // 偶数ステップにメロディを重ねる
      if (this.noteInChord % 2 === 0) {
        const mel    = MELODY_SETS[this.mood];
        const melHz  = semToHz(mel[this.melodyIdx % mel.length], transp);
        this.playNote(melHz, this.nextNoteTime + spb * 0.3, spb * 0.7, 0.11);
        this.melodyIdx++;
      }

      this.nextNoteTime += spb;
      this.noteInChord++;
      if (this.noteInChord >= this.NOTES_PER_CHORD) {
        this.noteInChord = 0;
        this.chordIdx++;
      }
    }
  }

  private tick() {
    if (!this.isPlaying) return;
    this.scheduleNotes();
    this.timerID = setTimeout(() => this.tick(), 25);
  }

  start() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.isPlaying   = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.chordIdx    = 0;
    this.noteInChord = 0;
    this.melodyIdx   = 0;
    this.tick();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerID !== null) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 1.2);
    }
  }

  /**
   * mood を切り替える（転調）
   * 音量を一時的にディップさせてから新 mood で再開 → 転調感が出る
   */
  setMood(mood: AudioMood) {
    if (mood === this.mood) return;
    this.mood        = mood;
    this.noteInChord = 0; // コード先頭から再出発
    this.melodyIdx   = 0;

    // 転調エフェクト：音量ディップ
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.04, now + 0.4);  // ディップ
      this.masterGain.gain.linearRampToValueAtTime(0.22, now + 1.2);  // 復帰
    }
  }

  resume() {
    this.ctx?.resume();
  }
}

// ── シングルトン ─────────────────────────────────────
let _instance: PianoEngine | null = null;

export function getPianoEngine(): PianoEngine | null {
  if (typeof window === 'undefined') return null;
  if (!_instance) _instance = new PianoEngine();
  return _instance;
}
