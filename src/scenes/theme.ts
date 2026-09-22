import type { BlockColor, HitQuality } from '../game/types'

// Gedeelde presentatieconstanten voor GameScene: kleuren en z-volgorde op één
// plek, zodat nieuwe overlays of effecten hier op voortbouwen in plaats van
// losse hex-literals te herhalen of dieptes te gokken.

export const DEPTH = {
  progressBar: 5,
  colorWash: 10,
  effectWash: 11,
  hud: 12,
  particles: 13,
  overlay: 30,
  overlayForeground: 31,
} as const

export const BLOCK_COLOR_HEX: Record<BlockColor, number> = {
  red: 0xff2d55,
  blue: 0x1687ff,
}

export const PANEL_COLOR = {
  background: 0x111a2e,
  border: 0x334155,
  borderHighlight: 0x64748b,
  overlayShade: 0x070b14,
  edgeAccent: 0xfb7185,
} as const

export const BAR_COLOR = {
  neutralGlow: 0xe2e8f0,
  neutralHalo: 0xf8fafc,
  neutralCore: 0xffffff,
  dangerGlow: 0xff1744,
  dangerHalo: BLOCK_COLOR_HEX.red,
  dangerCore: 0xff5c76,
} as const

export const TEXT_COLOR = {
  default: '#f8fafc',
  soft: '#e2e8f0',
  muted: '#94a3b8',
  subtle: '#64748b',
  danger: '#fda4af',
  gold: '#fde68a',
  cyan: '#67e8f9',
  green: '#86efac',
  steady: '#cbd5e1',
  gameOverTitle: '#fb7185',
  purple: '#c4b5fd',
} as const

export const QUALITY_LABEL: Record<HitQuality, string> = {
  steady: 'STEADY',
  good: 'GOOD',
  great: 'GREAT',
  perfect: 'PERFECT',
}

export const QUALITY_COLOR: Record<HitQuality, string> = {
  steady: TEXT_COLOR.steady,
  good: TEXT_COLOR.green,
  great: TEXT_COLOR.cyan,
  perfect: TEXT_COLOR.gold,
}

// Index 0 hoort bij multiplier ×1, index 4 bij ×5.
export const COMBO_MULTIPLIER_COLOR = [
  TEXT_COLOR.default,
  TEXT_COLOR.green,
  TEXT_COLOR.cyan,
  TEXT_COLOR.purple,
  TEXT_COLOR.gold,
]
