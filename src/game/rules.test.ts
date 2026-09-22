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
import type { AdventureAlignment, AdventureChoice, AdventureStory, GameState } from './types'

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createGameState(createSeededRandom(17)), ...overrides }
}

function correctAttempt(state: GameState, atMs = 400, responseMs = 250) {
  return { ...state.path.blocks[state.path.activeIndex], atMs, responseMs }
}

// Bouwt een vaste keten a -> b -> c van twee stappen met gekozen houdingen,
// zodat de laatste keuze in fragment 'c' tegen een bekend overwicht afgezet kan worden.
function buildChainStory(
  firstAlignment: AdventureAlignment,
  secondAlignment: AdventureAlignment,
  finalChoices: AdventureChoice[],
): AdventureStory {
  return {
    id: 'test-chain',
    entryFragmentId: 'a',
    fragments: {
      a: {
        id: 'a',
        text: 'a',
        choices: [{ id: 'a1', label: 'a1', description: '', alignment: firstAlignment, next: 'b' }],
      },
      b: {
        id: 'b',
        text: 'b',
        choices: [{ id: 'b1', label: 'b1', description: '', alignment: secondAlignment, next: 'c' }],
      },
      c: { id: 'c', text: 'c', choices: finalChoices },
    },
  }
}

// Zet een state middenin een gegeven avontuur, bij het eerste fragment.
function stateInAdventure(story: AdventureStory, overrides: Partial<GameState> = {}): GameState {
  return stateWith({
    status: 'adventure',
    adventure: {
      levelsUntilAdventure: 0,
      active: { story, fragmentId: story.entryFragmentId, priorAlignments: [] },
      log: [],
    },
    score: 10,
    level: 5,
    ...overrides,
  })
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
    expect(
      resolveAttempt(initial, {
        color: wrongColor,
        direction: activeBlock.direction,
        atMs: 400,
        responseMs: 250,
      }).outcome,
    ).toBe('wrong')
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
    expect(gameConfig.adventure.levelGapChoices).toContain(state.adventure.levelsUntilAdventure)
    expect(state.adventure.active).toBeNull()
    expect(state.adventure.log).toHaveLength(0)
  })

  it('telt het aantal levels tot het volgende avontuur af bij een stage win', () => {
    const initial = createGameState(createSeededRandom(17))
    const state = stateWith({
      adventure: { ...initial.adventure, levelsUntilAdventure: 1 },
      edgeProgress: { left: 0, right: gameConfig.progressForStageWin - 1 },
      path: initial.path,
    })
    const result = resolveAttempt(state, correctAttempt(state, 5_000))
    expect(result.outcome).toBe('stage-win')
    expect(result.state.adventure.levelsUntilAdventure).toBe(0)
    expect(isAdventureDue(result.state)).toBe(true)
  })

  it('start een tekstavontuur bij het eerste fragment van een verhaal', () => {
    const due = stateWith({ adventure: { levelsUntilAdventure: 0, active: null, log: [] }, status: 'stage-win' })
    const adventureState = enterAdventure(due, createSeededRandom(5))
    expect(adventureState.status).toBe('adventure')
    const { story, fragmentId } = adventureState.adventure.active!
    expect(fragmentId).toBe(story.entryFragmentId)
    expect(story.fragments[fragmentId].choices.length).toBeGreaterThanOrEqual(2)
    expect(gameConfig.adventure.levelGapChoices).toContain(adventureState.adventure.levelsUntilAdventure)
  })

  it('leidt een niet-afsluitende keuze naar het volgende fragment, zonder het level te wisselen', () => {
    const due = stateWith({
      adventure: { levelsUntilAdventure: 0, active: null, log: [] },
      status: 'stage-win',
      score: 12,
      level: 3,
    })
    const adventureState = enterAdventure(due, createSeededRandom(5))
    const { story, fragmentId } = adventureState.adventure.active!
    const startFragment = story.fragments[fragmentId]
    const choice = startFragment.choices[0]
    expect(choice.next).not.toBe('end')

    const next = chooseAdventureOption(adventureState, 0)

    expect(next.status).toBe('adventure')
    expect(next.level).toBe(3)
    expect(next.score).toBe(12)
    expect(next.adventure.active?.fragmentId).toBe(choice.next)
    expect(next.adventure.active?.priorAlignments).toEqual([choice.alignment])
    expect(next.adventure.log).toEqual([
      { adventureId: story.id, fragmentId: startFragment.id, choiceId: choice.id, alignment: choice.alignment },
    ])
  })

  it('kent geen bonus toe als de laatste keuze het overwicht volgt', () => {
    const story = buildChainStory('bold', 'bold', [
      { id: 'c-bold', label: 'c-bold', description: '', alignment: 'bold', next: 'end' },
      { id: 'c-wary', label: 'c-wary', description: '', alignment: 'wary', next: 'end' },
    ])
    const due = stateInAdventure(story)
    const afterA = chooseAdventureOption(due, 0)
    const afterB = chooseAdventureOption(afterA, 0)
    expect(afterB.adventure.active?.priorAlignments).toEqual(['bold', 'bold'])

    const final = chooseAdventureOption(afterB, 0)
    expect(final.status).toBe('playing')
    expect(final.score).toBe(10)
  })

  it('kent de afwijkingsbonus toe als de laatste keuze tegen het overwicht ingaat', () => {
    const story = buildChainStory('bold', 'bold', [
      { id: 'c-bold', label: 'c-bold', description: '', alignment: 'bold', next: 'end' },
      { id: 'c-wary', label: 'c-wary', description: '', alignment: 'wary', next: 'end' },
    ])
    const due = stateInAdventure(story)
    const afterA = chooseAdventureOption(due, 0)
    const afterB = chooseAdventureOption(afterA, 0)

    const final = chooseAdventureOption(afterB, 1)
    expect(final.status).toBe('playing')
    expect(final.score).toBe(10 + gameConfig.adventure.defianceBonus)
  })

  it('kent geen bonus toe als de voorgaande houdingen elkaar in evenwicht houden', () => {
    const story = buildChainStory('bold', 'wary', [
      { id: 'c-bold', label: 'c-bold', description: '', alignment: 'bold', next: 'end' },
      { id: 'c-wary', label: 'c-wary', description: '', alignment: 'wary', next: 'end' },
    ])
    const due = stateInAdventure(story)
    const afterA = chooseAdventureOption(due, 0)
    const afterB = chooseAdventureOption(afterA, 0)
    expect(afterB.adventure.active?.priorAlignments).toEqual(['bold', 'wary'])

    const finalBold = chooseAdventureOption(afterB, 0)
    const finalWary = chooseAdventureOption(afterB, 1)
    expect(finalBold.score).toBe(10)
    expect(finalWary.score).toBe(10)
  })

  it('doorloopt een volledig avontuur tot het einde en gaat dan direct verder met het volgende level', () => {
    const due = stateWith({
      adventure: { levelsUntilAdventure: 0, active: null, log: [] },
      status: 'stage-win',
      score: 12,
      level: 3,
    })
    let state = enterAdventure(due, createSeededRandom(5))
    const storyId = state.adventure.active!.story.id

    let steps = 0
    while (state.status === 'adventure' && steps < 10) {
      state = chooseAdventureOption(state, 0, createSeededRandom(steps))
      steps += 1
    }

    expect(state.status).toBe('playing')
    expect(state.level).toBe(4)
    expect(state.score).toBe(12)
    expect(state.adventure.active).toBeNull()
    expect(state.adventure.log.length).toBe(steps)
    expect(state.adventure.log.every((entry) => entry.adventureId === storyId)).toBe(true)
    expect(state.adventure.log.at(-1)?.choiceId).toBeDefined()
  })

  it('weigert een keuze buiten een tekstavontuur', () => {
    const state = createGameState(createSeededRandom(17))
    expect(() => chooseAdventureOption(state, 0)).toThrow()
  })

  it('weigert een ongeldige keuze-index tijdens een tekstavontuur', () => {
    const due = stateWith({ adventure: { levelsUntilAdventure: 0, active: null, log: [] }, status: 'stage-win' })
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
    expect(state.timing.combo.streak).toBe(3)
    expect(state.timing.combo.multiplier).toBe(2)
    expect(thirdScoreDelta).toBe((gameConfig.pointsPerBlock + gameConfig.timing.qualityBonusPoints.perfect) * 2)
    expect(getMultiplier(15)).toBe(5)
    expect(state.timing.timeReliefMs).toBe(
      3 * gameConfig.timing.timeReliefPerCorrectMs + gameConfig.timing.extraTimeReliefPerMultiplierStepMs,
    )
  })

  it('breekt de combo bij een fout', () => {
    const initial = createGameState(createSeededRandom(17), 0)
    const hit = resolveAttempt(initial, correctAttempt(initial, 300, 250)).state
    const result = resolveAttempt(hit, { color: null, direction: 'up', atMs: 500, responseMs: 200 })
    expect(result.state.timing.combo).toEqual({ streak: 0, multiplier: 1, lastCorrectAtMs: null })
  })

  it('geeft bij een snelle stage-clear een afzonderlijke tijdbonus', () => {
    const initial = createGameState(createSeededRandom(17), 0)
    const state = stateWith({
      timing: { ...initial.timing, levelStartedAtMs: 0 },
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
    expect(getTimePressure(state, 1_000 + gameConfig.timing.levelTimeLimitMs / 2)).toBe(0.5)
    expect(getTimePressure(state, 1_000 + gameConfig.timing.levelTimeLimitMs)).toBe(1)
  })

  it('duwt de rode tijdslijn bij iedere correcte treffer een beetje terug', () => {
    const initial = createGameState(createSeededRandom(17), 0)
    const before = getTimePressure(initial, 9_000)
    const afterHit = resolveAttempt(initial, correctAttempt(initial, 9_000, 250)).state

    expect(afterHit.timing.timeReliefMs).toBe(gameConfig.timing.timeReliefPerCorrectMs)
    expect(getTimePressure(afterHit, 9_000)).toBeLessThan(before)
  })

  it('koopt met een hogere combo per treffer meer tijd terug', () => {
    let state = createGameState(createSeededRandom(17), 0)
    const reliefByMultiplier = new Map<number, number>()
    let pressureBeforeHighCombo = 0
    let atMs = 3_500

    for (let hit = 1; hit <= gameConfig.progressForStageWin; hit += 1) {
      atMs += 500
      const result = resolveAttempt(state, correctAttempt(state, atMs, hit === 1 ? atMs : 500))
      state = result.state
      reliefByMultiplier.set(state.timing.combo.multiplier, result.timeReliefMs)
      if (hit === 9) pressureBeforeHighCombo = getTimePressure(state, atMs)
    }

    expect([...reliefByMultiplier.entries()]).toEqual([
      [1, 250],
      [2, 350],
      [3, 450],
      [4, 550],
      [5, 650],
    ])
    expect(state.status).toBe('stage-win')
    expect(getTimePressure(state, atMs)).toBeLessThan(pressureBeforeHighCombo)
  })

  it.each(['pauze', 'fout'] as const)('verliest extra tijdswinst na een %s', (cause) => {
    let state = createGameState(createSeededRandom(17), 0)
    let atMs = 0
    for (let hit = 0; hit < 3; hit += 1) {
      atMs += 500
      state = resolveAttempt(state, correctAttempt(state, atMs, 500)).state
    }
    expect(state.timing.combo.multiplier).toBe(2)
    const savedTimeReliefMs = state.timing.timeReliefMs

    if (cause === 'fout') {
      atMs += 100
      const miss = resolveAttempt(state, { color: null, direction: 'up', atMs, responseMs: 100 })
      expect(miss.timeReliefMs).toBe(0)
      expect(miss.state.timing.timeReliefMs).toBe(savedTimeReliefMs)
      state = miss.state
    } else {
      atMs += gameConfig.timing.comboWindowMs
    }

    atMs += 100
    const nextHit = resolveAttempt(state, correctAttempt(state, atMs, 100))
    expect(nextHit.state.timing.combo.multiplier).toBe(1)
    expect(nextHit.timeReliefMs).toBe(gameConfig.timing.timeReliefPerCorrectMs)
    expect(nextHit.state.timing.timeReliefMs).toBe(savedTimeReliefMs + gameConfig.timing.timeReliefPerCorrectMs)
  })

  it('laat de tijd bij een langzaam speeltempo netto oprukken', () => {
    let state = createGameState(createSeededRandom(17), 0)

    for (const atMs of [2_000, 4_000, 6_000]) {
      state = resolveAttempt(state, correctAttempt(state, atMs, 1_200)).state
    }

    expect(state.timing.timeReliefMs).toBe(3 * gameConfig.timing.timeReliefPerCorrectMs)
    expect(getTimePressure(state, 6_000)).toBeGreaterThan(0.25)
  })

  it('geeft game over wanneer de rode tijdslijn het midden bereikt', () => {
    const state = createGameState(createSeededRandom(17), 1_000)
    const result = resolveTimePressure(state, 1_000 + gameConfig.timing.levelTimeLimitMs)
    expect(result.outcome).toBe('game-over')
    expect(result.state.status).toBe('game-over')
  })
})
