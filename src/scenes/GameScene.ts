import Phaser from 'phaser'

type BlockColor = 'red' | 'blue'
type BlockDirection = 'up' | 'right'
type TargetSide = 'left' | 'right'

type Block = {
  color: BlockColor
  direction: BlockDirection
  view: Phaser.GameObjects.Container
}

const ROUND_SECONDS = 17
const BLOCKS_PER_WAVE = 7
const COLOR_KEYS: Record<BlockColor, string> = {
  red: 'A',
  blue: 'D',
}

export class GameScene extends Phaser.Scene {
  private blocks: Block[] = []
  private targetSide: TargetSide = 'left'
  private activeIndex = 0
  private score = 0
  private timeLeft = ROUND_SECONDS
  private roundIsOver = false

  private redKey!: Phaser.Input.Keyboard.Key
  private blueKey!: Phaser.Input.Keyboard.Key
  private upKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key

  private scoreText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private sideText!: Phaser.GameObjects.Text
  private feedbackText!: Phaser.GameObjects.Text
  private hintText!: Phaser.GameObjects.Text
  private overlay!: Phaser.GameObjects.Container
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

    this.scoreText = this.addText(24, 22, 'PUNTEN  0', 22).setOrigin(0)
    this.timerText = this.addText(776, 22, '17.0', 28).setOrigin(1, 0)
    this.sideText = this.addText(400, 88, '', 22).setOrigin(0.5)
    this.feedbackText = this.addText(400, 400, '', 22).setOrigin(0.5)
    this.hintText = this.addText(400, 464, 'Houd A = ROOD of D = BLAUW vast · druk daarna ↑ of →', 17, '#94a3b8').setOrigin(0.5)

    this.redKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.blueKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
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

