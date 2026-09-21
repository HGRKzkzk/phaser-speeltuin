export type BlockColor = 'red' | 'blue'
export type BlockDirection = 'up' | 'left' | 'right'
export type TargetSide = 'left' | 'right'
export type GameStatus = 'playing' | 'stage-win' | 'game-over'

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

export type GameState = {
  score: number
  level: number
  status: GameStatus
  completedPaths: number
  edgeProgress: Record<TargetSide, number>
  affinity: AffinityMatrix
  path: PathState
}

export type PlayerAttempt = {
  color: BlockColor | null
  direction: BlockDirection
}

export type AttemptOutcome = 'correct' | 'wrong' | 'path-complete' | 'stage-win' | 'game-over'

export type AttemptResolution = {
  state: GameState
  outcome: AttemptOutcome
}
