export type BlockColor = 'red' | 'blue'
export type BlockDirection = 'up' | 'left' | 'right'
export type TargetSide = 'left' | 'right'
export type GameStatus = 'playing' | 'stage-win' | 'stage-late' | 'game-over' | 'adventure'
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

export type JourneyRoute = 'open' | 'sheltered'
export type ArrivalTone = 'persistent' | 'fluent' | 'steady' | 'late'
export type ShelterApproach = 'lift' | 'hinges'
export type ShelterMemory = { approach: ShelterApproach; result: 'opened' | 'late' | null }
export type LevelRules = { targetHits: number; timeLimitMs: number; blockGrouping?: 'color' | 'direction' }
export type LevelPerformance = { mistakes: number; highestCombo: number; elapsedMs: number }
export type JourneyMemory = LevelPerformance & {
  route: JourneyRoute
  remainingMs: number
  tone: ArrivalTone
}
export type JourneyState = {
  phase: 'unmet' | 'travelling' | 'arrived' | 'opening' | 'shelter-finished' | 'complete'
  route: JourneyRoute | null
  memory: JourneyMemory | null
  shelter: ShelterMemory | null
}

export type AdventureChoice = {
  id: string
  label: string
  description: string
  next: string
  route?: JourneyRoute
  shelterApproach?: ShelterApproach
  anticipation?: string
}

export type AdventureFragment = {
  interaction?: 'hold'
  id: string
  text: string
  choices: AdventureChoice[]
}

export type AdventureStory = {
  id: string
  kind?: 'meeting' | 'arrival' | 'shelter-result'
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

export type TimingState = {
  levelStartedAtMs: number
  timeReliefMs: number
  combo: ComboState
}

export type AdventureState = {
  levelsUntilAdventure: number
  active: ActiveAdventure | null
  log: AdventureChoiceRecord[]
}

export type GameState = {
  score: number
  level: number
  status: GameStatus
  completedPaths: number
  edgeProgress: Record<TargetSide, number>
  affinity: AffinityMatrix
  timing: TimingState
  path: PathState
  adventure: AdventureState
  levelRules: LevelRules
  performance: LevelPerformance
  journey: JourneyState
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
  timeReliefMs: number
}

export type TimePressureResolution = {
  state: GameState
  progress: number
  outcome: 'running' | 'time-up'
}
