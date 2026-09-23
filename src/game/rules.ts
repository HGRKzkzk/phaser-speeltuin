import { gameConfig } from './config'
import { pickAdventureStory } from './adventures'
import { createShelterOutcome, groupShelterBlocks } from './shelter'
import { createArrivalStory, getLevelRules, meetingStory, recallJourney, rememberArrival } from './journey'
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
  if (responseMs <= gameConfig.timing.qualityThresholdsMs.perfect) return 'perfect'
  if (responseMs <= gameConfig.timing.qualityThresholdsMs.great) return 'great'
  if (responseMs <= gameConfig.timing.qualityThresholdsMs.good) return 'good'
  return 'steady'
}

export function getMultiplier(streak: number) {
  return gameConfig.timing.multiplierThresholds.find((step) => streak >= step.streak)?.multiplier ?? 1
}

export function getTimePressure(state: GameState, nowMs: number) {
  const effectiveElapsedMs = Math.max(0, nowMs - state.timing.levelStartedAtMs - state.timing.timeReliefMs)
  return Math.min(1, effectiveElapsedMs / state.levelRules.timeLimitMs)
}

export function resolveTimePressure(state: GameState, nowMs: number): TimePressureResolution {
  const progress = getTimePressure(state, nowMs)
  if (state.status !== 'playing' || progress < 1) {
    return { progress, outcome: 'running', state }
  }
  const performance = { ...state.performance, elapsedMs: Math.max(0, nowMs - state.timing.levelStartedAtMs) }
  const journey =
    state.journey.phase === 'travelling' && state.journey.route
      ? {
          ...state.journey,
          phase: 'arrived' as const,
          memory: {
            ...rememberArrival(state.journey.route, performance, state.levelRules, state.timing.timeReliefMs),
            tone: 'late' as const,
          },
        }
      : state.journey.phase === 'opening' && state.journey.shelter
        ? {
            ...state.journey,
            phase: 'shelter-finished' as const,
            shelter: { ...state.journey.shelter, result: 'late' as const },
          }
        : state.journey
  return {
    progress,
    outcome: 'time-up',
    state: {
      ...state,
      status: 'stage-late',
      performance,
      journey,
      adventure: { ...state.adventure, levelsUntilAdventure: Math.max(0, state.adventure.levelsUntilAdventure - 1) },
    },
  }
}

export function createEmptyAffinity(): AffinityMatrix {
  return {
    left: { red: { shown: 0, correct: 0 }, blue: { shown: 0, correct: 0 } },
    right: { red: { shown: 0, correct: 0 }, blue: { shown: 0, correct: 0 } },
  }
}

export function createPath(
  level: number,
  random: RandomSource = Math.random,
  grouping?: 'color' | 'direction',
): PathState {
  const targetSide = getTargetSide(level)
  const directions: BlockDirection[] = ['up', targetSide]
  const combinations: GameBlock[] = COLORS.flatMap((color) => directions.map((direction) => ({ color, direction })))
  const pool = Array.from({ length: Math.ceil(gameConfig.blocksPerPath / combinations.length) }, () =>
    combinations.map((block) => ({ ...block })),
  ).flat()

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
  }

  return { targetSide, blocks: groupShelterBlocks(pool.slice(0, gameConfig.blocksPerPath), grouping), activeIndex: 0 }
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
  const choices = gameConfig.adventure.levelGapChoices
  return choices[Math.floor(random() * choices.length)]
}

export function createGameState(random: RandomSource = Math.random, nowMs = 0): GameState {
  const path = createPath(1, random)
  return {
    score: 0,
    level: 1,
    status: 'playing',
    completedPaths: 0,
    edgeProgress: { left: 0, right: 0 },
    levelRules: getLevelRules(),
    performance: { mistakes: 0, highestCombo: 0, elapsedMs: 0 },
    journey: { phase: 'unmet', route: null, memory: null, shelter: null },
    affinity: recordShown(createEmptyAffinity(), path),
    timing: {
      levelStartedAtMs: nowMs,
      timeReliefMs: 0,
      combo: { streak: 0, multiplier: 1, lastCorrectAtMs: null },
    },
    path,
    adventure: {
      levelsUntilAdventure: pickAdventureGap(random),
      active: null,
      log: [],
    },
  }
}

