import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WatchSpec,
  specsEqual,
  countSpecDiffs,
  diffSpec,
  calculateStars,
  scoreWatchMatchRound,
  scoreStyleBuild,
  applyMemoryTurn,
  isDialTimeWithinTolerance,
  scoreBeatTheClockAnswer,
} from './rules';

const BASE_WATCH: WatchSpec = {
  caseFinish: 'steel-silver',
  dialColor: 'navy',
  indices: 'baton',
  hands: 'baton',
  subdial: 'none',
  dateWindow: true,
  strap: 'steel-bracelet',
  time: { h: 10, m: 10, s: 30 },
};

test('diffSpec mutates exactly n attributes and specsEqual detects differences', () => {
  for (const n of [1, 2, 3]) {
    const variant = diffSpec(BASE_WATCH, n);
    assert.equal(specsEqual(BASE_WATCH, variant), false);
    assert.equal(countSpecDiffs(BASE_WATCH, variant), n);
  }
});

test('calculateStars follows 0 / 1 / 60% / 85% thresholds', () => {
  assert.equal(calculateStars({ won: false, score: 3000, maxScore: 2000 }), 0);
  assert.equal(calculateStars({ won: true, score: 900, maxScore: 2000 }), 1);
  assert.equal(calculateStars({ won: true, score: 1200, maxScore: 2000 }), 2);
  assert.equal(calculateStars({ won: true, score: 1699, maxScore: 2000 }), 2);
  assert.equal(calculateStars({ won: true, score: 1700, maxScore: 2000 }), 3);
});

test('scoreWatchMatchRound computes base, speed, streak, and Easy retry half-points', () => {
  const full = scoreWatchMatchRound({
    remainingTime: 10,
    roundTime: 20,
    consecutiveCorrectAfterAnswer: 3,
    usedRetry: false,
  });
  // 100 + 50 speed + 30 streak = 180
  assert.equal(full.points, 180);

  const retried = scoreWatchMatchRound({
    remainingTime: 10,
    roundTime: 20,
    consecutiveCorrectAfterAnswer: 1,
    usedRetry: true,
  });
  // (100 + 50 + 10) * 0.5 = 80
  assert.equal(retried.points, 80);
});

test('scoreStyleBuild checks 60% rule threshold, harmony bonus, and time bonus', () => {
  const passBuild = scoreStyleBuild({
    totalRules: 3,
    satisfiedRules: 2,
    harmonyMatched: true,
    remainingSeconds: 10,
  });
  assert.equal(passBuild.passed, true);
  // 200 + 50 + 30 = 280
  assert.equal(passBuild.points, 280);

  const failBuild = scoreStyleBuild({
    totalRules: 3,
    satisfiedRules: 1,
    harmonyMatched: false,
    remainingSeconds: 15,
  });
  assert.equal(failBuild.passed, false);
  assert.equal(failBuild.points, 100);
});

test('applyMemoryTurn scales streak up to x4 and floors mismatch penalty at 0', () => {
  let state = { score: 0, streak: 0 };
  state = applyMemoryTurn({ currentScore: state.score, currentStreak: state.streak, isMatch: false });
  assert.equal(state.score, 0);

  state = applyMemoryTurn({ currentScore: state.score, currentStreak: state.streak, isMatch: true });
  assert.equal(state.score, 100);
  assert.equal(state.streak, 1);

  state = applyMemoryTurn({ currentScore: state.score, currentStreak: 4, isMatch: true });
  assert.equal(state.streak, 4);
  assert.equal(state.score, 500);
});

test('isDialTimeWithinTolerance handles 12-hour wrap-around and tolerance', () => {
  assert.equal(isDialTimeWithinTolerance({ h: 12, m: 0 }, { h: 11, m: 59 }, 1), true);
  assert.equal(isDialTimeWithinTolerance({ h: 12, m: 0 }, { h: 11, m: 57 }, 2), false);
  assert.equal(isDialTimeWithinTolerance({ h: 3, m: 15 }, { h: 3, m: 17 }, 2), true);
});

test('scoreBeatTheClockAnswer caps speed and streak bonuses at +50 each', () => {
  const res = scoreBeatTheClockAnswer({
    roundElapsedSeconds: 0,
    consecutiveCorrectAfterAnswer: 8,
  });
  assert.equal(res.speedBonus, 50);
  assert.equal(res.streakBonus, 50);
  assert.equal(res.points, 200);
});
