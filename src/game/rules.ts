export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WatchSpec {
  caseFinish: 'steel-silver' | 'gunmetal-black' | 'rose-gold-tone' | 'gold-tone';
  dialColor: 'navy' | 'black' | 'silver-white' | 'royal-blue-sunburst' | 'forest-green' | 'slate-grey';
  indices: 'baton' | 'roman' | 'dots' | 'numerals-12';
  hands: 'baton' | 'leaf' | 'sword';
  subdial: 'none' | 'small-seconds' | 'chronograph-two';
  dateWindow: boolean;
  strap: 'black-leather' | 'brown-leather' | 'navy-leather' | 'steel-bracelet' | 'mesh' | 'black-rubber';
  time?: { h: number; m: number; s?: number };
}

export const WATCH_ATTR_POOL: Record<keyof Omit<WatchSpec, 'time'>, any[]> = {
  caseFinish: ['steel-silver', 'gunmetal-black', 'rose-gold-tone', 'gold-tone'],
  dialColor: ['navy', 'black', 'silver-white', 'royal-blue-sunburst', 'forest-green', 'slate-grey'],
  indices: ['baton', 'roman', 'dots', 'numerals-12'],
  hands: ['baton', 'leaf', 'sword'],
  subdial: ['none', 'small-seconds', 'chronograph-two'],
  dateWindow: [true, false],
  strap: ['black-leather', 'brown-leather', 'navy-leather', 'steel-bracelet', 'mesh', 'black-rubber'],
};

export function specsEqual(a: WatchSpec, b: WatchSpec): boolean {
  return (
    a.caseFinish === b.caseFinish &&
    a.dialColor === b.dialColor &&
    a.indices === b.indices &&
    a.hands === b.hands &&
    a.subdial === b.subdial &&
    a.dateWindow === b.dateWindow &&
    a.strap === b.strap
  );
}

export function countSpecDiffs(a: WatchSpec, b: WatchSpec): number {
  let diffs = 0;
  if (a.caseFinish !== b.caseFinish) diffs++;
  if (a.dialColor !== b.dialColor) diffs++;
  if (a.indices !== b.indices) diffs++;
  if (a.hands !== b.hands) diffs++;
  if (a.subdial !== b.subdial) diffs++;
  if (a.dateWindow !== b.dateWindow) diffs++;
  if (a.strap !== b.strap) diffs++;
  return diffs;
}

export function diffSpec(
  baseSpec: WatchSpec,
  n: number,
  allowedAttrs?: Array<keyof Omit<WatchSpec, 'time'>>,
  rng: () => number = Math.random
): WatchSpec {
  const attrs = (allowedAttrs && allowedAttrs.length > 0
    ? [...allowedAttrs]
    : (Object.keys(WATCH_ATTR_POOL) as Array<keyof Omit<WatchSpec, 'time'>>));
  // Shuffle attributes
  for (let i = attrs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [attrs[i], attrs[j]] = [attrs[j], attrs[i]];
  }
  const count = Math.max(1, Math.min(n, attrs.length));
  const picked = attrs.slice(0, count);
  const copy: WatchSpec = {
    ...baseSpec,
    time: baseSpec.time ? { ...baseSpec.time } : { h: 10, m: 10, s: 30 },
  };
  for (const attr of picked) {
    const choices = WATCH_ATTR_POOL[attr].filter((v) => v !== baseSpec[attr]);
    if (choices.length > 0) {
      (copy as any)[attr] = choices[Math.floor(rng() * choices.length)];
    }
  }
  return copy;
}

/**
 * Stars rule (all games):
 * win = 1 star; win with score >= 60% of maxScore = 2 stars; >= 85% = 3 stars; loss = 0 stars.
 */
export function calculateStars(params: { won: boolean; score: number; maxScore: number }): number {
  const { won, score, maxScore } = params;
  if (!won) return 0;
  if (maxScore <= 0) return 1;
  const ratio = score / maxScore;
  if (ratio >= 0.85) return 3;
  if (ratio >= 0.60) return 2;
  return 1;
}

