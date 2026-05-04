'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Heart, Swords, ChevronRight, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { storyChapters, storyScenes } from '@/lib/story-data';
import type { StoryScene, StorySceneChoice } from '@/lib/types';
import type { AudioMood } from '@/lib/audio-engine';
import { Button } from '@/components/ui/button';
import { BottomNavigation } from '@/components/bottom-navigation';
import { StoryCharacterSprite } from '@/components/story-character-sprite';

// ── ヘルパー ──────────────────────────────────────────
function replacePlaceholders(text: string, lover: string, interrupter: string) {
  return text.replace(/\{lover\}/g, lover).replace(/\{interrupter\}/g, interrupter);
}

function getMoodForScene(scene: StoryScene | undefined): AudioMood {
  if (!scene) return 'neutral';
  if (scene.type === 'choice') return 'dramatic';
  if (scene.type === 'dialogue') {
    if (scene.speaker === 'lover') return 'romantic';
    if (scene.speaker === 'interrupter') return 'tense';
  }
  return 'neutral';
}

// シーン背景グラデーション（mood に応じて変化）
const BG_BY_MOOD: Record<AudioMood, string> = {
  neutral:  'from-slate-800  via-slate-700  to-slate-900',
  romantic: 'from-rose-900   via-pink-800   to-fuchsia-950',
  tense:    'from-zinc-900   via-red-950    to-zinc-950',
  dramatic: 'from-indigo-950 via-violet-900 to-slate-950',
  resolved: 'from-amber-900  via-orange-800 to-rose-900',
};

// ── タイプライターフック ──────────────────────────────
function useTypewriter(text: string, speed = 28) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // テキスト変化時にリセット
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayed('');
    setDone(false);
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setDone(true);
      }
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed]);

  const skip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

