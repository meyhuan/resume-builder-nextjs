import { useEffect } from 'react'
import { useEditorUiStore } from '@/state/editor-ui-store'

/** Keep an active inline editor mounted even when its last character is erased. */
export function useRetainEditingBlock(blockId: string, editing: boolean): void {
  const setBlockEditing = useEditorUiStore((state) => state.setBlockEditing)
  useEffect(() => {
    if (!editing) return
    setBlockEditing(blockId, true)
    return () => setBlockEditing(blockId, false)
  }, [blockId, editing, setBlockEditing])
}
