/**
 * Delete Section Confirmation Dialog
 * Reusable dialog for confirming section deletion across all templates
 */
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteSectionDialogProps {
  readonly open: boolean
  readonly sectionTitle: string
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: () => void
}

/**
 * Confirmation dialog for section deletion.
 * Displays warning message and requires explicit confirmation.
 */
export default function DeleteSectionDialog(props: DeleteSectionDialogProps) {
  const { open, sectionTitle, onOpenChange, onConfirm } = props

  const handleConfirm = (): void => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = (): void => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            确认删除区块
          </DialogTitle>
          <DialogDescription className="text-left pt-4">
            <p className="mb-2">
              确定要删除 <strong className="text-foreground">"{sectionTitle}"</strong> 区块吗？
            </p>
            <p className="text-sm text-muted-foreground">
              此操作将删除该区块内的所有内容，且无法撤销。
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
          >
            确定删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
