import { useState, useRef, useEffect } from 'react';
import type { ReactElement, KeyboardEvent } from 'react';
import InlineEditor from '@/editor/inline-editor';
import { useAppStore } from '@/state/store';
import type { EducationBlock } from '@/entities/blocks/education-block';
import { CONTENT_DISPLAY_STYLES_XS, CONTENT_EDITING_STYLES_XS } from '@/editor/editor-styles';
import EditableDateField from '@/editor/editable-date-field';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { SCHOOL_OPTIONS, MAJOR_OPTIONS } from '@/data/dictionaries/education';

/**
 * Renders a single EducationBlock with structured layout and inline editing.
 */
export interface EducationBlockViewProps {
  readonly block: EducationBlock;
  readonly themeColor?: string;
  readonly onEditingChange?: (isEditing: boolean) => void;
}

export default function EducationBlockView(props: EducationBlockViewProps): ReactElement {
  const { block, onEditingChange } = props;
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editingField, setEditingField] = useState<'school' | 'major' | 'degree' | null>(null);
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
        if (foundBlock && foundBlock.type === 'education') {
          foundBlock.courseHtml = html;
          break;
        }
      }
    });
  }

  function startEditing(field: 'school' | 'major' | 'degree'): void {
    setEditingField(field);
    setTempValue(block[field] || '');
  }

  function saveField(): void {
    if (!editingField) return;
    setResume((draft) => {
      for (const section of draft.sections) {
        const foundBlock = section.blocks.find((b) => b.id === block.id);
        if (foundBlock && foundBlock.type === 'education') {
          if (editingField === 'school') {
            foundBlock.school = tempValue || '未命名学校';
          } else if (editingField === 'major') {
            foundBlock.major = tempValue || undefined;
          } else if (editingField === 'degree') {
            foundBlock.degree = tempValue || undefined;
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
    e.stopPropagation();
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      saveField();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-1 text-sm font-bold flex-1 min-w-0">
          {editingField === 'school' ? (
            <AutocompleteInput
              ref={inputRef}
              type="text"
              value={tempValue}
              onValueChange={setTempValue}
              options={SCHOOL_OPTIONS} listLabel="学校建议" minPopupWidth={280}
              onBlur={saveField}
              onKeyDown={handleKeyDown}
              className="h-auto px-1 py-0.5 border border-primary rounded outline-none text-[inherit] md:text-[inherit]"
              placeholder="学校名称"
            />
          ) : (
            <span
              className="cursor-pointer hover:underline rounded px-1 py-0.5"
              onClick={(): void => startEditing('school')}
              title="点击编辑学校"
            >
              {block.school || '点击输入学校'}
            </span>
          )}
          
          {(block.major || editingField === 'major') ? (
            <>
              <span className="text-gray-400">·</span>
              {editingField === 'major' ? (
                <AutocompleteInput
                  ref={inputRef}
                  type="text"
                  value={tempValue}
                  onValueChange={setTempValue}
                  options={MAJOR_OPTIONS} listLabel="专业建议" minPopupWidth={280}
                  onBlur={saveField}
                  onKeyDown={handleKeyDown}
                  className="h-auto px-1 py-0.5 border border-primary rounded outline-none text-[inherit] md:text-[inherit]"
                  placeholder="专业"
                />
              ) : (
                <span
                  className="cursor-pointer hover:underline rounded px-1 py-0.5"
                  onClick={(): void => startEditing('major')}
                  title="点击编辑专业"
                >
                  {block.major}
                </span>
              )}
            </>
          ) : null}
          
          {(block.degree || editingField === 'degree') ? (
            <>
              <span className="text-gray-400">·</span>
              {editingField === 'degree' ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={tempValue}
                  onChange={(e): void => setTempValue(e.target.value)}
                  onBlur={saveField}
                  onKeyDown={handleKeyDown}
                  className="px-1 py-0.5 border border-blue-500 rounded outline-none w-20"
                  placeholder="学历"
                />
              ) : (
                <span
                  className="cursor-pointer hover:underline rounded px-1 py-0.5"
                  onClick={(): void => startEditing('degree')}
                  title="点击编辑学历"
                >
                  {block.degree}
                </span>
              )}
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-600 shrink-0">
          <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
          <span>-</span>
          <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
        </div>
      </div>
      {block.courseHtml ? (
        isEditingContent ? (
          <div className={CONTENT_EDITING_STYLES_XS}>
            <InlineEditor
              initialHtml={block.courseHtml}
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
            dangerouslySetInnerHTML={{ __html: block.courseHtml }}
          />
        )
      ) : null}
    </div>
  );
}