export function startNextLevel(state: GameState, random: RandomSource = Math.random, nowMs = 0): GameState {
  const level = state.level + 1
  const levelRules = getLevelRules(state.journey.phase === 'travelling' ? state.journey.route : null)
  if (state.journey.phase === 'opening' && state.journey.shelter) {
    levelRules.blockGrouping = gameConfig.shelter.approaches[state.journey.shelter.approach].grouping
  }
  const path = createPath(level, random, levelRules.blockGrouping)
  return {
    score: state.score,
    level,
    status: 'playing',
    completedPaths: 0,
    edgeProgress: { left: 0, right: 0 },
    levelRules,
    performance: { mistakes: 0, highestCombo: 0, elapsedMs: 0 },
    journey: state.journey,
    affinity: recordShown(state.affinity, path),
    timing: {
      levelStartedAtMs: nowMs,
      timeReliefMs: 0,
      combo: { streak: 0, multiplier: 1, lastCorrectAtMs: null },
    },
    path,
    adventure: {
      levelsUntilAdventure: state.adventure.levelsUntilAdventure,
      active: null,
      log: state.adventure.log,
    },
  }
}

export function isAdventureDue(state: GameState): boolean {
  return (
    (state.level === 1 && state.journey.phase === 'unmet') ||
    state.journey.phase === 'arrived' ||
    state.journey.phase === 'shelter-finished' ||
    state.adventure.levelsUntilAdventure <= 0
  )
}

export function enterAdventure(state: GameState, random: RandomSource = Math.random): GameState {
  const story =
    state.journey.phase === 'shelter-finished' && state.journey.shelter
      ? createShelterOutcome(state.journey.shelter)
      : state.journey.phase === 'arrived' && state.journey.memory
        ? createArrivalStory(state.journey.memory)
        : state.level === 1 && state.journey.phase === 'unmet'
          ? meetingStory
          : recallJourney(pickAdventureStory(random), state.journey.memory, state.journey.shelter)
  return {
    ...state,
    status: 'adventure',
    adventure: {
      levelsUntilAdventure: pickAdventureGap(random),
      active: { story, fragmentId: story.entryFragmentId },
      log: state.adventure.log,
    },
  }
}

