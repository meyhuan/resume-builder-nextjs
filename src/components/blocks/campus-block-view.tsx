import { useState, useRef, useEffect } from 'react';
import type { ReactElement, KeyboardEvent } from 'react';
import InlineEditor from '@/editor/inline-editor';
import { useAppStore } from '@/state/store';
import type { CampusBlock } from '@/entities/blocks/campus-block';
import { CONTENT_DISPLAY_STYLES_XS, CONTENT_EDITING_STYLES_XS } from '@/editor/editor-styles';
import EditableDateField from '@/editor/editable-date-field';

/**
 * Renders a single CampusBlock with inline editing for all fields.
 */
export interface CampusBlockViewProps {
  readonly block: CampusBlock;
  readonly themeColor?: string;
  readonly onEditingChange?: (isEditing: boolean) => void;
}

export default function CampusBlockView(props: CampusBlockViewProps): ReactElement {
  const { block, onEditingChange } = props;
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingField, setEditingField] = useState<'organization' | 'position' | null>(null);
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
        if (foundBlock && foundBlock.type === 'campus') {
          foundBlock.contentHtml = html;
          break;
        }
      }
    });
  }

  function startEditing(field: 'organization' | 'position'): void {
    setEditingField(field);
    setTempValue(block[field] || '');
  }

  function saveField(): void {
    if (!editingField) return;
    setResume((draft) => {
      for (const section of draft.sections) {
        const foundBlock = section.blocks.find((b) => b.id === block.id);
        if (foundBlock && foundBlock.type === 'campus') {
          if (editingField === 'organization') {
            foundBlock.organization = tempValue || 'Organization Name';
          } else if (editingField === 'position') {
            foundBlock.position = tempValue || 'Role';
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
        <div className="flex items-center gap-1 text-sm font-bold shrink-0">
          <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
          <span>-</span>
          <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
        </div>

        <div className="flex-1 min-w-0 text-right">
          {editingField === 'organization' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e): void => setTempValue(e.target.value)}
              onBlur={saveField}
              onKeyDown={handleKeyDown}
              className="px-1 py-0.5 border border-blue-500 rounded outline-none w-full text-sm font-bold text-right"
              placeholder="Organization Name"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5 font-bold text-sm"
              onClick={(): void => startEditing('organization')}
              title="Click to edit organization"
            >
              {block.organization || 'Organization Name'}
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-600 mb-2">
        {editingField === 'position' ? (
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e): void => setTempValue(e.target.value)}
            onBlur={saveField}
            onKeyDown={handleKeyDown}
            className="px-1 py-0.5 border border-blue-500 rounded outline-none w-full"
            placeholder="Role"
          />
        ) : (
          <span
            className="cursor-pointer hover:underline rounded px-1 py-0.5"
            onClick={(): void => startEditing('position')}
            title="Click to edit role"
          >
            {block.position || 'Role'}
          </span>
        )}
      </div>

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
