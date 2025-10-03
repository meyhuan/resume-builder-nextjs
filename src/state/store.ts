/**
 * Global app store using Zustand with Immer.
 * Holds resume data and theme tokens, and exposes minimal actions.
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { produce } from 'immer'
import type { AppState } from '@/state/app-state'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { UUID } from '@/entities/common/uuid'
import type { ExternalResume } from '@/io/external-resume-types'
import { mapExternalResume } from '@/io/external-resume-importer'

const DEFAULT_FONT_SIZE: number = 14
const defaultTheme: ThemeTokens = {
  primaryColor: '#111827',
  textColor: '#111827',
  fontFamily: 'Inter, Noto Sans SC, system-ui, sans-serif',
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: 1.5,
  spacingScale: 1,
}

const externalResumeJson: ExternalResume = {
  base_info: {
    name: '袁观环',
    gender: '男',
    age: '33',
    birthday: '1992.6.19',
    show_age_type: 1,
    phone: '15602277630',
    mail: '627655140@qq.com',
    url: 'https://img8.file.cache.docer.com/storage/20250928/33Jy88RdvALK6nZ11bmKM4suaqOa.jpg',
    nation: '',
    hide_avatar: false,
    politics_status: '',
    height: '',
    weight: '',
  },
  job_intention: {
    objective: '移动端开发工程师',
    category: '',
    industry: '',
    curr_salary: '',
    workyear_age: '',
    location: '',
    home_location: '',
    current_state: '',
    hope: '',
    hope_industry: '',
    city: '武汉',
    type: '社招',
    salary: '面议',
    apply: 0,
    is_hide: false,
  },
  experience: [
    {
      id: '68dd3f3a18c61a000133e3fc',
      name: '联想集团',
      category: '',
      industry: '计算机软件',
      position: '移动端开发工程师',
      work_place: '',
      month_salary: '',
      work_industry: '',
      content: '<ul><li>参与公司级核心项目超级互联的多端开发工作，实现Android、Windows和iOS设备间的无缝协作</li><li>负责 Android 端架构的搭建，采用MVI架构和Kotlin语言，结合DataBinding实现响应式编程框架</li><li>负责 Android 端性能分析和优化，通过内存分析和性能调优解决OOM、ANR等问题，将应用流畅度提升30%</li><li>参与多端通信协议和数据结构制定，开发ShareHub模块实现跨设备文件同步功能</li></ul>',
      is_hide: false,
      period: {
        start: '2023.03',
        end: '至今',
      },
    },
    {
      id: '68dd3f3a18c61a000133e3f1',
      name: '腾讯科技',
      category: '',
      industry: '互联网',
      position: 'Android开发工程师',
      work_place: '',
      month_salary: '',
      work_industry: '',
      content: '<ul><li>参与微信读书Android端核心功能开发，负责阅读器模块的性能优化，使页面渲染速度提升40%</li><li>独立完成用户反馈系统的设计与开发，日均处理反馈量提升至5000+条</li><li>协助团队完成App架构升级，采用组件化开发模式，使编译时间缩短50%</li><li>参与Code Review和技术分享，帮助新人快速融入团队开发流程</li></ul>',
      is_hide: false,
      period: {
        start: '2020.07',
        end: '2023.02',
      },
    },
  ],
  intern: [
    {
      id: '68dd3f3a18c61a000133e3fd',
      name: '字节跳动',
      category: '',
      industry: '互联网',
      position: 'Android实习生',
      work_place: '',
      month_salary: '',
      work_industry: '',
      content: '<ul><li>参与抖音Android端短视频播放器优化，使视频加载速度提升25%</li><li>协助开发用户个性化推荐功能，学习并应用推荐算法基础知识</li><li>完成Bug修复和单元测试编写，代码覆盖率达到85%以上</li><li>参与敏捷开发流程，与产品、设计团队紧密协作完成需求</li></ul>',
      is_hide: false,
      period: {
        start: '2019.07',
        end: '2020.01',
      },
    },
  ],
  education: [
    {
      id: '68dd3f3a18c61a000133e3fe',
      name: '华南理工大学',
      major: '软件工程',
      degree: '本科',
      is_hide: false,
      recruit_type: '统招',
      course: '<p>核心课程：Java程序设计、数据结构与算法、操作系统、计算机网络、数据库原理、软件工程、移动应用开发等。GPA 3.7/4.0，连续三年获得校级奖学金，担任计算机协会技术部部长。</p>',
      period: {
        start: '2016.09',
        end: '2020.06',
      },
      content: '',
    },
  ],
  program_experience: [
    {
      id: '68dd3f3a18c61a000133e3ff',
      name: '超级互联跨平台协作系统',
      role: '项目负责人',
      category: '',
      content: '<p><strong>项目背景：</strong>开发跨平台互联解决方案，实现Android、Windows和iOS设备间的无缝协作，包括文件同步、鼠标穿越、应用投屏、屏幕扩展、摄像头共享和电脑锁等功能。</p><p><strong>项目职责：</strong></p><ul><li>主导Android端架构设计，采用MVI架构和Kotlin语言，结合DataBinding实现响应式编程框架</li><li>负责ShareHub模块开发，基于NFS技术实现跨设备文件同步功能，设计并实现支持文件拖拽操作的全局浮窗</li><li>开发Messages模块，通过SmsManager接口实现跨设备短信/彩信发送功能，完成数据同步和展示逻辑</li><li>针对Android碎片化问题，开发自适应方案，解决不同厂商设备的兼容性问题</li><li>通过内存分析和性能调优，解决OOM、ANR等关键性能问题，将应用流畅度提升30%</li></ul>',
      is_hide: false,
      period: {
        start: '2023.03',
        end: '至今',
      },
    },
    {
      id: '68dd3f3a18c61a000133e3f2',
      name: '智能健康管理App',
      role: '核心开发',
      category: '',
      content: '<p><strong>项目背景：</strong>开发一款面向个人用户的智能健康管理应用，集成运动追踪、饮食记录、睡眠监测等功能，帮助用户科学管理健康数据。</p><p><strong>项目职责：</strong></p><ul><li>负责App整体架构设计，采用MVVM架构模式，使用Retrofit+RxJava处理网络请求</li><li>实现运动追踪模块，集成Google Fit API获取用户运动数据，实现实时数据同步</li><li>开发数据可视化功能，使用MPAndroidChart绘制各类健康数据趋势图表</li><li>优化电池消耗，通过后台任务调度和传感器优化，使耗电量降低40%</li><li>用户量突破10万，应用评分4.6/5.0，获得Google Play编辑推荐</li></ul>',
      is_hide: false,
      period: {
        start: '2021.05',
        end: '2022.08',
      },
    },
  ],
  school_exps: [
    {
      id: '68dd3f3a18c61a000133e400',
      name: '校计算机协会',
      position: '技术部部长',
      content: '<ul><li>负责协会技术培训工作，组织并主讲Android开发、Java编程等技术讲座，累计培训学员200余人</li><li>策划并主办"校园APP创意大赛"，吸引全校30余支队伍参赛，提升协会影响力</li><li>带领团队开发校园二手交易平台，用户量达到2000+，日活跃用户300+</li><li>协助举办技术分享会和编程马拉松活动，促进校内技术交流氛围</li></ul>',
      is_hide: false,
      period: {
        start: '2018.09',
        end: '2020.06',
      },
    },
    {
      id: '68dd3f3a18c61a000133e401',
      name: '校学生会',
      position: '宣传部成员',
      content: '<ul><li>参与策划和执行学校大型活动的宣传工作，包括迎新晚会、校园文化节等</li><li>负责学生会官方微信公众号的运营，撰写推文并设计海报，粉丝量增长至5000+</li><li>协助开发学生会活动报名小程序，简化报名流程，提高工作效率</li><li>培养了良好的沟通协调能力和团队协作精神</li></ul>',
      is_hide: false,
      period: {
        start: '2017.09',
        end: '2018.06',
      },
    },
  ],
  self_evaluation: {
    content: '<p>5年移动端开发经验，专注于Android平台应用开发，具备扎实的计算机基础和良好的编程习惯。熟悉Android系统架构和常用框架，有丰富的性能优化经验。具有良好的沟通能力、团队协作能力和抗压能力，能够独立负责项目模块的设计与开发。热爱技术，关注行业动态，乐于在团队中分享技术经验。工作态度认真负责，善于思考和解决问题，对编程充满热情。</p>',
    is_hide: false,
  },
  skills: {
    content: '<ul><li>5年Android开发经验，熟练掌握Java和Kotlin语言，熟悉Android SDK和常用开源框架</li><li>熟悉MVVM、MVI等架构模式，了解组件化、模块化开发思想</li><li>熟悉Android性能优化，包括内存优化、启动优化、布局优化、网络优化等</li><li>熟悉多线程编程，掌握Handler、AsyncTask、协程等并发处理机制</li><li>熟悉常用设计模式和数据结构与算法，具备良好的代码设计能力</li><li>了解Android系统源码，如Activity启动流程、View绘制流程、Binder机制等</li><li>熟悉Git版本控制工具，有良好的代码规范和文档编写习惯</li><li>具备跨端开发经验，了解Flutter、React Native等跨平台框架</li></ul>',
    is_hide: false,
  },
  qualifications: {
    content: '<p>大学英语六级（CET-6）、计算机技术与软件专业技术资格（中级）、软件设计师证书</p>',
    is_hide: false,
  },
  custom_module_info: [
    {
      name: '自定义模块',
      content: '<p>这个是自定一个的内容</p>',
      is_hide: false,
      module_name: 'custom_module_0101fef91e47bc1e3f1d2e48d512bbf6',
    },
  ],
}

const defaultResume = mapExternalResume(externalResumeJson)

function createId(prefix: string): UUID {
  const ts: string = Date.now().toString(36)
  const rnd: string = Math.random().toString(36).slice(2, 6)
  return `${prefix}-${ts}-${rnd}`
}

const DEFAULT_NEW_TEXT_HTML: string = '<p>New text block. Click to edit.</p>'

/**
 * Create app store.
 */
