import { describe, expect, it } from 'vitest'
import { gameConfig } from './config'
import {
  chooseAdventureOption,
  classifyHitQuality,
  createGameState,
  createPath,
  enterAdventure,
  getTimePressure,
  getMultiplier,
  getTargetSide,
  isAdventureDue,
  resolveAttempt,
  resolveTimePressure,
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
    const result = resolveAttempt(state, correctAttempt(state, 5_000))
    expect(result.outcome).toBe('stage-win')
    expect(result.state.levelsUntilAdventure).toBe(0)
    expect(isAdventureDue(result.state)).toBe(true)
  })

  it('start een tekstavontuur bij het eerste fragment van een verhaal', () => {
    const due = stateWith({ levelsUntilAdventure: 0, status: 'stage-win' })
    const adventureState = enterAdventure(due, createSeededRandom(5))
    expect(adventureState.status).toBe('adventure')
    const { story, fragmentId } = adventureState.adventure!
    expect(fragmentId).toBe(story.entryFragmentId)
    expect(story.fragments[fragmentId].choices.length).toBeGreaterThanOrEqual(2)
    expect(gameConfig.adventureLevelGapChoices).toContain(adventureState.levelsUntilAdventure)
  })

  it('leidt een niet-afsluitende keuze naar het volgende fragment, zonder het level te wisselen', () => {
    const due = stateWith({ levelsUntilAdventure: 0, status: 'stage-win', score: 12, level: 3 })
    const adventureState = enterAdventure(due, createSeededRandom(5))
    const { story, fragmentId } = adventureState.adventure!
    const startFragment = story.fragments[fragmentId]
    const choice = startFragment.choices[0]
    expect(choice.next).not.toBe('end')

    const next = chooseAdventureOption(adventureState, 0)

    expect(next.status).toBe('adventure')
    expect(next.level).toBe(3)
    expect(next.score).toBe(12)
    expect(next.adventure?.fragmentId).toBe(choice.next)
    expect(next.adventureLog).toEqual([{ adventureId: story.id, fragmentId: startFragment.id, choiceId: choice.id }])
  })

  it('doorloopt een volledig avontuur tot het einde en gaat dan direct verder met het volgende level', () => {
    const due = stateWith({ levelsUntilAdventure: 0, status: 'stage-win', score: 12, level: 3 })
    let state = enterAdventure(due, createSeededRandom(5))
    const storyId = state.adventure!.story.id

    let steps = 0
    while (state.status === 'adventure' && steps < 10) {
      state = chooseAdventureOption(state, 0, createSeededRandom(steps))
      steps += 1
    }

    expect(state.status).toBe('playing')
    expect(state.level).toBe(4)
    expect(state.score).toBe(12)
    expect(state.adventure).toBeNull()
    expect(state.adventureLog.length).toBe(steps)
    expect(state.adventureLog.every((entry) => entry.adventureId === storyId)).toBe(true)
    expect(state.adventureLog.at(-1)?.choiceId).toBeDefined()
  })

  it('weigert een keuze buiten een tekstavontuur', () => {
    const state = createGameState(createSeededRandom(17))
    expect(() => chooseAdventureOption(state, 0)).toThrow()
  })

  it('weigert een ongeldige keuze-index tijdens een tekstavontuur', () => {
    const due = stateWith({ levelsUntilAdventure: 0, status: 'stage-win' })
    const adventureState = enterAdventure(due, createSeededRandom(5))
    expect(() => chooseAdventureOption(adventureState, 99)).toThrow()
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
    expect(result.timeBonus).toBe(14)
    expect(result.scoreDelta).toBeGreaterThan(result.timeBonus)
  })

  it('laat de tijdsdruk lineair van buitenrand naar midden lopen', () => {
    const state = createGameState(createSeededRandom(17), 1_000)
    expect(getTimePressure(state, 1_000)).toBe(0)
    expect(getTimePressure(state, 1_000 + gameConfig.levelTimeLimitMs / 2)).toBe(0.5)
    expect(getTimePressure(state, 1_000 + gameConfig.levelTimeLimitMs)).toBe(1)
  })

  it('duwt de rode tijdslijn bij iedere correcte treffer een beetje terug', () => {
    const initial = createGameState(createSeededRandom(17), 0)
    const before = getTimePressure(initial, 9_000)
    const afterHit = resolveAttempt(initial, correctAttempt(initial, 9_000, 250)).state

    expect(afterHit.timeReliefMs).toBe(gameConfig.timeReliefPerCorrectMs)
    expect(getTimePressure(afterHit, 9_000)).toBeLessThan(before)
  })

  it('laat de tijd bij een langzaam speeltempo netto oprukken', () => {
    let state = createGameState(createSeededRandom(17), 0)

    for (const atMs of [2_000, 4_000, 6_000]) {
      state = resolveAttempt(state, correctAttempt(state, atMs, 1_200)).state
    }

    expect(state.timeReliefMs).toBe(3 * gameConfig.timeReliefPerCorrectMs)
    expect(getTimePressure(state, 6_000)).toBeGreaterThan(0.25)
  })

  it('geeft game over wanneer de rode tijdslijn het midden bereikt', () => {
    const state = createGameState(createSeededRandom(17), 1_000)
    const result = resolveTimePressure(state, 1_000 + gameConfig.levelTimeLimitMs)
    expect(result.outcome).toBe('game-over')
    expect(result.state.status).toBe('game-over')
  })
})
