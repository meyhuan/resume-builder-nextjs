/**
 * Export avatar canvases without losing transparency.
 *
 * JPEG keeps opaque portraits small, but it cannot store alpha. When the
 * cropped canvas contains transparent pixels we must export PNG, otherwise
 * transparent ID photos can render with black backgrounds in templates.
 */
export function exportAvatarCanvasDataUrl(
  canvas: HTMLCanvasElement,
  jpegQuality: number,
): string {
  if (canvasHasTransparency(canvas)) {
    return canvas.toDataURL('image/png')
  }

  return canvas.toDataURL('image/jpeg', jpegQuality)
}

function canvasHasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d')
  if (!ctx) {
    return true
  }

  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) {
        return true
      }
    }
  } catch {
    return true
  }

  return false
}