/**
 * Game 1: Watch Match Challenge scoring
 * +100 per correct answer + speed bonus up to +100 (remainingTime / roundTime * 100)
 * + streak bonus (+10 per consecutive correct, capped at +50).
 * Easy retry gives half points.
 */
export function scoreWatchMatchRound(params: {
  remainingTime: number;
  roundTime: number;
  consecutiveCorrectAfterAnswer: number;
  usedRetry: boolean;
}): { points: number; speedBonus: number; streakBonus: number } {
  const { remainingTime, roundTime, consecutiveCorrectAfterAnswer, usedRetry } = params;
  const ratio = Math.max(0, Math.min(1, roundTime > 0 ? remainingTime / roundTime : 0));
  const speedBonus = Math.round(ratio * 100);
  const streakBonus = Math.min(50, Math.max(0, consecutiveCorrectAfterAnswer) * 10);
  const raw = 100 + speedBonus + streakBonus;
  const points = usedRetry ? Math.round(raw * 0.5) : raw;
  return { points, speedBonus, streakBonus };
}

/**
 * Game 2: Build Your Style scoring
 * +100 per satisfied rule; +50 Harmony bonus if strap matches outfit palette;
 * + time bonus (remaining seconds * 3).
 * Passed when >= 60% of rules are satisfied.
 */
export function scoreStyleBuild(params: {
  totalRules: number;
  satisfiedRules: number;
  harmonyMatched: boolean;
  remainingSeconds: number;
}): { points: number; passed: boolean; rulePoints: number; harmonyPoints: number; timeBonus: number } {
  const { totalRules, satisfiedRules, harmonyMatched, remainingSeconds } = params;
  const passed = totalRules > 0 ? satisfiedRules / totalRules >= 0.6 : true;
  const rulePoints = satisfiedRules * 100;
  const harmonyPoints = harmonyMatched ? 50 : 0;
  const timeBonus = passed ? Math.max(0, Math.floor(remainingSeconds) * 3) : 0;
  return {
    points: rulePoints + harmonyPoints + timeBonus,
    passed,
    rulePoints,
    harmonyPoints,
    timeBonus,
  };
}

/**
 * Game 3: Timepiece Memory scoring
 * +100 per matched pair * streak multiplier (x1, x2, x3, max x4);
 * -10 per mismatch (never below 0);
 * time bonus at win = remainingSeconds * 3.
 */
export function applyMemoryTurn(params: {
  currentScore: number;
  currentStreak: number;
  isMatch: boolean;
}): { score: number; streak: number; delta: number } {
  const { currentScore, currentStreak, isMatch } = params;
  if (isMatch) {
    const nextStreak = Math.min(4, currentStreak + 1);
    const delta = 100 * nextStreak;
    return { score: currentScore + delta, streak: nextStreak, delta };
  }
  const nextScore = Math.max(0, currentScore - 10);
  return { score: nextScore, streak: 0, delta: nextScore - currentScore };
}

/**
 * Game 4: Beat the Clock SET mode time difference (in minutes on a 12-hour dial)
 * Evaluates shortest distance on a 12-hour (720-minute) cycle.
 */
export function isDialTimeWithinTolerance(
  target: { h: number; m: number },
  actual: { h: number; m: number },
  toleranceMinutes: number
): boolean {
  const normTarget = ((target.h % 12) * 60 + target.m + 720) % 720;
  const normActual = ((actual.h % 12) * 60 + actual.m + 720) % 720;
  const diff = Math.abs(normTarget - normActual);
  const circularDiff = Math.min(diff, 720 - diff);
  return circularDiff <= toleranceMinutes;
}

export function scoreBeatTheClockAnswer(params: {
  roundElapsedSeconds: number;
  consecutiveCorrectAfterAnswer: number;
}): { points: number; speedBonus: number; streakBonus: number } {
  const { roundElapsedSeconds, consecutiveCorrectAfterAnswer } = params;
  const ratio = Math.max(0, Math.min(1, 1 - roundElapsedSeconds / 8));
  const speedBonus = Math.round(ratio * 50);
  const streakBonus = Math.min(50, Math.max(0, consecutiveCorrectAfterAnswer) * 10);
  return {
    points: 100 + speedBonus + streakBonus,
    speedBonus,
    streakBonus,
  };
}
