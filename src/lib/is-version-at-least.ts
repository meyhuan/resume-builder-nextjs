function parseVersionSegments(version: string): readonly number[] {
  return version
    .trim()
    .split(/[._-]/)
    .map((segment) => Number.parseInt(segment, 10))
    .filter((segment) => Number.isFinite(segment))
}

export function isVersionAtLeast(current: string, minimum: string): boolean {
  const currentSegments = parseVersionSegments(current)
  const minimumSegments = parseVersionSegments(minimum)
  if (currentSegments.length === 0) return false

  const length = Math.max(currentSegments.length, minimumSegments.length)
  for (let index = 0; index < length; index += 1) {
    const left = currentSegments[index] ?? 0
    const right = minimumSegments[index] ?? 0
    if (left !== right) return left > right
  }

  return true
}
