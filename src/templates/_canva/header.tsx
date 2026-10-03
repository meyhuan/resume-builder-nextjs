"use client"

import type { ReactElement } from 'react'
import type { EditableHeader, EditableJobIntention } from '@/templates/_core'
import type { ReferenceDesign } from './designs'
import { useAppStore } from '@/state/store'
import { DecorativeStar, Fields, Heading, Intention, Name, Portrait } from './components'

export function Masthead({ design, english = false }: { readonly design: ReferenceDesign; readonly english?: boolean }): ReactElement {
  const cn = english ? 'RESUME' : '个人简历'
  if (design.header === 'centered') return <></>
  if (design.header === 'notched') return <div className="canva-notched">PERSONAL RESUME</div>
  if (design.header === 'stacked') return <div style={{ fontSize: '2.5em', fontWeight: 800, lineHeight: 1.2, letterSpacing: '.08em', marginBottom: 24 }}>PERSONAL<br />RESUME</div>
  if (design.header === 'collage') return <div style={{ background: 'var(--canva-soft)', padding: '10px 18px', clipPath: 'polygon(0 0, 96% 3%, 100% 92%, 2% 100%)', marginBottom: 20 }}><div style={{ fontSize: '2.3em', fontWeight: 800 }}>{cn}</div><div style={{ fontSize: '.75em', letterSpacing: '.18em' }}>PERSONAL RESUME</div></div>
  if (design.header === 'angled') return <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: '#eee', marginBottom: 22 }}><strong style={{ background: 'var(--canva-accent)', color: 'var(--canva-on-accent)', padding: '10px 24px 10px 14px', fontSize: '1.6em', clipPath: 'polygon(0 0, 100% 0, calc(100% - 20px) 100%, 0 100%)' }}>{cn}</strong><span style={{ fontStyle: 'italic', fontSize: '.9em', padding: '8px 14px' }}>PERSONAL RESUME</span></div>
  if (design.header === 'frame') return <div className="canva-masthead"><span className="canva-masthead-cn">{cn}</span><span style={{ flex: 1, textAlign: 'right', color: '#fff', background: 'var(--canva-accent)', padding: '5px 20px', fontSize: '1.25em', letterSpacing: '.14em' }}>RESUME</span></div>
  if (design.header === 'segmented') return <div className="canva-masthead canva-segmented"><span className="canva-masthead-cn" style={{ color: 'var(--canva-accent)' }}>{cn}</span><span className="canva-masthead-en">| PERSONAL RESUME</span><div aria-hidden className="canva-segmented-band"><span /></div></div>
  if (design.header === 'dots' && design.heading === 'outline-icon') return <div className="canva-masthead" style={{ borderTop: '8px solid var(--canva-accent)', paddingTop: 14, justifyContent: 'flex-start', gap: 10 }}><span className="canva-masthead-cn">{cn}</span><span className="canva-masthead-en" style={{ fontWeight: 700 }}>PERSONAL RESUME</span><span aria-hidden className="canva-dots canva-dots-solid" style={{ marginLeft: 'auto' }}><i /><i /><i /></span></div>
  return <div className="canva-masthead" style={{ ...(design.header === 'ruled' || design.header === 'dots' ? { borderBottom: '3px solid var(--canva-accent)', paddingBottom: 10 } : {}), ...(design.header === 'inline' ? { justifyContent: 'flex-start', gap: 14 } : {}) }}>
    <span className="canva-masthead-cn" style={{ color: 'var(--canva-accent)' }}>{cn}</span>
    {design.header === 'dots' ? <span aria-hidden className="canva-dots"><i /><i /><i /></span> : design.header === 'compact' ? null : <span className="canva-masthead-en">{design.header === 'inline' ? '| ' : ''}PERSONAL RESUME</span>}
  </div>
}

