import { describe, expect, it } from 'vitest'
import { initialAdventureSelection, stepAdventureSelection } from './adventureSelection'
import { gameConfig } from './config'
import { getLevelRules, recallJourney } from './journey'
import { adventureStories } from './adventures'
import { createSeededRandom } from './random'
import {
  chooseAdventureOption,
  createGameState,
  createPath,
  enterAdventure,
  getTimePressure,
  isAdventureDue,
  resolveAttempt,
  resolveTimePressure,
} from './rules'
import type { GameState, ShelterApproach } from './types'

function choose(state: GameState, id: string, now = 100_000): GameState {
  const active = state.adventure.active!
  const index = active.story.fragments[active.fragmentId].choices.findIndex((choice) => choice.id === id)
  expect(index).toBeGreaterThanOrEqual(0)
  return chooseAdventureOption(state, index, createSeededRandom(5), now)
}

function atDoor(): GameState {
  let state = createGameState(createSeededRandom(7))
  state = enterAdventure(resolveTimePressure(state, state.levelRules.timeLimitMs).state)
  state = choose(state, 'routes')
  state = choose(state, 'open')
  return enterAdventure(resolveTimePressure(state, 100_000 + state.levelRules.timeLimitMs).state)
}

function startDoor(approach: ShelterApproach): GameState {
  let state = choose(atDoor(), 'inspect')
  state = choose(state, 'plan')
  return choose(state, approach, 200_000)
}

function finishDoor(state: GameState, late: boolean): GameState {
  if (late) return resolveTimePressure(state, state.timing.levelStartedAtMs + state.levelRules.timeLimitMs).state
  let now = state.timing.levelStartedAtMs
  for (let i = 0; i < 100 && state.status === 'playing'; i++) {
    now += 500
    state = resolveAttempt(
      state,
      { ...state.path.blocks[state.path.activeIndex], atMs: now, responseMs: 500 },
      createSeededRandom(i),
    ).state
  }
  expect(state.status).toBe('stage-win')
  return state
}

