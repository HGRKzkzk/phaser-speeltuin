export type BlockColor = 'red' | 'blue'
export type BlockDirection = 'up' | 'left' | 'right'
export type TargetSide = 'left' | 'right'
export type GameStatus = 'playing' | 'stage-win' | 'game-over' | 'adventure'
export type HitQuality = 'steady' | 'good' | 'great' | 'perfect'

export type ComboState = {
  streak: number
  multiplier: number
  lastCorrectAtMs: number | null
}

export type AffinityCell = {
  shown: number
  correct: number
}

export type AffinityMatrix = Record<TargetSide, Record<BlockColor, AffinityCell>>

export type GameBlock = {
  color: BlockColor
  direction: BlockDirection
}

export type PathState = {
  targetSide: TargetSide
  blocks: GameBlock[]
  activeIndex: number
}

export type AdventureChoice = {
  id: string
  label: string
  description: string
  next: string
}

export type AdventureFragment = {
  id: string
  text: string
  choices: AdventureChoice[]
}

export type AdventureStory = {
  id: string
  entryFragmentId: string
  fragments: Record<string, AdventureFragment>
}

export type ActiveAdventure = {
  story: AdventureStory
  fragmentId: string
}

export type AdventureChoiceRecord = {
  adventureId: string
  fragmentId: string
  choiceId: string
}

export type GameState = {
  score: number
  level: number
  status: GameStatus
  completedPaths: number
  edgeProgress: Record<TargetSide, number>
  affinity: AffinityMatrix
  combo: ComboState
  levelStartedAtMs: number
  timeReliefMs: number
  path: PathState
  levelsUntilAdventure: number
  adventure: ActiveAdventure | null
  adventureLog: AdventureChoiceRecord[]
}

export type PlayerAttempt = {
  color: BlockColor | null
  direction: BlockDirection
  atMs: number
  responseMs: number
}

export type AttemptOutcome = 'correct' | 'wrong' | 'path-complete' | 'stage-win' | 'game-over'

export type AttemptResolution = {
  state: GameState
  outcome: AttemptOutcome
  quality: HitQuality | null
  scoreDelta: number
  timeBonus: number
}

export type TimePressureResolution = {
  state: GameState
  progress: number
  outcome: 'running' | 'game-over'
}
