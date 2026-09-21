import Phaser from 'phaser'

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'up' | 'left' | 'down' | 'right', Phaser.Input.Keyboard.Key>

  constructor() {
    super('game')
  }

  create() {
    this.add
      .text(400, 36, 'Welkom in je Phaser-speeltuin', {
        color: '#e5e7eb',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
      })
      .setOrigin(0.5)

    const circle = this.add.graphics()
    circle.fillStyle(0xf6c453)
    circle.fillCircle(24, 24, 24)
    circle.generateTexture('player', 48, 48)
    circle.destroy()

    this.player = this.physics.add.image(400, 270, 'player')
    this.player.setCollideWorldBounds(true)
    this.player.setDrag(900)
    this.player.setMaxVelocity(260)

    if (!this.input.keyboard) {
      throw new Error('Toetsenbordinvoer is niet beschikbaar.')
    }

    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'up' | 'left' | 'down' | 'right', Phaser.Input.Keyboard.Key>
  }

  update() {
    const acceleration = 650
    const left = this.cursors.left.isDown || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown
    const up = this.cursors.up.isDown || this.wasd.up.isDown
    const down = this.cursors.down.isDown || this.wasd.down.isDown

    this.player.setAcceleration(
      left ? -acceleration : right ? acceleration : 0,
      up ? -acceleration : down ? acceleration : 0,
    )
  }
}
