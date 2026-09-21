import { gameConfig } from './config'
import type {
  AffinityMatrix,
  AttemptResolution,
  BlockColor,
  BlockDirection,
  GameBlock,
  GameState,
  HitQuality,
  PathState,
  PlayerAttempt,
  TargetSide,
  TimePressureResolution,
} from './types'
import type { RandomSource } from './random'

const COLORS: BlockColor[] = ['red', 'blue']

export function getTargetSide(level: number): TargetSide {
  return level % 2 === 1 ? 'right' : 'left'
}

export function classifyHitQuality(responseMs: number): HitQuality {
  if (responseMs <= gameConfig.qualityThresholdsMs.perfect) return 'perfect'
  if (responseMs <= gameConfig.qualityThresholdsMs.great) return 'great'
  if (responseMs <= gameConfig.qualityThresholdsMs.good) return 'good'
  return 'steady'
}

export function getMultiplier(streak: number) {
  return gameConfig.multiplierThresholds.find((step) => streak >= step.streak)?.multiplier ?? 1
}

export function getTimePressure(state: GameState, nowMs: number) {
  const elapsedMs = Math.max(0, nowMs - state.levelStartedAtMs)
  return Math.min(1, elapsedMs / gameConfig.levelTimeLimitMs)
}

export function resolveTimePressure(state: GameState, nowMs: number): TimePressureResolution {
  const progress = getTimePressure(state, nowMs)
  const gameOver = state.status === 'playing' && progress >= 1

  return {
    progress,
    outcome: gameOver ? 'game-over' : 'running',
    state: gameOver ? { ...state, status: 'game-over' } : state,
  }
}

export function createEmptyAffinity(): AffinityMatrix {
  return {
    left: { red: { shown: 0, correct: 0 }, blue: { shown: 0, correct: 0 } },
    right: { red: { shown: 0, correct: 0 }, blue: { shown: 0, correct: 0 } },
  }
}

export function createPath(level: number, random: RandomSource = Math.random): PathState {
  const targetSide = getTargetSide(level)
  const directions: BlockDirection[] = ['up', targetSide]
  const combinations: GameBlock[] = COLORS.flatMap((color) =>
    directions.map((direction) => ({ color, direction })),
  )
  const pool = Array.from(
    { length: Math.ceil(gameConfig.blocksPerPath / combinations.length) },
    () => combinations.map((block) => ({ ...block })),
  ).flat()

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
  }

  return { targetSide, blocks: pool.slice(0, gameConfig.blocksPerPath), activeIndex: 0 }
}

function recordShown(affinity: AffinityMatrix, path: PathState): AffinityMatrix {
  const next = structuredClone(affinity)
  path.blocks.forEach(({ color }) => {
    next[path.targetSide][color].shown += 1
  })
  return next
}

function recordCorrect(affinity: AffinityMatrix, side: TargetSide, color: BlockColor): AffinityMatrix {
  const next = structuredClone(affinity)
  next[side][color].correct += 1
  return next
}

export function createGameState(random: RandomSource = Math.random, nowMs = 0): GameState {
  const path = createPath(1, random)
  return {
    score: 0,
    level: 1,
    status: 'playing',
    completedPaths: 0,
    edgeProgress: { left: 0, right: 0 },
    affinity: recordShown(createEmptyAffinity(), path),
    combo: { streak: 0, multiplier: 1, lastCorrectAtMs: null },
    levelStartedAtMs: nowMs,
    path,
  }
}

export function startNextLevel(state: GameState, random: RandomSource = Math.random, nowMs = 0): GameState {
  const level = state.level + 1
  const path = createPath(level, random)
  return {
    score: state.score,
    level,
    status: 'playing',
    completedPaths: 0,
    edgeProgress: { left: 0, right: 0 },
    affinity: recordShown(state.affinity, path),
    combo: { streak: 0, multiplier: 1, lastCorrectAtMs: null },
    levelStartedAtMs: nowMs,
    path,
  }
}

export function resolveAttempt(
  state: GameState,
  attempt: PlayerAttempt,
  random: RandomSource = Math.random,
): AttemptResolution {
  if (state.status !== 'playing') {
    throw new Error('Invoer is alleen toegestaan tijdens een actief level.')
  }

  const activeBlock = state.path.blocks[state.path.activeIndex]
  const activeSide = state.path.targetSide
  const isCorrect = attempt.color === activeBlock.color && attempt.direction === activeBlock.direction

  if (!isCorrect) {
    const progress = state.edgeProgress[activeSide] - 1
    const gameOver = progress <= -gameConfig.mistakesFromStartToGameOver
    return {
      outcome: gameOver ? 'game-over' : 'wrong',
      quality: null,
      scoreDelta: Math.max(0, state.score - gameConfig.penaltyPerMistake) - state.score,
      timeBonus: 0,
      state: {
        ...state,
        status: gameOver ? 'game-over' : 'playing',
        score: Math.max(0, state.score - gameConfig.penaltyPerMistake),
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
        combo: { streak: 0, multiplier: 1, lastCorrectAtMs: null },
      },
    }
  }

  const progress = state.edgeProgress[activeSide] + 1
  const activeIndex = state.path.activeIndex + 1
  const pathIsComplete = activeIndex === state.path.blocks.length
  const completedPaths = state.completedPaths + (pathIsComplete ? 1 : 0)
  const quality = classifyHitQuality(attempt.responseMs)
  const continuesCombo = state.combo.lastCorrectAtMs !== null
    && attempt.atMs - state.combo.lastCorrectAtMs <= gameConfig.comboWindowMs
  const streak = continuesCombo ? state.combo.streak + 1 : 1
  const multiplier = getMultiplier(streak)
  const hitPoints = (gameConfig.pointsPerBlock + gameConfig.qualityBonusPoints[quality]) * multiplier
  const pathBonus = pathIsComplete ? gameConfig.pointsPerCompletedPath : 0
  const elapsedMs = attempt.atMs - state.levelStartedAtMs
  const timeBonus = progress >= gameConfig.progressForStageWin
    ? Math.max(0, Math.ceil((gameConfig.levelTimeLimitMs - elapsedMs) / 1000))
    : 0
  const scoreDelta = hitPoints + pathBonus + timeBonus
  const score = state.score + scoreDelta
  const affinity = recordCorrect(state.affinity, activeSide, activeBlock.color)
  const combo = { streak, multiplier, lastCorrectAtMs: attempt.atMs }

  if (progress >= gameConfig.progressForStageWin) {
    return {
      outcome: 'stage-win',
      quality,
      scoreDelta,
      timeBonus,
      state: {
        ...state,
        score,
        status: 'stage-win',
        completedPaths,
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
        affinity,
        combo,
      },
    }
  }

  if (!pathIsComplete) {
    return {
      outcome: 'correct',
      quality,
      scoreDelta,
      timeBonus: 0,
      state: {
        ...state,
        score,
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
        affinity,
        combo,
        path: { ...state.path, activeIndex },
      },
    }
  }

  const path = createPath(state.level, random)
  return {
    outcome: 'path-complete',
    quality,
    scoreDelta,
    timeBonus: 0,
    state: {
      ...state,
      score,
      completedPaths,
      edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
      affinity: recordShown(affinity, path),
      combo,
      path,
    },
  }
}
