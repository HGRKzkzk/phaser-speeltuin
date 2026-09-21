import Phaser from 'phaser'
import { gameConfig } from '../game/config'
import {
  chooseAdventureOption,
  createGameState,
  enterAdventure,
  isAdventureDue,
  resolveAttempt,
  resolveTimePressure,
  startNextLevel,
} from '../game/rules'
import type {
  AdventureChoice,
  BlockColor,
  BlockDirection,
  GameBlock,
  GameState,
  HitQuality,
  TargetSide,
} from '../game/types'

type BlockView = {
  block: GameBlock
  view: Phaser.GameObjects.Container
}

type AdventureChoiceView = {
  container: Phaser.GameObjects.Container
  box: Phaser.GameObjects.Rectangle
  hint: Phaser.GameObjects.Arc
}

type ProgressBarView = {
  container: Phaser.GameObjects.Container
  glow: Phaser.GameObjects.Rectangle
  halo: Phaser.GameObjects.Rectangle
  core: Phaser.GameObjects.Rectangle
}

const COLOR_KEYS: Record<BlockColor, string> = { red: 'A', blue: 'D' }
const BAR_START_X: Record<TargetSide, number> = { left: 92, right: 708 }
const CENTER_X = 400
const ADVENTURE_TRACK_Y = 380
const ADVENTURE_TRACK_HALF_WIDTH = 220
const ADVENTURE_TRACK_SPEED = 260

export class GameScene extends Phaser.Scene {
  private state: GameState = createGameState()
  private blockViews: BlockView[] = []
  private inputIsLocked = false
  private activeSinceMs = 0

  private redKey!: Phaser.Input.Keyboard.Key
  private blueKey!: Phaser.Input.Keyboard.Key
  private upKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key
  private shiftKey!: Phaser.Input.Keyboard.Key

  private scoreText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text
  private sideText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private overlay?: Phaser.GameObjects.Container
  private colorWash!: Phaser.GameObjects.Rectangle
  private effectWash!: Phaser.GameObjects.Rectangle
  private progressBars!: Record<TargetSide, ProgressBarView>
  private affinityLights!: Record<TargetSide, Record<BlockColor, Phaser.GameObjects.Arc>>

  private adventureUI?: Phaser.GameObjects.Container
  private adventureSelector!: Phaser.GameObjects.Container
  private adventureChoiceViews: AdventureChoiceView[] = []
  private adventureChoiceXs: number[] = []
  private adventureSelectorX = CENTER_X
  private adventureSelectorDirection = 1

  constructor() {
    super('game')
  }

  create() {
    if (!this.input.keyboard) {
      throw new Error('Toetsenbordinvoer is niet beschikbaar.')
    }

    this.cameras.main.setBackgroundColor('#0b1020')
    this.drawArena()
    this.progressBars = {
      left: this.createProgressBar('left'),
      right: this.createProgressBar('right'),
    }
    this.affinityLights = {
      left: {
        red: this.createAffinityLight(354, 425, 'red'),
        blue: this.createAffinityLight(376, 425, 'blue'),
      },
      right: {
        red: this.createAffinityLight(424, 425, 'red'),
        blue: this.createAffinityLight(446, 425, 'blue'),
      },
    }
    this.colorWash = this.add.rectangle(400, 250, 800, 500, 0xffffff, 0).setDepth(10)
    this.effectWash = this.add.rectangle(400, 250, 800, 500, 0xffffff, 0).setDepth(11)

    this.scoreText = this.addText(24, 22, 'PUNTEN  0', 22).setOrigin(0)
    this.levelText = this.addText(776, 22, 'LEVEL  1', 22).setOrigin(1, 0)
    this.sideText = this.addText(400, 88, '', 22).setOrigin(0.5)
    this.comboText = this.addText(400, 126, '', 24, '#f8fafc').setOrigin(0.5).setDepth(12)
    this.feedbackText = this.addText(400, 400, '', 22).setOrigin(0.5)
    this.addText(400, 464, 'Houd A = ROOD of D = BLAUW vast · druk daarna de pijl', 17, '#94a3b8').setOrigin(0.5)

    this.redKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.blueKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)