export const useAppStore = create<AppState>()(
  devtools((set) => ({
    resume: defaultResume,
    theme: defaultTheme,
    setResume: (updater) =>
      set((state) => ({
        resume: produce(state.resume, updater),
      }), false, 'resume/set'),
    setTheme: (updater) =>
      set((state) => ({
        theme: produce(state.theme, updater),
      }), false, 'theme/set'),
    moveBlockInSection: (sectionId, activeId, overId) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const fromIdx: number = section.blocks.findIndex((b) => b.id === activeId)
          const toIdx: number = section.blocks.findIndex((b) => b.id === overId)
          if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
          const [moved] = section.blocks.splice(fromIdx, 1)
          section.blocks.splice(toIdx, 0, moved)
        }),
      }), false, 'section/moveBlock'),
    moveBlockToSection: (fromSectionId, blockId, toSectionId, toIndex) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          const fromSection = draft.sections.find((s) => s.id === fromSectionId)
          const toSection = draft.sections.find((s) => s.id === toSectionId)
          if (!fromSection || !toSection) return
          const blockIdx: number = fromSection.blocks.findIndex((b) => b.id === blockId)
          if (blockIdx < 0) return
          const [block] = fromSection.blocks.splice(blockIdx, 1)
          toSection.blocks.splice(toIndex, 0, block)
        }),
      }), false, 'section/moveBlockToSection'),
    addTextBlock: (sectionId) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const newBlock = {
            id: createId('block'),
            type: 'text' as const,
            html: DEFAULT_NEW_TEXT_HTML,
          }
          section.blocks.push(newBlock)
        }),
      }), false, 'section/addTextBlock'),
    addBlockByType: (sectionId) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          
          const title = section.title.toLowerCase()
          let newBlock
          
          if (title.includes('教育') || title.includes('education')) {
            newBlock = {
              id: createId('block'),
              type: 'education' as const,
              school: '学校名称',
              major: '专业',
              degree: '学历',
              startDate: '开始时间',
              endDate: '结束时间',
              courseHtml: '<p>大学之前的教育经历建议不写，尽量写与求职行业或者求职岗位相关的课程。有交流交换的经验可以在教育经历中展示。工作年限较多或成绩自认不够优异，则可以直接将教育背景置清晰列后，重点其他模块。成绩优异的话建议写上GPA及排名等信息，尽量简洁。</p>',
            }
          } else if (title.includes('工作') || title.includes('experience') || title.includes('经历')) {
            newBlock = {
              id: createId('block'),
              type: 'experience' as const,
              company: '公司名称',
              position: '职位名称',
              startDate: '开始时间',
              endDate: '结束时间',
              contentHtml: '<p>工作内容描述</p>',
            }
          } else if (title.includes('项目') || title.includes('project')) {
            newBlock = {
              id: createId('block'),
              type: 'project' as const,
              name: '项目名称',
              role: '项目角色',
              startDate: '开始时间',
              endDate: '结束时间',
              contentHtml: '<p>项目描述</p>',
            }
          } else {
            newBlock = {
              id: createId('block'),
              type: 'text' as const,
              html: DEFAULT_NEW_TEXT_HTML,
            }
          }
          
          section.blocks.push(newBlock)
        }),
      }), false, 'section/addBlockByType'),
    deleteBlock: (sectionId, blockId) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const idx: number = section.blocks.findIndex((b) => b.id === blockId)
          if (idx >= 0) {
            section.blocks.splice(idx, 1)
          }
        }),
      }), false, 'section/deleteBlock'),
    moveBlockUp: (sectionId, blockId) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const idx: number = section.blocks.findIndex((b) => b.id === blockId)
          if (idx <= 0) return
          const temp = section.blocks[idx]
          section.blocks[idx] = section.blocks[idx - 1]
          section.blocks[idx - 1] = temp
        }),
      }), false, 'section/moveBlockUp'),
    moveBlockDown: (sectionId, blockId) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const idx: number = section.blocks.findIndex((b) => b.id === blockId)
          if (idx < 0 || idx >= section.blocks.length - 1) return
          const temp = section.blocks[idx]
          section.blocks[idx] = section.blocks[idx + 1]
          section.blocks[idx + 1] = temp
        }),
      }), false, 'section/moveBlockDown'),
    moveSection: (activeSectionId, overSectionId) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          const from: number = draft.sections.findIndex((s) => s.id === activeSectionId)
          const to: number = draft.sections.findIndex((s) => s.id === overSectionId)
          if (from < 0 || to < 0 || from === to) return
          const [moved] = draft.sections.splice(from, 1)
          draft.sections.splice(to, 0, moved)
        }),
      }), false, 'section/moveSection'),
    importExternalResume: (external: ExternalResume) =>
      set(() => ({
        resume: mapExternalResume(external),
      }), false, 'resume/import'),
    updateBaseInfo: (baseInfo, name) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          draft.name = name
          draft.baseInfo = baseInfo
        }),
      }), false, 'resume/updateBaseInfo'),
    updateJobIntention: (jobIntention) =>
      set((state) => ({
        resume: produce(state.resume, (draft) => {
          draft.jobIntention = jobIntention
        }),
      }), false, 'resume/updateJobIntention'),
  }))
)
