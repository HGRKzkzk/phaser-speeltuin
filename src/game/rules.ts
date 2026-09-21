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

export function createRoundState(random: RandomSource = Math.random): GameState {
  return {
    score: 0,
    completedPaths: 0,
    path: createPath(0, random),
  }
}

export function resolveAttempt(
  state: GameState,
  attempt: PlayerAttempt,
  random: RandomSource = Math.random,
): AttemptResolution {
  const activeBlock = state.path.blocks[state.path.activeIndex]
  const isCorrect = attempt.color === activeBlock.color && attempt.direction === activeBlock.direction

  if (!isCorrect) {
    return {
      outcome: 'wrong',
      state: {
        ...state,
        score: Math.max(0, state.score - gameConfig.penaltyPerMistake),
      },
    }
  }

  const scoreAfterBlock = state.score + gameConfig.pointsPerBlock
  const activeIndex = state.path.activeIndex + 1

  if (activeIndex < state.path.blocks.length) {
    return {
      outcome: 'correct',
      state: {
        ...state,
        score: scoreAfterBlock,
        path: { ...state.path, activeIndex },
      },
    }
  }

  const completedPaths = state.completedPaths + 1

  return {
    outcome: 'path-complete',
    state: {
      score: scoreAfterBlock + gameConfig.pointsPerCompletedPath,
      completedPaths,
      path: createPath(completedPaths, random),
    },
  }
}