export function chooseAdventureOption(
  state: GameState,
  choiceIndex: number,
  random: RandomSource = Math.random,
  nowMs = 0,
): GameState {
  if (state.status !== 'adventure' || !state.adventure.active) {
    throw new Error('Een keuze is alleen toegestaan tijdens een tekstavontuur.')
  }

  const { story, fragmentId } = state.adventure.active
  const fragment = story.fragments[fragmentId]
  const choice = fragment.choices[choiceIndex]
  if (!choice) {
    throw new Error('Ongeldige keuze-index.')
  }

  const log = [...state.adventure.log, { adventureId: story.id, fragmentId: fragment.id, choiceId: choice.id }]

  if (choice.next !== 'end') {
    return {
      ...state,
      adventure: {
        ...state.adventure,
        active: { story, fragmentId: choice.next },
        log,
      },
    }
  }

  if (story.kind === 'meeting') {
    if (!choice.route) throw new Error('Een routekeuze ontbreekt.')
    return startNextLevel(
      {
        ...state,
        adventure: { ...state.adventure, active: null, log },
        journey: { phase: 'travelling', route: choice.route, memory: null, shelter: null },
      },
      random,
      nowMs,
    )
  }

  if (story.kind === 'arrival') {
    if (!choice.shelterApproach) throw new Error('Een aanpak voor de deur ontbreekt.')
    return startNextLevel(
      {
        ...state,
        adventure: { ...state.adventure, active: null, log },
        journey: { ...state.journey, phase: 'opening', shelter: { approach: choice.shelterApproach, result: null } },
      },
      random,
      nowMs,
    )
  }

  return startNextLevel(
    {
      ...state,
      journey: story.kind === 'shelter-result' ? { ...state.journey, phase: 'complete' } : state.journey,
      adventure: { ...state.adventure, active: null, log },
    },
    random,
    nowMs,
  )
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
      timeReliefMs: 0,
      state: {
        ...state,
        performance: {
          ...state.performance,
          mistakes: state.performance.mistakes + 1,
          elapsedMs: Math.max(0, attempt.atMs - state.timing.levelStartedAtMs),
        },
        status: gameOver ? 'game-over' : 'playing',
        score: Math.max(0, state.score - gameConfig.penaltyPerMistake),
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
        timing: { ...state.timing, combo: { streak: 0, multiplier: 1, lastCorrectAtMs: null } },
      },
    }
  }

  const progress = state.edgeProgress[activeSide] + 1
  const activeIndex = state.path.activeIndex + 1
  const pathIsComplete = activeIndex === state.path.blocks.length
  const completedPaths = state.completedPaths + (pathIsComplete ? 1 : 0)
  const quality = classifyHitQuality(attempt.responseMs)
  const continuesCombo =
    state.timing.combo.lastCorrectAtMs !== null &&
    attempt.atMs - state.timing.combo.lastCorrectAtMs <= gameConfig.timing.comboWindowMs
  const streak = continuesCombo ? state.timing.combo.streak + 1 : 1
  const multiplier = getMultiplier(streak)
  const hitPoints = (gameConfig.pointsPerBlock + gameConfig.timing.qualityBonusPoints[quality]) * multiplier
  const pathBonus = pathIsComplete ? gameConfig.pointsPerCompletedPath : 0
  const earnedTimeReliefMs =
    gameConfig.timing.timeReliefPerCorrectMs + (multiplier - 1) * gameConfig.timing.extraTimeReliefPerMultiplierStepMs
  const timeReliefMs = state.timing.timeReliefMs + earnedTimeReliefMs
  const performance = {
    ...state.performance,
    highestCombo: Math.max(state.performance.highestCombo, streak),
    elapsedMs: Math.max(0, attempt.atMs - state.timing.levelStartedAtMs),
  }
  const effectiveElapsedMs = Math.max(0, attempt.atMs - state.timing.levelStartedAtMs - timeReliefMs)
  const timeBonus =
    progress >= state.levelRules.targetHits
      ? Math.max(0, Math.ceil((state.levelRules.timeLimitMs - effectiveElapsedMs) / 1000))
      : 0
  const scoreDelta = hitPoints + pathBonus + timeBonus
  const score = state.score + scoreDelta
  const affinity = recordCorrect(state.affinity, activeSide, activeBlock.color)
  const combo = { streak, multiplier, lastCorrectAtMs: attempt.atMs }

  if (progress >= state.levelRules.targetHits) {
    return {
      outcome: 'stage-win',
      quality,
      scoreDelta,
      timeBonus,
      timeReliefMs: earnedTimeReliefMs,
      state: {
        ...state,
        performance,
        journey:
          state.journey.phase === 'travelling' && state.journey.route
            ? {
                ...state.journey,
                phase: 'arrived',
                memory: rememberArrival(state.journey.route, performance, state.levelRules, timeReliefMs),
              }
            : state.journey.phase === 'opening' && state.journey.shelter
              ? { ...state.journey, phase: 'shelter-finished', shelter: { ...state.journey.shelter, result: 'opened' } }
              : state.journey,
        score,
        status: 'stage-win',
        completedPaths,
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
        affinity,
        adventure: {
          ...state.adventure,
          levelsUntilAdventure: Math.max(0, state.adventure.levelsUntilAdventure - 1),
        },
        timing: { ...state.timing, combo, timeReliefMs },
      },
    }
  }

  if (!pathIsComplete) {
    return {
      outcome: 'correct',
      quality,
      scoreDelta,
      timeBonus: 0,
      timeReliefMs: earnedTimeReliefMs,
      state: {
        ...state,
        performance,
        score,
        edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
        affinity,
        timing: { ...state.timing, combo, timeReliefMs },
        path: { ...state.path, activeIndex },
      },
    }
  }

  const path = createPath(state.level, random, state.levelRules.blockGrouping)
  return {
    outcome: 'path-complete',
    quality,
    scoreDelta,
    timeBonus: 0,
    timeReliefMs: earnedTimeReliefMs,
    state: {
      ...state,
      performance,
      score,
      completedPaths,
      edgeProgress: { ...state.edgeProgress, [activeSide]: progress },
      affinity: recordShown(affinity, path),
      timing: { ...state.timing, combo, timeReliefMs },
      path,
    },
  }
}
