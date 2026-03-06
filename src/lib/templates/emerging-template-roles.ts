type EmergingTemplateRole = {
  role: string;
  industry: string;
  category: string;
};

export const emergingTemplateRoles: readonly EmergingTemplateRole[] = [
  { role: 'AI产品经理', industry: '互联网通信', category: '产品' },
  { role: '数据产品经理', industry: '互联网通信', category: '产品' },
  { role: 'B端产品经理', industry: '互联网通信', category: '产品' },
  { role: '增长产品经理', industry: '互联网通信', category: '产品' },
  { role: 'AIGC运营', industry: '互联网通信', category: '运营' },
  { role: '增长运营', industry: '互联网通信', category: '运营' },
  { role: '私域运营', industry: '互联网通信', category: '运营' },
  { role: '社群运营', industry: '互联网通信', category: '运营' },
  { role: '短视频运营', industry: '互联网通信', category: '运营' },
  { role: '直播运营', industry: '互联网通信', category: '运营' },
  { role: '达人运营', industry: '互联网通信', category: '运营' },
  { role: '电商运营', industry: '互联网通信', category: '运营' },
  { role: '跨境电商运营', industry: '互联网通信', category: '运营' },
  { role: '数据运营', industry: '互联网通信', category: '运营' },
  { role: '提示词工程师', industry: '互联网通信', category: '技术' },
  { role: '大模型应用工程师', industry: '互联网通信', category: '技术' },
  { role: '算法工程师', industry: '互联网通信', category: '技术' },
  { role: '机器学习工程师', industry: '互联网通信', category: '技术' },
  { role: '数据分析师', industry: '互联网通信', category: '技术' },
  { role: '商业分析师', industry: '互联网通信', category: '技术' },
  { role: 'UX设计师', industry: '广告/传媒/设计', category: '设计' },
  { role: '体验设计师', industry: '广告/传媒/设计', category: '设计' },
  { role: '动效设计师', industry: '广告/传媒/设计', category: '设计' },
  { role: '视觉设计师', industry: '广告/传媒/设计', category: '设计' },
  { role: '品牌设计师', industry: '广告/传媒/设计', category: '设计' },
  { role: '电商设计师', industry: '广告/传媒/设计', category: '设计' },
  { role: '用户研究员', industry: '广告/传媒/设计', category: '设计' },
  { role: '客户成功', industry: '管理/人力/行政', category: '人事' },
  { role: '实施顾问', industry: '教育/咨询/翻译', category: '咨询' },
  { role: '解决方案顾问', industry: '教育/咨询/翻译', category: '咨询' },
  { role: '售前顾问', industry: '教育/咨询/翻译', category: '咨询' },
  { role: '交付经理', industry: '管理/人力/行政', category: '人事' },
] as const;
