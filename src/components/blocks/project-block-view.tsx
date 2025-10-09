import { useState, useRef, useEffect } from 'react';
import type { ReactElement, KeyboardEvent } from 'react';
import InlineEditor from '@/editor/inline-editor';
import { useAppStore } from '@/state/store';
import type { ProjectBlock } from '@/entities/blocks/project-block';
import { CONTENT_DISPLAY_STYLES_XS, CONTENT_EDITING_STYLES_XS } from '@/editor/editor-styles';
import EditableDateField from '@/editor/editable-date-field';

/**
 * Renders a single ProjectBlock with inline editing for all fields.
 */
export interface ProjectBlockViewProps {
  readonly block: ProjectBlock;
  readonly themeColor?: string;
  readonly onEditingChange?: (isEditing: boolean) => void;
}

export default function ProjectBlockView(props: ProjectBlockViewProps): ReactElement {
  const { block, onEditingChange } = props;
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingField, setEditingField] = useState<'name' | 'role' | null>(null);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const setResume = useAppStore((s) => s.setResume);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  useEffect(() => {
    const isEditing = isEditingContent || editingField !== null;
    onEditingChange?.(isEditing);
  }, [isEditingContent, editingField, onEditingChange]);

  function handleContentChange(html: string): void {
    setResume((draft) => {
      for (const section of draft.sections) {
        const foundBlock = section.blocks.find((b) => b.id === block.id);
        if (foundBlock && foundBlock.type === 'project') {
          foundBlock.contentHtml = html;
          break;
        }
      }
    });
  }

  function startEditing(field: 'name' | 'role'): void {
    setEditingField(field);
    setTempValue(block[field] || '');
  }

  function saveField(): void {
    if (!editingField) return;
    setResume((draft) => {
      for (const section of draft.sections) {
        const foundBlock = section.blocks.find((b) => b.id === block.id);
        if (foundBlock && foundBlock.type === 'project') {
          if (editingField === 'name') {
            foundBlock.name = tempValue || '未命名项目';
          } else if (editingField === 'role') {
            foundBlock.role = tempValue || undefined;
          }
          break;
        }
      }
    });
    setEditingField(null);
  }

  function cancelEditing(): void {
    setEditingField(null);
    setTempValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      saveField();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 gap-2">
        <div className="flex-1 min-w-0">
          {editingField === 'name' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e): void => setTempValue(e.target.value)}
              onBlur={saveField}
              onKeyDown={handleKeyDown}
              className="px-1 py-0.5 border border-blue-500 rounded outline-none w-full text-sm font-bold"
              placeholder="项目名称"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5 font-bold text-sm"
              onClick={(): void => startEditing('name')}
              title="点击编辑项目名称"
            >
              {block.name || '项目名称'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-600 shrink-0">
          <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
          <span>-</span>
          <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
        </div>
      </div>

      {(block.role || editingField === 'role') ? (
        <div className="text-xs text-gray-600 mb-2">
          {editingField === 'role' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e): void => setTempValue(e.target.value)}
              onBlur={saveField}
              onKeyDown={handleKeyDown}
              className="px-1 py-0.5 border border-blue-500 rounded outline-none w-full"
              placeholder="项目角色"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5"
              onClick={(): void => startEditing('role')}
              title="点击编辑角色"
            >
              {block.role}
            </span>
          )}
        </div>
      ) : null}

      {block.contentHtml ? (
        isEditingContent ? (
          <div className={CONTENT_EDITING_STYLES_XS}>
            <InlineEditor
              initialHtml={block.contentHtml}
              onChange={handleContentChange}
              onClickOutside={(): void => setIsEditingContent(false)}
              floatingToolbar={true}
              className="text-xs outline-none"
            />
          </div>
        ) : (
          <div
            className={CONTENT_DISPLAY_STYLES_XS}
            onClick={(): void => setIsEditingContent(true)}
            dangerouslySetInnerHTML={{ __html: block.contentHtml }}
          />
        )
      ) : null}
    </div>
  );
}
