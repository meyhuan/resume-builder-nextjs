"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface DeleteResumeButtonProps {
  onDelete: () => Promise<void>
}

export function DeleteResumeButton({ onDelete }: DeleteResumeButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Delete resume"
        onClick={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Resume"
        description="This action cannot be undone. Are you sure you want to delete this resume?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={loading}
        onConfirm={async () => {
          setLoading(true)
          try {
            await onDelete()
          } catch (e) {
            console.error(e)
          } finally {
            setLoading(false)
            setOpen(false)
          }
        }}
      />
    </>
  )
}
