'use client';

import { useState } from 'react';
import { MoreVertical, Edit2, Copy, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResumeCardActionsProps {
  resumeId: string;
  currentTitle: string;
  onRename: (id: string, newTitle: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<string>;
  onDelete: (id: string) => Promise<void>;
}

export function ResumeCardActions({
  resumeId,
  currentTitle,
  onRename,
  onDuplicate,
  onDelete,
}: ResumeCardActionsProps) {
  // State for Rename Dialog
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [isRenaming, setIsRenaming] = useState(false);
  
  // State for Delete Dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for Duplicating
  const [isDuplicating, setIsDuplicating] = useState(false);

  const handleRenameSubmit = async () => {
    if (!newTitle.trim()) {
      toast.error('简历名称不能为空');
      return;
    }
    
    setIsRenaming(true);
    try {
      await onRename(resumeId, newTitle.trim());
      toast.success('重命名成功');
      setIsRenameOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('重命名失败，请稍后重试');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      await onDuplicate(resumeId);
      toast.success('已创建副本');
      // router.push(`/editor/${newId}`); // Optional: redirect to new editor or just stay on dashboard
    } catch (error) {
      console.error(error);
      toast.error('复制简历失败');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setIsDeleting(true);
    try {
      await onDelete(resumeId);
      toast.success('简历已删除');
      setIsDeleteOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('删除简历失败');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
            disabled={isDuplicating || isDeleting || isRenaming}
          >
            {isDuplicating || isDeleting || isRenaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
            <span className="sr-only">更多选项</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 rounded-xl">
          <DropdownMenuItem 
            onSelect={() => setIsRenameOpen(true)}
            className="cursor-pointer gap-2 py-2"
          >
            <Edit2 className="h-4 w-4 text-slate-500" />
            <span>重命名</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onSelect={() => handleDuplicate()}
            className="cursor-pointer gap-2 py-2"
          >
            <Copy className="h-4 w-4 text-slate-500" />
            <span>复制副本</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onSelect={() => setIsDeleteOpen(true)}
            className="cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>删除简历</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>重命名简历</DialogTitle>
            <DialogDescription>
              请输入新的简历名称。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="例如：2026产品经理秋招"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRenameSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)} disabled={isRenaming}>
              取消
            </Button>
            <Button onClick={handleRenameSubmit} disabled={isRenaming} className="bg-violet-600 hover:bg-violet-700 text-white">
              {isRenaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              确认删除
            </DialogTitle>
            <DialogDescription className="pt-2">
              你确定要删除简历 <strong>{currentTitle}</strong> 吗？
              <br/>此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              取消
            </Button>
            <Button onClick={handleDeleteSubmit} disabled={isDeleting} variant="destructive" className="bg-rose-500 hover:bg-rose-600">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
