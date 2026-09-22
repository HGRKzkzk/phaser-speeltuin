import { describe, expect, it } from 'vitest'
import { gameConfig } from './config'
import { adventureStories } from './adventures'
import { createArrivalStory, getLevelRules, recallJourney } from './journey'
import { createSeededRandom } from './random'
import {
  chooseAdventureOption,
  createGameState,
  enterAdventure,
  getTimePressure,
  isAdventureDue,
  resolveAttempt,
  resolveTimePressure,
  startNextLevel,
} from './rules'
import type { ArrivalTone, GameState, JourneyRoute } from './types'

function playLevel(initial: GameState, cadenceMs = 500, mistakes = 0): GameState {
  let state = initial
  let atMs = state.timing.levelStartedAtMs + 280
  let correctHits = 0
  for (let attempt = 0; attempt < 200 && state.status === 'playing'; attempt += 1) {
    const miss = mistakes > 0 && correctHits > 0 && correctHits % 4 === 0
    atMs += miss ? 200 : cadenceMs
    state = resolveTimePressure(state, atMs).state
    if (state.status !== 'playing') break
    const block = state.path.blocks[state.path.activeIndex]
    const result = resolveAttempt(
      state,
      {
        color: miss ? null : block.color,
        direction: block.direction,
        atMs,
        responseMs: miss ? 200 : cadenceMs,
      },
      createSeededRandom(attempt),
    )
    state = result.state
    if (miss) mistakes -= 1
    else correctHits += 1
    if (result.outcome === 'path-complete') atMs += 160
  }
  return state
}

function beginRoute(route: JourneyRoute): GameState {
  const won = playLevel(createGameState(createSeededRandom(17)))
  const meeting = enterAdventure(won, createSeededRandom(5))
  const routeChoice = chooseAdventureOption(meeting, 0, createSeededRandom(5), 50_000)
  return chooseAdventureOption(routeChoice, route === 'open' ? 0 : 1, createSeededRandom(5), 100_000)
}

