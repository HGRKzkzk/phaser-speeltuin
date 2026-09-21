import Phaser from 'phaser'
import { gameConfig } from '../game/config'
import { createGameState, resolveAttempt, startNextLevel } from '../game/rules'
import type { BlockColor, BlockDirection, GameBlock, GameState, TargetSide } from '../game/types'

type BlockView = {
  block: GameBlock
  view: Phaser.GameObjects.Container
}

const COLOR_KEYS: Record<BlockColor, string> = { red: 'A', blue: 'D' }
const BAR_START_X: Record<TargetSide, number> = { left: 92, right: 708 }
const CENTER_X = 400

export class GameScene extends Phaser.Scene {
  private state: GameState = createGameState()
  private blockViews: BlockView[] = []
  private inputIsLocked = false

  private redKey!: Phaser.Input.Keyboard.Key
  private blueKey!: Phaser.Input.Keyboard.Key
  private upKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key

  private scoreText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text
  private sideText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private overlay?: Phaser.GameObjects.Container
  private colorWash!: Phaser.GameObjects.Rectangle
  private progressBars!: Record<TargetSide, Phaser.GameObjects.Container>
  private affinityLights!: Record<TargetSide, Record<BlockColor, Phaser.GameObjects.Arc>>

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

    this.scoreText = this.addText(24, 22, 'PUNTEN  0', 22).setOrigin(0)
    this.levelText = this.addText(776, 22, 'LEVEL  1', 22).setOrigin(1, 0)
    this.sideText = this.addText(400, 88, '', 22).setOrigin(0.5)
    this.feedbackText = this.addText(400, 400, '', 22).setOrigin(0.5)
    this.addText(400, 464, 'Houd A = ROOD of D = BLAUW vast · druk daarna de pijl', 17, '#94a3b8').setOrigin(0.5)

    this.redKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.blueKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.startGame()
  }

  update() {
    if (this.state.status === 'game-over') {
      if (this.overlay && Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.startGame()
      return
    }

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
    this.state = createGameState()
    this.inputIsLocked = false
    this.scoreText.setText('PUNTEN  0')
    this.levelText.setText('LEVEL  1')
    this.feedbackText.setText('')
    this.colorWash.setAlpha(0)
    this.syncProgressBars()
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
    const bar = this.add.container(BAR_START_X[side], 250, [glow, halo, core]).setDepth(5)

    this.tweens.add({
      targets: [glow, halo],
      alpha: { from: 0.12, to: 0.36 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    })

    return bar
  }

  private createAffinityLight(x: number, y: number, color: BlockColor) {
    const fill = color === 'red' ? 0xff2d55 : 0x1687ff
    return this.add.circle(x, y, 5, fill, 0.18).setStrokeStyle(1, 0xffffff, 0.12)
  }

  private tryBlock(direction: BlockDirection, color: BlockColor | null) {
    const activeSide = this.state.path.targetSide
    const activeView = this.blockViews[this.state.path.activeIndex]
    if (!activeView) return

    const resolution = resolveAttempt(this.state, { color, direction })
    this.state = resolution.state
    this.scoreText.setText(`PUNTEN  ${this.state.score}`)
    this.moveProgressBar(activeSide)

    if (resolution.outcome === 'wrong' || resolution.outcome === 'game-over') {
      this.showFeedback(color ? 'MIS  −1' : 'HOUD EERST EEN KLEUR VAST', '#fda4af')
      this.cameras.main.shake(55, 0.004)

      if (resolution.outcome === 'game-over') {
        this.inputIsLocked = true
        this.time.delayedCall(220, () => this.showGameOver())
      }
      return
    }

    this.updateAffinityLights()
    this.pulseAffinity(activeSide, activeView.block.color)

    this.tweens.add({
      targets: activeView.view,
      alpha: 0,
      scale: 1.35,
      duration: 90,
      onComplete: () => activeView.view.setVisible(false),
    })

    if (resolution.outcome === 'stage-win') {
      this.inputIsLocked = true
      this.showFeedback('MIDDEN BEREIKT', '#fde68a')
      this.time.delayedCall(260, () => this.showStageWin())
    } else if (resolution.outcome === 'path-complete') {
      this.inputIsLocked = true
      this.showFeedback(`PAD KLAAR  +${gameConfig.pointsPerCompletedPath}`, '#fde68a')
      this.time.delayedCall(160, () => {
        if (this.state.status === 'playing') {
          this.renderPath()
          this.inputIsLocked = false
        }
      })
    } else {
      this.showFeedback(`+${gameConfig.pointsPerBlock}`, '#86efac')
      this.markActiveBlock()
    }
  }

  private showStageWin() {
    const shade = this.add.rectangle(400, 250, 800, 500, 0x070b14, 0.88)
    const title = this.addText(400, 185, `LEVEL ${this.state.level} KLAAR`, 40, '#fde68a').setOrigin(0.5)
    const score = this.addText(400, 255, `${this.state.score} punten`, 28, '#f8fafc').setOrigin(0.5)
    const next = this.addText(400, 320, 'VOLGENDE LEVEL', 18, '#86efac').setOrigin(0.5)
    this.overlay = this.add.container(0, 0, [shade, title, score, next]).setDepth(30)

    this.time.delayedCall(950, () => {
      this.overlay?.destroy(true)
      this.overlay = undefined
      this.state = startNextLevel(this.state)
      this.levelText.setText(`LEVEL  ${this.state.level}`)
      this.syncProgressBars(260)
      this.updateAffinityLights()
      this.renderPath()
      this.time.delayedCall(280, () => {
        this.inputIsLocked = false
      })
    })
  }

  private showGameOver() {
    const storedBest = Number(localStorage.getItem('phaser-speeltuin-best') ?? 0)
    const best = Math.max(storedBest, this.state.score)
    localStorage.setItem('phaser-speeltuin-best', String(best))
    this.colorWash.setAlpha(0)

    const shade = this.add.rectangle(400, 250, 800, 500, 0x070b14, 0.94)
    const title = this.addText(400, 145, 'GAME OVER', 48, '#fb7185').setOrigin(0.5)
    const level = this.addText(400, 215, `Level ${this.state.level}`, 22, '#cbd5e1').setOrigin(0.5)
    const finalScore = this.addText(400, 260, `${this.state.score} punten`, 32, '#fde68a').setOrigin(0.5)
    const bestScore = this.addText(400, 305, `Beste: ${best}`, 18, '#94a3b8').setOrigin(0.5)
    const restart = this.addText(400, 365, 'Druk op SPATIE om opnieuw te beginnen', 19, '#86efac').setOrigin(0.5)
    this.overlay = this.add.container(0, 0, [shade, title, level, finalScore, bestScore, restart]).setDepth(30)
  }

  private moveProgressBar(side: TargetSide) {
    const x = this.getBarX(side)
    this.tweens.killTweensOf(this.progressBars[side])
    this.tweens.add({ targets: this.progressBars[side], x, duration: 150, ease: 'Back.Out' })
  }

  private syncProgressBars(duration = 0) {
    ;(['left', 'right'] as TargetSide[]).forEach((side) => {
      this.tweens.killTweensOf(this.progressBars[side])
      if (duration === 0) {
        this.progressBars[side].setX(this.getBarX(side))
      } else {
        this.tweens.add({ targets: this.progressBars[side], x: this.getBarX(side), duration, ease: 'Sine.Out' })
      }
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
