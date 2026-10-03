import { getSectionDisplayTitle } from '@/entities/resume/section-display-title'
import type { ResumeData } from '@/entities/resume/resume-data'
import { prepareResumeForExport } from '@/lib/resume-export-visibility'
import { normalizeJobIntention } from '@/entities/user/job-intention-fields'

export function exportResumeToMarkdown(resume: ResumeData): string {
  resume = prepareResumeForExport(resume)
  const lines: string[] = []

  // 1. Header (Name + Base Info)
  lines.push(`# ${resume.name || '姓名'}`)
  lines.push('')

  if (resume.baseInfo) {
    const info = resume.baseInfo
    const parts = [
      info.age ? `年龄: ${info.age}` : '',
      info.gender ? `性别: ${info.gender}` : '',
      info.phone ? `电话: ${info.phone}` : '',
      info.email ? `邮箱: ${info.email}` : '',
      info.location ? `所在地: ${info.location}` : '',
    ].filter(Boolean)
    
    if (parts.length > 0) {
      lines.push(parts.join(' | '))
      lines.push('')
    }
  }

  // 2. Job Intention
  if (resume.jobIntentionVisible && resume.jobIntention) {
    lines.push('## 求职意向')
    lines.push('')
    const intent = normalizeJobIntention(resume.jobIntention)
    const parts = [
      intent.position ? `意向岗位: ${intent.position}` : '',
      intent.city ? `意向城市: ${intent.city}` : '',
      intent.salary ? `期望薪资: ${intent.salary}` : '',
      intent.type ? `工作性质: ${intent.type}` : '',
      intent.recruitmentType ? `招聘类型: ${intent.recruitmentType}` : '',
      intent.industry ? `期望行业: ${intent.industry}` : '',
      intent.currentStatus ? `求职状态: ${intent.currentStatus}` : '',
    ].filter(Boolean)
    
    if (parts.length > 0) {
      lines.push(parts.join(' | '))
      lines.push('')
    }
  }

  // 3. Sections
  if (resume.sections && resume.sections.length > 0) {
    resume.sections.forEach((section) => {
      lines.push(`## ${getSectionDisplayTitle(section) || '自定义模块'}`)
      lines.push('')
      
      section.blocks.forEach((block) => {
        if (block.type === 'experience') {
          const leftTop = block.company || ''
          const leftBottom = block.position || ''
          const rightTop = block.startDate && block.endDate ? `${block.startDate} - ${block.endDate}` : (block.startDate || block.endDate || '')

          if (leftTop || rightTop) {
            lines.push(`### ${leftTop || ''} ${rightTop ? `(${rightTop})` : ''}`)
          }
          if (leftBottom) {
            lines.push(`**${leftBottom}**`)
          }
          if (block.contentHtml) {
            lines.push('')
            lines.push(stripHtmlTags(block.contentHtml))
          }
          lines.push('')
        } else if (block.type === 'project') {
          const leftTop = block.name || ''
          const leftBottom = block.role || ''
          const rightTop = block.startDate && block.endDate ? `${block.startDate} - ${block.endDate}` : (block.startDate || block.endDate || '')

          if (leftTop || rightTop) {
            lines.push(`### ${leftTop || ''} ${rightTop ? `(${rightTop})` : ''}`)
          }
          if (leftBottom) {
            lines.push(`**${leftBottom}**`)
          }
          if (block.contentHtml) {
            lines.push('')
            lines.push(stripHtmlTags(block.contentHtml))
          }
          lines.push('')
        } else if (block.type === 'education') {
          const leftTop = block.school || ''
          const leftBottom = block.major || ''
          const rightTop = block.startDate && block.endDate ? `${block.startDate} - ${block.endDate}` : (block.startDate || block.endDate || '')

          if (leftTop || rightTop) {
            lines.push(`### ${leftTop || ''} ${rightTop ? `(${rightTop})` : ''}`)
          }
          if (leftBottom) {
            lines.push(`**${leftBottom}**`)
          }
          if (block.courseHtml) {
            lines.push('')
            lines.push(stripHtmlTags(block.courseHtml))
          }
          lines.push('')
        } else if (block.type === 'campus') {
          const leftTop = block.organization || ''
          const leftBottom = block.position || ''
          const rightTop = block.startDate && block.endDate ? `${block.startDate} - ${block.endDate}` : (block.startDate || block.endDate || '')

          if (leftTop || rightTop) {
            lines.push(`### ${leftTop || ''} ${rightTop ? `(${rightTop})` : ''}`)
          }
          if (leftBottom) {
            lines.push(`**${leftBottom}**`)
          }
          if (block.contentHtml) {
            lines.push('')
            lines.push(stripHtmlTags(block.contentHtml))
          }
          lines.push('')
        } else if (block.type === 'text') {
          if (block.html) {
            lines.push(stripHtmlTags(block.html))
            lines.push('')
          }
        } else if (block.type === 'list') {
          if (block.items && block.items.length > 0) {
            block.items.forEach(item => {
              lines.push(`- ${stripHtmlTags(item.html)}`)
            })
            lines.push('')
          }
        }
      })
    })
  }

  return lines.join('\n')
}

function stripHtmlTags(html: string): string {
  if (!html) return ''
  // Basic conversion: replace common tags with newlines, remove the rest
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '- ')
  
  // Remove remaining HTML tags
  text = text.replace(/<[^>]*>?/gm, '')
  
  // Clean up extra spaces/newlines
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 || line === '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}
