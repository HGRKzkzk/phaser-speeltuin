import Phaser from 'phaser'
import { gameConfig } from '../game/config'
import { getJourneyCaption } from '../game/journey'
import { initialAdventureSelection, stepAdventureSelection } from '../game/adventureSelection'
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
  AttemptResolution,
  BlockColor,
  BlockDirection,
  GameBlock,
  GameState,
  HitQuality,
  TargetSide,
} from '../game/types'
import {
  BAR_COLOR,
  BLOCK_COLOR_HEX,
  COMBO_MULTIPLIER_COLOR,
  DEPTH,
  PANEL_COLOR,
  QUALITY_COLOR,
  QUALITY_LABEL,
  TEXT_COLOR,
} from './theme'

type BlockView = {
  block: GameBlock
  view: Phaser.GameObjects.Container
}

// Payloads voor de 'block-missed'/'block-hit'-events: tryBlock() bepaalt wat
// er is gebeurd, de geregistreerde handlers bepalen hoe daarop te reageren.
type BlockMissedContext = {
  color: BlockColor | null
  previousMultiplier: number
}

type BlockHitContext = {
  activeView: BlockView
  activeSide: TargetSide
  nowMs: number
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
  private pendingTimers: Phaser.Time.TimerEvent[] = []

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
  private journeyText!: Phaser.GameObjects.Text
  private goalText!: Phaser.GameObjects.Text
  private overlay?: Phaser.GameObjects.Container
  private colorWash!: Phaser.GameObjects.Rectangle
  private effectWash!: Phaser.GameObjects.Rectangle
  private hitEmitter!: Phaser.GameObjects.Particles.ParticleEmitter
  private progressBars!: Record<TargetSide, ProgressBarView>
  private affinityLights!: Record<TargetSide, Record<BlockColor, Phaser.GameObjects.Arc>>

  private adventureSelection: number | null = null
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
    this.colorWash = this.add.rectangle(400, 250, 800, 500, 0xffffff, 0).setDepth(DEPTH.colorWash)
    this.effectWash = this.add.rectangle(400, 250, 800, 500, 0xffffff, 0).setDepth(DEPTH.effectWash)
    this.hitEmitter = this.createHitEmitter()

    this.scoreText = this.addText(24, 22, 'PUNTEN  0', 22).setOrigin(0)
    this.levelText = this.addText(776, 22, 'LEVEL  1', 22).setOrigin(1, 0)
    this.journeyText = this.addText(400, 60, '', 13, TEXT_COLOR.soft).setOrigin(0.5)
    this.sideText = this.addText(400, 88, '', 22).setOrigin(0.5)
    this.comboText = this.addText(400, 126, '', 24, TEXT_COLOR.default).setOrigin(0.5).setDepth(DEPTH.hud)
    this.feedbackText = this.addText(400, 400, '', 22).setOrigin(0.5)
    this.addText(400, 464, 'Houd A = ROOD of D = BLAUW vast · druk daarna de pijl', 17, TEXT_COLOR.muted).setOrigin(0.5)

    this.redKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.blueKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)

    this.events.on('block-missed', this.onBlockMissed, this)
    this.events.on('block-hit', this.onBlockHit, this)

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

  private scheduleOnce(delay: number, callback: () => void): void {
    const timer = this.time.delayedCall(delay, () => {
      this.pendingTimers = this.pendingTimers.filter((pending) => pending !== timer)
      callback()
    })
    this.pendingTimers.push(timer)
  }

  private cancelPendingTimers() {
    this.pendingTimers.forEach((timer) => timer.remove())
    this.pendingTimers = []
  }

  private startGame() {
    this.cancelPendingTimers()
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
    this.updateJourneyDisplay()

    blocks.forEach((block, index) => {
      const step = index * 50
      const x = targetSide === 'left' ? 350 - step : 450 + step
      this.blockViews.push({ block, view: this.createBlockView(x, 250, block) })
    })

    this.markActiveBlock()
    this.activeSinceMs = this.time.now
  }

  private createBlockView(x: number, y: number, block: GameBlock) {
    const fill = BLOCK_COLOR_HEX[block.color]
    const rectangle = this.add.rectangle(0, 0, 42, 64, fill).setStrokeStyle(3, 0xffffff, 0.22)
    const arrowSymbol = block.direction === 'up' ? '↑' : block.direction === 'left' ? '←' : '→'
    const arrow = this.addText(0, 0, arrowSymbol, 31).setOrigin(0.5)
    const key = this.addText(0, 23, COLOR_KEYS[block.color], 11, '#ffffff').setOrigin(0.5).setAlpha(0.8)
    return this.add.container(x, y, [rectangle, arrow, key])
  }

  private createProgressBar(side: TargetSide) {
    const glow = this.add.rectangle(0, 0, 24, 198, BAR_COLOR.neutralGlow, 0.12)
    const halo = this.add.rectangle(0, 0, 14, 194, BAR_COLOR.neutralHalo, 0.28)
    const core = this.add.rectangle(0, 0, 7, 190, BAR_COLOR.neutralCore, 0.96)
    const container = this.add.container(BAR_START_X[side], 250, [glow, halo, core]).setDepth(DEPTH.progressBar)

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

  private createHitEmitter() {
    if (!this.textures.exists('spark')) {
      const graphics = this.add.graphics()
      graphics.fillStyle(0xffffff, 1)
      graphics.fillCircle(4, 4, 4)
      graphics.generateTexture('spark', 8, 8)
      graphics.destroy()
    }

    return this.add.particles(0, 0, 'spark', { emitting: false }).setDepth(DEPTH.particles)
  }

  private createAffinityLight(x: number, y: number, color: BlockColor) {
    return this.add.circle(x, y, 5, BLOCK_COLOR_HEX[color], 0.18).setStrokeStyle(1, 0xffffff, 0.12)
  }

  private tryBlock(direction: BlockDirection, color: BlockColor | null) {
    const activeSide = this.state.path.targetSide
    const activeView = this.blockViews[this.state.path.activeIndex]
    if (!activeView) return

    const nowMs = this.time.now
    const previousMultiplier = this.state.timing.combo.multiplier
    const resolution = resolveAttempt(this.state, {
      color,
      direction,
      atMs: nowMs,
      responseMs: nowMs - this.activeSinceMs,
    })
    this.state = resolution.state
    this.scoreText.setText(`PUNTEN  ${this.state.score}`)
    this.moveProgressBar(activeSide)
    this.updateJourneyDisplay()

    if (resolution.outcome === 'wrong' || resolution.outcome === 'game-over') {
      this.events.emit('block-missed', resolution, { color, previousMultiplier })
      return
    }

    this.events.emit('block-hit', resolution, { activeView, activeSide, nowMs })
  }

  private onBlockMissed(resolution: AttemptResolution, { color, previousMultiplier }: BlockMissedContext) {
    this.comboText.setText(previousMultiplier > 1 ? 'COMBO KWIJT' : '')
    this.showFeedback(color ? 'MIS  −1' : 'HOUD EERST EEN KLEUR VAST', TEXT_COLOR.danger)
    this.cameras.main.shake(55, 0.004)

    if (resolution.outcome === 'game-over') {
      this.inputIsLocked = true
      this.scheduleOnce(220, () => this.showGameOver('BUITENRAND BEREIKT'))
    }
  }

  private onBlockHit(resolution: AttemptResolution, { activeView, activeSide, nowMs }: BlockHitContext) {
    this.updateAffinityLights()
    this.pulseAffinity(activeSide, activeView.block.color)
    this.showTimeRelief(resolution.timeReliefMs)
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
      this.showFeedback(`MIDDEN BEREIKT  +${resolution.scoreDelta}`, TEXT_COLOR.gold)
      this.scheduleOnce(260, () => this.showStageEnd(resolution.timeBonus))
    } else if (resolution.outcome === 'path-complete') {
      this.inputIsLocked = true
      this.showFeedback(`PAD KLAAR  +${resolution.scoreDelta}`, TEXT_COLOR.gold)
      this.scheduleOnce(160, () => {
        this.renderPath()
        this.inputIsLocked = false
      })
    } else {
      this.showHitFeedback(resolution.quality!, resolution.scoreDelta)
      this.markActiveBlock()
    }
  }

  private showStageEnd(timeBonus: number) {
    const adventureDue = isAdventureDue(this.state)
    const shade = this.add.rectangle(400, 250, 800, 500, PANEL_COLOR.overlayShade, 0.88)
    const late = this.state.status === 'stage-late'
    const titleText = late
      ? 'OP JOUW TEMPO VERDER'
      : this.state.journey.phase === 'shelter-finished'
        ? 'DE DEUR GAAT OPEN'
        : this.state.journey.phase === 'arrived'
          ? 'BIJ DE SCHUILPLAATS'
          : `LEVEL ${this.state.level} KLAAR`
    const title = this.addText(400, 185, titleText, 40, TEXT_COLOR.gold).setOrigin(0.5)
    const score = this.addText(400, 255, `${this.state.score} punten`, 28, TEXT_COLOR.default).setOrigin(0.5)
    const bonus = this.addText(
      400,
      305,
      late ? 'Deze keer zonder tijdbonus · Je punten blijven' : `Tijdbonus  +${timeBonus}`,
      18,
      TEXT_COLOR.cyan,
    ).setOrigin(0.5)
    const nextLabel =
      this.state.journey.phase === 'shelter-finished'
        ? 'EEN PLEK VOOR DE NACHT'
        : this.state.journey.phase === 'arrived'
          ? 'ER TIKT IETS ACHTER DE DEUR'
          : this.state.level === 1 && this.state.journey.phase === 'unmet'
            ? 'IEMAND WACHT BIJ DE SPLITSING'
            : adventureDue
              ? 'EEN TEKSTAVONTUUR WACHT'
              : 'VOLGENDE LEVEL'
    const next = this.addText(400, 350, nextLabel, 18, TEXT_COLOR.green).setOrigin(0.5)
    this.overlay = this.add.container(0, 0, [shade, title, score, bonus, next]).setDepth(DEPTH.overlay)

    this.scheduleOnce(late ? 1800 : 950, () => {
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
    this.scheduleOnce(280, () => {
      this.inputIsLocked = false
    })
  }

  private showAdventure() {
    const adventure = this.state.adventure.active
    if (!adventure) return

    // Discard presses made during the previous overlay; choices require fresh input.
    ;[this.leftKey, this.rightKey, this.spaceKey].forEach((key) => Phaser.Input.Keyboard.JustDown(key))
    const fragment = adventure.story.fragments[adventure.fragmentId]
    const shade = this.add.rectangle(400, 250, 800, 500, PANEL_COLOR.overlayShade, 0.92)
    const storyText = this.addText(400, 65, fragment.text, 18, TEXT_COLOR.soft)
      .setOrigin(0.5, 0)
      .setWordWrapWidth(620, true)
      .setAlign('center')

    const spacing = 220
    const startX = CENTER_X - ((fragment.choices.length - 1) * spacing) / 2
    this.adventureChoiceXs = fragment.choices.map((_, index) => startX + index * spacing)
    this.adventureChoiceViews = fragment.choices.map((choice, index) =>
      this.createAdventureChoiceView(this.adventureChoiceXs[index], choice),
    )

    this.adventureSelection = initialAdventureSelection(fragment.choices.length)
    this.adventureSelectorX = CENTER_X
    this.adventureSelectorDirection = 1
    this.adventureSelector = this.createAdventureSelector()

    const hint = this.addText(
      400,
      448,
      fragment.choices.length === 1
        ? 'SPATIE om verder te gaan'
        : '← → kies · SPATIE bevestigt · SHIFT beweegt de balk',
      15,
      TEXT_COLOR.muted,
    ).setOrigin(0.5)

    this.adventureUI = this.add
      .container(0, 0, [
        shade,
        storyText,
        ...this.adventureChoiceViews.map((view) => view.container),
        this.adventureSelector,
        hint,
      ])
      .setDepth(DEPTH.overlay)

    this.highlightAdventureChoice(this.adventureSelection)
  }

  private createAdventureChoiceView(x: number, choice: AdventureChoice): AdventureChoiceView {
    const box = this.add.rectangle(0, 0, 190, 110, PANEL_COLOR.background, 0.82).setStrokeStyle(1, PANEL_COLOR.border)
    const label = this.addText(0, -32, choice.label, 16, TEXT_COLOR.default)
      .setOrigin(0.5)
      .setAlign('center')
      .setWordWrapWidth(170, true)
    const description = this.addText(0, 2, choice.description, 13, TEXT_COLOR.muted)
      .setOrigin(0.5)
      .setAlign('center')
      .setWordWrapWidth(160, true)
    const hint = this.add.circle(0, 42, 3, 0xf8fafc, 0)
    const container = this.add.container(x, 285, [box, label, description, hint])
    return { container, box, hint }
  }

  private createAdventureSelector() {
    const glow = this.add.rectangle(0, 0, 14, 74, BAR_COLOR.neutralGlow, 0.14)
    const halo = this.add.rectangle(0, 0, 9, 70, BAR_COLOR.neutralHalo, 0.3)
    const core = this.add.rectangle(0, 0, 4, 66, BAR_COLOR.neutralCore, 0.96)
    return this.add.container(CENTER_X, ADVENTURE_TRACK_Y, [glow, halo, core]).setDepth(DEPTH.overlayForeground)
  }

  private updateAdventure(delta: number) {
    if (!this.state.adventure.active) return

    const left = Phaser.Input.Keyboard.JustDown(this.leftKey)
    const right = Phaser.Input.Keyboard.JustDown(this.rightKey)
    if (left !== right) {
      this.adventureSelection = stepAdventureSelection(
        this.adventureSelection,
        this.adventureChoiceXs.length,
        left ? -1 : 1,
      )
      this.adventureSelectorX = this.adventureChoiceXs[this.adventureSelection!]
      this.adventureSelector.setX(this.adventureSelectorX)
    } else if (this.shiftKey.isDown) {
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
      this.adventureSelection = this.getPointedAdventureChoiceIndex()
    }

    const pointedIndex = this.adventureSelection
    this.highlightAdventureChoice(pointedIndex)

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && pointedIndex !== null) {
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

  private highlightAdventureChoice(pointedIndex: number | null) {
    this.adventureChoiceViews.forEach((view, index) => {
      const isPointed = index === pointedIndex
      view.box.setStrokeStyle(isPointed ? 3 : 1, isPointed ? PANEL_COLOR.borderHighlight : PANEL_COLOR.border)
      view.box.setFillStyle(PANEL_COLOR.background, isPointed ? 0.92 : 0.82)
      view.hint.setAlpha(isPointed ? 1 : 0)
    })
  }

  private commitAdventureChoice(choiceIndex: number) {
    this.state = chooseAdventureOption(this.state, choiceIndex, Math.random, this.time.now)
    this.destroyAdventureUI()

    if (this.state.status === 'adventure') {
      this.showAdventure()
      return
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

    const shade = this.add.rectangle(400, 250, 800, 500, PANEL_COLOR.overlayShade, 0.94)
    const title = this.addText(400, 125, 'GAME OVER', 48, TEXT_COLOR.gameOverTitle).setOrigin(0.5)
    const cause = this.addText(400, 180, reason, 16, TEXT_COLOR.danger).setOrigin(0.5)
    const levelLabel =
      this.state.journey.phase === 'travelling' ? 'Het donker valt. Noor blijft bij je.' : `Level ${this.state.level}`
    const level = this.addText(400, 225, levelLabel, 22, TEXT_COLOR.steady).setOrigin(0.5)
    const finalScore = this.addText(400, 270, `${this.state.score} punten`, 32, TEXT_COLOR.gold).setOrigin(0.5)
    const bestScore = this.addText(400, 315, `Beste: ${best}`, 18, TEXT_COLOR.muted).setOrigin(0.5)
    const restart = this.addText(400, 375, 'Druk op SPATIE om opnieuw te beginnen', 19, TEXT_COLOR.green).setOrigin(0.5)
    this.overlay = this.add
      .container(0, 0, [shade, title, cause, level, finalScore, bestScore, restart])
      .setDepth(DEPTH.overlay)
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
      bar.glow.setFillStyle(isDanger ? BAR_COLOR.dangerGlow : BAR_COLOR.neutralGlow)
      bar.halo.setFillStyle(isDanger ? BAR_COLOR.dangerHalo : BAR_COLOR.neutralHalo)
      bar.core.setFillStyle(isDanger ? BAR_COLOR.dangerCore : BAR_COLOR.neutralCore)
    })
  }

  private updateTimePressure() {
    const resolution = resolveTimePressure(this.state, this.time.now)
    const dangerSide: TargetSide = this.state.path.targetSide === 'left' ? 'right' : 'left'
    const centerX = dangerSide === 'left' ? 392 : 408
    this.progressBars[dangerSide].container.setX(
      Phaser.Math.Linear(BAR_START_X[dangerSide], centerX, resolution.progress),
    )

    if (resolution.outcome === 'time-up') {
      this.state = resolution.state
      this.inputIsLocked = true
      this.colorWash.setAlpha(0)
      this.comboText.setText('HET WORDT DONKER · JE REIS GAAT DOOR')
      this.updateJourneyDisplay()
      this.effectWash.setFillStyle(BAR_COLOR.dangerGlow).setAlpha(0.18)
      this.tweens.add({ targets: this.effectWash, alpha: 0, duration: 260 })
      this.scheduleOnce(260, () => this.showStageEnd(0))
      return true
    }

    return false
  }

  private showTimeRelief(timeReliefMs: number) {
    const dangerSide: TargetSide = this.state.path.targetSide === 'left' ? 'right' : 'left'
    const dangerBar = this.progressBars[dangerSide]
    const x = dangerBar.container.x + (dangerSide === 'left' ? 22 : -22)
    const reliefSeconds = (timeReliefMs / 1000).toLocaleString('nl-NL')
    const label = this.addText(x, 145, `+${reliefSeconds}s`, 13, TEXT_COLOR.cyan).setOrigin(0.5).setDepth(DEPTH.hud)

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
    const progress = this.state.edgeProgress[side]
    if (progress < 0) {
      const distance = progress * gameConfig.barMovementPixels
      return side === 'left' ? BAR_START_X.left + distance : BAR_START_X.right - distance
    }
    const centerX = side === 'left' ? 392 : 408
    return Phaser.Math.Linear(BAR_START_X[side], centerX, Math.min(1, progress / this.state.levelRules.targetHits))
  }

  private updateJourneyDisplay() {
    this.journeyText.setText(getJourneyCaption(this.state.journey))
    const destination =
      this.state.journey.phase === 'opening' || this.state.journey.phase === 'shelter-finished'
        ? 'DEUR OPENEN'
        : this.state.journey.phase === 'travelling' || this.state.journey.phase === 'arrived'
          ? 'SCHUILPLAATS'
          : 'STAGE WIN'
    const progress = Math.max(0, this.state.edgeProgress[this.state.path.targetSide])
    this.goalText.setText(`${destination} · ${progress}/${this.state.levelRules.targetHits}`)
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
    const { streak, multiplier } = this.state.timing.combo
    const label = multiplier > 1 ? `×${multiplier}  ·  ${streak} HITS` : streak > 1 ? `${streak} HITS` : ''
    this.comboText.setText(label).setColor(COMBO_MULTIPLIER_COLOR[multiplier - 1] ?? TEXT_COLOR.gold)
    this.comboText.setScale(1.35)
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 120, ease: 'Back.Out' })
  }

  private showHitFeedback(quality: HitQuality, scoreDelta: number) {
    this.showFeedback(
      `${QUALITY_LABEL[quality]}  ×${this.state.timing.combo.multiplier}  +${scoreDelta}`,
      QUALITY_COLOR[quality],
    )
  }

  private playHitEffect(
    view: Phaser.GameObjects.Container,
    color: BlockColor,
    quality: HitQuality,
    scoreDelta: number,
  ) {
    const multiplier = this.state.timing.combo.multiplier
    const fill = BLOCK_COLOR_HEX[color]
    const burstCount = Math.min(16, 3 + multiplier * 2 + (quality === 'perfect' ? 3 : 0))
    const lifespanMs = 180 + multiplier * 35
    const minDistance = 22
    const maxDistance = minDistance + 18 + multiplier * 5

    this.hitEmitter.setConfig({
      tint: fill,
      lifespan: lifespanMs,
      speed: { min: (minDistance * 1000) / lifespanMs, max: (maxDistance * 1000) / lifespanMs },
      scale: { start: 1, end: 0.25 },
      alpha: { start: 0.9, end: 0 },
    })
    this.hitEmitter.explode(burstCount, view.x, view.y)

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
      this.comboText.setText(`OVERDRIVE ×5  ·  ${this.state.timing.combo.streak} HITS`)
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
    const outlineColor = heldColor ? BLOCK_COLOR_HEX[heldColor] : 0xffffff
    outline.setStrokeStyle(heldColor === activeView.block.color ? 6 : 3, outlineColor, heldColor ? 1 : 0.22)
  }

  private updateColorWash(heldColor: BlockColor | null) {
    if (heldColor) {
      this.colorWash.setFillStyle(BLOCK_COLOR_HEX[heldColor]).setAlpha(0.1)
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
    this.add.rectangle(400, 250, 760, 150, PANEL_COLOR.background).setStrokeStyle(2, PANEL_COLOR.border)
    this.add.rectangle(CENTER_X, 250, 8, 190, BAR_COLOR.neutralHalo, 0.85)
    this.goalText = this.addText(CENTER_X, 362, 'STAGE WIN', 13, TEXT_COLOR.subtle).setOrigin(0.5)
    this.add.rectangle(20, 250, 2, 190, PANEL_COLOR.edgeAccent, 0.45)
    this.add.rectangle(780, 250, 2, 190, PANEL_COLOR.edgeAccent, 0.45)
  }

  private addText(x: number, y: number, text: string, size: number, color: string = TEXT_COLOR.default) {
    return this.add.text(x, y, text, {
      color,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: `${size}px`,
      fontStyle: 'bold',
    })
  }
}
