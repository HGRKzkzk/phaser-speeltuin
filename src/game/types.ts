export type BlockColor = 'red' | 'blue'
export type BlockDirection = 'up' | 'left' | 'right'
export type TargetSide = 'left' | 'right'

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
  completedPaths: number
  path: PathState
}

export type PlayerAttempt = {
  color: BlockColor | null
  direction: BlockDirection
}

export type AttemptOutcome = 'correct' | 'wrong' | 'path-complete'

export type AttemptResolution = {
  state: GameState
  outcome: AttemptOutcome
}
