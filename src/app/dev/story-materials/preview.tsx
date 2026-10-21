'use client'

import { useEffect, useState } from 'react'
import LanyingTemplate from '@/templates/lanying'
import { useAppStore } from '@/state/store'
import { getTemplateLabTheme } from '@/lib/template-fixtures'
import type { ResumeData } from '@/entities/resume/resume-data'
import { TextField } from '@/features/edit/form-fields/text-field'
import { RichAiTextarea } from '@/features/edit/form-fields/rich-ai-textarea'
import { PreviewSettingsSheet } from '@/app/m/preview/_components/preview-settings-sheet'
import RightSidebar from '@/ui/right-sidebar'
import { getAllTemplates } from '@/templates/template-loader'

// Entirely fictional, fixed fixture shared by every promotional material.
const resume: ResumeData = {
  id: 'story-lanying-example', name: '林知夏',
  baseInfo: { gender: '女', age: 24, currentLocation: '上海', workStartTime: '2022.07', showAvatar: true, avatarUrl: '/avatar.jpg' },
  jobIntention: { position: '市场运营', city: '上海', type: '全职', industry: '消费品牌', currentStatus: '在职，考虑合适机会' },
  jobIntentionVisible: true,
  sections: [
    { id: 'education', title: '教育经历', columns: 1, blocks: [{ id: 'edu', type: 'education', school: '示例大学', major: '新闻传播学', degree: '本科', startDate: '2018.09', endDate: '2022.06', courseHtml: '<p>主修课程：市场营销、传播学、消费者行为、数据分析。</p>' }] },
    { id: 'work', title: '工作经历', columns: 1, blocks: [{ id: 'work-1', type: 'experience', company: '示例消费品牌', position: '市场运营', startDate: '2022.07', endDate: '至今', contentHtml: '<p>协助整理品牌活动信息，联动内容与设计同事，跟进活动素材与发布安排。</p><p>整理用户反馈与活动记录，为后续内容调整提供参考。</p>' }] },
    { id: 'project', title: '项目经历', columns: 1, blocks: [{ id: 'project-1', type: 'project', name: '校园活动报名整理', role: '活动协助', startDate: '2024.03', endDate: '2024.06', contentHtml: '<p>整理活动报名信息，核对重复记录，汇总参与名单。</p><p>协助维护报名表，整理活动通知与参与反馈。</p>' }] },
    { id: 'skills', title: '相关技能', columns: 1, blocks: [{ id: 'skills-1', type: 'text', html: '<p>内容整理、活动协助、用户反馈、基础数据分析。</p><p>熟悉 Excel、PPT 等常用办公工具。</p>' }] },
    { id: 'profile', title: '自我评价', columns: 1, blocks: [{ id: 'profile-1', type: 'text', html: '<p>注重信息整理与沟通协作，做事细致，愿意从具体任务中积累经验。</p>' }] },
  ],
}

export default function StoryMaterialPreview() {
  const [templates, setTemplates] = useState(false)
  const currentResume = useAppStore(state => state.resume)
  function alternate(kind: 'checked' | 'reordered') {
    const next = structuredClone(resume)
    if (kind === 'checked') {
      next.sections = next.sections.map(section => section.id !== 'project' ? section : { ...section, blocks: section.blocks.map(block => block.type === 'project' ? { ...block, contentHtml: '<p>协助整理活动报名信息，检查重复报名，并汇总参与名单。</p><p>协助维护报名表，整理活动通知与参与反馈。</p>' } : block) })
    } else {
      next.sections = [next.sections[2], next.sections[0], next.sections[1], ...next.sections.slice(3)]
    }
    useAppStore.getState().loadScenarioData(next)
    useAppStore.getState().setReadOnly(true)
  }
  useEffect(() => {
    const previous = useAppStore.getState().readOnly
    useAppStore.getState().loadScenarioData(structuredClone(resume))
    useAppStore.getState().setReadOnly(true)
    return () => useAppStore.getState().setReadOnly(previous)
  }, [])
  return currentResume.id === resume.id ? <>
    <div data-story-resume style={{ width: 794, background: 'white' }}><LanyingTemplate resume={currentResume} theme={{ ...getTemplateLabTheme('base'), primaryColor: '#3f6da3' }} /></div>
    <button data-mode="checked" onClick={() => alternate('checked')}>核对后</button><button data-mode="reordered" onClick={() => alternate('reordered')}>调整顺序后</button>
    <div data-story-form className="w-[390px] space-y-5 bg-slate-50 p-4">
      <TextField label="项目名称" value="校园活动报名整理" onValueChange={() => {}} required />
      <TextField label="项目角色" value="活动协助" onValueChange={() => {}} />
      <div className="grid grid-cols-2 gap-3"><TextField label="开始时间" value="2024.03" onValueChange={() => {}} /><TextField label="结束时间" value="2024.06" onValueChange={() => {}} /></div>
      <RichAiTextarea label="项目描述" html="<p>整理活动报名信息，核对重复记录，汇总参与名单。</p>" onHtmlChange={() => {}} moduleType="project" />
    </div>
    <div data-story-polish className="w-[390px] bg-slate-50 p-4"><RichAiTextarea label="项目描述" html="<p>帮忙整理报名表，检查重复的人，再做名单。</p>" onHtmlChange={() => {}} moduleType="project" /></div>
    <div data-story-polish-revised className="w-[390px] bg-slate-50 p-4"><RichAiTextarea label="项目描述" html="<p>整理活动报名信息，核对重复记录，汇总参与名单。</p>" onHtmlChange={() => {}} moduleType="project" /></div>
    <div data-story-desktop-templates className="h-[720px] w-[420px] bg-white"><RightSidebar activePanel="templates" onClose={() => {}} theme={getTemplateLabTheme('base')} tpl="lanying" templates={getAllTemplates()} onTplChange={() => {}} onThemePatch={() => {}} /></div>
    <div data-story-desktop-order className="h-[620px] w-[420px] bg-white"><RightSidebar activePanel="sections" onClose={() => {}} theme={getTemplateLabTheme('base')} tpl="lanying" templates={[]} onTplChange={() => {}} onThemePatch={() => {}} /></div>
    <button data-open-templates onClick={() => setTemplates(true)}>手机模板</button>
    <PreviewSettingsSheet open={templates} tab="template" templateId="lanying" theme={getTemplateLabTheme('base')} defaultPrimaryColor="#426eaa" locksPrimaryColor onePageStatus="idle" onClose={() => setTemplates(false)} onConfirm={() => setTemplates(false)} confirming={false} onReset={() => {}} onTabChange={() => {}} onSelectTemplate={() => {}} onUpdateTheme={() => {}} />
  </> : null
}
