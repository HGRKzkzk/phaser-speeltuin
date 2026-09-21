import { describe, expect, it } from 'vitest'
import { gameConfig } from './config'
import {
  classifyHitQuality,
  createGameState,
  createPath,
  getMultiplier,
  getTargetSide,
  resolveAttempt,
  startNextLevel,
} from './rules'
import { createSeededRandom } from './random'
import type { GameState } from './types'

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createGameState(createSeededRandom(17)), ...overrides }
}

function correctAttempt(state: GameState, atMs = 400, responseMs = 250) {
  return { ...state.path.blocks[state.path.activeIndex], atMs, responseMs }
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
    expect(resolveAttempt(initial, { ...activeBlock, atMs: 400, responseMs: 250 }).outcome).toBe('correct')
    const wrongColor = activeBlock.color === 'red' ? 'blue' : 'red'
    expect(resolveAttempt(initial, {
      color: wrongColor,
      direction: activeBlock.direction,
      atMs: 400,
      responseMs: 250,
    }).outcome).toBe('wrong')
  })

  it('beweegt de balk aan de actieve zijde naar binnen bij een goed blok', () => {
    const initial = createGameState(createSeededRandom(17))
    const result = resolveAttempt(initial, correctAttempt(initial))
    expect(result.state.edgeProgress.right).toBe(1)
    expect(result.state.edgeProgress.left).toBe(0)
  })

  it('geeft na 21 netto goede blokken stage win', () => {
    const initial = createGameState(createSeededRandom(17))
    const state = stateWith({
      edgeProgress: { left: 0, right: gameConfig.progressForStageWin - 1 },
      path: initial.path,
    })
    const result = resolveAttempt(state, correctAttempt(state, 5_000))
    expect(result.outcome).toBe('stage-win')
  })

  it('geeft game over wanneer de actieve balk de buitenrand bereikt', () => {
    const initial = createGameState(createSeededRandom(17))
    const state = stateWith({
      edgeProgress: { left: 0, right: -(gameConfig.mistakesFromStartToGameOver - 1) },
      path: initial.path,
    })
    const result = resolveAttempt(state, { color: null, direction: 'up', atMs: 400, responseMs: 400 })
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
    const result = resolveAttempt(state, { ...block, atMs: 400, responseMs: 250 })
    expect(result.state.affinity.right[block.color].correct).toBe(1)
    const otherColor = block.color === 'red' ? 'blue' : 'red'
    expect(result.state.affinity.right[otherColor].correct).toBe(0)
  })

  it('bewaart affiniteit en score wanneer het volgende level van zijde wisselt', () => {
    const won = stateWith({ score: 42, level: 1, status: 'stage-win' })
    won.affinity.right.red.correct = 9
    const next = startNextLevel(won, createSeededRandom(17), 20_000)
    expect(next.score).toBe(42)
    expect(next.level).toBe(2)
    expect(next.path.targetSide).toBe('left')
    expect(next.affinity.right.red.correct).toBe(9)
    expect(next.affinity.left.red.shown + next.affinity.left.blue.shown).toBe(gameConfig.blocksPerPath)
  })
})

describe('tijd, kwaliteit en combo', () => {
  it('deelt reactietijden in vier kwaliteitsniveaus in', () => {
    expect(classifyHitQuality(280)).toBe('perfect')
    expect(classifyHitQuality(500)).toBe('great')
    expect(classifyHitQuality(800)).toBe('good')
    expect(classifyHitQuality(801)).toBe('steady')
  })

  it('maakt ×2 na drie snelle opeenvolgende treffers toegankelijk', () => {
    let state = createGameState(createSeededRandom(17), 0)
    let thirdScoreDelta = 0
    for (const atMs of [300, 650, 1_000]) {
      const result = resolveAttempt(state, correctAttempt(state, atMs, 250))
      state = result.state
      thirdScoreDelta = result.scoreDelta
    }
    expect(state.combo.streak).toBe(3)
    expect(state.combo.multiplier).toBe(2)
    expect(thirdScoreDelta).toBe(
      (gameConfig.pointsPerBlock + gameConfig.qualityBonusPoints.perfect) * 2,
    )
    expect(getMultiplier(15)).toBe(5)
  })

  it('breekt de combo bij een fout', () => {
    const initial = createGameState(createSeededRandom(17), 0)
    const hit = resolveAttempt(initial, correctAttempt(initial, 300, 250)).state
    const result = resolveAttempt(hit, { color: null, direction: 'up', atMs: 500, responseMs: 200 })
    expect(result.state.combo).toEqual({ streak: 0, multiplier: 1, lastCorrectAtMs: null })
  })

  it('geeft bij een snelle stage-clear een afzonderlijke tijdbonus', () => {
    const initial = createGameState(createSeededRandom(17), 0)
    const state = stateWith({
      levelStartedAtMs: 0,
      edgeProgress: { left: 0, right: gameConfig.progressForStageWin - 1 },
      path: initial.path,
    })
    const result = resolveAttempt(state, correctAttempt(state, 5_000, 250))
    expect(result.outcome).toBe('stage-win')
    expect(result.timeBonus).toBe(13)
    expect(result.scoreDelta).toBeGreaterThan(result.timeBonus)
  })
})
