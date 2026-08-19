'use client';

import type { ReactElement } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Upload,
  FileSearch,
  Languages,
  ClipboardList,
  SpellCheck,
  Palette,
  LayoutList,
  Sparkles,
  Save,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEditorUiStore } from '@/state/editor-ui-store';

export interface EditorHeaderProps {
  readonly title: string;
  readonly isSaving: boolean;
  readonly hasUnsavedChanges: boolean;
  readonly lastSaved: Date | null;
  readonly onBack: () => void;
  readonly onSave: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onExport: () => void;
  readonly isExporting: boolean;
  readonly exportQuotaLabel?: string;
  readonly sectionsOpen: boolean;
  readonly onToggleSections: () => void;
  readonly themeOpen: boolean;
  readonly onToggleTheme: () => void;
}

export default function EditorHeader(props: EditorHeaderProps): ReactElement {
  const openModal = useEditorUiStore((state) => state.openModal);
  const showAiChat = useEditorUiStore((state) => state.showAiChat);
  const toggleAiChat = useEditorUiStore((state) => state.toggleAiChat);
  const saveLabel = props.isSaving
    ? '保存中'
    : props.hasUnsavedChanges
      ? '未保存'
      : props.lastSaved
        ? '已自动保存'
        : '';

  return (
    <header className="z-50 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 sm:px-3 print:hidden">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={props.onBack}
          className="h-8 w-8 shrink-0 text-slate-600"
          aria-label="返回"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <span className="min-w-0 max-w-[8rem] truncate text-sm font-medium text-slate-900 sm:max-w-48">
          {props.title || '未命名简历'}
        </span>
        {saveLabel ? (
          <span className="hidden text-xs text-slate-400 sm:inline">{saveLabel}</span>
        ) : null}
        {props.hasUnsavedChanges && !props.isSaving ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onSave}
            className="h-7 gap-1 px-2 text-violet-600 hover:bg-violet-50 hover:text-violet-700"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="text-xs">保存</span>
          </Button>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={props.onUndo}
          disabled={!props.canUndo}
          className="h-8 w-8"
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={props.onRedo}
          disabled={!props.canRedo}
          className="h-8 w-8"
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        <div className="hidden items-center gap-1 md:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('jd-analysis')}
            className="h-8"
            title="岗位匹配"
          >
            <FileSearch className="h-4 w-4" />
            <span className="ml-1 hidden text-xs sm:inline">岗位匹配</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('grammar-check')}
            className="h-8"
            title="语法检查"
          >
            <SpellCheck className="h-4 w-4" />
            <span className="ml-1 hidden text-xs sm:inline">语法检查</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('translate')}
            className="h-8"
            title="翻译"
          >
            <Languages className="h-4 w-4" />
            <span className="ml-1 hidden text-xs sm:inline">翻译</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal('interview-prep')}
            className="h-8"
            title="面试准备"
          >
            <ClipboardList className="h-4 w-4" />
            <span className="ml-1 hidden text-xs sm:inline">面试准备</span>
          </Button>
        </div>

        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openModal('jd-analysis')}>
                <FileSearch className="mr-2 h-4 w-4" />
                岗位匹配
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('grammar-check')}>
                <SpellCheck className="mr-2 h-4 w-4" />
                语法检查
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('translate')}>
                <Languages className="mr-2 h-4 w-4" />
                翻译
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal('interview-prep')}>
                <ClipboardList className="mr-2 h-4 w-4" />
                面试准备
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleAiChat}>
                <Sparkles className="mr-2 h-4 w-4" />
                AI 助手
              </DropdownMenuItem>
              <DropdownMenuItem onClick={props.onExport}>
                <Upload className="mr-2 h-4 w-4" />
                导出
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <Button
          variant={showAiChat ? 'secondary' : 'ghost'}
          size="icon"
          onClick={toggleAiChat}
          className={`h-8 w-8 cursor-pointer rounded-full sm:w-auto sm:px-3 ${
            showAiChat
              ? 'bg-violet-100 text-violet-700 hover:bg-violet-100'
              : 'text-violet-600 hover:bg-violet-50 hover:text-violet-700'
          }`}
          title="AI 助手"
        >
          <Sparkles className="h-4 w-4" />
          <span className="ml-1 hidden text-xs sm:inline">AI 助手</span>
        </Button>
        <Button
          variant={props.sectionsOpen ? 'secondary' : 'ghost'}
          size="icon"
          data-editor-panel="sections"
          onClick={props.onToggleSections}
          className="h-8 w-8 cursor-pointer rounded-full sm:w-auto sm:px-3"
          title="模块管理"
        >
          <LayoutList className="h-4 w-4" />
          <span className="ml-1 hidden text-xs sm:inline">模块管理</span>
        </Button>
        <Button
          variant={props.themeOpen ? 'secondary' : 'ghost'}
          size="icon"
          onClick={props.onToggleTheme}
          className="h-8 w-8 cursor-pointer rounded-full sm:w-auto sm:px-3"
          title="主题"
        >
          <Palette className="h-4 w-4" />
          <span className="ml-1 hidden text-xs sm:inline">主题</span>
        </Button>
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onExport}
          disabled={props.isExporting}
          className="h-8"
          title="导出"
        >
          {props.isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span className="ml-1 hidden text-xs sm:inline">导出</span>
          {props.exportQuotaLabel ? (
            <span className="ml-1 text-[10px] text-slate-400">{props.exportQuotaLabel}</span>
          ) : null}
        </Button>
      </div>
    </header>
  );
}
