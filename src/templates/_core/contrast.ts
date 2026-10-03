/** Choose readable ink for the editor's opaque hexadecimal theme colors. */
export function contrastingInk(hex: string): '#000000' | '#ffffff' {
  const raw = hex.trim().replace(/^#/, '')
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return '#000000'
  const expanded = raw.length === 3 ? raw.split('').map((channel) => channel + channel).join('') : raw
  const channels = [0, 2, 4].map((index) => {
    const value = parseInt(expanded.slice(index, index + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  // Black/white's crossover guarantees >= 4.5:1 on an opaque sRGB color.
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff'
}
