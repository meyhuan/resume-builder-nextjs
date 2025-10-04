import { useState, useRef, useEffect } from 'react';
import type { ReactElement } from 'react';
import InlineEditor from '@/editor/inline-editor';
import { useAppStore } from '@/state/store';
import type { ExperienceBlock } from '@/entities/blocks/experience-block';
import { CONTENT_DISPLAY_STYLES_XS, CONTENT_EDITING_STYLES_XS } from '@/editor/editor-styles';
/**
 * Renders a single ExperienceBlock with inline editing for all fields.
 */
export interface ExperienceBlockViewProps {
  readonly block: ExperienceBlock;
  readonly themeColor?: string;
}

export default function ExperienceBlockView(props: ExperienceBlockViewProps): ReactElement {
  const { block } = props;
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingField, setEditingField] = useState<'company' | 'position' | 'industry' | 'startDate' | 'endDate' | null>(null);
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
        if (foundBlock && foundBlock.type === 'experience') {
          foundBlock.contentHtml = html;
          break;
        }
      }
    });
  }

  function startEditing(field: 'company' | 'position' | 'industry' | 'startDate' | 'endDate'): void {
    setEditingField(field);
    setTempValue(block[field] || '');
  }

  function saveField(): void {
    if (!editingField) return;
    setResume((draft) => {
      for (const section of draft.sections) {
        const foundBlock = section.blocks.find((b) => b.id === block.id);
        if (foundBlock && foundBlock.type === 'experience') {
          if (editingField === 'company') {
            foundBlock.company = tempValue || '未命名公司';
          } else if (editingField === 'position') {
            foundBlock.position = tempValue || '职位名称';
          } else if (editingField === 'industry') {
            foundBlock.industry = tempValue || undefined;
          } else if (editingField === 'startDate') {
            foundBlock.startDate = tempValue || '开始';
          } else if (editingField === 'endDate') {
            foundBlock.endDate = tempValue || '至今';
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
        <div className="flex items-center gap-1 font-bold shrink-0" style={{ fontSize: '0.875em' }}>
          {editingField === 'startDate' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e): void => setTempValue(e.target.value)}
              onBlur={saveField}
              onKeyDown={handleKeyDown}
              className="px-1 py-0.5 border border-blue-500 rounded outline-none w-20"
              placeholder="2020.09"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5"
              onClick={(): void => startEditing('startDate')}
              title="点击编辑开始时间"
            >
              {block.startDate || '开始'}
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
              className="px-1 py-0.5 border border-blue-500 rounded outline-none w-20"
              placeholder="至今"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5"
              onClick={(): void => startEditing('endDate')}
              title="点击编辑结束时间"
            >
              {block.endDate || '至今'}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 text-right">
          {editingField === 'company' ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e): void => setTempValue(e.target.value)}
              onBlur={saveField}
              onKeyDown={handleKeyDown}
              className="px-1 py-0.5 border border-blue-500 rounded outline-none w-full font-bold text-right"
              placeholder="公司名称"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5 font-bold"
              style={{ fontSize: '0.875em' }}
              onClick={(): void => startEditing('company')}
              title="点击编辑公司"
            >
              {block.company || '公司名称'}
            </span>
          )}
        </div>
      </div>

      <div className="text-gray-600 mb-2 flex items-center gap-1" style={{ fontSize: '0.75em' }}>
        {editingField === 'position' ? (
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e): void => setTempValue(e.target.value)}
            onBlur={saveField}
            onKeyDown={handleKeyDown}
            className="px-1 py-0.5 border border-blue-500 rounded outline-none flex-1"
            placeholder="职位名称"
          />
        ) : (
          <span
            className="cursor-pointer hover:underline rounded px-1 py-0.5"
            onClick={(): void => startEditing('position')}
            title="点击编辑职位"
          >
            {block.position || '职位名称'}
          </span>
        )}
        
        {(block.industry || editingField === 'industry') ? (
          <>
            <span>|</span>
            {editingField === 'industry' ? (
              <input
                ref={inputRef}
                type="text"
                value={tempValue}
                onChange={(e): void => setTempValue(e.target.value)}
                onBlur={saveField}
                onKeyDown={handleKeyDown}
                className="px-1 py-0.5 border border-blue-500 rounded outline-none flex-1"
                placeholder="行业"
              />
            ) : (
              <span
                className="cursor-pointer hover:underline rounded px-1 py-0.5"
                onClick={(): void => startEditing('industry')}
                title="点击编辑行业"
              >
                {block.industry}
              </span>
            )}
          </>
        ) : null}
      </div>

      {block.contentHtml ? (
        isEditingContent ? (
          <div className={CONTENT_EDITING_STYLES_XS}>
            <InlineEditor
              initialHtml={block.contentHtml}
              onChange={handleContentChange}
              onClickOutside={(): void => setIsEditingContent(false)}
              floatingToolbar={true}
              className="leading-relaxed outline-none"
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
