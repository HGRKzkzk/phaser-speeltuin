import { describe, expect, it, vi } from 'vitest'
import { gameConfig } from '../game/config'
import { createShelterStory } from '../game/shelter'
import { createGameState } from '../game/rules'

type Key = { isDown: boolean; pressed: boolean }
type Pointer = { isDown: boolean; wasTouch: boolean; button: number; x: number; y: number }
vi.mock('phaser', () => ({
  default: {
    Scene: class {},
    Input: {
      Keyboard: {
        JustDown: (key: Key) => {
          const pressed = key.pressed
          key.pressed = false
          return pressed
        },
      },
    },
  },
}))
import { GameScene } from './GameScene'

// Exercise the scene's real input handlers without needing a WebGL canvas.
class View {
  handlers: Record<string, (pointer: Pointer) => void> = {}
  text = ''
  scaleX = 0
  inside = true
  destroy() {}
  setStrokeStyle() {
    return this
  }
  setInteractive() {
    return this
  }
  setOrigin() {
    return this
  }
  setAlign() {
    return this
  }
  setWordWrapWidth() {
    return this
  }
  setVisible() {
    return this
  }
  setDepth() {
    return this
  }
  setAlpha() {
    return this
  }
  setFillStyle() {
    return this
  }
  setScale(x: number) {
    this.scaleX = x
    return this
  }
  setText(text: string) {
    this.text = text
    return this
  }
  getBounds() {
    return { contains: () => this.inside }
  }
  on(name: string, handler: (pointer: Pointer) => void) {
    this.handlers[name] = handler
    return this
  }
}

function fixture(fragmentId = 'approach') {
  const scene = new GameScene()
  const keys = {
    leftKey: { isDown: false, pressed: false },
    rightKey: { isDown: false, pressed: false },
    enterKey: { isDown: false, pressed: false },
    spaceKey: { isDown: false, pressed: false },
  }
  const pointer: Pointer = { isDown: false, wasTouch: false, button: 0, x: 0, y: 0 }
  const pointers = [pointer]
  const commit = vi.fn()
  const story = createShelterStory({
    route: 'open',
    remainingMs: 0,
    tone: 'late',
    mistakes: 0,
    highestCombo: 0,
    elapsedMs: 16_000,
  })
  Object.assign(scene, keys, {
    state: {
      ...createGameState(),
      level: 2,
      status: 'adventure',
      adventure: { levelsUntilAdventure: 2, log: [], active: { story, fragmentId } },
    },
    time: { now: 100_000 },
    input: { manager: { pointers } },
    add: { rectangle: () => new View(), circle: () => new View(), text: () => new View(), container: () => new View() },
    commitAdventureChoice: commit,
  })
  scene['showAdventure']()
  const tick = (ms = 50) => scene['updateAdventure'](ms)
  tick() // Clear the release barrier on entry.
  const box = (index: number) => scene['adventureChoiceViews'][index].box as unknown as View
  const down = (index: number) => {
    pointer.isDown = true
    box(index).handlers.pointerdown(pointer)
  }
  const up = (index: number) => {
    pointer.isDown = false
    box(index).handlers.pointerup(pointer)
  }
  const finishHold = () => {
    for (let i = 0; i <= gameConfig.adventure.choiceHoldMs / 50; i++) tick()
  }
  return { scene, keys, pointer, pointers, commit, tick, box, down, up, finishHold }
}