    this.startGame()
  }

  update(_time: number, delta: number) {
    if (this.state.status === 'game-over') {
      if (this.overlay && Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.startGame()
      return
    }

    if (this.state.status === 'adventure') {
      this.updateAdventure(delta)
      return
    }

    if (this.state.status === 'playing' && this.updateTimePressure()) return

    const heldColor = this.getHeldColor()
    this.updateColorWash(heldColor)

    if (this.inputIsLocked || this.state.status !== 'playing') return

    this.updateActiveOutline(heldColor)

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.tryBlock('up', heldColor)
    } else if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
      this.tryBlock('left', heldColor)
    } else if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
      this.tryBlock('right', heldColor)
    }
  }

  private startGame() {
    this.overlay?.destroy(true)
    this.destroyAdventureUI()
    this.state = createGameState(Math.random, this.time.now)
    this.inputIsLocked = false
    this.scoreText.setText('PUNTEN  0')
    this.levelText.setText('LEVEL  1')
    this.feedbackText.setText('')
    this.comboText.setText('')
    this.colorWash.setAlpha(0)
    this.effectWash.setAlpha(0)
    this.syncProgressBars()
    this.styleProgressBars()
    this.updateAffinityLights()
    this.renderPath()
  }

  private renderPath() {
    this.clearBlockViews()

    const { targetSide, blocks } = this.state.path
    const horizontalArrow = targetSide === 'left' ? '←' : '→'
    this.sideText.setText(`${horizontalArrow} + ↑  ·  PAD ${this.state.completedPaths + 1}`)

    blocks.forEach((block, index) => {
      const step = index * 50
      const x = targetSide === 'left' ? 350 - step : 450 + step
      this.blockViews.push({ block, view: this.createBlockView(x, 250, block) })
    })

    this.markActiveBlock()
    this.activeSinceMs = this.time.now
  }

  private createBlockView(x: number, y: number, block: GameBlock) {
    const fill = block.color === 'red' ? 0xff2d55 : 0x1687ff
    const rectangle = this.add.rectangle(0, 0, 42, 64, fill).setStrokeStyle(3, 0xffffff, 0.22)
    const arrowSymbol = block.direction === 'up' ? '↑' : block.direction === 'left' ? '←' : '→'
    const arrow = this.addText(0, 0, arrowSymbol, 31).setOrigin(0.5)
    const key = this.addText(0, 23, COLOR_KEYS[block.color], 11, '#ffffff').setOrigin(0.5).setAlpha(0.8)
    return this.add.container(x, y, [rectangle, arrow, key])
  }

  private createProgressBar(side: TargetSide) {
    const glow = this.add.rectangle(0, 0, 24, 198, 0xe2e8f0, 0.12)
    const halo = this.add.rectangle(0, 0, 14, 194, 0xf8fafc, 0.28)
    const core = this.add.rectangle(0, 0, 7, 190, 0xffffff, 0.96)
    const container = this.add.container(BAR_START_X[side], 250, [glow, halo, core]).setDepth(5)

    this.tweens.add({
      targets: [glow, halo],
      alpha: { from: 0.12, to: 0.36 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    })

    return { container, glow, halo, core }
  }

  private createAffinityLight(x: number, y: number, color: BlockColor) {
    const fill = color === 'red' ? 0xff2d55 : 0x1687ff
    return this.add.circle(x, y, 5, fill, 0.18).setStrokeStyle(1, 0xffffff, 0.12)
  }

  private tryBlock(direction: BlockDirection, color: BlockColor | null) {
    const activeSide = this.state.path.targetSide
    const activeView = this.blockViews[this.state.path.activeIndex]
    if (!activeView) return

    const nowMs = this.time.now
    const previousMultiplier = this.state.combo.multiplier
    const resolution = resolveAttempt(this.state, {
      color,
      direction,
      atMs: nowMs,
      responseMs: nowMs - this.activeSinceMs,
    })
    this.state = resolution.state
    this.scoreText.setText(`PUNTEN  ${this.state.score}`)
    this.moveProgressBar(activeSide)

    if (resolution.outcome === 'wrong' || resolution.outcome === 'game-over') {
      this.comboText.setText(previousMultiplier > 1 ? 'COMBO KWIJT' : '')
      this.showFeedback(color ? 'MIS  −1' : 'HOUD EERST EEN KLEUR VAST', '#fda4af')
      this.cameras.main.shake(55, 0.004)

      if (resolution.outcome === 'game-over') {
        this.inputIsLocked = true
        this.time.delayedCall(220, () => this.showGameOver('BUITENRAND BEREIKT'))
      }
      return
    }

    this.updateAffinityLights()
    this.pulseAffinity(activeSide, activeView.block.color)
    this.showTimeRelief()
    this.updateComboDisplay()
    this.playHitEffect(activeView.view, activeView.block.color, resolution.quality!, resolution.scoreDelta)
    this.activeSinceMs = nowMs

    this.tweens.add({
      targets: activeView.view,
      alpha: 0,
      scale: 1.35,
      duration: 90,
      onComplete: () => activeView.view.setVisible(false),
    })

    if (resolution.outcome === 'stage-win') {
      this.inputIsLocked = true
      this.showFeedback(`MIDDEN BEREIKT  +${resolution.scoreDelta}`, '#fde68a')
      this.time.delayedCall(260, () => this.showStageWin(resolution.timeBonus))
    } else if (resolution.outcome === 'path-complete') {
      this.inputIsLocked = true
      this.showFeedback(`PAD KLAAR  +${resolution.scoreDelta}`, '#fde68a')
      this.time.delayedCall(160, () => {
        if (this.state.status === 'playing') {
          this.renderPath()
          this.inputIsLocked = false
        }
      })
    } else {
      this.showHitFeedback(resolution.quality!, resolution.scoreDelta)
      this.markActiveBlock()
    }
  }

  private showStageWin(timeBonus: number) {
    const adventureDue = isAdventureDue(this.state)
    const shade = this.add.rectangle(400, 250, 800, 500, 0x070b14, 0.88)
    const title = this.addText(400, 185, `LEVEL ${this.state.level} KLAAR`, 40, '#fde68a').setOrigin(0.5)
    const score = this.addText(400, 255, `${this.state.score} punten`, 28, '#f8fafc').setOrigin(0.5)
    const bonus = this.addText(400, 305, `Tijdbonus  +${timeBonus}`, 18, '#67e8f9').setOrigin(0.5)
    const nextLabel = adventureDue ? 'EEN TEKSTAVONTUUR WACHT' : 'VOLGENDE LEVEL'
    const next = this.addText(400, 350, nextLabel, 18, '#86efac').setOrigin(0.5)
    this.overlay = this.add.container(0, 0, [shade, title, score, bonus, next]).setDepth(30)

    this.time.delayedCall(950, () => {
      this.overlay?.destroy(true)
      this.overlay = undefined
      if (adventureDue) {
        this.state = enterAdventure(this.state)
        this.showAdventure()
        return
      }

      this.advanceToNextLevel()
    })
  }

  private advanceToNextLevel() {
    this.state = startNextLevel(this.state, Math.random, this.time.now)
    this.presentLevel()
  }

  private presentLevel() {
    this.scoreText.setText(`PUNTEN  ${this.state.score}`)
    this.levelText.setText(`LEVEL  ${this.state.level}`)
    this.styleProgressBars()
    this.syncProgressBars(260)
    this.updateAffinityLights()
    this.comboText.setText('')
    this.renderPath()
    this.time.delayedCall(280, () => {
      this.inputIsLocked = false
    })
  }

  private showAdventure() {
    const adventure = this.state.adventure
    if (!adventure) return

    const fragment = adventure.story.fragments[adventure.fragmentId]
    const shade = this.add.rectangle(400, 250, 800, 500, 0x070b14, 0.92)
    const storyText = this.addText(400, 150, fragment.text, 18, '#e2e8f0')
      .setOrigin(0.5)
      .setWordWrapWidth(620, true)
      .setAlign('center')

    const spacing = 220
    const startX = CENTER_X - ((fragment.choices.length - 1) * spacing) / 2
    this.adventureChoiceXs = fragment.choices.map((_, index) => startX + index * spacing)
    this.adventureChoiceViews = fragment.choices.map((choice, index) =>
      this.createAdventureChoiceView(this.adventureChoiceXs[index], choice),
    )

    this.adventureSelectorX = CENTER_X
    this.adventureSelectorDirection = 1
    this.adventureSelector = this.createAdventureSelector()

    const hint = this.addText(400, 448, 'Houd SHIFT vast om te bewegen · SPATIE kiest', 15, '#94a3b8').setOrigin(0.5)

    this.adventureUI = this.add
      .container(0, 0, [
        shade,
        storyText,
        ...this.adventureChoiceViews.map((view) => view.container),
        this.adventureSelector,
        hint,
      ])
      .setDepth(30)

    this.highlightAdventureChoice(this.getPointedAdventureChoiceIndex())
  }

  private createAdventureChoiceView(x: number, choice: AdventureChoice): AdventureChoiceView {
    const box = this.add.rectangle(0, 0, 190, 110, 0x111a2e, 0.82).setStrokeStyle(1, 0x334155)
    const label = this.addText(0, -32, choice.label, 16, '#f8fafc').setOrigin(0.5).setAlign('center')
    const description = this.addText(0, 2, choice.description, 13, '#94a3b8')
      .setOrigin(0.5)
      .setAlign('center')
      .setWordWrapWidth(160, true)
    const hint = this.add.circle(0, 42, 3, 0xf8fafc, 0)
    const container = this.add.container(x, 265, [box, label, description, hint])
    return { container, box, hint }
  }

  private createAdventureSelector() {
    const glow = this.add.rectangle(0, 0, 14, 74, 0xe2e8f0, 0.14)
    const halo = this.add.rectangle(0, 0, 9, 70, 0xf8fafc, 0.3)
    const core = this.add.rectangle(0, 0, 4, 66, 0xffffff, 0.96)
    return this.add.container(CENTER_X, ADVENTURE_TRACK_Y, [glow, halo, core]).setDepth(31)
  }

  private updateAdventure(delta: number) {
    if (!this.state.adventure) return

    if (this.shiftKey.isDown) {
      const distance = (ADVENTURE_TRACK_SPEED * delta) / 1000
      const min = CENTER_X - ADVENTURE_TRACK_HALF_WIDTH
      const max = CENTER_X + ADVENTURE_TRACK_HALF_WIDTH
      this.adventureSelectorX += this.adventureSelectorDirection * distance

      if (this.adventureSelectorX >= max) {
        this.adventureSelectorX = max
        this.adventureSelectorDirection = -1
      } else if (this.adventureSelectorX <= min) {
        this.adventureSelectorX = min
        this.adventureSelectorDirection = 1
      }

      this.adventureSelector.setX(this.adventureSelectorX)
    }

    const pointedIndex = this.getPointedAdventureChoiceIndex()
    this.highlightAdventureChoice(pointedIndex)

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.commitAdventureChoice(pointedIndex)
    }
  }

  private getPointedAdventureChoiceIndex(): number {
    let closest = 0
    let closestDistance = Infinity
    this.adventureChoiceXs.forEach((x, index) => {
      const distance = Math.abs(x - this.adventureSelectorX)
      if (distance < closestDistance) {
        closestDistance = distance
        closest = index
      }
    })
    return closest
  }

  private highlightAdventureChoice(pointedIndex: number) {
    this.adventureChoiceViews.forEach((view, index) => {
      const isPointed = index === pointedIndex
      view.box.setStrokeStyle(1, isPointed ? 0x64748b : 0x334155)
      view.box.setFillStyle(0x111a2e, isPointed ? 0.92 : 0.82)
      view.hint.setAlpha(isPointed ? 0.45 : 0)
    })
  }

  private commitAdventureChoice(choiceIndex: number) {
    const scoreBefore = this.state.score
    this.state = chooseAdventureOption(this.state, choiceIndex, Math.random, this.time.now)
    this.destroyAdventureUI()

    if (this.state.status === 'adventure') {
      this.showAdventure()
      return
    }

    const bonus = this.state.score - scoreBefore
    if (bonus > 0) {
      this.showFeedback(`ONVERWACHT  +${bonus}`, '#fde68a')
    }

    this.presentLevel()
  }

  private destroyAdventureUI() {
    this.adventureUI?.destroy(true)
    this.adventureUI = undefined
    this.adventureChoiceViews = []
    this.adventureChoiceXs = []
  }

  private showGameOver(reason: string) {
    const storedBest = Number(localStorage.getItem('phaser-speeltuin-best') ?? 0)
    const best = Math.max(storedBest, this.state.score)
    localStorage.setItem('phaser-speeltuin-best', String(best))
    this.colorWash.setAlpha(0)

    const shade = this.add.rectangle(400, 250, 800, 500, 0x070b14, 0.94)
    const title = this.addText(400, 125, 'GAME OVER', 48, '#fb7185').setOrigin(0.5)
    const cause = this.addText(400, 180, reason, 16, '#fda4af').setOrigin(0.5)
    const level = this.addText(400, 225, `Level ${this.state.level}`, 22, '#cbd5e1').setOrigin(0.5)
    const finalScore = this.addText(400, 270, `${this.state.score} punten`, 32, '#fde68a').setOrigin(0.5)
    const bestScore = this.addText(400, 315, `Beste: ${best}`, 18, '#94a3b8').setOrigin(0.5)
    const restart = this.addText(400, 375, 'Druk op SPATIE om opnieuw te beginnen', 19, '#86efac').setOrigin(0.5)
    this.overlay = this.add.container(0, 0, [shade, title, cause, level, finalScore, bestScore, restart]).setDepth(30)
  }

  private moveProgressBar(side: TargetSide) {
    const x = this.getBarX(side)
    this.tweens.killTweensOf(this.progressBars[side].container)
    this.tweens.add({ targets: this.progressBars[side].container, x, duration: 150, ease: 'Back.Out' })
  }

  private syncProgressBars(duration = 0) {
    ;(['left', 'right'] as TargetSide[]).forEach((side) => {
      const container = this.progressBars[side].container
      this.tweens.killTweensOf(container)
      if (duration === 0) {
        container.setX(this.getBarX(side))
      } else {
        this.tweens.add({ targets: container, x: this.getBarX(side), duration, ease: 'Sine.Out' })
      }
    })
  }

  private styleProgressBars() {
    const activeSide = this.state.path.targetSide
    ;(['left', 'right'] as TargetSide[]).forEach((side) => {
      const bar = this.progressBars[side]
      const isDanger = side !== activeSide
      bar.glow.setFillStyle(isDanger ? 0xff1744 : 0xe2e8f0)
      bar.halo.setFillStyle(isDanger ? 0xff2d55 : 0xf8fafc)
      bar.core.setFillStyle(isDanger ? 0xff5c76 : 0xffffff)
    })
  }

  private updateTimePressure() {
    const resolution = resolveTimePressure(this.state, this.time.now)
    const dangerSide: TargetSide = this.state.path.targetSide === 'left' ? 'right' : 'left'
    const centerX = dangerSide === 'left' ? 392 : 408
    this.progressBars[dangerSide].container.setX(
      Phaser.Math.Linear(BAR_START_X[dangerSide], centerX, resolution.progress),
    )

    if (resolution.outcome === 'game-over') {
      this.state = resolution.state
      this.inputIsLocked = true
      this.colorWash.setAlpha(0)
      this.comboText.setText('DE TIJD HAALT JE IN')
      this.cameras.main.shake(180, 0.008)
      this.effectWash.setFillStyle(0xff1744).setAlpha(0.18)
      this.tweens.add({ targets: this.effectWash, alpha: 0, duration: 260 })
      this.time.delayedCall(260, () => this.showGameOver('RODE LIJN BEREIKTE HET MIDDEN'))
      return true
    }

    return false
  }

  private showTimeRelief() {
    const dangerSide: TargetSide = this.state.path.targetSide === 'left' ? 'right' : 'left'
    const dangerBar = this.progressBars[dangerSide]
    const x = dangerBar.container.x + (dangerSide === 'left' ? 22 : -22)
    const reliefSeconds = (gameConfig.timeReliefPerCorrectMs / 1000).toLocaleString('nl-NL')
    const label = this.addText(x, 145, `+${reliefSeconds}s`, 13, '#67e8f9')
      .setOrigin(0.5)
      .setDepth(12)

    this.tweens.add({
      targets: label,
      y: 125,
      alpha: 0,
      duration: 420,
      ease: 'Sine.Out',
      onComplete: () => label.destroy(),
    })
  }

  private getBarX(side: TargetSide) {
    const distance = this.state.edgeProgress[side] * gameConfig.barMovementPixels
    return side === 'left' ? BAR_START_X.left + distance : BAR_START_X.right - distance
  }

  private updateAffinityLights() {
    ;(['left', 'right'] as TargetSide[]).forEach((side) => {
      ;(['red', 'blue'] as BlockColor[]).forEach((color) => {
        const correct = this.state.affinity[side][color].correct
        this.affinityLights[side][color].setAlpha(0.18 + Math.min(0.62, correct * 0.025))
      })
    })
  }

  private pulseAffinity(side: TargetSide, color: BlockColor) {
    const light = this.affinityLights[side][color]
    this.tweens.killTweensOf(light)
    light.setScale(1)
    this.tweens.add({
      targets: light,
      scale: 1.8,
      alpha: 1,
      duration: 90,
      yoyo: true,
      onComplete: () => this.updateAffinityLights(),
    })
  }

  private updateComboDisplay() {
    const { streak, multiplier } = this.state.combo
    const label = multiplier > 1 ? `×${multiplier}  ·  ${streak} HITS` : streak > 1 ? `${streak} HITS` : ''
    const colors = ['#f8fafc', '#86efac', '#67e8f9', '#c4b5fd', '#fde68a']
    this.comboText.setText(label).setColor(colors[multiplier - 1] ?? '#fde68a')
    this.comboText.setScale(1.35)
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 120, ease: 'Back.Out' })
  }

  private showHitFeedback(quality: HitQuality, scoreDelta: number) {
    const labels: Record<HitQuality, string> = {
      steady: 'STEADY',
      good: 'GOOD',
      great: 'GREAT',
      perfect: 'PERFECT',
    }
    const colors: Record<HitQuality, string> = {
      steady: '#cbd5e1',
      good: '#86efac',
      great: '#67e8f9',
      perfect: '#fde68a',
    }
    this.showFeedback(`${labels[quality]}  ×${this.state.combo.multiplier}  +${scoreDelta}`, colors[quality])
  }

  private playHitEffect(
    view: Phaser.GameObjects.Container,
    color: BlockColor,
    quality: HitQuality,
    scoreDelta: number,
  ) {
    const multiplier = this.state.combo.multiplier
    const fill = color === 'red' ? 0xff2d55 : 0x1687ff
    const burstCount = Math.min(16, 3 + multiplier * 2 + (quality === 'perfect' ? 3 : 0))

    for (let index = 0; index < burstCount; index += 1) {
      const angle = (Math.PI * 2 * index) / burstCount + Math.random() * 0.35
      const distance = 22 + Math.random() * (18 + multiplier * 5)
      const spark = this.add.circle(view.x, view.y, 1.5 + Math.random() * 2, fill, 0.9).setDepth(13)
      this.tweens.add({
        targets: spark,
        x: view.x + Math.cos(angle) * distance,
        y: view.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.25,
        duration: 180 + multiplier * 35,
        onComplete: () => spark.destroy(),
      })
    }

    if (multiplier >= 2 || quality === 'perfect') {
      this.effectWash.setFillStyle(fill).setAlpha(0.025 + multiplier * 0.012)
      this.tweens.killTweensOf(this.effectWash)
      this.tweens.add({ targets: this.effectWash, alpha: 0, duration: 150 + multiplier * 25 })
    }

    if (multiplier >= 3) {
      const activeBar = this.progressBars[this.state.path.targetSide].container
      activeBar.setScale(1.08, 1.03)
      this.tweens.add({ targets: activeBar, scaleX: 1, scaleY: 1, duration: 130, ease: 'Back.Out' })
    }

    if (multiplier >= 4) {
      this.cameras.main.zoomTo(1.012 + multiplier * 0.002, 60, 'Sine.Out', false, (_camera, progress) => {
        if (progress === 1) this.cameras.main.zoomTo(1, 110, 'Sine.In')
      })
    }

    if (multiplier === 5 && scoreDelta > 0) {
      this.comboText.setText(`OVERDRIVE ×5  ·  ${this.state.combo.streak} HITS`)
    }
  }

  private markActiveBlock() {
    this.blockViews.forEach(({ view }, index) => {
      const isActive = index === this.state.path.activeIndex
      view.setAlpha(index < this.state.path.activeIndex ? 0 : isActive ? 1 : 0.48)
      view.setScale(isActive ? 1.14 : 1)
    })
  }

  private getHeldColor(): BlockColor | null {
    if (this.redKey.isDown && !this.blueKey.isDown) return 'red'
    if (this.blueKey.isDown && !this.redKey.isDown) return 'blue'
    return null
  }

  private updateActiveOutline(heldColor: BlockColor | null) {
    const activeView = this.blockViews[this.state.path.activeIndex]
    if (!activeView) return
    const outline = activeView.view.first as Phaser.GameObjects.Rectangle
    const outlineColor = heldColor === 'red' ? 0xff2d55 : heldColor === 'blue' ? 0x1687ff : 0xffffff
    outline.setStrokeStyle(heldColor === activeView.block.color ? 6 : 3, outlineColor, heldColor ? 1 : 0.22)
  }

  private updateColorWash(heldColor: BlockColor | null) {
    if (heldColor === 'red') {
      this.colorWash.setFillStyle(0xff2d55).setAlpha(0.1)
    } else if (heldColor === 'blue') {
      this.colorWash.setFillStyle(0x1687ff).setAlpha(0.1)
    } else {
      this.colorWash.setAlpha(0)
    }
  }

  private showFeedback(message: string, color: string) {
    this.feedbackText.setText(message).setColor(color).setAlpha(1)
    this.tweens.killTweensOf(this.feedbackText)
    this.tweens.add({ targets: this.feedbackText, alpha: 0, duration: 420, delay: 120 })
  }

  private clearBlockViews() {
    this.blockViews.forEach(({ view }) => view.destroy(true))
    this.blockViews = []
  }

  private drawArena() {
    this.add.rectangle(400, 250, 760, 150, 0x111a2e).setStrokeStyle(2, 0x334155)
    this.add.rectangle(CENTER_X, 250, 8, 190, 0xf8fafc, 0.85)
    this.addText(CENTER_X, 362, 'STAGE WIN', 13, '#64748b').setOrigin(0.5)
    this.add.rectangle(20, 250, 2, 190, 0xfb7185, 0.45)
    this.add.rectangle(780, 250, 2, 190, 0xfb7185, 0.45)
  }

  private addText(x: number, y: number, text: string, size: number, color = '#f8fafc') {
    return this.add.text(x, y, text, {
      color,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: `${size}px`,
      fontStyle: 'bold',
    })
  }
}
