import { useState, useRef, useEffect } from 'react';
import type { ReactElement } from 'react';
import InlineEditor from '@/editor/inline-editor';
import { useAppStore } from '@/state/store';
import type { CampusBlock } from '@/entities/blocks/campus-block';
import { CONTENT_DISPLAY_STYLES_XS, CONTENT_EDITING_STYLES_XS } from '@/editor/editor-styles';

/**
 * Renders a single CampusBlock with inline editing for all fields.
 */
export interface CampusBlockViewProps {
  readonly block: CampusBlock;
  readonly themeColor?: string;
}

export default function CampusBlockView(props: CampusBlockViewProps): ReactElement {
  const { block } = props;
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingField, setEditingField] = useState<'organization' | 'position' | 'startDate' | 'endDate' | null>(null);
  const [tempValue, setTempValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const setResume = useAppStore((s) => s.setResume);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

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

  function startEditing(field: 'organization' | 'position' | 'startDate' | 'endDate'): void {
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
            foundBlock.organization = tempValue || '社团/活动名称';
          } else if (editingField === 'position') {
            foundBlock.position = tempValue || '职位';
          } else if (editingField === 'startDate') {
            foundBlock.startDate = tempValue || '开始';
          } else if (editingField === 'endDate') {
            foundBlock.endDate = tempValue || '结束';
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
          {editingField === 'startDate' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e): void => setTempValue(e.target.value)}
              onBlur={saveField}
              onKeyDown={handleKeyDown}
              className="px-1 py-0.5 border border-blue-500 rounded outline-none w-20 text-sm"
              placeholder="2020.09"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5"
              onClick={(): void => startEditing('startDate')}
              title="点击编辑开始时间"
            >
              {block.startDate || '开始时间'}
            </span>
          )}
          
          <span>-</span>
          
          {editingField === 'endDate' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e): void => setTempValue(e.target.value)}
              onBlur={saveField}
              onKeyDown={handleKeyDown}
              className="px-1 py-0.5 border border-blue-500 rounded outline-none w-20 text-sm"
              placeholder="2024.06"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5"
              onClick={(): void => startEditing('endDate')}
              title="点击编辑结束时间"
            >
              {block.endDate || '结束时间'}
            </span>
          )}
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
              placeholder="社团/活动名称"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5 font-bold text-sm"
              onClick={(): void => startEditing('organization')}
              title="点击编辑社团/活动名称"
            >
              {block.organization || '社团/活动名称'}
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
            placeholder="职位"
          />
        ) : (
          <span
            className="cursor-pointer hover:underline rounded px-1 py-0.5"
            onClick={(): void => startEditing('position')}
            title="点击编辑职位"
          >
            {block.position || '职位'}
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
              className="text-xs leading-relaxed outline-none"
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
