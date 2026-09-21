import { describe, expect, it } from 'vitest'
import { gameConfig } from './config'
import { createGameState, createPath, getTargetSide, resolveAttempt, startNextLevel } from './rules'
import { createSeededRandom } from './random'
import type { GameState } from './types'

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createGameState(createSeededRandom(17)), ...overrides }
}

describe('richtingsfasen', () => {
  it('wisselt na het ingestelde aantal voltooide paden van zijde', () => {
    const phaseSize = gameConfig.pathsPerDirectionPhase
    expect(getTargetSide(0)).toBe('right')
    expect(getTargetSide(phaseSize - 1)).toBe('right')
    expect(getTargetSide(phaseSize)).toBe('left')
    expect(getTargetSide(phaseSize * 2)).toBe('right')
  })

  it('gebruikt alleen boven en de horizontale richting naar de doelrand', () => {
    const rightPath = createPath(0, createSeededRandom(17))
    const leftPath = createPath(gameConfig.pathsPerDirectionPhase, createSeededRandom(17))
    expect(rightPath.blocks.every(({ direction }) => direction === 'up' || direction === 'right')).toBe(true)
    expect(leftPath.blocks.every(({ direction }) => direction === 'up' || direction === 'left')).toBe(true)
  })
})

describe('kleur en richting', () => {
  it('genereert kleur en richting als twee onafhankelijke keuzes', () => {
    const values = [0.25, 0.75, 0.75, 0.25]
    let index = 0
    const path = createPath(0, () => values[index++ % values.length])
    expect(path.blocks[0]).toEqual({ color: 'red', direction: 'right' })
    expect(path.blocks[1]).toEqual({ color: 'blue', direction: 'up' })
  })

  it('keurt alleen een gelijktijdig juiste kleur en richting goed', () => {
    const initial = createGameState(() => 0.25)
    const activeBlock = initial.path.blocks[0]
    expect(resolveAttempt(initial, activeBlock).outcome).toBe('correct')
    expect(resolveAttempt(initial, { color: 'blue', direction: activeBlock.direction }).outcome).toBe('wrong')
    expect(resolveAttempt(initial, { color: activeBlock.color, direction: 'right' }).outcome).toBe('wrong')
  })
})

describe('balkvoortgang', () => {
  it('beweegt de balk aan de actieve zijde naar binnen bij een goed blok', () => {
    const initial = createGameState(() => 0.25)
    const result = resolveAttempt(initial, initial.path.blocks[0])
    expect(result.state.edgeProgress.right).toBe(1)
    expect(result.state.edgeProgress.left).toBe(0)
  })

  it('beweegt dezelfde balk naar buiten bij een fout en bewaakt de minimumscore', () => {
    const initial = createGameState(() => 0.25)
    const result = resolveAttempt(initial, { color: null, direction: 'up' })
    expect(result.state.edgeProgress.right).toBe(-1)
    expect(result.state.score).toBe(0)
  })

  it('geeft stage win wanneer de actieve balk het midden bereikt', () => {
    const initial = createGameState(() => 0.25)
    const state = stateWith({
      edgeProgress: { left: 0, right: gameConfig.progressForStageWin - 1 },
      path: initial.path,
    })
    const result = resolveAttempt(state, state.path.blocks[0])
    expect(result.outcome).toBe('stage-win')
    expect(result.state.status).toBe('stage-win')
  })

  it('geeft game over wanneer de actieve balk de buitenrand bereikt', () => {
    const initial = createGameState(() => 0.25)
    const state = stateWith({
      edgeProgress: { left: 0, right: -(gameConfig.mistakesFromStartToGameOver - 1) },
      path: initial.path,
    })
    const result = resolveAttempt(state, { color: null, direction: 'up' })
    expect(result.outcome).toBe('game-over')
    expect(result.state.status).toBe('game-over')
  })

  it('bewaart de score maar reset de balken in een volgend level', () => {
    const won = stateWith({ score: 42, level: 2, status: 'stage-win', edgeProgress: { left: 25, right: 4 } })
    const next = startNextLevel(won, createSeededRandom(17))
    expect(next.score).toBe(42)
    expect(next.level).toBe(3)
    expect(next.status).toBe('playing')
    expect(next.edgeProgress).toEqual({ left: 0, right: 0 })
  })
})
