import { gameConfig } from './config'
import { pickAdventureScenario } from './adventures'
import type {
  AffinityMatrix,
  AttemptResolution,
  BlockColor,
  BlockDirection,
  GameBlock,
  GameState,
  PathState,
  PlayerAttempt,
  TargetSide,
} from './types'
import type { RandomSource } from './random'

const COLORS: BlockColor[] = ['red', 'blue']

export function getTargetSide(level: number): TargetSide {
  return level % 2 === 1 ? 'right' : 'left'
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

function pickAdventureGap(random: RandomSource): number {
  const choices = gameConfig.adventureLevelGapChoices
  return choices[Math.floor(random() * choices.length)]
}

export function createGameState(random: RandomSource = Math.random): GameState {
  const path = createPath(1, random)
  return {
    score: 0,
    level: 1,
    status: 'playing',
    completedPaths: 0,
    edgeProgress: { left: 0, right: 0 },
    affinity: recordShown(createEmptyAffinity(), path),
    path,
    levelsUntilAdventure: pickAdventureGap(random),
    adventure: null,
    adventureLog: [],
  }
}

export function startNextLevel(state: GameState, random: RandomSource = Math.random): GameState {
  const level = state.level + 1
  const path = createPath(level, random)
  return {
    score: state.score,
    level,
    status: 'playing',
    completedPaths: 0,
    edgeProgress: { left: 0, right: 0 },
    affinity: recordShown(state.affinity, path),
    path,
    levelsUntilAdventure: state.levelsUntilAdventure,
    adventure: null,
    adventureLog: state.adventureLog,
  }
}

export function isAdventureDue(state: GameState): boolean {
  return state.levelsUntilAdventure <= 0
}

export function enterAdventure(state: GameState, random: RandomSource = Math.random): GameState {
  return {
    ...state,
    status: 'adventure',
    adventure: { scenario: pickAdventureScenario(random) },
    levelsUntilAdventure: pickAdventureGap(random),
  }
}

export function chooseAdventureOption(
  state: GameState,
  choiceIndex: number,
  random: RandomSource = Math.random,
): GameState {
  if (state.status !== 'adventure' || !state.adventure) {
    throw new Error('Een keuze is alleen toegestaan tijdens een tekstavontuur.')
  }

  const choice = state.adventure.scenario.choices[choiceIndex]
  if (!choice) {
    throw new Error('Ongeldige keuze-index.')
  }

  const adventureLog = [
    ...state.adventureLog,
    { scenarioId: state.adventure.scenario.id, choiceId: choice.id },
  ]

  return startNextLevel({ ...state, adventure: null, adventureLog }, random)
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
  const score = state.score + gameConfig.pointsPerBlock
    + (pathIsComplete ? gameConfig.pointsPerCompletedPath : 0)
  const affinity = recordCorrect(state.affinity, activeSide, activeBlock.color)

  if (progress >= gameConfig.progressForStageWin) {
    return {
      outcome: 'stage-win',
      state: {
        ...state,
        score,
        status: 'stage-win',
        completedPaths,
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
        affinity,
        levelsUntilAdventure: Math.max(0, state.levelsUntilAdventure - 1),
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
        affinity,
        path: { ...state.path, activeIndex },
      },
    }
  }

  const path = createPath(state.level, random)
  return {
    outcome: 'path-complete',
    state: {
      ...state,
      score,
      completedPaths,
      edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
      affinity: recordShown(affinity, path),
      path,
    },
  }
}
