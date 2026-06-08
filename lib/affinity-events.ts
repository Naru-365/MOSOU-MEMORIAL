// Affinity milestone events.
//
// Pure, testable: given the affinity value before and after a turn, returns the
// events that fired by crossing a threshold this turn. The chat screen reacts to
// them (a vanish sequence at 0, a system note for positive milestones).
//
// `next` must be computed with the same clamp as the store's updateAffinity
// (Math.max(0, Math.min(100, ...))) so the 0-boundary lines up.

export type AffinityEvent =
  | { kind: 'vanish' }
  | { kind: 'milestone'; threshold: number; note: string };

interface Milestone {
  threshold: number;
  note: string;
}

// Upward crossings (prev < threshold && next >= threshold) fire once each.
const POSITIVE_MILESTONES: Milestone[] = [
  { threshold: 80, note: '——距離がぐっと縮まった気がする。' },
  { threshold: 100, note: '——彼女の心が満ちている。' },
];

export function checkAffinityEvents(prev: number, next: number): AffinityEvent[] {
  const events: AffinityEvent[] = [];

  // Vanish takes precedence: she fades away at 0.
  if (prev > 0 && next <= 0) {
    events.push({ kind: 'vanish' });
    return events;
  }

  for (const m of POSITIVE_MILESTONES) {
    if (prev < m.threshold && next >= m.threshold) {
      events.push({ kind: 'milestone', threshold: m.threshold, note: m.note });
    }
  }

  return events;
}