    this.updateHeldColorIndicator()

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.tryBlock('up')
    } else if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
      this.tryBlock('right')
    }
  }

  private startRound() {
    this.overlay?.destroy(true)
    this.clearBlocks()
    this.roundTimer?.remove()

    this.score = 0
    this.timeLeft = ROUND_SECONDS
    this.roundIsOver = false
    this.scoreText.setText('PUNTEN  0')
    this.timerText.setText(ROUND_SECONDS.toFixed(1)).setColor('#f8fafc')
    this.feedbackText.setText('')
    this.hintText.setVisible(true)
    this.createWave()

    this.roundTimer = this.time.addEvent({
      delay: 100,
      repeat: ROUND_SECONDS * 10 - 1,
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

  private createWave() {
    this.clearBlocks()
    this.activeIndex = 0
    this.targetSide = Math.random() < 0.5 ? 'left' : 'right'

    const pointsToEdge = this.targetSide === 'left' ? '← LINKERRAND' : 'RECHTERRAND →'
    this.sideText.setText(pointsToEdge)

    for (let index = 0; index < BLOCKS_PER_WAVE; index += 1) {
      const color: BlockColor = Math.random() < 0.5 ? 'red' : 'blue'
      const direction: BlockDirection = Math.random() < 0.5 ? 'up' : 'right'
      const step = index * 50
      const x = this.targetSide === 'left' ? 350 - step : 450 + step
      const view = this.createBlockView(x, 250, color, direction)

      this.blocks.push({ color, direction, view })
    }

    this.markActiveBlock()
  }

  private createBlockView(x: number, y: number, color: BlockColor, direction: BlockDirection) {
    const fill = color === 'red' ? 0xff2d55 : 0x1687ff
    const rectangle = this.add.rectangle(0, 0, 42, 64, fill).setStrokeStyle(3, 0xffffff, 0.22)
    const arrow = this.addText(0, 0, direction === 'up' ? '↑' : '→', 31).setOrigin(0.5)
    const key = this.addText(0, 23, COLOR_KEYS[color], 11, '#ffffff').setOrigin(0.5).setAlpha(0.8)

    return this.add.container(x, y, [rectangle, arrow, key])
  }

  private tryBlock(direction: BlockDirection) {
    const block = this.blocks[this.activeIndex]
    if (!block) return

    const heldColor: BlockColor | null = this.redKey.isDown && !this.blueKey.isDown
      ? 'red'
      : this.blueKey.isDown && !this.redKey.isDown
        ? 'blue'
        : null

    const isCorrect = heldColor === block.color && direction === block.direction

    if (isCorrect) {
      this.score += 1
      this.scoreText.setText(`PUNTEN  ${this.score}`)
      this.showFeedback('+1', '#86efac')

      this.tweens.add({
        targets: block.view,
        alpha: 0,
        scale: 1.35,
        duration: 90,
        onComplete: () => block.view.destroy(true),
      })

      this.activeIndex += 1

      if (this.activeIndex === this.blocks.length) {
        this.score += 3
        this.scoreText.setText(`PUNTEN  ${this.score}`)
        this.showFeedback('RAND BEREIKT  +3', '#fde68a')
        this.time.delayedCall(160, () => {
          if (!this.roundIsOver) this.createWave()
        })
      } else {
        this.markActiveBlock()
      }
    } else {
      this.score = Math.max(0, this.score - 1)
      this.scoreText.setText(`PUNTEN  ${this.score}`)
      this.showFeedback(heldColor ? 'MIS  −1' : 'HOUD EERST EEN KLEUR VAST', '#fda4af')
      this.cameras.main.shake(55, 0.004)
    }
  }

  private markActiveBlock() {
    this.blocks.forEach((block, index) => {
      const isActive = index === this.activeIndex
      block.view.setAlpha(index < this.activeIndex ? 0 : isActive ? 1 : 0.48)
      block.view.setScale(isActive ? 1.14 : 1)
    })
  }

  private updateHeldColorIndicator() {
    const block = this.blocks[this.activeIndex]
    if (!block) return

    const heldColor = this.redKey.isDown && !this.blueKey.isDown
      ? 'red'
      : this.blueKey.isDown && !this.redKey.isDown
        ? 'blue'
        : null

    const outline = block.view.first as Phaser.GameObjects.Rectangle
    const outlineColor = heldColor === 'red' ? 0xff2d55 : heldColor === 'blue' ? 0x1687ff : 0xffffff
    outline.setStrokeStyle(heldColor === block.color ? 6 : 3, outlineColor, heldColor ? 1 : 0.22)
  }

  private showFeedback(message: string, color: string) {
    this.feedbackText.setText(message).setColor(color).setAlpha(1)
    this.tweens.killTweensOf(this.feedbackText)
    this.tweens.add({ targets: this.feedbackText, alpha: 0, duration: 420, delay: 120 })
  }

  private endRound() {
    if (this.roundIsOver) return

    this.roundIsOver = true
    this.roundTimer?.remove()
    this.timerText.setText('0.0')
    this.hintText.setVisible(false)

    const storedBest = Number(localStorage.getItem('phaser-speeltuin-best') ?? 0)
    const best = Math.max(storedBest, this.score)
    localStorage.setItem('phaser-speeltuin-best', String(best))

    const shade = this.add.rectangle(400, 250, 800, 500, 0x070b14, 0.94)
    const title = this.addText(400, 155, 'TIJD!', 48, '#f8fafc').setOrigin(0.5)
    const finalScore = this.addText(400, 230, `${this.score} punten`, 34, '#fde68a').setOrigin(0.5)
    const bestScore = this.addText(400, 282, `Beste: ${best}`, 20, '#94a3b8').setOrigin(0.5)
    const restart = this.addText(400, 350, 'Druk op SPATIE voor nog 17 seconden', 20, '#86efac').setOrigin(0.5)

    this.overlay = this.add.container(0, 0, [shade, title, finalScore, bestScore, restart])
  }

  private clearBlocks() {
    this.blocks.forEach((block) => block.view.destroy(true))
    this.blocks = []
  }

  private drawArena() {
    this.add.rectangle(400, 250, 760, 150, 0x111a2e).setStrokeStyle(2, 0x334155)
    this.add.rectangle(400, 250, 8, 190, 0xf8fafc, 0.85)
    this.addText(400, 362, 'START', 13, '#64748b').setOrigin(0.5)
    this.add.rectangle(22, 250, 8, 190, 0xff2d55, 0.8)
    this.add.rectangle(778, 250, 8, 190, 0x1687ff, 0.8)
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
