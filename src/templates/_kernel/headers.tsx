import type { ReactElement } from 'react'
import { cloneElement } from 'react'
import { Pencil, XCircle } from 'lucide-react'
import type { BaseInfo } from '@/entities/user/base-info'
import { buildBaseInfoFields } from './shared'
import type { BaseInfoFieldDef } from './shared'
import { KernelAvatar } from './kernel-avatar'
import { useHeaderState } from './use-header-state'
import type { HeaderState } from './use-header-state'
import type {
  HeaderSpec,
  HeaderAvatarLeftInline,
  HeaderBannerGradient,
  HeaderDarkBar,
  HeaderSidebarAvatar,
  HeaderCentered,
} from './types'

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export interface KernelHeaderProps {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly themeColor: string
  readonly spec: HeaderSpec
  /** Additional slot rendered after the info (e.g. job-intention inline row). */
  readonly afterFields?: ReactElement | null
}

/** Render any header variant from its spec. */
export function KernelHeader(props: KernelHeaderProps): ReactElement {
  const { spec } = props
  switch (spec.variant) {
    case 'avatar-left-inline':
      return <AvatarLeftInlineHeader {...props} spec={spec} />
    case 'banner-gradient':
      return <BannerGradientHeader {...props} spec={spec} />
    case 'dark-bar':
      return <DarkBarHeader {...props} spec={spec} />
    case 'sidebar-avatar':
      return <SidebarAvatarHeader {...props} spec={spec} />
    case 'centered':
      return <CenteredHeader {...props} spec={spec} />
  }
}

// ---------------------------------------------------------------------------
// Field list (inline, with delete on hover) — shared between variants
// ---------------------------------------------------------------------------

interface InlineFieldListProps {
  readonly fields: BaseInfoFieldDef[]
  readonly separator?: string
  readonly fieldsPerRow?: number
  readonly labelColor?: string
  readonly valueColor?: string
  readonly state: HeaderState
  readonly showIcons?: boolean
  readonly iconColor?: string
}

function InlineFieldList(props: InlineFieldListProps): ReactElement {
  const { fields, separator = '|', fieldsPerRow, labelColor, valueColor, state, showIcons, iconColor } = props
  if (fieldsPerRow && fieldsPerRow > 0) {
    const rows: BaseInfoFieldDef[][] = []
    for (let i = 0; i < fields.length; i += fieldsPerRow) {
      rows.push(fields.slice(i, i + fieldsPerRow))
    }
    return (
      <div className="flex flex-col gap-1.5">
        {rows.map((row, ri) => (
          <FieldRow
            key={ri}
            fields={row}
            separator={separator}
            labelColor={labelColor}
            valueColor={valueColor}
            state={state}
            showIcons={showIcons}
            iconColor={iconColor}
          />
        ))}
      </div>
    )
  }
  return (
    <FieldRow
      fields={fields}
      separator={separator}
      labelColor={labelColor}
      valueColor={valueColor}
      state={state}
      showIcons={showIcons}
      iconColor={iconColor}
    />
  )
}