describe('de klemmende deur', () => {
  it('geeft verschillende aanwijzingen, laat beide onderzoeken en bewaart de score tijdens onderzoek', () => {
    const door = atDoor()
    const listen = choose(door, 'listen')
    const inspect = choose(door, 'inspect')
    expect(listen.adventure.active?.fragmentId).toBe('listen')
    expect(inspect.adventure.active?.fragmentId).toBe('inspect')
    const both = choose(listen, 'inspect-too')
    expect(both.adventure.active?.fragmentId).toBe('both')
    expect(choose(inspect, 'listen-too').adventure.active?.fragmentId).toBe('both')
    expect(both.score).toBe(door.score)
    expect(both.level).toBe(door.level)
    expect(resolveTimePressure(both, 9_000_000).state).toBe(both)
    expect(both.adventure.log.at(-1)?.choiceId).toBe('inspect-too')
  })

  it('laat elke onderzoekstak eindigen met een expliciete aanpak, zonder doodlopende fragmenten', () => {
    const visit = (state: GameState, depth = 0) => {
      expect(depth).toBeLessThan(6)
      const active = state.adventure.active!
      const fragment = active.story.fragments[active.fragmentId]
      expect(fragment).toBeDefined()
      expect(fragment.choices.length).toBeGreaterThan(0)
      fragment.choices.forEach((choice) => {
        const next = choose(state, choice.id)
        expect(next.score).toBe(state.score)
        if (next.status === 'adventure') visit(next, depth + 1)
        else {
          expect(next.journey.phase).toBe('opening')
          expect(next.journey.shelter?.approach).toBe(choice.shelterApproach)
        }
      })
    }
    visit(atDoor())
  })

  it.each(['lift', 'hinges'] as const)('past aanpak %s toe op elk pad van precies één level', (approach) => {
    let state = startDoor(approach)
    const grouping = gameConfig.shelter.approaches[approach].grouping
    expect(state.level).toBe(3)
    expect(state.levelRules).toEqual({ ...getLevelRules(), blockGrouping: grouping })
    expect(getTimePressure(state, 200_000)).toBe(0)
    for (let path = 0; path < 2; path++) {
      const values = state.path.blocks.map((block) => block[grouping])
      expect(values.filter((value, index) => index > 0 && values[index - 1] !== value)).toHaveLength(1)
      for (let block = 0; block < gameConfig.blocksPerPath; block++) {
        state = resolveAttempt(state, {
          ...state.path.blocks[state.path.activeIndex],
          atMs: 200_000 + (path * 7 + block + 1) * 500,
          responseMs: 500,
        }).state
      }
    }
    expect(state.status).toBe('playing')
  })

  it.each([1, 2])('behoudt op zijde van level %i dezelfde gebalanceerde blokkenzak en affiniteit', (level) => {
    for (const grouping of ['color', 'direction'] as const) {
      for (let seed = 1; seed <= 12; seed++) {
        const plain = createPath(level, createSeededRandom(seed))
        const grouped = createPath(level, createSeededRandom(seed), grouping)
        const bag = (state: typeof plain) => state.blocks.map((b) => `${b.color}:${b.direction}`).sort()
        expect(bag(grouped)).toEqual(bag(plain))
        expect(grouped.blocks.every((b) => b.direction === 'up' || b.direction === grouped.targetSide)).toBe(true)
      }
    }
    const state = startDoor('lift')
    for (const color of ['red', 'blue'] as const) {
      // Level 1 already contributed right-side offers; the door adds a full grouped path.
      expect(state.affinity.right[color].shown).toBeGreaterThanOrEqual(
        state.path.blocks.filter((b) => b.color === color).length,
      )
    }
  })

  it.each([
    ['lift', false],
    ['hinges', false],
    ['lift', true],
    ['hinges', true],
  ] as const)('toont en onthoudt de afloop van %s (tijd op: %s) en herstelt gewone levels', (approach, late) => {
    const finished = finishDoor(startDoor(approach), late)
    expect(isAdventureDue(finished)).toBe(true)
    expect(finished.journey.shelter).toEqual({ approach, result: late ? 'late' : 'opened' })
    let state = enterAdventure(finished)
    const active = state.adventure.active!
    expect(active.story.kind).toBe('shelter-result')
    expect(active.story.fragments.result.text).toContain(late ? 'droge bank' : 'briefje')
    state = choose(state, 'rest')
    expect(state.status).toBe('adventure')
    state = choose(state, 'continue', 500_000)
    expect(state.status).toBe('playing')
    expect(state.level).toBe(4)
    expect(state.levelRules).toEqual(getLevelRules())
    expect(state.path).toEqual(createPath(4, createSeededRandom(5)))
    expect(state.journey.phase).toBe('complete')
    expect(state.journey.shelter).toEqual(finished.journey.shelter)
    expect(state.journey.memory).toEqual(finished.journey.memory)
    expect(state.score).toBe(finished.score)
    expect(getTimePressure(state, 500_000)).toBe(0)
    const story = recallJourney(adventureStories[0], state.journey.memory, state.journey.shelter)
    expect(story.fragments[story.entryFragmentId].text).toContain(late ? 'rugleuning' : 'scharnier')
    expect(createGameState().journey.shelter).toBeNull()
  })
})

describe('expliciete tekstselectie', () => {
  it('ondersteunt links en rechts vanaf een neutrale start, ook bij één vervolgknop', () => {
    expect(initialAdventureSelection(2)).toBeNull()
    expect(initialAdventureSelection(1)).toBe(0)
    expect(initialAdventureSelection(0)).toBeNull()
    expect(stepAdventureSelection(null, 2, -1)).toBe(0)
    expect(stepAdventureSelection(null, 2, 1)).toBe(1)
    expect(stepAdventureSelection(1, 2, -1)).toBe(0)
    expect(stepAdventureSelection(0, 2, 1)).toBe(1)
    expect(stepAdventureSelection(null, 1, 1)).toBe(0)
    expect(stepAdventureSelection(null, 0, 1)).toBeNull()
  })
})