// ── メインコンポーネント ──────────────────────────────
export default function ChapterPage() {
  const params = useParams();
  const chapterId = params.chapterId as string;

  const getLoverCharacter       = useAppStore((s) => s.getLoverCharacter);
  const getInterrupterCharacter = useAppStore((s) => s.getInterrupterCharacter);
  const updateStoryAffinity     = useAppStore((s) => s.updateStoryAffinity);
  const completeChapter         = useAppStore((s) => s.completeChapter);
  const storyProgress           = useAppStore((s) => s.storyProgress);

  const lover       = getLoverCharacter();
  const interrupter = getInterrupterCharacter();
  const loverName       = lover?.name ?? '???';
  const interrupterName = interrupter?.name ?? '???';

  const chapter = storyChapters.find((c) => c.id === chapterId);
  const scenes  = storyScenes[chapterId] ?? [];

  const [sceneIndex,    setSceneIndex]    = useState(0);
  const [choiceMade,    setChoiceMade]    = useState(false);
  const [choiceResult,  setChoiceResult]  = useState<string | null>(null);
  const [finished,      setFinished]      = useState(false);
  const [affinityGained, setAffinityGained] = useState(0);
  const [musicOn,       setMusicOn]       = useState(true);
  const [musicStarted,  setMusicStarted]  = useState(false);

  const currentScene = scenes[sceneIndex];
  const mood = getMoodForScene(currentScene);
  const bgGrad = BG_BY_MOOD[finished ? 'resolved' : mood];

  // タイプライターに渡すテキスト
  const rawText = currentScene
    ? replacePlaceholders(currentScene.text, loverName, interrupterName)
    : '';

  // 選択肢結果を表示中はタイプライターで結果テキスト
  const typeText = choiceMade && choiceResult ? choiceResult : rawText;
  const { displayed, done, skip } = useTypewriter(typeText);

  // ── オーディオ ─────────────────────────────────────
  const engineRef = useRef<import('@/lib/audio-engine').PianoEngine | null>(null);

  useEffect(() => {
    let engine: typeof engineRef.current = null;
    import('@/lib/audio-engine').then(({ getPianoEngine }) => {
      engine = getPianoEngine();
      engineRef.current = engine;
    });
    return () => {
      engine?.stop();
    };
  }, []);

  // mood 変化時に転調
  useEffect(() => {
    if (!musicStarted || !musicOn) return;
    engineRef.current?.setMood(mood);
  }, [mood, musicStarted, musicOn]);

  // 音楽 ON/OFF トグル
  useEffect(() => {
    if (!engineRef.current) return;
    if (musicOn && musicStarted) {
      engineRef.current.resume();
    } else if (!musicOn) {
      engineRef.current.stop();
    }
  }, [musicOn, musicStarted]);

  // ── タップで音楽スタート（初回インタラクション後） ──
  const startMusic = useCallback(() => {
    if (musicStarted || !musicOn) return;
    engineRef.current?.start();
    engineRef.current?.setMood(mood);
    setMusicStarted(true);
  }, [musicStarted, musicOn, mood]);

  // ── 話者状態 ──────────────────────────────────────
  const activeSpeaker = currentScene?.type === 'dialogue' ? currentScene.speaker : undefined;

  function loverSpriteState(): 'speaking' | 'idle' | 'hidden' {
    if (finished) return 'speaking';
    if (currentScene?.type === 'narration') return 'idle';
    return activeSpeaker === 'lover' ? 'speaking' : 'idle';
  }
  function interrupterSpriteState(): 'speaking' | 'idle' | 'hidden' {
    if (finished) return 'idle';
    if (currentScene?.type === 'narration') return 'idle';
    return activeSpeaker === 'interrupter' ? 'speaking' : 'idle';
  }

  // ── ハンドラー ────────────────────────────────────
  const handleChoice = (choice: StorySceneChoice) => {
    startMusic();
    setChoiceMade(true);
    setChoiceResult(replacePlaceholders(choice.response, loverName, interrupterName));
    if (choice.affinityChange !== 0) {
      updateStoryAffinity(choice.affinityChange);
      setAffinityGained((p) => p + choice.affinityChange);
    }
  };

  const handleNext = () => {
    startMusic();
    // タイプライター未完なら先にスキップ
    if (!done && !choiceMade) { skip(); return; }

    if (choiceMade) {
      setChoiceMade(false);
      setChoiceResult(null);
    }
    const next = sceneIndex + 1;
    if (next >= scenes.length) {
      completeChapter(chapterId);
      setFinished(true);
      engineRef.current?.setMood('resolved');
    } else {
      setSceneIndex(next);
    }
  };

  // ── 章が見つからない ──────────────────────────────
  if (!chapter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">章が見つかりません</p>
          <Link href="/story" className="text-primary hover:underline">ストーリーへ戻る</Link>
        </div>
      </div>
    );
  }

  // ── クリア画面 ────────────────────────────────────
  if (finished) {
    return (
      <div className="min-h-screen bg-background pb-20 flex flex-col">
        {/* キャラクター表示（クリア時） */}
        <div className={`bg-gradient-to-b ${bgGrad} flex items-end justify-center pb-4 pt-12`}
             style={{ minHeight: 220 }}>
          <div className="flex gap-8 items-end">
            {interrupter && (
              <StoryCharacterSprite
                name={interrupterName}
                imageUrl={interrupter.imageUrl}
                role="interrupter"
                state="idle"
              />
            )}
            {lover && (
              <StoryCharacterSprite
                name={loverName}
                imageUrl={lover.imageUrl}
                role="lover"
                state="speaking"
              />
            )}
          </div>
        </div>

        <main className="px-4 py-10 max-w-md mx-auto w-full flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">クリア！</h2>
            <p className="text-muted-foreground text-sm">
              第{chapter.number}章「{chapter.title}」をクリアしました。
            </p>
          </div>
          {affinityGained !== 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
              affinityGained > 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
            }`}>
              <Heart className="w-4 h-4" />
              好感度 {affinityGained > 0 ? `+${affinityGained}` : affinityGained} pt
            </div>
          )}
          <div className="flex flex-col gap-3 w-full">
            {(() => {
              const next = storyChapters.find((c) => c.number === chapter.number + 1);
              if (next && storyProgress.storyAffinity >= next.requiredAffinity) {
                return (
                  <Link href={`/story/${next.id}`}
                    className="w-full h-14 rounded-full bg-primary text-primary-foreground font-medium text-base flex items-center justify-center gap-2">
                    第{next.number}章へ <ChevronRight className="w-4 h-4" />
                  </Link>
                );
              }
              return null;
            })()}
            <Link href="/story"
              className="w-full h-14 rounded-full border border-border text-foreground font-medium text-base flex items-center justify-center">
              ストーリーに戻る
            </Link>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // ── シーン再生画面 ────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">

      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center px-3 h-13 max-w-md mx-auto gap-2">
          <Link href="/story"
            className="p-2 rounded-full hover:bg-secondary min-w-[40px] min-h-[40px] flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground truncate leading-tight">
              第{chapter.number}章 {chapter.title}
            </p>
            <p className="text-xs text-muted-foreground leading-tight">{chapter.subtitle}</p>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 mr-1">
            {sceneIndex + 1}/{scenes.length}
          </span>
          {/* 音楽ボタン */}
          <button
            onClick={() => setMusicOn((v) => !v)}
            className="p-2 rounded-full hover:bg-secondary min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label={musicOn ? 'ミュート' : '音楽オン'}
          >
            {musicOn
              ? <Volume2 className="w-4 h-4 text-primary" />
              : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
        {/* プログレスバー */}
        <div className="h-0.5 bg-secondary">
          <div className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((sceneIndex + 1) / scenes.length) * 100}%` }} />
        </div>
      </header>

      {/* ── キャラクター表示エリア ─────────────────── */}
      <div
        className={`bg-gradient-to-b ${bgGrad} transition-all duration-700 flex items-end justify-around px-4 pb-3 pt-6 flex-shrink-0`}
        style={{ minHeight: 200 }}
        onClick={handleNext}
      >
        {/* 邪魔者（左） */}
        {interrupter ? (
          <StoryCharacterSprite
            name={interrupterName}
            imageUrl={interrupter.imageUrl}
            role="interrupter"
            state={interrupterSpriteState()}
          />
        ) : (
          <div style={{ width: 100 }} />
        )}

        {/* ナレーション中央テキスト */}
        {currentScene?.type === 'narration' && (
          <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none px-8"
               style={{ top: 56 + 60 }}>
            <p className="text-white/80 text-sm text-center italic leading-relaxed drop-shadow-sm">
              {displayed}
              {!done && <span className="animate-pulse">▍</span>}
            </p>
          </div>
        )}

        {/* 恋愛相手（右） */}
        {lover ? (
          <StoryCharacterSprite
            name={loverName}
            imageUrl={lover.imageUrl}
            role="lover"
            state={loverSpriteState()}
          />
        ) : (
          <div style={{ width: 100 }} />
        )}
      </div>

      {/* ── テキストボックス ───────────────────────── */}
      <div className="flex-1 flex flex-col bg-background">

        {/* セリフ・選択肢エリア */}
        <div className="px-4 pt-3 pb-2 max-w-md mx-auto w-full flex flex-col gap-3">

          {/* ダイアログ */}
          {currentScene?.type === 'dialogue' && !choiceMade && (
            <div className="flex flex-col gap-1">
              <div className={`flex items-center gap-1 ${
                currentScene.speaker === 'lover' ? 'text-primary'
                : currentScene.speaker === 'interrupter' ? 'text-destructive'
                : 'text-foreground'
              }`}>
                {currentScene.speaker === 'lover' && <Heart className="w-3 h-3 fill-current" />}
                {currentScene.speaker === 'interrupter' && <Swords className="w-3 h-3" />}
                <span className="text-xs font-bold">
                  {currentScene.speaker === 'lover' ? loverName
                    : currentScene.speaker === 'interrupter' ? interrupterName
                    : 'あなた'}
                </span>
              </div>
              <div className={`rounded-2xl border p-3 min-h-[72px] ${
                currentScene.speaker === 'lover'
                  ? 'bg-primary/8 border-primary/20'
                  : currentScene.speaker === 'interrupter'
                  ? 'bg-destructive/8 border-destructive/20'
                  : 'bg-card border-border'
              }`}>
                <p className="text-foreground text-sm leading-relaxed">
                  {displayed}
                  {!done && <span className="animate-pulse text-muted-foreground">▍</span>}
                </p>
              </div>
            </div>
          )}

          {/* 選択肢 */}
          {currentScene?.type === 'choice' && !choiceMade && (
            <div className="flex flex-col gap-2">
              <p className="text-foreground text-sm text-center font-medium px-2 pb-1">
                {replacePlaceholders(currentScene.text, loverName, interrupterName)}
              </p>
              {currentScene.choices?.map((c, i) => (
                <button key={i} onClick={() => handleChoice(c)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-primary/25 bg-primary/5 text-primary text-left text-sm font-medium hover:bg-primary/12 hover:border-primary/50 active:scale-98 transition-all">
                  <span className="text-primary/50 text-xs mr-1">{i + 1}.</span>
                  {replacePlaceholders(c.label, loverName, interrupterName)}
                </button>
              ))}
            </div>
          )}

          {/* 選択肢結果 */}
          {choiceMade && choiceResult && (
            <div className="rounded-2xl border border-border bg-card p-3 min-h-[72px]">
              <p className="text-foreground text-sm leading-relaxed">
                {displayed}
                {!done && <span className="animate-pulse text-muted-foreground">▍</span>}
              </p>
            </div>
          )}

          {/* 次へボタン（選択肢待ち中は非表示） */}
          {(currentScene?.type !== 'choice' || choiceMade) && (
            <Button
              onClick={handleNext}
              className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center justify-center gap-1.5 text-sm mt-1"
            >
              {!done
                ? 'スキップ'
                : sceneIndex + 1 >= scenes.length
                ? 'クリア！'
                : '次へ'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