describe('invoer van het tekstavontuur', () => {
  it('laat de bevestigende pijl niet doorlekken naar het eerste blok van het volgende level', () => {
    const f = fixture()
    const attempt = vi.fn()
    Object.assign(f.scene, {
      commitAdventureChoice: GameScene.prototype['commitAdventureChoice'].bind(f.scene),
      presentLevel: vi.fn(),
      updateTimePressure: () => false,
      getHeldColor: () => null,
      updateColorWash: vi.fn(),
      updateActiveOutline: vi.fn(),
      tryBlock: attempt,
      upKey: { isDown: false, pressed: false },
    })
    Object.assign(f.keys.rightKey, { isDown: true, pressed: true })
    f.finishHold()
    expect(f.scene['state'].status).toBe('playing')
    expect(f.scene['state'].level).toBe(3)
    f.keys.rightKey.pressed = true // A repeat arriving while the key is still held.
    f.scene.update(0, 16)
    expect(attempt).not.toHaveBeenCalled()
    f.keys.rightKey.isDown = false
    f.scene.update(16, 16)
    Object.assign(f.keys.rightKey, { isDown: true, pressed: true })
    f.scene.update(32, 16)
    expect(attempt).toHaveBeenCalledExactlyOnceWith('right', null)
  })

  it('vraagt na een gewone bevestiging nieuwe invoer in het volgende fragment', () => {
    const f = fixture('both')
    Object.assign(f.scene, { commitAdventureChoice: GameScene.prototype['commitAdventureChoice'].bind(f.scene) })
    Object.assign(f.keys.enterKey, { isDown: true, pressed: true })
    f.tick()
    expect(f.scene['state'].adventure.active?.fragmentId).toBe('approach')
    f.keys.rightKey.isDown = true
    f.finishHold()
    expect(f.scene['state'].status).toBe('adventure')
    expect(f.scene['adventureHold'].requiresRelease).toBe(true)
  })

  it('laat de deur reageren tijdens vasthouden en bevestigt pas na opbouw', () => {
    const f = fixture()
    Object.assign(f.keys.leftKey, { isDown: true, pressed: true })
    f.tick()
    expect(f.commit).not.toHaveBeenCalled()
    expect((f.scene['adventurePreview'] as unknown as View).text).toContain('Noor')
    f.finishHold()
    expect(f.commit).toHaveBeenCalledExactlyOnceWith(0)
    f.finishHold()
    expect(f.commit).toHaveBeenCalledTimes(1)
  })

  it('begint opnieuw bij snel loslaten en opnieuw indrukken tussen twee frames', () => {
    const f = fixture()
    Object.assign(f.keys.leftKey, { isDown: true, pressed: true })
    f.tick()
    f.tick()
    f.tick()
    expect(f.scene['adventureHold'].elapsedMs).toBeGreaterThan(0)
    f.keys.leftKey.pressed = true
    f.tick()
    expect(f.scene['adventureHold'].elapsedMs).toBe(0)
    expect(f.commit).not.toHaveBeenCalled()
  })

  it('annuleert vroeg loslaten zonder een keuze te maken', () => {
    const f = fixture()
    Object.assign(f.keys.rightKey, { isDown: true, pressed: true })
    f.tick()
    f.tick()
    f.keys.rightKey.isDown = false
    f.tick()
    expect(f.commit).not.toHaveBeenCalled()
    expect((f.scene['adventurePreview'] as unknown as View).text).toBe('')
    expect(f.scene['adventureHold'].elapsedMs).toBe(0)
  })

  it.each([false, true])('ondersteunt vasthouden met muis of aanraking (touch: %s)', (touch) => {
    const f = fixture()
    f.pointer.wasTouch = touch
    f.down(1)
    f.finishHold()
    expect(f.commit).toHaveBeenCalledExactlyOnceWith(1)
    f.up(1)
    expect(f.commit).toHaveBeenCalledTimes(1)
  })

  it.each(['release', 'outside', 'cancel'] as const)('breekt een pointerpoging af bij %s', (reason) => {
    const f = fixture()
    f.down(0)
    f.tick()
    f.tick()
    if (reason === 'release') f.up(0)
    if (reason === 'outside') f.box(0).handlers.pointerout(f.pointer)
    if (reason === 'cancel') f.scene['cancelAdventureGesture']()
    f.finishHold()
    expect(f.commit).not.toHaveBeenCalled()
    expect(f.scene['adventureHold'].elapsedMs).toBe(0)
  })

  it('negeert dubbel aanraken en twee tegengestelde pijlen tot alles is losgelaten', () => {
    const f = fixture()
    f.down(0)
    f.pointers.push({ ...f.pointer })
    f.finishHold()
    expect(f.commit).not.toHaveBeenCalled()
    f.pointers[1].isDown = false
    f.pointer.isDown = false
    f.tick()
    f.keys.leftKey.isDown = true
    f.keys.rightKey.isDown = true
    f.finishHold()
    f.keys.leftKey.isDown = false
    f.finishHold()
    expect(f.commit).not.toHaveBeenCalled()
  })

  it('laat direct selecteren en Enter beschikbaar zonder een hold te eisen', () => {
    const f = fixture()
    Object.assign(f.keys.rightKey, { isDown: true, pressed: true })
    f.tick()
    f.keys.rightKey.isDown = false
    f.tick()
    Object.assign(f.keys.enterKey, { isDown: true, pressed: true })
    f.tick()
    expect(f.commit).toHaveBeenCalledExactlyOnceWith(1)
  })

  it('houdt gewone keuzes direct klikbaar en vervolgen met één Enter bedienbaar', () => {
    const choice = fixture('arrival')
    choice.down(1)
    choice.up(1)
    expect(choice.commit).toHaveBeenCalledExactlyOnceWith(1)
    const continuation = fixture('both')
    Object.assign(continuation.keys.enterKey, { isDown: true, pressed: true })
    continuation.tick()
    expect(continuation.commit).toHaveBeenCalledExactlyOnceWith(0)
  })

  it('laat alleen Enter zonder selectie geen vertakking kiezen', () => {
    const f = fixture('arrival')
    Object.assign(f.keys.enterKey, { isDown: true, pressed: true })
    f.tick()
    expect(f.commit).not.toHaveBeenCalled()
  })
})