export function ReferenceHeader({ header, intention, showJob, design, english = false, includeFields = true, includeAvatar = true }: { readonly header: EditableHeader; readonly intention: EditableJobIntention; readonly showJob: boolean; readonly design: ReferenceDesign; readonly english?: boolean; readonly includeFields?: boolean; readonly includeAvatar?: boolean }): ReactElement {
  const readOnly = useAppStore((s) => s.readOnly)
  const isLeftPhoto = design.header === 'mint' || design.header === 'banner' || design.header === 'circle'
  const colored = design.header === 'banner'
  const centered = design.header === 'centered'
  const photo = includeAvatar && header.baseInfo?.showAvatar !== false
  const personalHeading = ['bookmark', 'segmented', 'notched', 'ruled'].includes(design.header) && design.heading !== 'solid-icon' && design.heading !== 'slant'
  return <header className="canva-header" onDoubleClick={readOnly ? undefined : (event) => { event.stopPropagation(); header.openEditModal() }} style={{ marginBottom: 'var(--canva-header-gap)', ...(design.header === 'mint' ? { background: 'var(--canva-soft)', padding: 18 } : {}), ...(colored ? { background: 'var(--canva-accent)', color: 'var(--canva-on-accent)', padding: '22px 20px' } : {}) }}>
    {design.header !== 'banner' && design.header !== 'mint' && design.header !== 'circle' ? <Masthead design={design} english={english} /> : null}
    {personalHeading ? <Heading value={english ? 'Personal Information' : '基本信息'} originalTitle="" design={design} /> : null}
    <div style={{ display: 'flex', alignItems: centered ? 'center' : 'flex-start', gap: 20, flexDirection: isLeftPhoto ? 'row' : 'row-reverse' }}>
      {photo ? <div style={{ flexShrink: 0, maxWidth: '30%', ...(design.header === 'banner' ? { marginTop: -35, border: '4px solid white' } : {}) }}><Portrait header={header} design={design} /></div> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        {design.header === 'mint' ? <div style={{ fontSize: '1.6em', fontWeight: 800, marginBottom: 8 }}>PERSONAL RESUME / {english ? 'RESUME' : '个人简历'}</div> : null}
        {design.header === 'banner' ? <div style={{ fontSize: '.72em', letterSpacing: '.12em', borderBottom: '1px solid currentColor', marginBottom: 8 }}>PERSONAL RESUME</div> : null}
        <Name header={header} large={design.header === 'circle' || centered} center={centered} />
        <Intention intention={intention} visible={showJob} />
        {includeFields ? <Fields header={header} inline={centered} /> : null}
      </div>
      {design.header === 'circle' ? <div aria-hidden style={{ border: '1px solid #888', borderRadius: '50%', width: 70, height: 70, padding: '18px 5px', textAlign: 'center', fontSize: '.7em', lineHeight: 1.5 }}>PERSONAL<br />RESUME</div> : null}
    </div>
  </header>
}

export function RailProfile({ header, intention, showJob, design, english = false }: { readonly header: EditableHeader; readonly intention: EditableJobIntention; readonly showJob: boolean; readonly design: ReferenceDesign; readonly english?: boolean }): ReactElement {
  const readOnly = useAppStore((s) => s.readOnly)
  const railDocument = design.header === 'rail-document'
  const collage = design.header === 'collage'
  const stacked = design.header === 'stacked'
  return <header className="canva-header" style={{ marginBottom: 'var(--canva-header-gap)' }} onDoubleClick={readOnly ? undefined : (event) => { event.stopPropagation(); header.openEditModal() }}>
    {railDocument ? <div style={{ fontSize: '2em', fontWeight: 800, lineHeight: 1.4, marginBottom: 18 }}>RESUME<br /><span style={{ fontSize: '.65em' }}>{english ? 'PERSONAL' : '个人简历'}</span></div> : <div style={{ margin: '0 auto 20px', width: design.avatar[0], maxWidth: '100%' }}><Portrait header={header} design={design} /></div>}
    {!railDocument && !stacked && !collage && design.decor !== 'beige-circles' ? <div style={{ padding: '10px 0', borderTop: design.darkRail ? '1px solid #ffffff80' : undefined, borderBottom: design.darkRail ? '1px solid #ffffff80' : undefined }}><Name header={header} center /></div> : null}
    {collage ? <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-5px 5px 10px' }}><DecorativeStar /></div> : null}
    <Intention intention={intention} visible={showJob} vertical />
    {!stacked && !railDocument ? <><div style={{ marginTop: 20 }}><Heading value={english ? 'Personal Information' : '基本信息'} originalTitle="" design={design} compact dark={design.darkRail} /></div><Fields header={header} columns={1} /></> : null}
  </header>
}
