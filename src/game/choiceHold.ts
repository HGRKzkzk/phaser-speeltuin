export type ChoiceHoldState = {
  choice: number | null
  source: 'keyboard' | 'pointer' | null
  elapsedMs: number
  requiresRelease: boolean
}

export type ChoiceHoldInput = {
  choice: number | null
  source: ChoiceHoldState['source']
  anyDown: boolean
  deltaMs: number
}

export function createChoiceHold(requiresRelease = true): ChoiceHoldState {
  return { choice: null, source: null, elapsedMs: 0, requiresRelease }
}

// Presentation state only: no score, story or clock changes before commitment.
export function advanceChoiceHold(state: ChoiceHoldState, input: ChoiceHoldInput, durationMs: number) {
  if (state.requiresRelease) {
    return { state: createChoiceHold(input.anyDown), progress: 0, committed: null }
  }
  if (input.choice === null || input.source === null || !input.anyDown) {
    return { state: createChoiceHold(false), progress: 0, committed: null }
  }
  const sameGesture = state.choice === input.choice && state.source === input.source
  // A suspended frame must not finish a gesture when the page resumes.
  const elapsedMs = sameGesture ? state.elapsedMs + Math.max(0, Math.min(input.deltaMs, 100)) : 0
  const progress = Math.min(1, elapsedMs / durationMs)
  if (progress >= 1) return { state: createChoiceHold(), progress: 1, committed: input.choice }
  return {
    state: { choice: input.choice, source: input.source, elapsedMs, requiresRelease: false },
    progress,
    committed: null,
  }
}
