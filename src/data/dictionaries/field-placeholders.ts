/**
 * Field placeholders and tips ported from miniprogram fieldDic.wxs.
 * Used as placeholder text and micro-tips in the mobile edit forms.
 */

export const FIELD_PLACEHOLDERS: Record<string, string> = {
  workDescription:
    '具体简要的描述，将有助于HR第一时间发现你的亮点，可以从以下几个方面入手：工作内容、工作业绩、方法总结',
  projectDescription:
    '具体简要的描述，将有助于HR第一时间发现你的亮点，可以从以下几个方面入手：项目内容、项目业绩、项目总结',
  campusDescription:
    '1.曾组织"XX活动""XX活动"等X次校级协会活动 2.和校外企业保持联系，为协会拉取赞助总计XX元 3.负责向学校协会负责人汇报协会工作，每季度一次',
  educationDescription:
    '尽量简洁，突出重点，成绩优异的话建议写上GPA或排名信息\n如：软件工程、面向对象程序设计、项目管理、数据结构、计算机网络\nGPA3.9/4.0，专业前5%',
  selfEvaluation:
    '本人性格开朗，积极向上，对工作有极大的兴趣和爱好，对工作认真负责，注重效率，具有良好的业务能力和身体素质，能够很好的适应团队工作，有上进心。',
  skill:
    '可填写相关职业技能，如熟练掌握办公软件、绘图软件等',
  language:
    '英语能力（分数），六级（分数），法语（分数）',
}

export const FIELD_TIPS: Record<string, string> = {
  workDescription: '用动词开头、量化成果更有说服力',
  projectDescription: 'STAR 法则：情境-任务-行动-结果',
  selfEvaluation: '3-5 句即可，避免空话套话',
  skill: '标注熟练度，比罗列更专业',
  name: '用真实姓名，招聘者会查证',
  objective: '填写具体岗位名称，比"不限"更吸引 HR',
  company: '公司全称比简称更正式',
  school: '学校全称，如"XX大学"',
}
