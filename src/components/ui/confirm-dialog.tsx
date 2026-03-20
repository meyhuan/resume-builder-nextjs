import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ConfirmDialogVariant = 'default' | 'destructive' | 'warning'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  discardText?: string
  variant?: ConfirmDialogVariant
  onConfirm: () => void
  onCancel?: () => void
  onDiscard?: () => void
  loading?: boolean
}

/**
 * Generic confirmation dialog component
 * @example
 * <ConfirmDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   title="Confirm Delete"
 *   description="This cannot be undone. Are you sure?"
 *   confirmText="Delete"
 *   cancelText="Cancel"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  discardText = 'Discard changes',
  variant = 'default',
  onConfirm,
  onCancel,
  onDiscard,
  loading = false,
}: ConfirmDialogProps): React.ReactElement {
  const handleCancel = (): void => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleConfirm = (): void => {
    onConfirm()
  }

  const handleDiscard = (): void => {
    onDiscard?.()
    onOpenChange(false)
  }

  const getConfirmButtonVariant = (): 'default' | 'destructive' | 'outline' => {
    switch (variant) {
      case 'destructive':
        return 'destructive'
      case 'warning':
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 sm:justify-between w-full">
          {onDiscard ? (
            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 sm:px-4" onClick={handleDiscard} disabled={loading}>
              {discardText}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              {cancelText}
            </Button>
            <Button
              variant={getConfirmButtonVariant()}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
