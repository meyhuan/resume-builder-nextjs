import { describe, expect, it } from 'vitest'
import { contrastingInk } from '@/templates/_core/contrast'
import { REFERENCE_DESIGNS } from '@/templates/_canva/designs'

function luminance(hex: string): number {
  const raw = hex.slice(1)
  const expanded = raw.length === 3 ? raw.split('').map((value) => value + value).join('') : raw
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe('theme foreground contrast', () => {
  it('handles light, dark, shorthand and invalid theme values', () => {
    expect(contrastingInk('#4c47ff')).toBe('#ffffff')
    expect(contrastingInk('#e9eef5')).toBe('#000000')
    expect(contrastingInk('#fff')).toBe('#000000')
    expect(contrastingInk(' #000 ')).toBe('#ffffff')
    expect(contrastingInk('invalid')).toBe('#000000')
  })
  it('keeps normal text above 4.5:1 for all references and a 216-color RGB sample', () => {
    const colors: string[] = Object.values(REFERENCE_DESIGNS).map((design) => design.accent)
    for (const r of [0, 51, 102, 153, 204, 255]) {
      for (const g of [0, 51, 102, 153, 204, 255]) {
        for (const b of [0, 51, 102, 153, 204, 255]) {
          colors.push(`#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`)
        }
      }
    }
    for (const color of colors) {
      const background = luminance(color)
      const foreground = luminance(contrastingInk(color))
      const ratio = (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05)
      expect(ratio, color).toBeGreaterThanOrEqual(4.5)
    }
  })
})