describe('de belofte aan Noor', () => {
  it('maakt het verhaal ook bereikbaar zonder een snelle of correcte treffer', () => {
    let state = createGameState(createSeededRandom(17))
    state = resolveTimePressure(state, state.levelRules.timeLimitMs).state
    expect(state.status).toBe('stage-late')
    const meeting = enterAdventure(state)
    const route = chooseAdventureOption(meeting, 0)
    state = chooseAdventureOption(route, 1, createSeededRandom(5), 100_000)
    state = resolveTimePressure(state, 100_000 + state.levelRules.timeLimitMs).state
    expect(state.journey.memory?.tone).toBe('late')
    expect(state.score).toBe(0)
    expect(enterAdventure(state).adventure.active?.story.kind).toBe('arrival')
  })

  it('laat de ontmoeting na level 1 voorgaan op de willekeurige avonturen', () => {
    const won = playLevel(createGameState(createSeededRandom(17)))
    expect(won.status).toBe('stage-win')
    expect(won.adventure.levelsUntilAdventure).toBeGreaterThan(0)
    expect(isAdventureDue(won)).toBe(true)
    const meeting = enterAdventure(won, createSeededRandom(5))
    expect(meeting.adventure.active?.story.kind).toBe('meeting')
    const next = chooseAdventureOption(meeting, 0, createSeededRandom(5), 50_000)
    expect(next.level).toBe(1)
    expect(next.status).toBe('adventure')
    expect(next.score).toBe(won.score)
    expect(resolveTimePressure(next, 90_000).state.status).toBe('adventure')
  })

  it.each(['open', 'sheltered'] as const)('past route %s toe op precies het volgende level', (route) => {
    const state = beginRoute(route)
    expect(state.level).toBe(2)
    expect(state.path.targetSide).toBe('left')
    expect(state.journey).toEqual({ phase: 'travelling', route, memory: null })
    expect(state.levelRules).toEqual(getLevelRules(route))
    expect(state.performance).toEqual({ mistakes: 0, highestCombo: 0, elapsedMs: 0 })
    expect(state.timing.levelStartedAtMs).toBe(100_000)
    expect(state.timing.timeReliefMs).toBe(0)
    expect(getTimePressure(state, 100_000 + state.levelRules.timeLimitMs / 2)).toBe(0.5)
    expect(resolveTimePressure(state, 100_000 + state.levelRules.timeLimitMs).outcome).toBe('time-up')
  })

  it('geeft geen punten voor een route die van de eerste houding afwijkt', () => {
    const won = playLevel(createGameState(createSeededRandom(17)))
    const meeting = enterAdventure(won)
    const choices = chooseAdventureOption(meeting, 0)
    const open = chooseAdventureOption(choices, 0)
    const sheltered = chooseAdventureOption(choices, 1)
    expect(open.score).toBe(won.score)
    expect(sheltered.score).toBe(won.score)
  })

  it.each(['open', 'sheltered'] as const)(
    'houdt route %s haalbaar op beheerst tempo en laat langzaam spel ook doorgaan',
    (route) => {
      const state = beginRoute(route)
      const steady = playLevel(state, 1_250)
      expect(steady.status).toBe('stage-win')
      expect(steady.edgeProgress.left).toBe(state.levelRules.targetHits)
      expect(steady.completedPaths).toBe(state.levelRules.targetHits / gameConfig.blocksPerPath)
      expect(steady.journey.phase).toBe('arrived')
      expect(steady.levelRules).toEqual(state.levelRules)
      expect(isAdventureDue(steady)).toBe(true)
      const tooSlow = playLevel(state, 1_500)
      expect(tooSlow.status).toBe('stage-late')
      expect(tooSlow.journey.memory?.tone).toBe('late')
      expect(tooSlow.journey.memory?.remainingMs).toBe(0)
      expect(isAdventureDue(tooSlow)).toBe(true)
      const arrival = enterAdventure(tooSlow)
      expect(arrival.adventure.active?.story.fragments.arrival.text).toContain('later de schuilplaats')
      const rest = chooseAdventureOption(arrival, 1, createSeededRandom(1), 200_000)
      const next = chooseAdventureOption(rest, 0, createSeededRandom(1), 300_000)
      expect(next.level).toBe(3)
      expect(next.status).toBe('playing')
      expect(next.score).toBe(tooSlow.score)
      expect(next.journey.memory?.tone).toBe('late')
      expect(getTimePressure(next, 300_000)).toBe(0)
    },
  )

  it.each([
    [500, 0, 'fluent'],
    [1_000, 0, 'steady'],
    [500, 3, 'persistent'],
  ] as const)('maakt een eigen aankomst na %i ms tempo en %i fouten', (cadence, mistakes, tone: ArrivalTone) => {
    const won = playLevel(beginRoute('open'), cadence, mistakes)
    expect(won.status).toBe('stage-win')
    expect(won.journey.memory?.tone).toBe(tone)
    expect(won.journey.memory?.mistakes).toBe(mistakes)
    expect(won.journey.memory?.highestCombo).toBe(won.performance.highestCombo)
    expect(won.journey.memory?.elapsedMs).toBe(won.performance.elapsedMs)
    const memory = won.journey.memory!
    const remainingMs = won.levelRules.timeLimitMs - memory.elapsedMs + won.timing.timeReliefMs
    expect(memory.remainingMs).toBe(remainingMs)
    const arrival = enterAdventure(won)
    expect(arrival.adventure.active?.story).toEqual(createArrivalStory(memory))
    expect(arrival.adventure.active?.story.fragments.arrival.text).toContain(
      tone === 'persistent' ? 'je bleef wel' : tone === 'fluent' ? 'Doe jij dit vaker?' : 'Fijn dat we samen gingen',
    )
    expect(won.score).toBeGreaterThan(0)
  })

  it('bewaart de herinnering, herstelt de gewone regels en begint de klok pas na het gesprek', () => {
    const won = playLevel(beginRoute('sheltered'), 500, 3)
    let state = enterAdventure(won)
    state = chooseAdventureOption(state, 0, createSeededRandom(1), 200_000)
    expect(state.status).toBe('adventure')
    expect(state.level).toBe(2)
    state = chooseAdventureOption(state, 1, createSeededRandom(2), 300_000)
    expect(state.status).toBe('playing')
    expect(state.level).toBe(3)
    expect(state.path.targetSide).toBe('right')
    expect(state.journey.phase).toBe('complete')
    expect(state.journey.memory).toEqual(won.journey.memory)
    expect(state.levelRules).toEqual(getLevelRules())
    expect(state.score).toBe(won.score)
    expect(state.affinity.left).toEqual(won.affinity.left)
    expect(state.performance).toEqual({ mistakes: 0, highestCombo: 0, elapsedMs: 0 })
    expect(getTimePressure(state, 300_000)).toBe(0)
    expect(state.timing.timeReliefMs).toBe(0)
    const later = startNextLevel({ ...state, status: 'stage-win' }, createSeededRandom(3), 400_000)
    expect(later.journey.memory).toEqual(won.journey.memory)
    const nextAdventure = enterAdventure({ ...later, status: 'stage-win' }, createSeededRandom(4))
    const active = nextAdventure.adventure.active!
    expect(active.story.fragments[active.fragmentId].text).toContain('Noor')
    expect(active.story.kind).toBeUndefined()
  })

  it('voegt herinneringen toe zonder gedeelde verhaalteksten te veranderen en wist ze bij herstart', () => {
    const won = playLevel(beginRoute('open'))
    const original = adventureStories[0]
    const text = original.fragments[original.entryFragmentId].text
    const remembered = recallJourney(original, won.journey.memory)
    expect(remembered.fragments[remembered.entryFragmentId].text).toContain('Noor')
    expect(original.fragments[original.entryFragmentId].text).toBe(text)
    expect(createGameState().journey).toEqual({ phase: 'unmet', route: null, memory: null })
  })
})
