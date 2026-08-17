'use client';

import type { ReactElement } from 'react';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AiOptimizePanel from '@/ui/ai-optimize-panel';
import { useEditorUiStore } from '@/state/editor-ui-store';

export function OptimizeDialog(): ReactElement {
  const open = useEditorUiStore((state) => state.activeModal === 'optimize');
  const closeModal = useEditorUiStore((state) => state.closeModal);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) closeModal(); }}>
      <DialogContent className="flex h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pb-2 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            一键优化
          </DialogTitle>
          <DialogDescription>根据目标岗位批量优化简历表述，确认后再写入。</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden h-full">
          <AiOptimizePanel />
        </div>
      </DialogContent>
    </Dialog>
  );
}