function FieldRow(props: InlineFieldListProps): ReactElement {
  const { fields, separator = '|', labelColor, valueColor, state, showIcons, iconColor } = props
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {fields.map((f, i) => (
        <div
          key={f.key}
          className="relative flex items-center gap-1 group/field"
          onMouseEnter={() => state.setHoveredField(f.key)}
          onMouseLeave={() => state.setHoveredField(null)}
        >
          {showIcons && (
            <span className="shrink-0 inline-flex items-center" style={{ color: iconColor || labelColor }}>
              {cloneElement(f.icon as ReactElement<{ size?: string | number; className?: string }>, {
                size: '1em',
              })}
            </span>
          )}
          <span style={{ color: valueColor || labelColor, fontSize: '0.9em' }}>
            {f.value}
          </span>
          {i < fields.length - 1 && (
            <span className="opacity-40 mx-1" style={{ color: labelColor }}>{separator}</span>
          )}
          {state.hoveredField === f.key && (
            <button
              type="button"
              className="absolute -right-2 -top-2 print:hidden text-red-400 hover:text-red-600 transition-colors bg-white rounded-full z-10"
              onClick={(e) => { e.stopPropagation(); state.deleteField(f.key) }}
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant: avatar-left-inline (Image 2 style)
// ---------------------------------------------------------------------------

function AvatarLeftInlineHeader(props: KernelHeaderProps & { spec: HeaderAvatarLeftInline }): ReactElement {
  const { name, baseInfo, themeColor, spec, afterFields } = props
  const state = useHeaderState(baseInfo, name)
  const fields = buildBaseInfoFields(baseInfo)
  const avatarW = spec.avatarSize?.width ?? 90
  const avatarH = spec.avatarSize?.height ?? 90

  return (
    <>
      <header
        className="relative group cursor-pointer print:cursor-default flex items-center gap-6"
        onClick={state.openEditModal}
      >
        <button
          type="button"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10"
          onClick={(e) => { e.stopPropagation(); state.openEditModal() }}
        >
          <Pencil size={16} />
        </button>

        <KernelAvatar
          baseInfo={baseInfo}
          shape={spec.avatarShape ?? 'circle'}
          width={avatarW}
          height={avatarH}
          headerState={state}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-4 mb-2">
            <h1 className="font-bold" style={{ fontSize: '1.8em', color: '#1f2937' }}>
              {name}
            </h1>
            {spec.tagline && (
              <span className="tracking-widest uppercase text-gray-400" style={{ fontSize: '0.8em' }}>
                {spec.tagline}
              </span>
            )}
          </div>
          <div style={{ color: '#4b5563' }}>
            <InlineFieldList
              fields={fields}
              separator={spec.separator ?? '|'}
              fieldsPerRow={spec.fieldsPerRow}
              labelColor="#6b7280"
              valueColor="#374151"
              state={state}
              showIcons={true}
              iconColor={themeColor}
            />
          </div>
          {afterFields}
        </div>
      </header>
      {state.modals}
    </>
  )
}

// ---------------------------------------------------------------------------
// Variant: banner-gradient (Image 3 style)
// ---------------------------------------------------------------------------

function BannerGradientHeader(props: KernelHeaderProps & { spec: HeaderBannerGradient }): ReactElement {
  const { name, baseInfo, spec, afterFields } = props
  const state = useHeaderState(baseInfo, name)
  const fields = buildBaseInfoFields(baseInfo)
  const direction = spec.direction === 'to-bottom'
    ? 'to bottom'
    : spec.direction === 'diagonal'
      ? '135deg'
      : 'to right'
  const avatarOverlap = spec.avatarPosition === 'overlap-left'
  const showAvatar = spec.avatarPosition !== 'hidden'

  return (
    <>
      <header
        className="relative group cursor-pointer print:cursor-default"
        onClick={state.openEditModal}
      >
        <div className="flex items-stretch">
          {showAvatar && (
            <div className={`shrink-0 flex items-center justify-center ${avatarOverlap ? 'pl-6 pr-4' : 'pl-6 pr-4'}`}>
              <KernelAvatar
                baseInfo={baseInfo}
                shape={spec.avatarShape ?? 'rounded'}
                width={110}
                height={130}
                backgroundColor="#ffffff"
                headerState={state}
                style={avatarOverlap ? { boxShadow: '0 4px 18px rgba(0,0,0,0.12)' } : undefined}
              />
            </div>
          )}
          <div
            className="flex-1 relative rounded-md overflow-hidden"
            style={{ background: `linear-gradient(${direction}, ${spec.from}, ${spec.to})` }}
          >
            <button
              type="button"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-white/70 hover:text-white z-10"
              onClick={(e) => { e.stopPropagation(); state.openEditModal() }}
            >
              <Pencil size={16} />
            </button>
            <div className="px-8 py-6 flex flex-col justify-center h-full gap-2">
              <h1 className="font-bold" style={{ fontSize: '1.9em', color: spec.nameColor ?? '#ffffff' }}>
                {name}
              </h1>
              <InlineFieldList
                fields={fields}
                separator={spec.separator ?? '|'}
                fieldsPerRow={2}
                labelColor={spec.fieldColor ?? 'rgba(255,255,255,0.9)'}
                valueColor={spec.fieldColor ?? 'rgba(255,255,255,0.95)'}
                state={state}
                showIcons={false}
              />
              {afterFields}
            </div>
          </div>
        </div>
      </header>
      {state.modals}
    </>
  )
}

// ---------------------------------------------------------------------------
// Variant: dark-bar (Elegant-style)
// ---------------------------------------------------------------------------

function DarkBarHeader(props: KernelHeaderProps & { spec: HeaderDarkBar }): ReactElement {
  const { name, baseInfo, themeColor, spec, afterFields } = props
  const state = useHeaderState(baseInfo, name)
  const fields = buildBaseInfoFields(baseInfo)

  return (
    <>
      <header
        className="relative group cursor-pointer print:cursor-default overflow-hidden"
        style={{ backgroundColor: spec.backgroundColor }}
        onClick={state.openEditModal}
      >
        {spec.accentStripe !== false && (
          <div className="absolute left-0 top-0 bottom-0 w-[6px]" style={{ backgroundColor: themeColor }} />
        )}
        <button
          type="button"
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-white/50 hover:text-white z-10"
          onClick={(e) => { e.stopPropagation(); state.openEditModal() }}
        >
          <Pencil size={18} />
        </button>
        <div className="flex items-start gap-6 px-8 py-6 pl-10">
          <KernelAvatar
            baseInfo={baseInfo}
            shape={spec.avatarShape ?? 'rounded'}
            width={110}
            height={130}
            border={`3px solid ${themeColor}`}
            headerState={state}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-4 mb-1">
              <h1 className="text-white font-bold" style={{ fontSize: '2.1em' }}>{name}</h1>
              {spec.tagline && (
                <span className="tracking-[0.25em] uppercase" style={{ fontSize: '0.85em', color: 'rgba(255,255,255,0.45)' }}>
                  {spec.tagline}
                </span>
              )}
            </div>
            <div className="mt-3">
              <InlineFieldList
                fields={fields}
                separator="·"
                fieldsPerRow={4}
                labelColor="rgba(255,255,255,0.7)"
                valueColor="rgba(255,255,255,0.9)"
                state={state}
                showIcons={false}
              />
            </div>
            {afterFields}
          </div>
        </div>
      </header>
      {state.modals}
    </>
  )
}

// ---------------------------------------------------------------------------
// Variant: sidebar-avatar (Image 4 creative style — avatar lives in sidebar)
// ---------------------------------------------------------------------------

function SidebarAvatarHeader(props: KernelHeaderProps & { spec: HeaderSidebarAvatar }): ReactElement {
  const { name, baseInfo, themeColor, spec } = props
  const state = useHeaderState(baseInfo, name)
  const avatarW = spec.avatarSize?.width ?? 130
  const avatarH = spec.avatarSize?.height ?? 130

  return (
    <>
      <div
        className="relative group cursor-pointer print:cursor-default mb-4"
        onClick={state.openEditModal}
      >
        <button
          type="button"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10"
          onClick={(e) => { e.stopPropagation(); state.openEditModal() }}
        >
          <Pencil size={16} />
        </button>
        <div className="relative flex justify-center">
          {spec.decorBlob && (
            <div
              className="absolute rounded-full"
              style={{
                width: avatarW * 0.75,
                height: avatarH * 0.75,
                backgroundColor: spec.decorBlob.color,
                right: spec.decorBlob.offsetX ?? 0,
                bottom: spec.decorBlob.offsetY ?? 8,
                zIndex: 0,
              }}
            />
          )}
          <div className="relative z-10">
            <KernelAvatar
              baseInfo={baseInfo}
              shape={spec.avatarShape ?? 'circle'}
              width={avatarW}
              height={avatarH}
              border={`3px solid ${themeColor}20`}
              headerState={state}
            />
          </div>
        </div>
        {spec.quoteMark && (
          <div
            className="mx-auto mt-4 text-4xl leading-none text-center"
            style={{ color: themeColor, fontFamily: 'Georgia, serif' }}
          >
            &ldquo;
          </div>
        )}
        {spec.showName !== false && (
          <h1 className="mt-3 text-center font-bold" style={{ fontSize: '1.6em', color: '#1f2937' }}>
            {name}
          </h1>
        )}
      </div>
      {state.modals}
    </>
  )
}

// ---------------------------------------------------------------------------
// Variant: centered (simple stacked name over avatar)
// ---------------------------------------------------------------------------

function CenteredHeader(props: KernelHeaderProps & { spec: HeaderCentered }): ReactElement {
  const { name, baseInfo, themeColor, spec, afterFields } = props
  const state = useHeaderState(baseInfo, name)
  const fields = buildBaseInfoFields(baseInfo)

  return (
    <>
      <header
        className="relative group cursor-pointer print:cursor-default flex flex-col items-center gap-3 py-4"
        onClick={state.openEditModal}
      >
        <button
          type="button"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10"
          onClick={(e) => { e.stopPropagation(); state.openEditModal() }}
        >
          <Pencil size={16} />
        </button>
        <KernelAvatar
          baseInfo={baseInfo}
          shape={spec.avatarShape ?? 'circle'}
          width={110}
          height={110}
          headerState={state}
        />
        <h1 className="font-bold" style={{ fontSize: '1.8em', color: '#1f2937' }}>{name}</h1>
        <InlineFieldList
          fields={fields}
          separator="|"
          labelColor="#6b7280"
          valueColor="#374151"
          state={state}
          iconColor={themeColor}
        />
        {afterFields}
      </header>
      {state.modals}
    </>
  )
}
