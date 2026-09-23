import { describe, expect, it } from 'vitest'
import { advanceChoiceHold, createChoiceHold } from './choiceHold'
import type { ChoiceHoldInput, ChoiceHoldState } from './choiceHold'
import { gameConfig } from './config'
import { createShelterStory } from './shelter'

const duration = gameConfig.adventure.choiceHoldMs
const pressed: ChoiceHoldInput = { choice: 0, source: 'keyboard', anyDown: true, deltaMs: 50 }
const released: ChoiceHoldInput = { choice: null, source: null, anyDown: false, deltaMs: 16 }
const step = (state: ChoiceHoldState, input = pressed) => advanceChoiceHold(state, input, duration)
function begin() {
  return step(createChoiceHold(false)).state
}
function holdFor(ms: number, initial = begin()) {
  let result = step(initial, { ...pressed, deltaMs: 0 })
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    result = step(result.state, { ...pressed, deltaMs: Math.min(50, ms - elapsed) })
  }
  return result
}

describe('bewust vasthouden', () => {
  it('bevestigt pas bij de volledige duur en precies één keer tot loslaten', () => {
    const almost = holdFor(duration - 1)
    expect(almost.committed).toBeNull()
    expect(almost.progress).toBeLessThan(1)
    const done = step(almost.state, { ...pressed, deltaMs: 1 })
    expect(done.committed).toBe(0)
    expect(done.progress).toBe(1)
    expect(step(done.state).committed).toBeNull()
    expect(step(done.state).state.requiresRelease).toBe(true)
    const ready = step(done.state, released)
    expect(ready.state.requiresRelease).toBe(false)
    expect(step(ready.state).state.elapsedMs).toBe(0)
  })

  it('wist alle opbouw bij vroeg loslaten en begint een nieuwe poging vanaf nul', () => {
    const cancelled = step(holdFor(duration / 2).state, released)
    expect(cancelled.committed).toBeNull()
    expect(cancelled.progress).toBe(0)
    const again = step(cancelled.state)
    expect(again.state.elapsedMs).toBe(0)
    expect(holdFor(duration / 2, again.state).committed).toBeNull()
  })

  it.each([
    { ...pressed, choice: 1 },
    { ...pressed, source: 'pointer' as const },
  ])('neemt opgebouwde tijd niet mee naar een andere keuze of invoerbron', (input) => {
    const result = step(holdFor(duration / 2).state, input)
    expect(result.progress).toBe(0)
    expect(result.committed).toBeNull()
  })

  it('neemt een ingedrukte toets niet over bij een nieuw fragment of na focusverlies', () => {
    let state = createChoiceHold()
    for (let i = 0; i < 100; i++) {
      const result = step(state)
      expect(result.committed).toBeNull()
      state = result.state
    }
    expect(step(state, released).state.requiresRelease).toBe(false)
  })

  it('laat een onderbroken frame de keuze niet ineens voltooien', () => {
    const result = step(begin(), { ...pressed, deltaMs: 60_000 })
    expect(result.committed).toBeNull()
    expect(result.progress).toBeLessThan(1)
  })

  it('past het experiment uitsluitend toe op de twee deurhandelingen met eigen reactie', () => {
    const story = createShelterStory({
      route: 'open',
      remainingMs: 0,
      tone: 'late',
      mistakes: 0,
      highestCombo: 0,
      elapsedMs: 16_000,
    })
    expect(
      Object.values(story.fragments)
        .filter((fragment) => fragment.interaction === 'hold')
        .map((fragment) => fragment.id),
    ).toEqual(['approach'])
    expect(story.fragments.approach.choices).toHaveLength(2)
    expect(story.fragments.approach.choices.every((choice) => choice.anticipation?.includes('Noor'))).toBe(true)
  })
})
