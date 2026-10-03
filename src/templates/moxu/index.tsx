"use client";

import { SectionTitleText } from '@/components/sections/section-title-text'
import {
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import type { ResumeBlock } from "@/entities/blocks/resume-block";
import type { Section } from "@/entities/resume/section";
import type { ThemeTokens } from "@/entities/theme/theme-tokens";
import { getHeaderJobIntentionText } from "@/entities/resume/header-job-intention";
import { getSectionIcon } from "@/utils/get-section-icon";
import { useAppStore } from "@/state/store";
import { useAiSection } from "@/components/ai-section/ai-section-provider";
import {
  blockTypeToModuleType,
  extractBlockContentHtml,
} from "@/components/ai-section/block-module-utils";
import BlockWrapper from "@/components/blocks/block-wrapper";
import { BlockRenderer } from "@/templates/components/v2";
import EditableFieldWrapper from "@/editor/editable-field-wrapper";
import EditableDateField from "@/editor/editable-date-field";
import {
  AvatarSlot,
  BlockList,
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  ResumeFrame,
  SortableSection,
  mmToPx,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from "@/templates/_core";
import type {
  DragHandleProps,
  EditableJobIntention,
  JobIntentionFieldDef,
  TemplateProps,
} from "@/templates/_core";

/** Reference: Canva DAHVmV6BaSE. Only decorative shapes are positioned absolutely. */
export default function MoxuTemplate({
  resume,
  theme,
}: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null);
  const job = useEditableJobIntention(resume.jobIntention);
  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0;
  const subtitle = getHeaderJobIntentionText(resume);
  const accent = theme.primaryColor || "#242424";
  const english = resume.language?.startsWith("en") ?? false;
  const extras = job.fields.filter(
    (field) =>
      !(subtitle && field.key === "position" && field.value === subtitle),
  );
  const style = {
    position: "relative",
    minHeight: "297mm",
    background: "#fff",
    // Keep Latin glyphs proportional when the Chinese serif fallback is SimSun.
    fontFamily: english
      ? `${theme.fontFamilyId === "serif" ? '"Times New Roman", Georgia' : "Arial"} , ${theme.fontFamily}`
      : theme.fontFamily,
    fontSize: `${theme.fontSize * (english ? 0.94 : 1)}px`,
    "--moxu-accent": accent,
    "--moxu-title-gap": `${theme.spacingScale * (english ? 6 : 10)}px`,
    "--moxu-spacing": `${theme.spacingScale}`,
    "--moxu-line-height": `${theme.lineHeight * (english ? 0.85 : 1)}`,
    "--moxu-print-padding": `${theme.pagePaddingVertical}mm`,
  } as CSSProperties;
  return (
    <ResumeFrame
      resume={resume}
      theme={theme}
      className="moxu-resume"
      style={style}
    >
      <style>{`

        .moxu-content { position:relative; overflow-wrap:anywhere; }
        .moxu-heading { position:relative; display:flex; align-items:center; gap:12px; break-after:avoid; }
        .moxu-rule { display:none; }
        .moxu-section-icon { position:absolute; left:-46px; top:0; width:34px; height:34px; display:grid; place-items:center; border-radius:50%; background:var(--moxu-accent); color:white; }
        .moxu-section-icon svg { width:22px; height:22px; }
        .moxu-heading h2::after { content:""; display:block; width:64px; border-bottom:1px solid currentColor; margin-top:5px; }
        .moxu-section { margin-left:18px; padding-left:28px; border-left:1px solid var(--moxu-accent); }
        .moxu-contact { background:#171717; color:#fff; padding:16px 18px; min-width:0; }
        .moxu-contact * { color:inherit; }
        .moxu-rich, .moxu-rich p, .moxu-rich li { line-height:var(--moxu-line-height); }
        .moxu-rich p { margin:0; }
        .moxu-rich ul, .moxu-rich ol { margin:0; padding-left:1.6em; }
        .moxu-rich li { margin:0; }

        .moxu-meta { display:flex; flex-wrap:wrap; align-items:baseline; gap:3px 12px; break-inside:avoid; break-after:avoid; font-size:1.05em; font-weight:700; margin-bottom:calc(5px * var(--moxu-spacing)); }
        .moxu-meta > * { min-width:0; overflow-wrap:anywhere; text-align:left !important; }
        .moxu-date { display:flex; flex-wrap:wrap; align-items:baseline; gap:2px; }
        .moxu-resume [data-resume-block] { break-inside:auto; }
        @media print {
          .moxu-resume { min-height:calc(297mm - 2 * var(--moxu-print-padding) - 2px) !important; overflow:visible !important; }
          .moxu-content { padding-bottom:0 !important; }
          .moxu-resume p, .moxu-resume li { orphans:2; widows:2; }
        }
      `}</style>
      <div
        className="moxu-content"
        data-template-padding-probe="true"
        style={{
          padding: `${mmToPx(theme.pagePaddingVertical) * 0.45}px ${mmToPx(theme.pagePaddingHorizontal) * 0.7}px ${mmToPx(theme.pagePaddingVertical)}px`,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            background: "#eef0ef",
            padding: "18px 20px",
            breakInside: "avoid",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <EditableText
              as="h1"
              value={header.name}
              onCommit={header.onCommitName}
              style={{
                fontSize: "3em",
                fontWeight: 700,
                lineHeight: 0.98,
                margin: 0,
                textTransform: "uppercase",
                overflowWrap: "anywhere",
              }}
            />
            {showJob && subtitle && (
              <div
                data-template-job-intention-trigger="true"
                data-template-job-intention-layout="header"
                role="button"
                tabIndex={0}
                onClick={job.openEditModal}
                onKeyDown={(event) => {
                  if (event.key === "Enter") job.openEditModal();
                }}
                style={{
                  marginTop: 10,
                  fontSize: "1.12em",
                  lineHeight: 1.2,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          <div
            className="moxu-contact"
            data-template-base-info-trigger="true"
            role="button"
            tabIndex={0}
            onClick={header.openEditModal}
            onKeyDown={(event) => {
              if (event.key === "Enter") header.openEditModal();
            }}
            style={{ width: "42%", fontSize: "0.9em", cursor: "pointer" }}
          >
            {header.fields.map((field) => (
              <FieldChip
                key={field.key}
                field={field}
                header={header}
                className="max-w-full"
                style={{ display: "block", overflowWrap: "anywhere" }}
              >
                <span>
                  <strong>{field.label}: </strong>
                  {field.value}
                </span>
              </FieldChip>
            ))}
            {header.fields.length === 0 && <span>＋</span>}
          </div>
          <AvatarSlot
            header={header}
            style={{ flexShrink: 0, width: 88, height: 110 }}
          />
        </header>
        {showJob && extras.length > 0 && (
          <div
            data-template-job-intention-trigger="true"
            className="group/job"
            onClick={job.openEditModal}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px 20px",
              marginTop: 16 * theme.spacingScale,
              cursor: "pointer",
            }}
          >
            {extras.map((field) => (
              <JobField key={field.key} field={field} job={job} />
            ))}
          </div>
        )}
        <main
          style={{
            marginTop:
              (showJob && extras.length > 0 ? 18 : 22) * theme.spacingScale,
          }}
        >
          {resume.sections.map((section, index) => (
            <div
              key={section.id}
              style={{
                marginBottom:
                  index < resume.sections.length - 1
                    ? (english ? 12 : 18) * theme.spacingScale
                    : 0,
              }}
            >
              <SortableSection sectionId={section.id}>
                {(drag) => (
                  <MoxuSection section={section} drag={drag} theme={theme} />
                )}
              </SortableSection>
            </div>
          ))}
        </main>
      </div>
      {header.modals}
      {job.modals}
    </ResumeFrame>
  );
}

function JobField({
  field,
  job,
}: {
  field: JobIntentionFieldDef;
  job: EditableJobIntention;
}): ReactElement {
  return (
    <span
      className="relative"
      onMouseEnter={() => job.setHoveredField(field.key)}
      onMouseLeave={() => job.setHoveredField(null)}
      style={{ maxWidth: "100%", overflowWrap: "anywhere" }}
    >
      {field.label}：{field.value}
      {job.hoveredField === field.key && (
        <button
          type="button"
          aria-label={`删除 ${field.label}`}
          className="absolute -right-3 -top-2 rounded-full bg-white text-red-500 print:hidden"
          onClick={(event) => {
            event.stopPropagation();
            job.deleteField(field.key);
          }}
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}

function MoxuSection({
  section,
  drag,
  theme,
}: {
  section: Section;
  drag: DragHandleProps;
  theme: ThemeTokens;
}): ReactElement {
  const edit = useEditableSection(section);
  const attachDragHandle = (element: HTMLButtonElement | null): void => {
    drag.ref(element);
  };
  const dragAttributes = drag.attributes as Record<string, unknown>;
  const dragListeners = drag.listeners as Record<string, unknown>;
  return (
    <section
      className="moxu-section relative group/section"
      data-template-section="true"
      data-template-section-title={section.title}
      onMouseEnter={() => edit.setHovered(true)}
      onMouseLeave={() => edit.setHovered(false)}
    >
      <div
        className="moxu-heading"
        style={{ marginBottom: "var(--moxu-title-gap)" }}
      >
        <span className="moxu-section-icon" aria-hidden>
          {getSectionIcon(section.title)}
        </span>
        <SectionTitleText
          as="h2"
          value={edit.displayTitle}
          onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: `${1.22 * (theme.titleScale ?? 1)}em`,
            lineHeight: 1.35,
          }}
        />
        <span className="moxu-rule" aria-hidden />
      </div>
      {edit.canEditTitle && <div
        data-resume-section-actions="true" data-export-hide="true" data-visible={edit.isHovered || undefined}
        className="absolute right-0 top-0 flex gap-1 rounded border bg-white p-1 shadow-sm print:hidden"
      >
        <button
          type="button"
          title="拖动"
          ref={attachDragHandle}
          {...dragAttributes}
          {...dragListeners}
        >
          <GripVertical size={16} />
        </button>
        {!edit.isTextOnly && (
          <button type="button" title="添加" onClick={edit.onAddBlock}>
            <Plus size={16} />
          </button>
        )}
        <button type="button" title="删除" onClick={edit.onRequestDelete}>
          <Trash2 size={16} />
        </button>
      </div>}
      <BlockList
        section={edit}
        themeColor={theme.primaryColor}
        spacingScale={theme.spacingScale}
        renderBlock={({ block, index, total }) => (
          <MoxuBlock
            block={block}
            sectionId={section.id}
            index={index}
            total={total}
            theme={theme}
          />
        )}
      />
      <DeleteSectionDialog
        open={edit.isDeleteDialogOpen}
        sectionTitle={edit.displayTitle}
        onOpenChange={edit.setDeleteDialogOpen}
        onConfirm={edit.confirmDelete}
      />
    </section>
  );
}

function MoxuBlock({
  block,
  sectionId,
  index,
  total,
  theme,
}: {
  block: ResumeBlock;
  sectionId: string;
  index: number;
  total: number;
  theme: ThemeTokens;
}): ReactElement {
  const add = useAppStore((s) => s.addBlockByType);
  const remove = useAppStore((s) => s.deleteBlock);
  const up = useAppStore((s) => s.moveBlockUp);
  const down = useAppStore((s) => s.moveBlockDown);
  const [editing, setEditing] = useState(false);
  const ai = useAiSection();
  const moduleType = blockTypeToModuleType(block.type);
  return (
    <div
      data-template-body-text="true"
      style={{
        marginBottom: index < total - 1 ? 12 * theme.spacingScale : 0,
        lineHeight: theme.lineHeight,
      }}
    >
      <BlockWrapper
        flush
        blockType="内容"
        onAdd={block.type !== "text" ? () => add(sectionId) : undefined}
        onDelete={() => remove(sectionId, block.id)}
        onMoveUp={index > 0 ? () => up(sectionId, block.id) : undefined}
        onMoveDown={
          index < total - 1 ? () => down(sectionId, block.id) : undefined
        }
        onPolish={
          moduleType
            ? () =>
                ai.openPolish(
                  block.id,
                  extractBlockContentHtml(block),
                  moduleType,
                )
            : undefined
        }
        onGenerate={
          moduleType
            ? () => ai.openGenerate(block.id, moduleType, block)
            : undefined
        }
        showDragHandle={false}
        disableHover={editing}
      >
        <BlockRenderer
          block={block}
          themeColor={theme.primaryColor}
          onEditingChange={setEditing}
          styles={{ content: "moxu-rich", contentColor: theme.textColor }}
          slots={{
            header: () => (
              <BlockHeader block={block} onEditingChange={setEditing} />
            ),
          }}
        />
      </BlockWrapper>
    </div>
  );
}

function BlockHeader({
  block,
  onEditingChange,
}: {
  block: ResumeBlock;
  onEditingChange: (editing: boolean) => void;
}): ReactElement | null {
  if (block.type === "text" || block.type === "list") return null;
  const field = (key: string, value: string | undefined): ReactNode => (
    <EditableFieldWrapper
      blockId={block.id}
      fieldName={key}
      value={value ?? ""}
      onUpdate={() => {}}
      onEditingChange={onEditingChange}
    />
  );
  const title =
    block.type === "education"
      ? field("school", block.school)
      : block.type === "experience"
        ? field("company", block.company)
        : block.type === "project"
          ? field("name", block.name)
          : field("organization", block.organization);
  const detail =
    block.type === "education" ? (
      <>
        {field("major", block.major)}
        {block.degree && <> · {field("degree", block.degree)}</>}
      </>
    ) : block.type === "project" ? (
      field("role", block.role)
    ) : (
      field("position", block.position)
    );
  return (
    <div className="moxu-meta">
      <div className="moxu-date">
        <EditableDateField
          blockId={block.id}
          fieldName="startDate"
          value={block.startDate ?? ""}
        />
        {(block.startDate || block.endDate) && <span>–</span>}
        <EditableDateField
          blockId={block.id}
          fieldName="endDate"
          value={block.endDate ?? ""}
        />
      </div>
      <div style={{ textAlign: "center" }}>{title}</div>
      <div style={{ textAlign: "right" }}>{detail}</div>
    </div>
  );
}
