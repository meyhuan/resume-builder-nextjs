'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Copy, X, ChevronRight, Sparkles, LoaderCircle, Check, Award, Clock, CheckCircle2, AlertCircle, Send } from 'lucide-react'
import { CORE_STORY_FEATURES, STORY_PACKS, featureForPack, packImage, packThumbnail, packsFor } from '@/lib/xhs-note/fixed-story'
import { useInMiniProgram } from '../_components/use-mini-program'
import { STORY_REASONS } from '@/lib/xhs-note/story-template'
import { DEFAULT_PINNED_COMMENT } from '@/lib/xhs-note/fixed-story-prompt'
import type { StoryPlatform } from '@/lib/xhs-note/story-assets'
import s from './fixed-story.module.css'

const ROLE_OPTIONS = [
  { id: '', label: '通用求职' },
  { id: '应届生/实习', label: '应届生/实习' },
  { id: '运营/市场', label: '运营/市场' },
  { id: '技术/开发', label: '技术/开发' },
  { id: '产品/设计', label: '产品/设计' },
  { id: '人事/行政/财务', label: '综合职能' },
]

interface NoteSubmission {
  id: number
  topicKey?: string
  noteUrl: string
  status: number
  rejectReason?: string
  baseDays: number
  bonusDays: number
  grantedDays: number
  createdAt?: string
}

interface UserRewardStatus {
  enabled: boolean
  baseDays: number
  tier1Views: number
  tier1Engagement: number
  bonusAfterHours: number
  tier1TotalDays: number
  tier2Views: number
  tier2TotalDays: number
  maxAwarded: number
  awardedCount: number
  remainingAwards: number
  blocked?: boolean
  submissions: NoteSubmission[]
}

