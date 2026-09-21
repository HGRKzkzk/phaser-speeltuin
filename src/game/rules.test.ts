import { describe, expect, it } from 'vitest'
import { gameConfig } from './config'
import { createPath, createRoundState, getTargetSide, resolveAttempt } from './rules'
import { createSeededRandom } from './random'
import type { GameState } from './types'

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
    const initial = createRoundState(() => 0.25)
    const activeBlock = initial.path.blocks[0]

    expect(resolveAttempt(initial, activeBlock).outcome).toBe('correct')
    expect(resolveAttempt(initial, { color: 'blue', direction: activeBlock.direction }).outcome).toBe('wrong')
    expect(resolveAttempt(initial, { color: activeBlock.color, direction: 'right' }).outcome).toBe('wrong')
  })
})

describe('score en voortgang', () => {
  it('laat de score nooit onder nul zakken', () => {
    const initial = createRoundState(() => 0.25)
    const result = resolveAttempt(initial, { color: null, direction: 'up' })

    expect(result.state.score).toBe(0)
  })

  it('geeft blokpunten en daarna de padbonus', () => {
    const state: GameState = {
      score: 0,
      completedPaths: gameConfig.pathsPerDirectionPhase - 1,
      path: {
        targetSide: 'right',
        activeIndex: 0,
        blocks: [{ color: 'red', direction: 'right' }],
      },
    }

    const result = resolveAttempt(state, { color: 'red', direction: 'right' }, createSeededRandom(17))

    expect(result.outcome).toBe('path-complete')
    expect(result.state.score).toBe(gameConfig.pointsPerBlock + gameConfig.pointsPerCompletedPath)
    expect(result.state.completedPaths).toBe(gameConfig.pathsPerDirectionPhase)
    expect(result.state.path.targetSide).toBe('left')
  })
})
