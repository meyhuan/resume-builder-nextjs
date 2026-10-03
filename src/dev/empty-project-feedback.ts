import type { ResumeData } from '@/entities/resume/resume-data'

/** Synthetic regression fixture matching the reported resume's structure and content density. */
export const emptyProjectFeedbackResume: ResumeData = {
  id: 'scenario-empty-project-feedback',
  name: '林晓宁',
  baseInfo: { gender: '女', age: 21, phone: '13800000000', email: 'test@example.com', showAvatar: false },
  jobIntention: { position: '空调 / 制冷 / 热管理工程师', type: '制冷系统设计、暖通供热、设备热管理相关技术岗' },
  sections: [
    { id: 'feedback-education', title: '教育经历', columns: 1, blocks: [
      { id: 'feedback-edu-1', type: 'education', school: '示例工学院', major: '能源与动力工程', degree: '本科', startDate: '2023.09', endDate: '至今', courseHtml: '<p>主修课程：工程热力学、传热学、流体力学、制冷原理与设备、机械设计基础。</p>' },
    ] },
    { id: 'feedback-internship', title: '实习经历', columns: 1, blocks: [
      { id: 'feedback-intern-1', type: 'experience', company: '多能互补供热示范工程', position: '实习生', startDate: '2026.09', endDate: '', contentHtml: '<ul><li>参与热源及供热管网运行数据整理，协助核对暖通图纸，完成典型建筑供热负荷计算。</li><li>整理运行记录和设备参数，汇总十余份运行报告，协助比较不同热源组合的运行效率与经济性。</li></ul>' },
      { id: 'feedback-intern-2', type: 'experience', company: '水产物流园冷库制冷系统', position: '实习生', startDate: '2026.09', endDate: '至今', contentHtml: '<ul><li>参与冷库冷负荷估算，了解螺杆式压缩机选型方法，检查围护结构保温参数。</li><li>协助整理制冷设备选型资料，核对系统运行条件与设备参数，形成选型说明及资料清单。</li></ul>' },
      { id: 'feedback-intern-3', type: 'experience', company: '校内实践', position: '学生', industry: '金工、钣管焊综合实习', startDate: '', endDate: '', contentHtml: '<p>完成车工、铣工、钳工及钣金、管道加工和焊接等综合实践，熟悉典型机械加工工艺、安全操作规范及基本测量方法。结合暖通设备结构理解管路连接、构件加工与安装要求，提升工程图纸识读、实际操作及团队协作能力。</p>' },
    ] },
    { id: 'feedback-campus', title: '在校经历', columns: 1, blocks: [
      { id: 'feedback-campus-1', type: 'campus', organization: '示例工学院党团工委', position: '宣传部部长', startDate: '2023.09', endDate: '至今', contentHtml: '<ul><li>连续获得校级奖学金，专业成绩位居前列，获评五好学生。</li><li>组织校园活动宣传，统筹文案、物料及跨部门沟通，按期完成活动筹备与总结。</li></ul>' },
    ] },
    { id: 'feedback-summary', title: '个人总结', columns: 1, blocks: [
      { id: 'feedback-summary-1', type: 'text', html: '<p>掌握制冷与供热基础理论，具备负荷计算、设备选型及工程图纸识读能力。通过工程实习与校内实践积累实际操作经验，能够快速学习新知识，注重细节与团队协作，希望从事暖通、制冷系统或设备热管理相关技术工作。</p>' },
    ] },
    { id: 'feedback-skills', title: '相关技能', columns: 1, blocks: [
      { id: 'feedback-skills-1', type: 'text', html: '<ul><li>专业能力：掌握制冷与暖通系统基本设计方法，可完成初步冷热负荷计算、设备参数核对及选型资料整理，能够结合工况分析系统运行特点。</li><li>软件工具：熟悉 AutoCAD 工程制图，能够使用 Excel 进行数据整理、基础计算及图表分析，熟练使用 Office 编制说明文档与汇报材料。</li><li>语言能力：通过大学英语等级考试，能够阅读制冷与传热相关英文资料，理解常见设备技术参数与专业术语。</li></ul>' },
    ] },
    { id: 'feedback-empty-project', title: '项目经历', columns: 1, blocks: [] },
  ],
}
