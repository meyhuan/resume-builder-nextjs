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
            Delete Section
          </DialogTitle>
          <DialogDescription className="text-left pt-4">
            <p className="mb-2">
              Are you sure you want to delete the <strong className="text-foreground">"{sectionTitle}"</strong> section?
            </p>
            <p className="text-sm text-muted-foreground">
              This will delete all content in this section and cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
