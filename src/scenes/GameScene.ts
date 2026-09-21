import Phaser from 'phaser'
import { gameConfig } from '../game/config'
import { createRoundState, resolveAttempt } from '../game/rules'
import type { BlockColor, BlockDirection, GameBlock, GameState } from '../game/types'

type BlockView = {
  block: GameBlock
  view: Phaser.GameObjects.Container
}

const COLOR_KEYS: Record<BlockColor, string> = {
  red: 'A',
  blue: 'D',
}

export class GameScene extends Phaser.Scene {
  private state: GameState = createRoundState()
  private blockViews: BlockView[] = []
  private timeLeft: number = gameConfig.roundDurationSeconds
  private roundIsOver = false
  private inputIsLocked = false

  private redKey!: Phaser.Input.Keyboard.Key
  private blueKey!: Phaser.Input.Keyboard.Key
  private upKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key

  private scoreText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private sideText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text
  private overlay!: Phaser.GameObjects.Container
  private colorWash!: Phaser.GameObjects.Rectangle
  private roundTimer?: Phaser.Time.TimerEvent

  constructor() {
    super('game')
  }

  create() {
    if (!this.input.keyboard) {
      throw new Error('Toetsenbordinvoer is niet beschikbaar.')
    }

    this.cameras.main.setBackgroundColor('#0b1020')
    this.drawArena()
    this.colorWash = this.add.rectangle(400, 250, 800, 500, 0xffffff, 0).setDepth(10)

    this.scoreText = this.addText(24, 22, 'PUNTEN  0', 22).setOrigin(0)
    this.timerText = this.addText(776, 22, gameConfig.roundDurationSeconds.toFixed(1), 28).setOrigin(1, 0)
    this.sideText = this.addText(400, 88, '', 22).setOrigin(0.5)
    this.feedbackText = this.addText(400, 400, '', 22).setOrigin(0.5)
    this.hintText = this.addText(400, 464, 'Houd A = ROOD of D = BLAUW vast · druk daarna de pijl', 17, '#94a3b8').setOrigin(0.5)

    this.redKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.blueKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.startRound()
  }

  update() {
    if (this.roundIsOver) {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.startRound()
      }
      return
    }

    const heldColor = this.getHeldColor()
    this.updateColorWash(heldColor)

    if (this.inputIsLocked) return

    this.updateActiveOutline(heldColor)

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.tryBlock('up', heldColor)
    } else if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
      this.tryBlock('left', heldColor)
    } else if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
      this.tryBlock('right', heldColor)
    }
  }

  private startRound() {
    this.overlay?.destroy(true)
    this.clearBlockViews()
    this.roundTimer?.remove()

    this.state = createRoundState()
    this.timeLeft = gameConfig.roundDurationSeconds
    this.roundIsOver = false
    this.inputIsLocked = false
    this.scoreText.setText('PUNTEN  0')
    this.timerText.setText(this.timeLeft.toFixed(1)).setColor('#f8fafc')
    this.feedbackText.setText('')
    this.colorWash.setAlpha(0)
    this.hintText.setVisible(true)
    this.renderPath()

    this.roundTimer = this.time.addEvent({
      delay: 100,
      repeat: gameConfig.roundDurationSeconds * 10 - 1,
      callback: () => {
        this.timeLeft = Math.max(0, this.timeLeft - 0.1)
        this.timerText.setText(this.timeLeft.toFixed(1))

        if (this.timeLeft <= 5) {
          this.timerText.setColor('#fb7185')
        }

        if (this.timeLeft <= 0) {
          this.endRound()
        }
      },
    })
  }

  private renderPath() {
    this.clearBlockViews()

    const { targetSide, blocks } = this.state.path
    const horizontalArrow = targetSide === 'left' ? '←' : '→'
    const phasePath = (this.state.completedPaths % gameConfig.pathsPerDirectionPhase) + 1
    this.sideText.setText(`${horizontalArrow} + ↑  ·  PAD ${phasePath}/${gameConfig.pathsPerDirectionPhase}`)

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

  private tryBlock(direction: BlockDirection, color: BlockColor | null) {
    const activeIndex = this.state.path.activeIndex
    const activeView = this.blockViews[activeIndex]
    if (!activeView) return

    const resolution = resolveAttempt(this.state, { color, direction })
    this.state = resolution.state
    this.scoreText.setText(`PUNTEN  ${this.state.score}`)

    if (resolution.outcome === 'wrong') {
      this.showFeedback(color ? 'MIS  −1' : 'HOUD EERST EEN KLEUR VAST', '#fda4af')
      this.cameras.main.shake(55, 0.004)
      return
    }

    this.tweens.add({
      targets: activeView.view,
      alpha: 0,
      scale: 1.35,
      duration: 90,
      onComplete: () => activeView.view.setVisible(false),
    })

    if (resolution.outcome === 'path-complete') {
      this.inputIsLocked = true
      this.showFeedback(`RAND BEREIKT  +${gameConfig.pointsPerCompletedPath}`, '#fde68a')
      this.time.delayedCall(160, () => {
        if (!this.roundIsOver) {
          this.renderPath()
          this.inputIsLocked = false
        }
      })
    } else {
      this.showFeedback(`+${gameConfig.pointsPerBlock}`, '#86efac')
      this.markActiveBlock()
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

  private endRound() {
    if (this.roundIsOver) return

    this.roundIsOver = true
    this.inputIsLocked = true
    this.roundTimer?.remove()
    this.colorWash.setAlpha(0)
    this.timerText.setText('0.0')
    this.hintText.setVisible(false)

    const storedBest = Number(localStorage.getItem('phaser-speeltuin-best') ?? 0)
    const best = Math.max(storedBest, this.state.score)
    localStorage.setItem('phaser-speeltuin-best', String(best))

    const shade = this.add.rectangle(400, 250, 800, 500, 0x070b14, 0.94)
    const title = this.addText(400, 155, 'TIJD!', 48, '#f8fafc').setOrigin(0.5)
    const finalScore = this.addText(400, 230, `${this.state.score} punten`, 34, '#fde68a').setOrigin(0.5)
    const bestScore = this.addText(400, 282, `Beste: ${best}`, 20, '#94a3b8').setOrigin(0.5)
    const restart = this.addText(400, 350, `Druk op SPATIE voor nog ${gameConfig.roundDurationSeconds} seconden`, 20, '#86efac').setOrigin(0.5)

    this.overlay = this.add.container(0, 0, [shade, title, finalScore, bestScore, restart]).setDepth(30)
  }

  private clearBlockViews() {
    this.blockViews.forEach(({ view }) => view.destroy(true))
    this.blockViews = []
  }

  private drawArena() {
    this.add.rectangle(400, 250, 760, 150, 0x111a2e).setStrokeStyle(2, 0x334155)
    this.add.rectangle(400, 250, 8, 190, 0xf8fafc, 0.85)
    this.addText(400, 362, 'START', 13, '#64748b').setOrigin(0.5)
    this.add.rectangle(22, 250, 8, 190, 0xf8fafc, 0.35)
    this.add.rectangle(778, 250, 8, 190, 0xf8fafc, 0.35)
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
