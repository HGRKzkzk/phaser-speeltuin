import { gameConfig } from './config'
import type {
  AttemptResolution,
  GameBlock,
  GameState,
  PlayerAttempt,
  TargetSide,
} from './types'
import type { RandomSource } from './random'

export function getTargetSide(completedPaths: number): TargetSide {
  const phase = Math.floor(completedPaths / gameConfig.pathsPerDirectionPhase)
  return phase % 2 === 0 ? 'right' : 'left'
}

export function createPath(completedPaths: number, random: RandomSource = Math.random) {
  const targetSide = getTargetSide(completedPaths)
  const blocks: GameBlock[] = Array.from({ length: gameConfig.blocksPerPath }, () => ({
    color: random() < 0.5 ? 'red' : 'blue',
    direction: random() < 0.5 ? 'up' : targetSide,
  }))

  return { targetSide, blocks, activeIndex: 0 }
}

export function createGameState(random: RandomSource = Math.random): GameState {
  return {
    score: 0,
    level: 1,
    status: 'playing',
    completedPaths: 0,
    edgeProgress: { left: 0, right: 0 },
    path: createPath(0, random),
  }
}

export function startNextLevel(state: GameState, random: RandomSource = Math.random): GameState {
  return {
    score: state.score,
    level: state.level + 1,
    status: 'playing',
    completedPaths: 0,
    edgeProgress: { left: 0, right: 0 },
    path: createPath(0, random),
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
  const isCorrect = attempt.color === activeBlock.color && attempt.direction === activeBlock.direction
  const activeSide = state.path.targetSide

  if (!isCorrect) {
    const progress = state.edgeProgress[activeSide] - 1
    const gameOver = progress <= -gameConfig.mistakesFromStartToGameOver

    return {
      outcome: gameOver ? 'game-over' : 'wrong',
      state: {
        ...state,
        status: gameOver ? 'game-over' : 'playing',
        score: Math.max(0, state.score - gameConfig.penaltyPerMistake),
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
      },
    }
  }

  const progress = state.edgeProgress[activeSide] + 1
  const activeIndex = state.path.activeIndex + 1
  const pathIsComplete = activeIndex === state.path.blocks.length
  const completedPaths = state.completedPaths + (pathIsComplete ? 1 : 0)
  const score = state.score
    + gameConfig.pointsPerBlock
    + (pathIsComplete ? gameConfig.pointsPerCompletedPath : 0)

  if (progress >= gameConfig.progressForStageWin) {
    return {
      outcome: 'stage-win',
      state: {
        ...state,
        score,
        status: 'stage-win',
        completedPaths,
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
      },
    }
  }

  if (!pathIsComplete) {
    return {
      outcome: 'correct',
      state: {
        ...state,
        score,
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
        path: { ...state.path, activeIndex },
      },
    }
  }

  return {
    outcome: 'path-complete',
    state: {
      ...state,
      score,
      completedPaths,
      edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
      path: createPath(completedPaths, random),
    },
  }
}
