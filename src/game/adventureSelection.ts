// Only a continuation may be preselected; real choices start neutral.
export function initialAdventureSelection(count: number): number | null {
  return count === 1 ? 0 : null
}

export function stepAdventureSelection(current: number | null, count: number, direction: -1 | 1): number | null {
  if (count < 1) return null
  if (current === null) return direction === -1 ? 0 : count - 1
  return Math.max(0, Math.min(count - 1, current + direction))
}
