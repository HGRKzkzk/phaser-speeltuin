export const gameConfig = {
  blocksPerPath: 7,
  pointsPerBlock: 1,
  pointsPerCompletedPath: 3,
  penaltyPerMistake: 1,
  progressForStageWin: 21,
  mistakesFromStartToGameOver: 6,
  barMovementPixels: 12,
  adventure: {
    levelGapChoices: [2, 3, 4],
    defianceBonus: 5,
  },
  timing: {
    comboWindowMs: 900,
    levelTimeLimitMs: 18_000,
    timeReliefPerCorrectMs: 250,
    extraTimeReliefPerMultiplierStepMs: 100,
    qualityThresholdsMs: {
      perfect: 280,
      great: 500,
      good: 800,
    },
    qualityBonusPoints: {
      steady: 0,
      good: 1,
      great: 2,
      perfect: 3,
    },
    multiplierThresholds: [
      { streak: 15, multiplier: 5 },
      { streak: 10, multiplier: 4 },
      { streak: 6, multiplier: 3 },
      { streak: 3, multiplier: 2 },
    ],
  },
} as const
