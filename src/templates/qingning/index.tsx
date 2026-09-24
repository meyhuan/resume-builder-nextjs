"use client";

import { SectionTitleText } from '@/components/sections/section-title-text'
import {
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { GripVertical, Plus, Trash2, User, X } from "lucide-react";
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
  lightenHex,
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

/** Reference: Canva DAHVjpxMGM0. Only decorative shapes are positioned absolutely. */
export default function QingningTemplate({
  resume,
  theme,
}: TemplateProps): ReactElement {
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null);
  const job = useEditableJobIntention(resume.jobIntention);
  const showJob = resume.jobIntentionVisible ?? job.fields.length > 0;
  const subtitle = getHeaderJobIntentionText(resume);
  const english = resume.language?.startsWith("en") ?? false;
  const accent = theme.primaryColor || "#c6e1d2";
  const extras = job.fields.filter(
    (field) =>
      !(subtitle && field.key === "position" && field.value === subtitle),
  );
  const style = {
    position: "relative",
    minHeight: "297mm",
    background: "#fff",
    "--qingning-accent": accent,
    "--qingning-soft": lightenHex(accent, 0.18),
    "--qingning-spacing": `${theme.spacingScale}`,
    "--qingning-line-height": `${theme.lineHeight}`,
    "--qingning-print-padding": `${theme.pagePaddingVertical}mm`,
  } as CSSProperties;
  return (
    <ResumeFrame
      resume={resume}
      theme={theme}
      className="qingning-resume"
      style={style}
    >
      <style>{`
        .qingning-corners { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
        .qingning-corner { position:absolute; width:150px; height:48px; border-radius:999px; background:var(--qingning-accent); transform:rotate(-43deg); }
        .qingning-corner.small { width:58px; height:27px; background:#f3e6d5; }
        .qingning-content { position:relative; overflow-wrap:anywhere; }
        .qingning-heading { display:flex; align-items:center; gap:8px; break-after:avoid; }
        .qingning-rule { flex:1; min-width:12px; border-top:2px dotted #cfaf86; margin-left:8px; }
        .qingning-section-icon { width:23px; height:23px; flex:none; display:grid; place-items:center; border-radius:50%; background:var(--qingning-accent); color:white; }
        .qingning-section-icon svg { width:16px; height:16px; }
        .qingning-rich, .qingning-rich p, .qingning-rich li { line-height:var(--qingning-line-height); }
        .qingning-rich p { margin:0; }
        .qingning-rich ul, .qingning-rich ol { margin:0; padding-left:1.6em; }
        .qingning-rich li { margin:0; }
        .qingning-meta { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr); align-items:baseline; gap:10px; break-inside:avoid; break-after:avoid; font-size:1.12em; font-weight:500; margin-bottom:calc(8px * var(--qingning-spacing)); }
        .qingning-meta > * { min-width:0; overflow-wrap:anywhere; }
        .qingning-date { display:flex; flex-wrap:wrap; align-items:baseline; gap:2px; }
        .qingning-resume [data-resume-block] { break-inside:auto; }
        @media print {
          .qingning-resume { min-height:calc(297mm - 2 * var(--qingning-print-padding) - 2px) !important; overflow:visible !important; }
          .qingning-content { padding-bottom:0 !important; }
          .qingning-resume p, .qingning-resume li { orphans:2; widows:2; }
        }
      `}</style>
      <div className="qingning-corners" aria-hidden="true">
        <i className="qingning-corner" style={{ left: -75, top: 32 }} />
        <i className="qingning-corner small" style={{ left: 3, top: 83 }} />
        <i className="qingning-corner" style={{ right: -58, bottom: 31 }} />
        <i
          className="qingning-corner small"
          style={{ right: 60, bottom: 23 }}
        />
      </div>
      <div
        className="qingning-content"
        data-template-padding-probe="true"
        style={{
          padding: `${mmToPx(theme.pagePaddingVertical) * 0.75}px ${mmToPx(theme.pagePaddingHorizontal) * 1.12}px ${mmToPx(theme.pagePaddingVertical)}px`,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 28,
            breakInside: "avoid",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: "8px 24px",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: "2.45em",
                  lineHeight: 1.25,
                  fontWeight: 700,
                }}
              >
                {english ? "RESUME" : "个人简历"}
              </h1>
              {subtitle && (
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
                    cursor: "pointer",
                    fontSize: "1.35em",
                    fontWeight: 500,
                    minWidth: 0,
                  }}
                >
                  {english ? "Target role: " : "求职意向："}
                  {subtitle}
                </div>
              )}
            </div>
            <div
              data-template-base-info-trigger="true"
              role="button"
              tabIndex={0}
              onClick={header.openEditModal}
              onKeyDown={(event) => {
                if (event.key === "Enter") header.openEditModal();
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: "10px 20px",
                marginTop: 20,
                fontSize: "0.98em",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  minWidth: 0,
                }}
              >
                <User size={16} style={{ flexShrink: 0 }} />
                <span>
                  {english ? "Name: " : "姓名："}
                  <EditableText
                    value={header.name}
                    onCommit={header.onCommitName}
                  />
                </span>
              </span>
              {header.fields.map((field) => (
                <FieldChip
                  key={field.key}
                  field={field}
                  header={header}
                  className="min-w-0 max-w-full"
                  style={{
                    alignItems: "baseline",
                    gap: 6,
                    overflowWrap: "anywhere",
                  }}
                >
                  <span
                    aria-hidden
                    style={{ flexShrink: 0, alignSelf: "center" }}
                  >
                    {field.icon}
                  </span>
                  <span>
                    {field.label}：{field.value}
                  </span>
                </FieldChip>
              ))}
            </div>
          </div>
          <AvatarSlot
            header={header}
            style={{ flexShrink: 0, width: 128, height: 145, marginTop: 5 }}
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
              (showJob && extras.length > 0 ? 30 : 40) * theme.spacingScale,
          }}
        >
          {resume.sections.map((section, index) => (
            <div
              key={section.id}
              style={{
                marginBottom:
                  index < resume.sections.length - 1
                    ? 30 * theme.spacingScale
                    : 0,
              }}
            >
              <SortableSection sectionId={section.id}>
                {(drag) => (
                  <QingningSection
                    section={section}
                    drag={drag}
                    theme={theme}
                  />
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

function QingningSection({
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
      className="relative group/section"
      data-template-section="true"
      data-template-section-title={section.title}
      onMouseEnter={() => edit.setHovered(true)}
      onMouseLeave={() => edit.setHovered(false)}
    >
      <div
        className="qingning-heading"
        style={{ marginBottom: 14 * theme.spacingScale }}
      >
        <span className="qingning-section-icon" aria-hidden>
          {getSectionIcon(section.title)}
        </span>
        <SectionTitleText
          as="h2"
          value={edit.displayTitle}
          onCommit={edit.canEditTitle ? edit.onCommitTitle : undefined}
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: `${1.3 * (theme.titleScale ?? 1)}em`,
            lineHeight: 1.35,
          }}
        />
        <span className="qingning-rule" aria-hidden />
      </div>
      <div
        className="absolute right-0 top-0 flex gap-1 rounded border bg-white p-1 shadow-sm print:hidden"
        style={{
          opacity: edit.isHovered ? 1 : 0,
          pointerEvents: edit.isHovered ? "auto" : "none",
        }}
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
      </div>
      <BlockList
        section={edit}
        themeColor={theme.primaryColor}
        spacingScale={theme.spacingScale}
        renderBlock={({ block, index, total }) => (
          <QingningBlock
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

function QingningBlock({
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
          styles={{ content: "qingning-rich", contentColor: theme.textColor }}
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
    <div className="qingning-meta">
      <div className="qingning-date">
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