type Draft = { title: string; body: string; tags: string[]; pinnedComment?: string }
export default function FixedStoryClient({
  initialPlatform,
  source,
  detectedJob = '',
  detectedStage = '',
}: {
  initialPlatform: StoryPlatform
  source: 'mini' | 'web'
  detectedJob?: string
  detectedStage?: string
}) {
  const inMiniProgram = useInMiniProgram(source === 'mini')
  const isMini = source === 'mini' || inMiniProgram
  const isWeChat = typeof window !== 'undefined' && (/micromessenger/i.test(navigator.userAgent) || isMini)
  const storageKey = `zhijian:fixed-story:sage-v3:${source}:${initialPlatform}`
  const [platform, setPlatform] = useState(initialPlatform)
  const [packId, setPackId] = useState(packsFor(initialPlatform, 'templates')[0].id)
  const [role, setRole] = useState(detectedJob || detectedStage || '')
  const [isCustomRole, setIsCustomRole] = useState(false)
  const [reason, setReason] = useState('')
  const [feeling, setFeeling] = useState('')
  const [extra, setExtra] = useState('')
  const [confirmed, setConfirmed] = useState(true)
  const [step, setStep] = useState<'choose' | 'feeling' | 'draft'>('choose')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [order, setOrder] = useState([0, 1, 2])
  const [activeImage, setActiveImage] = useState(0)
  const carousel = useRef<HTMLDivElement>(null)
  const [viewImage, setViewImage] = useState<number | null>(null)
  const [saved, setSaved] = useState<number[]>([])
  const [copied, setCopied] = useState(false)
  const [copiedTitle, setCopiedTitle] = useState(false)
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedComment, setCopiedComment] = useState(false)
  const [reviewed, setReviewed] = useState(true)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [noteUrlInput, setNoteUrlInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [rewardStatus, setRewardStatus] = useState<UserRewardStatus | null>(null)
  const [rewardLoading, setRewardLoading] = useState(true)
  const [rewardError, setRewardError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const rewardRequest = useRef(false)
  const submitModal = useRef<HTMLDivElement>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [ready, setReady] = useState(false)
  const root = useRef<HTMLElement>(null)
  const lightbox = useRef<HTMLDialogElement>(null)
  const pack = STORY_PACKS.find(item => item.id === packId && item.platform === platform) || packsFor(platform, 'templates')[0]
  const feature = featureForPack(pack)

  const openPreview = useCallback((index: number) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const toAbs = (url: string) => (url.startsWith('http') ? url : `${origin}${url}`)
    const current = toAbs(packImage(pack, index))
    const urls = order.map(i => toAbs(packImage(pack, i)))

    if (isWeChat) {
      const bridge = (window as unknown as { WeixinJSBridge?: { invoke: (action: string, data: unknown) => void } }).WeixinJSBridge
      if (bridge && typeof bridge.invoke === 'function') {
        try {
          bridge.invoke('imagePreview', { current, urls })
          return
        } catch { /* fallback to dialog */ }
      }

      const wx = (window as unknown as { wx?: { previewImage?: (opt: { current: string; urls: string[] }) => void } }).wx
      if (wx && typeof wx.previewImage === 'function') {
        try {
          wx.previewImage({ current, urls })
          return
        } catch { /* fallback to dialog */ }
      }
    }

    setViewImage(index)
  }, [pack, order, isWeChat])

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || 'null')
      const p = source === 'mini' ? 'mobile' : raw?.platform === 'desktop' ? 'desktop' : raw?.platform === 'mobile' ? 'mobile' : initialPlatform
      const restoredPack = STORY_PACKS.find(item => item.id === raw?.packId && item.platform === p)
      if (restoredPack) {
        setPlatform(p); setPackId(restoredPack.id)
        if (typeof raw.role === 'string' && raw.role.trim()) {
          setRole(raw.role)
          if (detectedJob && raw.role !== detectedJob) {
            setIsCustomRole(true)
          }
        } else if (detectedJob || detectedStage) {
          setRole(detectedJob || detectedStage)
        }
        const r = STORY_REASONS.some(item => item.id === raw.reason) ? raw.reason : STORY_REASONS[0].id
        const f = featureForPack(restoredPack).feelings.some(item => item.id === raw.feeling) ? raw.feeling : ''
        setReason(r); setFeeling(f); setExtra(typeof raw.extra === 'string' ? raw.extra.slice(0, 150) : '')
        if (Array.isArray(raw.order) && raw.order.length === 3 && new Set(raw.order).size === 3 && raw.order.every((n: unknown) => [0, 1, 2].includes(n as number))) setOrder(raw.order)
        if (raw.draft && typeof raw.draft.title === 'string' && typeof raw.draft.body === 'string' && Array.isArray(raw.draft.tags) && raw.draft.tags.every((tag: unknown) => typeof tag === 'string')) {
          setDraft({
            title: raw.draft.title.slice(0, 20),
            body: raw.draft.body.slice(0, 1000),
            tags: raw.draft.tags.slice(0, 5),
            pinnedComment: typeof raw.draft.pinnedComment === 'string' ? raw.draft.pinnedComment.slice(0, 150) : DEFAULT_PINNED_COMMENT,
          })
        }
      }
    } catch { setNotice('本地草稿无法读取，可重新选择。') }
    setReady(true)
  }, [storageKey, initialPlatform, source, detectedJob, detectedStage])

  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(storageKey, JSON.stringify({ platform, packId, role, reason, feeling, extra, order, draft })) }
    catch { setNotice('本地空间不足，请及时复制正文。') }
  }, [ready, storageKey, platform, packId, role, reason, feeling, extra, order, draft])

  useEffect(() => { root.current?.scrollIntoView({ block: 'start' }) }, [step])
  useEffect(() => {
    if (viewImage !== null && !lightbox.current?.open) lightbox.current?.showModal()
    else if (viewImage === null) lightbox.current?.close()
  }, [viewImage])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  function invalidate() { setDraft(null); setReviewed(true); setSaved([]); setCopied(false); setCopiedComment(false); setError(''); setNotice('') }
  function choosePack(id: string) { setPackId(id); setActiveImage(0); carousel.current?.scrollTo({left:0}); setFeeling(''); setConfirmed(true); setOrder([0, 1, 2]); invalidate() }
  function changePlatform(p: StoryPlatform) { setPlatform(p); choosePack(packsFor(p, pack.feature)[0].id) }
  async function generate(isRegenerate = false) {
    if (!reason || !feeling || !confirmed) {
      setError('请选择这次分享的心情和使用感受，并勾选确认。')
      return
    }
    if (draft && !isRegenerate) { setStep('draft'); return }
    setError('')
    setNotice(isRegenerate ? 'AI 正在换个语气重新生成...' : 'AI 正在为你整理分享笔记草稿...')
    setBusy(true)
    setAiGenerating(true)
    try {
      const response = await fetch('/next-api/xhs-note/fixed-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: pack.id,
          platform,
          role,
          reason,
          feeling,
          extra,
          confirmed,
        }),
        signal: AbortSignal.timeout(70000),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || '生成失败，请稍后重试。填写内容已保留。')
      if (response.ok) {
        if (data.title && data.body) {
          setDraft({
            title: data.title,
            body: data.body,
            tags: Array.isArray(data.tags) && data.tags.length ? data.tags : ['简历修改', '求职经验'],
            pinnedComment: data.pinnedComment || DEFAULT_PINNED_COMMENT,
          })
          setNotice(isRegenerate ? '分享笔记已重新生成，检查一下就能分享。' : '分享笔记已生成，检查一下就能分享。')
          setStep('draft')
          setReviewed(true)
          setCopied(false)
          setCopiedComment(false)
          return
        }
      }
      throw new Error('服务返回异常')
    } catch (cause) {
      setNotice('')
      setError(cause instanceof Error && cause.name !== 'TimeoutError' && cause.name !== 'TypeError' ? cause.message : '网络连接失败或请求超时，请重试。填写内容和已有正文已保留。')
    } finally {
      setBusy(false)
      setAiGenerating(false)
    }
  }
  async function copyComment() {
    const text = draft?.pinnedComment || DEFAULT_PINNED_COMMENT
    try {
      await navigator.clipboard.writeText(text)
      setCopiedComment(true)
      setNotice('评论区备选回复已复制，发布后可粘贴到小红书评论区。')
      setTimeout(() => setCopiedComment(false), 3000)
    } catch {
      setError('复制失败，请手动长按文字复制。')
    }
  }
  function readyToSave() {
    if (!draft?.title.trim() || !draft.body.trim() || draft.title.length > 20 || draft.body.length > 1000) { setError('请检查标题与正文，标题最多 20 字，正文最多 1000 字。'); return false }
    if (!reviewed) { setError('请先确认正文符合你的真实感受。'); return false }
    setError(''); return true
  }
  async function saveImage(index: number) {
    if (busy) return
    setError('')

    // In WeChat / Mini Program, browsers intercept HTML downloads with "可在浏览器打开此网页保存图片".
    // Directly open WeChat native full-screen image viewer where users can long-press to save to album.
    if (isWeChat) {
      setSaved(previous => [...new Set([...previous, index])])
      openPreview(index)
      setNotice('已打开高清大图：长按即可「保存到手机相册」，左右滑动可连续保存 3 张。')
      return
    }

    setBusy(true)
    try {
      const response = await fetch(packImage(pack, index), { signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error('图片加载失败，请重试。')
      const blob = await response.blob()
      if (!blob.type.startsWith('image/')) throw new Error('素材文件暂时不可用。')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `智简简历-${order.indexOf(index) + 1}-${pack.id}.png`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      setSaved(previous => [...new Set([...previous, index])]); setNotice('已发起下载。')
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，请重试。') }
    finally { setBusy(false) }
  }
  async function copyTitle() {
    if (!draft?.title.trim()) { setError('标题不能为空。'); return }
    try {
      await navigator.clipboard.writeText(draft.title.trim())
      setCopiedTitle(true)
      setNotice('标题已复制，可直接粘贴到小红书标题栏。')
      setTimeout(() => setCopiedTitle(false), 3000)
    } catch { setError('当前浏览器不支持快捷复制，请长按文字手动复制。') }
  }
  async function copy() {
    if (!draft || !readyToSave()) return
    try {
      await navigator.clipboard.writeText(`${draft.body.trim()}\n\n${draft.tags.map(tag => `#${tag}`).join(' ')}`)
      setCopied(true)
      setNotice('正文与话题标签已复制，可直接粘贴到小红书正文栏。')
      setTimeout(() => setCopied(false), 3000)
    } catch { setError('当前浏览器不支持复制，请返回正文页长按文字复制。') }
  }
  async function copyAll() {
    if (!draft || !readyToSave()) return
    try {
      await navigator.clipboard.writeText(`${draft.title.trim()}\n\n${draft.body.trim()}\n\n${draft.tags.map(tag => `#${tag}`).join(' ')}`)
      setCopiedAll(true)
      setNotice('整篇笔记（含标题、正文和话题）已复制。')
      setTimeout(() => setCopiedAll(false), 3000)
    } catch { setError('当前浏览器不支持复制，请返回正文页长按文字复制。') }
  }
  const loadRewardStatus = useCallback(async () => {
    if (rewardRequest.current) return
    rewardRequest.current = true
    setRewardLoading(true)
    try {
      const res = await fetch('/next-api/xhs-note/status', { cache: 'no-store', signal: AbortSignal.timeout(15000) })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.status === 100 && json?.data) {
        setRewardStatus(json.data)
        setRewardError('')
      } else {
        throw new Error(json?.error || '暂时无法获取奖励状态，请刷新重试。')
      }
    } catch (err) {
      setRewardError(err instanceof Error && err.name !== 'TimeoutError' ? err.message : '获取奖励状态超时，请刷新重试。')
    } finally {
      rewardRequest.current = false
      setRewardLoading(false)
    }
  }, [])
  useEffect(() => {
    void loadRewardStatus()
    const refresh = () => { if (document.visibilityState === 'visible') void loadRewardStatus() }
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [loadRewardStatus])
  useEffect(() => {
    if (!showSubmitModal) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    submitModal.current?.querySelector('textarea')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) setShowSubmitModal(false)
      if (event.key !== 'Tab') return
      const items = submitModal.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea')
      if (!items?.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [showSubmitModal, submitting])
  const submitUnavailable = rewardLoading || !!rewardError || !rewardStatus?.enabled || rewardStatus.remainingAwards <= 0 || !!rewardStatus.blocked || rewardStatus.submissions.some(note => note.status === 0)
  function openSubmit(noteUrl = '') {
    setSubmitError('')
    setNoteUrlInput(noteUrl)
    setShowSubmitModal(true)
  }
  async function submitNoteUrl() {
    if (submitting || submitUnavailable) return
    const raw = noteUrlInput.trim()
    if (!raw) {
      setSubmitError('请粘贴小红书笔记链接或分享文案')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/next-api/xhs-note/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: raw, topicKey: pack.id }),
        signal: AbortSignal.timeout(20000),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.status !== 100) {
        throw new Error(json?.error || '提交失败，请重试')
      }
      setNotice('提交成功！管理员审核通过后，VIP 会员将自动发放到当前账号。')
      setShowSubmitModal(false)
      setNoteUrlInput('')
      await loadRewardStatus()
    } catch (err) {
      setSubmitError(err instanceof Error && err.name !== 'TimeoutError' ? err.message : '提交超时，请先刷新审核状态，确认是否已提交后再重试。')
    } finally {
      setSubmitting(false)
    }
  }
  function back() { setError(''); setNotice(''); setStep(step === 'draft' ? 'feeling' : 'choose') }
  function selectImage(position: number) {
    setActiveImage(position)
    const track = carousel.current
    const card = track?.children[position] as HTMLElement | undefined
    if (track && card) track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2, behavior: 'smooth' })
  }
  const stepNumber = step === 'choose' ? 1 : step === 'feeling' ? 2 : 3
  return <main ref={root} className={s.root}>
    <div className={s.shell}>
      {!isMini ? (
        <header className={s.header}>
          {step !== 'choose' ? <button type="button" onClick={back} aria-label="返回上一步"><ArrowLeft size={20} /></button> : <span className={s.brand}>智简</span>}
          <span>分享使用体验</span><small aria-label={`第 ${stepNumber} 步，共 3 步`}>{stepNumber} / 3</small>
        </header>
      ) : step !== 'choose' ? (
        <div className={s.miniHeader}>
          <button type="button" onClick={back} className={s.miniBackBtn} aria-label="返回上一步">
            <ArrowLeft size={16} />
            <span>上一步</span>
          </button>
          <span className={s.miniStepPill}>步骤 {stepNumber} / 3</span>
        </div>
      ) : null}
      <div className={s.content}>
      {step === 'choose' && <>
        <div className={s.intro}><small>从你用过的功能开始</small><h1>这次，想分享什么？</h1><p>选好配图，再加上你的真实感受</p></div>
        {source !== 'mini' ? <div className={s.platform} aria-label="实际使用端">{(['mobile', 'desktop'] as const).map(p => <button key={p} aria-pressed={platform === p} onClick={() => changePlatform(p)}>{p === 'mobile' ? '手机 / 小程序' : '电脑网页版'}</button>)}</div> : <p className={s.muted}>微信小程序 / 手机端素材</p>}
        <div className={s.features} aria-label="分享功能">{CORE_STORY_FEATURES.map(item => <button key={item.id} aria-pressed={pack.feature === item.id} onClick={() => choosePack(packsFor(platform, item.id)[0].id)}><strong>{item.label}</strong></button>)}</div>
        <div key={pack.id} ref={carousel} className={s.carousel} aria-label="配图预览" onScroll={event => { const el = event.currentTarget; const center = el.scrollLeft + el.clientWidth / 2; const distances = Array.from(el.children).map(child => Math.abs((child as HTMLElement).offsetLeft + child.clientWidth / 2 - center)); setActiveImage(distances.indexOf(Math.min(...distances))) }}>
          {order.map((index, position) => <button key={index} className={s.heroImage} onClick={() => openPreview(index)} aria-label={`查看第 ${position + 1} 张大图`}><img src={packThumbnail(pack, index)} alt={pack.titles[index].replace('\n', '，')} loading={position === 0 ? 'eager' : 'lazy'} decoding="async" /></button>)}
        </div>
        <p className={s.counter}>{activeImage + 1} / 3 · 左右滑动，点击查看大图</p>
        <div className={s.variants}>{packsFor(platform, pack.feature).map(item => <button key={item.id} aria-pressed={item.id === pack.id} onClick={() => choosePack(item.id)}>方案 {item.variant}</button>)}</div>
        <div className={s.cards}>{order.map((index, position) => <div key={index}><button className={s.thumbnail} aria-pressed={activeImage === position} onClick={() => selectImage(position)} aria-label={`预览第 ${position + 1} 张`}><img src={packThumbnail(pack, index)} alt={pack.titles[index]} loading="lazy" decoding="async" /></button><div className={s.cardCaption}>{position === 0 ? <span>封面</span> : <button onClick={() => { setOrder([index, ...order.filter(n => n !== index)]); setSaved([]); selectImage(0) }}>设为封面</button>}</div></div>)}</div>
        <p className={s.disclosure}>AI 设计示意图 · 人物与经历为模拟数据<br />界面细节以实际产品为准</p>
      </>}
      {step === 'feeling' && <>
        <div className={s.intro}><small>基于你的使用体验</small><h1>说说你的真实感受</h1><p>这将帮助更多同学了解这个功能是否适合自己</p></div>
        <div className={s.miniCards}>{order.map(i => <button key={i} onClick={() => openPreview(i)} aria-label={`查看${pack.titles[i]}`}><img src={packThumbnail(pack, i)} alt={pack.titles[i]} loading="lazy" decoding="async" /></button>)}</div>
        <fieldset className={s.options}>
          <div className={s.roleHeader}>
            <legend>你的求职目标</legend>
            <span className={s.roleHint}>让分享内容更贴合你的真实经历</span>
          </div>
          {detectedJob && !isCustomRole ? (
            <div className={s.detectedBadge}>
              <span className={s.detectedLabel}>🎯 目标岗位：{role || detectedJob}</span>
              <span className={s.detectedSource}>（已从简历自动填入）</span>
              <button
                type="button"
                className={s.changeRoleBtn}
                onClick={() => { setIsCustomRole(true); invalidate() }}
              >
                修改
              </button>
            </div>
          ) : (
            <>
              <div className={s.roles}>
                {ROLE_OPTIONS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={role === item.id || (!role && item.id === '')}
                    onClick={() => { setRole(item.id); invalidate() }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className={s.customRoleInputWrap}>
                <input
                  type="text"
                  className={s.customRoleInput}
                  placeholder="或直接输入具体岗位，如：Java开发、电商运营、UI设计"
                  maxLength={30}
                  value={role}
                  onChange={e => { setRole(e.target.value); invalidate() }}
                />
              </div>
            </>
          )}
        </fieldset>
        <fieldset className={`${s.options} ${s.reasons}`}><legend>这次分享，想以什么心情发？</legend>{STORY_REASONS.map(item => <label key={item.id}><input type="radio" name="reason" checked={reason === item.id} onChange={() => { setReason(item.id); invalidate() }} /><span>{item.label}</span></label>)}</fieldset>
        <fieldset className={s.options}>
          <div className={s.feelingHeader}>
            <legend className={s.feelingLegend}>{feature.feelingQuestion || '用下来，最直观的体感是？'}</legend>
            <span className={s.feelingHint}>选一个最贴近你感受的，正文会自然融入这段体感</span>
          </div>
          <div className={s.feelingsList}>
            {feature.feelings.map(item => (
              <label key={item.id} className={s.feelingItem}>
                <input
                  type="radio"
                  name="feeling"
                  checked={feeling === item.id}
                  onChange={() => { setFeeling(item.id); invalidate() }}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className={s.field}><span>再补充一句（选填）</span><textarea value={extra} maxLength={150} onChange={event => { setExtra(event.target.value); invalidate() }} placeholder="哪一步改得最顺手？" /><small>{extra.length} / 150</small></label>
        <label className={s.confirm}><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />这个功能我确实用过，以上是我的真实感受</label>
      </>}
      {step === 'draft' && draft && <>
        <div className={s.intro}><small>笔记已准备好</small><h1>检查一下，就能分享</h1><p>确认内容符合你的真实感受，即可按指引发布分享</p></div>

        <div className={s.rewardBanner}>
          <div className={s.rewardHeader}>
            <span className={s.rewardBadge}>🎁 创作者福利</span>
            <button type="button" className={s.refreshReward} disabled={rewardLoading} onClick={() => void loadRewardStatus()}>{rewardLoading ? '正在刷新…' : '刷新奖励状态'}</button>
          </div>
          {rewardError && <p role="alert" className={s.error}>{rewardError}</p>}
          {!rewardStatus && !rewardError && <p className={s.statusDesc}>正在获取活动规则与剩余次数…</p>}
          {rewardStatus && <>
            <h3 className={s.rewardTitle}>{rewardStatus.enabled ? `发真实体验笔记，送 ${rewardStatus.baseDays} ~ ${rewardStatus.tier2TotalDays} 天 VIP 会员` : '活动暂未开放'}</h3>
            <p className={s.rewardCap}>每人最多 {rewardStatus.maxAwarded} 次 · 还可获奖 {rewardStatus.remainingAwards} 次 · 最高累计 {rewardStatus.maxAwarded * rewardStatus.tier2TotalDays} 天</p>
            <div className={s.rewardTiers}>
              <div className={s.rewardTierItem}><span className={s.tierDays}>{rewardStatus.baseDays}<small>天</small></span><span className={s.tierLabel}>审核通过发放</span></div>
              <div className={s.rewardTierDivider}>→</div>
              <div className={s.rewardTierItem}><span className={s.tierDays}>{rewardStatus.tier1TotalDays}<small>天</small></span><span className={s.tierLabel}>浏览≥{rewardStatus.tier1Views} 或 互动≥{rewardStatus.tier1Engagement}</span></div>
              <div className={s.rewardTierDivider}>→</div>
              <div className={s.rewardTierItem}><span className={s.tierDays}>{rewardStatus.tier2TotalDays}<small>天</small></span><span className={s.tierLabel}>浏览≥{rewardStatus.tier2Views}</span></div>
            </div>
            <p className={s.statusDesc}>进阶档为单篇累计会员天数，不重复叠加。发布满 {rewardStatus.bonusAfterHours} 小时，审核员核验数据达标后补发；互动为赞、藏、评之和。</p>
            {rewardStatus.blocked && <p className={s.error}>当前账号奖励资格已被回收，无法继续提交。</p>}
          </>}
        </div>

        {rewardStatus?.submissions.map(latest => (
            <div key={latest.id} className={s.statusCard}>
              <div className={s.statusCardHeader}>
                <div className={s.statusTitleWrap}>
                  {latest.status === 0 && <Clock size={16} className={s.statusIconPending} />}
                  {latest.status === 1 && <CheckCircle2 size={16} className={s.statusIconApproved} />}
                  {latest.status === 2 && <AlertCircle size={16} className={s.statusIconRejected} />}
                  <strong>
                    {latest.status === 0 ? '笔记审核中' : latest.status === 1 ? '审核已通过，VIP 已到账' : latest.status === 3 ? '奖励资格已回收' : '审核暂未通过'}
                  </strong>
                </div>
                <span className={`${s.statusBadge} ${s['status' + latest.status]}`}>
                  {latest.status === 0 ? '待审核' : latest.status === 1 ? `已发 ${latest.grantedDays} 天 VIP` : latest.status === 3 ? '已回收' : '未通过'}
                </span>
              </div>
              <p className={s.statusDesc}>
                {latest.status === 0 && `预计 24 小时内核验笔记公开状态，审核通过后发放 ${rewardStatus.baseDays} 天 VIP。结果将在此更新，也可点击上方刷新。`}
                {latest.status === 1 && `已发 ${latest.grantedDays} 天 VIP。发布满 ${rewardStatus.bonusAfterHours} 小时后，审核员核验数据，达标可累计升至 ${rewardStatus.tier1TotalDays} 或 ${rewardStatus.tier2TotalDays} 天；补发结果将在此更新。`}
                {latest.status === 3 && '该笔记的奖励资格已被回收，当前账号无法继续领取。'}
                {latest.status === 2 && `未通过原因：${latest.rejectReason || '笔记未公开或链接有误'}。可修改后重新提交。`}
              </p>
              {latest.status === 2 && (
                <button type="button" className={s.reSubmitBtn} disabled={submitUnavailable} onClick={() => openSubmit(latest.noteUrl)}>
                  修改链接重新提交
                </button>
              )}
            </div>
        ))}

        <div className={s.guideCard}>
          <h4 className={s.guideTitle}>🚀 小红书 4 步发布指引</h4>
          <ol className={s.guideList}>
            <li><strong>1. 保存配图</strong>：先在下方保存 3 张图片到手机相册（按 1、2、3 顺序）。</li>
            <li><strong>2. 打开小红书发笔记</strong>：点击底部「+」，按顺序上传这 3 张配图。</li>
            <li><strong>3. 粘贴标题与正文</strong>：点击本页「复制标题」和「复制正文与标签」分别粘贴。</li>
            <li>
              <strong className={s.highlightStep}>4. 评论区抢首评（重要）</strong>：笔记发布后，第一时间将下方【备选回复】发在<strong>评论区第一条（置顶/抢首评）</strong>。
              <span className={s.guideTip}>💡 作用：在评论区自然答疑指路，解答大家对模板和工具的疑问，让读者了解实际使用方法。</span>
            </li>
          </ol>
        </div>

        <div className={s.field}>
          <div className={s.fieldHeader}>
            <label htmlFor="draft-title" className={s.fieldLabel}>标题</label>
            <div className={s.fieldHeaderActions}>
              <span className={s.charCount}>{draft.title.length} / 20</span>
              <button
                type="button"
                className={s.copyMiniBtn}
                onClick={() => void copyTitle()}
                aria-label="复制标题"
              >
                {copiedTitle ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedTitle ? '已复制' : '复制标题'}</span>
              </button>
            </div>
          </div>
          <input
            id="draft-title"
            value={draft.title}
            maxLength={20}
            onChange={event => {
              setDraft({ ...draft, title: event.target.value })
              setReviewed(true)
              setCopied(false)
              setCopiedTitle(false)
              setCopiedAll(false)
            }}
          />
        </div>
        <div className={s.field}>
          <div className={s.fieldHeader}>
            <label htmlFor="draft-body" className={s.fieldLabel}>正文</label>
            <span className={s.charCount}>{draft.body.length} / 1000</span>
          </div>
          <textarea
            id="draft-body"
            className={s.bodyInput}
            value={draft.body}
            maxLength={1000}
            onChange={event => {
              setDraft({ ...draft, body: event.target.value })
              setReviewed(true)
              setCopied(false)
              setCopiedTitle(false)
              setCopiedAll(false)
            }}
          />
        </div>
        <p className={s.tags}>{draft.tags.map(tag => `#${tag}`).join('  ')}</p>
        <div className={s.commentCard}>
          <div className={s.commentCardHeader}>
            <small>💬 第 4 步：评论区首评备选回复（发在评论区第一条）</small>
            <button type="button" className={s.copyCommentBtn} onClick={() => void copyComment()}>
              {copiedComment ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedComment ? '已复制备选回复' : '一键复制备选回复'}</span>
            </button>
          </div>
          <p className={s.commentText}>{draft.pinnedComment || DEFAULT_PINNED_COMMENT}</p>
          <span className={s.commentTip}>小贴士：发布笔记后，第一时间将这段发在评论区第一条。有人在评论区问起你在哪里排版时，自然解答即可～</span>
        </div>
        <h2 className={s.imageHeading}>配图（3 张 · 请按顺序保存）</h2>
        <div className={s.cards}>{order.map((i, position) => <div key={i}><button className={s.imageButton} onClick={() => openPreview(i)} aria-label={`打开第 ${position + 1} 张大图`}><img src={packThumbnail(pack, i)} alt={pack.titles[i]} loading="lazy" decoding="async" /></button><button className={s.download} disabled={busy} onClick={() => void saveImage(i)}><Download size={14} />{isWeChat ? (saved.includes(i) ? '再次点开' : `点开长按存第 ${position + 1} 张`) : (saved.includes(i) ? '再次保存' : `保存第 ${position + 1} 张`)}</button></div>)}</div>
        {isWeChat && (
          <button
            type="button"
            className={s.batchPreviewBtn}
            onClick={() => {
              setSaved([0, 1, 2])
              openPreview(order[0])
              setNotice('已打开高清大图：长按即可「保存到手机相册」，左右滑动可连续保存 3 张。')
            }}
          >
            <Download size={15} />
            <span>一键点开 3 张高清图（长按存入相册）</span>
          </button>
        )}
        <p className={s.disclosure}>
          {isWeChat
            ? '微信内长按大图即可直接存入手机相册，左右滑动可连续保存全部 3 张。'
            : '微信内可点开大图，长按保存'}
        </p>
        <label className={s.confirm}><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />我已检查，正文符合我的真实感受</label>
      </>}
      </div>
      <div className={s.actions}>
        {error && <p role="alert" className={s.error}>{error}</p>}
        {notice && <p role="status" className={s.notice}>{notice}</p>}
        {step === 'choose' && <button className={s.primary} disabled={!ready} onClick={() => { setError(''); setNotice(''); setStep('feeling') }}>选好了，写感受<ChevronRight size={18} /></button>}
        {step === 'feeling' && (
          <button className={s.primary} disabled={busy || !confirmed || !reason || !feeling} onClick={() => void generate(false)}>
            {aiGenerating ? (
              <>
                <LoaderCircle size={18} className={s.spinner} />
                <span>正在帮我生成分享笔记...</span>
              </>
            ) : draft ? (
              <>
                <span>继续查看我的分享笔记</span>
                <ChevronRight size={18} />
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>✨ 一键生成我的分享笔记</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        )}
        {step === 'draft' && (
          <div className={s.draftActionsWrap}>
            <div className={s.btnRow}>
              <button
                type="button"
                className={s.secondaryBtn}
                disabled={busy}
                onClick={() => void generate(true)}
              >
                {aiGenerating ? <LoaderCircle size={15} className={s.spinner} /> : <Sparkles size={15} />}
                <span>{aiGenerating ? 'AI 生成中...' : '换个写法'}</span>
              </button>
              <button
                type="button"
                className={s.primaryBtn}
                disabled={busy}
                onClick={() => void copy()}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? '已复制正文与标签' : '复制正文与话题标签'}</span>
              </button>
            </div>
            <div className={s.rewardRow}>
              <button
                type="button"
                className={s.vipPill}
                disabled={submitUnavailable}
                onClick={() => openSubmit()}
              >
                <Award size={14} className={s.vipPillIcon} />
                <span className={s.vipPillText}>
                  {rewardLoading
                    ? '查询领奖资格…'
                    : rewardError
                    ? '请刷新奖励状态'
                    : !rewardStatus?.enabled
                    ? '活动暂未开放'
                    : rewardStatus.blocked
                    ? '暂无领奖资格'
                    : rewardStatus.remainingAwards <= 0
                    ? '获奖次数已用完'
                    : rewardStatus.submissions.some((note) => note.status === 0)
                    ? '笔记审核中 · 查看进度'
                    : '我已在小红书发布 · 提交链接领 VIP'}
                </span>
                <ChevronRight size={13} className={s.vipPillArrow} />
              </button>
              <button
                type="button"
                className={s.copyAllSubBtn}
                disabled={busy}
                onClick={() => void copyAll()}
                title="复制整篇笔记（含标题、正文、话题）"
              >
                <span>{copiedAll ? '✓ 已复制整篇' : '复制整篇'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    {showSubmitModal && (
      <div ref={submitModal} className={s.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="submit-note-heading" onClick={e => { if (e.target === e.currentTarget && !submitting) setShowSubmitModal(false) }}>
        <div className={s.modalSheet}>
          <div className={s.modalHeader}>
            <div className={s.modalTitleWrap}>
              <Award size={18} className={s.modalIcon} />
              <h3 id="submit-note-heading">提交小红书笔记链接</h3>
            </div>
            <button type="button" className={s.modalClose} disabled={submitting} onClick={() => setShowSubmitModal(false)} aria-label="关闭">
              <X size={20} />
            </button>
          </div>
          <div className={s.modalBody}>
            <p className={s.modalDesc}>
              在小红书打开已发布的笔记，点击右上角<strong>「分享」→「复制链接」</strong>，将链接粘贴在下方：
            </p>
            <textarea
              className={s.urlTextarea}
              aria-label="小红书笔记链接或分享文案"
              aria-invalid={!!submitError}
              aria-describedby={submitError ? 'submit-note-error' : undefined}
              maxLength={4000}
              placeholder="粘贴小红书笔记链接，例如 http://xhslink.com/a/... 或包含链接的完整文案"
              value={noteUrlInput}
              onChange={e => { setNoteUrlInput(e.target.value); setSubmitError('') }}
              rows={3}
            />
            <div className={s.modalRules}>
              <strong>提交前自查：</strong>
              <ul>
                <li>• 笔记为<strong>公开可见</strong>（非私密/仅自己可见）</li>
                <li>• 评论区首条或正文自然指路「智简简历」</li>
                <li>• 发布满 {rewardStatus?.bonusAfterHours} 小时后保持公开，方便审核员核验数据并补发会员</li>
              </ul>
            </div>
            {submitError && <p id="submit-note-error" role="alert" className={s.error}>{submitError}</p>}
            {submitUnavailable && <p role="alert" className={s.error}>当前无法提交，请关闭抽屉并刷新奖励状态。</p>}
            <button
              type="button"
              className={s.primary}
              disabled={submitting || !noteUrlInput.trim() || submitUnavailable}
              onClick={() => void submitNoteUrl()}
            >
              {submitting ? <LoaderCircle size={18} className={s.spinner} /> : <Send size={18} />}
              <span>{submitting ? '正在提交审核...' : `确认提交 · 审核通过领 ${rewardStatus?.baseDays} 天 VIP`}</span>
            </button>
          </div>
        </div>
      </div>
    )}
    <dialog ref={lightbox} className={s.lightbox} aria-label="素材大图" onCancel={() => setViewImage(null)} onClick={event => { if (event.target === event.currentTarget) setViewImage(null) }}><button autoFocus onClick={() => setViewImage(null)} aria-label="关闭大图"><X size={22} /></button>{viewImage !== null && <img src={packImage(pack, viewImage)} alt={pack.titles[viewImage]} decoding="async" />}</dialog>
  </main>
}
