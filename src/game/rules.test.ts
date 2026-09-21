import { describe, expect, it } from 'vitest'
import { gameConfig } from './config'
import {
  chooseAdventureOption,
  createGameState,
  createPath,
  enterAdventure,
  getTargetSide,
  isAdventureDue,
  resolveAttempt,
  startNextLevel,
} from './rules'
import { createSeededRandom } from './random'
import type { GameState } from './types'

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createGameState(createSeededRandom(17)), ...overrides }
}

describe('levelgebonden zijde', () => {
  it('wisselt de actieve zijde pas bij een volgend level', () => {
    expect(getTargetSide(1)).toBe('right')
    expect(getTargetSide(2)).toBe('left')
    expect(getTargetSide(3)).toBe('right')
  })

  it('houdt alle paden binnen een level aan dezelfde zijde', () => {
    const first = createPath(1, createSeededRandom(17))
    const later = createPath(1, createSeededRandom(42))
    expect(first.targetSide).toBe('right')
    expect(later.targetSide).toBe('right')
    expect(first.blocks.every(({ direction }) => direction === 'up' || direction === 'right')).toBe(true)
  })
})

describe('gebalanceerde blokkenzak', () => {
  it('houdt de vier kleur-richtingcombinaties binnen één aanbieding van elkaar', () => {
    const path = createPath(1, createSeededRandom(17))
    const counts = new Map<string, number>()
    path.blocks.forEach(({ color, direction }) => {
      const key = `${color}-${direction}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })
    const values = [...counts.values()]
    expect(counts.size).toBe(4)
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  })
})

describe('invoer en balkvoortgang', () => {
  it('keurt alleen een gelijktijdig juiste kleur en richting goed', () => {
    const initial = createGameState(createSeededRandom(17))
    const activeBlock = initial.path.blocks[0]
    expect(resolveAttempt(initial, activeBlock).outcome).toBe('correct')
    const wrongColor = activeBlock.color === 'red' ? 'blue' : 'red'
    expect(resolveAttempt(initial, { color: wrongColor, direction: activeBlock.direction }).outcome).toBe('wrong')
  })

  it('beweegt de balk aan de actieve zijde naar binnen bij een goed blok', () => {
    const initial = createGameState(createSeededRandom(17))
    const result = resolveAttempt(initial, initial.path.blocks[0])
    expect(result.state.edgeProgress.right).toBe(1)
    expect(result.state.edgeProgress.left).toBe(0)
  })

  it('geeft na 21 netto goede blokken stage win', () => {
    const initial = createGameState(createSeededRandom(17))
    const state = stateWith({
      edgeProgress: { left: 0, right: gameConfig.progressForStageWin - 1 },
      path: initial.path,
    })
    const result = resolveAttempt(state, state.path.blocks[0])
    expect(result.outcome).toBe('stage-win')
  })

  it('geeft game over wanneer de actieve balk de buitenrand bereikt', () => {
    const initial = createGameState(createSeededRandom(17))
    const state = stateWith({
      edgeProgress: { left: 0, right: -(gameConfig.mistakesFromStartToGameOver - 1) },
      path: initial.path,
    })
    const result = resolveAttempt(state, { color: null, direction: 'up' })
    expect(result.outcome).toBe('game-over')
  })
})

describe('latente affiniteit', () => {
  it('registreert aangeboden blokken per kleur en zijde', () => {
    const state = createGameState(createSeededRandom(17))
    const shown = state.affinity.right.red.shown + state.affinity.right.blue.shown
    expect(shown).toBe(gameConfig.blocksPerPath)
    expect(state.affinity.left.red.shown + state.affinity.left.blue.shown).toBe(0)
  })

  it('registreert een correcte treffer in precies één kleur-zijdecel', () => {
    const state = createGameState(createSeededRandom(17))
    const block = state.path.blocks[0]
    const result = resolveAttempt(state, block)
    expect(result.state.affinity.right[block.color].correct).toBe(1)
    const otherColor = block.color === 'red' ? 'blue' : 'red'
    expect(result.state.affinity.right[otherColor].correct).toBe(0)
  })

  it('bewaart affiniteit en score wanneer het volgende level van zijde wisselt', () => {
    const won = stateWith({ score: 42, level: 1, status: 'stage-win' })
    won.affinity.right.red.correct = 9
    const next = startNextLevel(won, createSeededRandom(17))
    expect(next.score).toBe(42)
    expect(next.level).toBe(2)
    expect(next.path.targetSide).toBe('left')
    expect(next.affinity.right.red.correct).toBe(9)
    expect(next.affinity.left.red.shown + next.affinity.left.blue.shown).toBe(gameConfig.blocksPerPath)
  })
})

describe('tekstavontuur', () => {
  it('trekt bij het begin van een spel een geldige levelafstand', () => {
    const state = createGameState(createSeededRandom(17))
    expect(gameConfig.adventureLevelGapChoices).toContain(state.levelsUntilAdventure)
    expect(state.adventure).toBeNull()
    expect(state.adventureLog).toHaveLength(0)
  })

  it('telt het aantal levels tot het volgende avontuur af bij een stage win', () => {
    const initial = createGameState(createSeededRandom(17))
    const state = stateWith({
      levelsUntilAdventure: 1,
      edgeProgress: { left: 0, right: gameConfig.progressForStageWin - 1 },
      path: initial.path,
    })
    const result = resolveAttempt(state, state.path.blocks[0])
    expect(result.outcome).toBe('stage-win')
    expect(result.state.levelsUntilAdventure).toBe(0)
    expect(isAdventureDue(result.state)).toBe(true)
  })

  it('start een tekstavontuur met een scenario en een nieuwe levelafstand', () => {
    const due = stateWith({ levelsUntilAdventure: 0, status: 'stage-win' })
    const adventureState = enterAdventure(due, createSeededRandom(5))
    expect(adventureState.status).toBe('adventure')
    expect(adventureState.adventure?.scenario.choices.length).toBeGreaterThanOrEqual(2)
    expect(gameConfig.adventureLevelGapChoices).toContain(adventureState.levelsUntilAdventure)
  })

  it('legt de gemaakte keuze vast en gaat direct verder met het volgende level', () => {
    const due = stateWith({ levelsUntilAdventure: 0, status: 'stage-win', score: 12, level: 3 })
    const adventureState = enterAdventure(due, createSeededRandom(5))
    const scenario = adventureState.adventure!.scenario
    const next = chooseAdventureOption(adventureState, 0, createSeededRandom(9))

    expect(next.status).toBe('playing')
    expect(next.level).toBe(4)
    expect(next.score).toBe(12)
    expect(next.adventure).toBeNull()
    expect(next.adventureLog).toEqual([{ scenarioId: scenario.id, choiceId: scenario.choices[0].id }])
  })

  it('weigert een keuze buiten een tekstavontuur', () => {
    const state = createGameState(createSeededRandom(17))
    expect(() => chooseAdventureOption(state, 0)).toThrow()
  })
})
