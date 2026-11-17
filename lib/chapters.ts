// Days & chapters — the game's quiet sense of purpose and pacing
// (改善: 誕生後の目的・区切り).
//
// Design constraints from the producer's core principles:
// - NO deadlines, NO countdowns, NO "あと◯日" pressure. A day passing is
//   weather, not a threat — nothing bad happens when time moves.
// - Chapters give direction (the next chapter's title is visible in the
//   memorial as "これから") without turning the relationship into a quest
//   log: no progress bars, no rewards, no announcements beyond one quiet
//   stage-direction note when a chapter turns.
// - Everything is derived from state the game already has (turn count,
//   affinity), so older saves join mid-story without migration drama.

/** Playing turns that make one in-game day. */
export const DAY_TURNS = 25;

/** In-game day for a playing turn count (turn 0..24 -> day 1, ...). */
export function dayForTurn(turnCount: number): number {
  return Math.floor(Math.max(0, turnCount) / DAY_TURNS) + 1;
}

export interface Chapter {
  id: string;
  /** Display number (第◯章). */
  number: number;
  title: string;
  /** Affinity at which the chapter opens (chapter 1 = the birth itself). */
  affinityFrom: number;
}

export const CHAPTERS: Chapter[] = [
  { id: 'birth', number: 1, title: '出会いと誕生', affinityFrom: 0 },
  { id: 'closer', number: 2, title: '肩が触れる距離', affinityFrom: 30 },
  { id: 'special', number: 3, title: '特別な存在', affinityFrom: 55 },
  { id: 'fullheart', number: 4, title: '心が満ちる日', affinityFrom: 80 },
  { id: 'anniversary', number: 5, title: '二人の記念日', affinityFrom: 100 },
];

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

/** The chapter the relationship is currently in, by affinity. */
export function currentChapter(affinity: number): Chapter {
  let current = CHAPTERS[0];
  for (const c of CHAPTERS) {
    if (affinity >= c.affinityFrom) current = c;
  }
  return current;
}

/** The next chapter not yet reached (null when the story is complete). */
export function nextChapter(affinity: number): Chapter | null {
  return CHAPTERS.find((c) => affinity < c.affinityFrom) ?? null;
}

/**
 * Chapters newly opened by an affinity move (upward crossings only).
 * Chapter 1 is excluded — it is recorded at birth, not by affinity.
 */
export function newChaptersBetween(prev: number, next: number): Chapter[] {
  if (next <= prev) return [];
  return CHAPTERS.filter(
    (c) => c.affinityFrom > 0 && prev < c.affinityFrom && next >= c.affinityFrom
  );
}
