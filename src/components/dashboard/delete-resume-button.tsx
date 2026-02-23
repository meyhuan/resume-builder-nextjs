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
        title="删除简历"
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
        title="确认删除简历"
        description="删除后无法恢复，确定要删除这份简历吗？"
        confirmText="删除"
        cancelText="取消"
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
