/** Preserve native text selection when display HTML becomes a Lexical editor. */
export interface InlineTextSelection {
  readonly anchor: number
  readonly focus: number
}

export function readInlineSelection(root: HTMLElement | null): InlineTextSelection | null {
  const selection = root?.ownerDocument.getSelection()
  if (!root || !selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode
    || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null
  const offset = (node: Node, position: number): number => {
    const range = root.ownerDocument.createRange()
    range.selectNodeContents(root)
    range.setEnd(node, position)
    return range.toString().length
  }
  return { anchor: offset(selection.anchorNode, selection.anchorOffset), focus: offset(selection.focusNode, selection.focusOffset) }
}

export function findInlineTextPosition(root: HTMLElement, offset: number): { node: Node; offset: number } | null {
  const walker = root.ownerDocument.createTreeWalker(root, 4 /* SHOW_TEXT */)
  let remaining = offset
  let last: Node | null = null
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    last = node
    const length = node.textContent?.length ?? 0
    if (remaining <= length) return { node, offset: remaining }
    remaining -= length
  }
  return last ? { node: last, offset: last.textContent?.length ?? 0 } : null
}
