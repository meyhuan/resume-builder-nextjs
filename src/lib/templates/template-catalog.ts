type TemplateCatalogItem = {
  id: string;
  name: string;
  description: string;
  preview: string;
  tags: readonly string[];
};

const HIDDEN_TEMPLATE_IDS: ReadonlySet<string> = new Set(['lanxin', 'tablegrid']);

export const templateCatalog: readonly TemplateCatalogItem[] = [
  {
    id: 'simple',
    name: '简约',
    description: '简洁大方，适合所有场景',
    preview: '/thumbnails/template_simple.webp',
    tags: ['通用', '简洁'],
  },
  {
    id: 'elegant',
    name: '典雅',
    description: '深色头部 + 金色点缀，庄重大方，适合正式场合',
    preview: '/thumbnails/template_elegant.webp',
    tags: ['正式', '庄重', '典雅', '金色'],
  },
  {
    id: 'warm',
    name: '双栏',
    description: '双列布局，左侧边栏 + 右侧主内容，淡黄色点缀',
    preview: '/thumbnails/template_warm.webp',
    tags: ['通用', '双列', '淡黄', '侧边栏'],
  },
  {
    id: 'timeline',
    name: '时间轴',
    description: '左侧日期 + 右侧内容，竖线贯穿，经典时间轴风格',
    preview: '/thumbnails/template_timeline.webp',
    tags: ['通用', '时间轴', '经典', '简洁'],
  },
  {
    id: 'lanxin',
    name: '蓝芯',
    description: '浅蓝页眉 + 左侧竖线节点，清爽专业，适合产品、运营与校招场景',
    preview: '/thumbnails/template_lanxin.webp',
    tags: ['通用', '时间轴', '浅蓝', '专业'],
  },
  {
    id: 'tablegrid',
    name: '表格',
    description: '传统表格结构，信息分区清晰，适合正式投递与标准化简历',
    preview: '/thumbnails/template_tablegrid.webp',
    tags: ['通用', '表格', '正式', '标准'],
  },
  {
    id: 'xinghe',
    name: '星河',
    description: '紫色渐变点缀 + 大气单栏，适合产品、运营、市场与互联网通用岗位',
    preview: '/thumbnails/template_xinghe.webp',
    tags: ['原创', '通用', '精美', '大气'],
  },
  {
    id: 'lifeng',
    name: '砺锋',
    description: '深色侧栏 + 紧凑信息布局，适合技术、工程、项目管理与咨询岗位',
    preview: '/thumbnails/template_lifeng.webp',
    tags: ['原创', '紧凑', '双栏', '技术'],
  },
  {
    id: 'qingsui',
    name: '青穗',
    description: '青蓝渐变页眉 + 校招亮点区，适合应届生、实习和转专业求职',
    preview: '/thumbnails/template_qingsui.webp',
    tags: ['原创', '校招', '应届生', '清爽'],
  },
  {
    id: 'yuanshan',
    name: '远山',
    description: '暖棕双线 + 稳重业绩区，适合资深专家、高管和管理岗位',
    preview: '/thumbnails/template_yuanshan.webp',
    tags: ['原创', '资深', '管理', '稳重'],
  },
  {
    id: 'hengjian',
    name: '衡简',
    description: '正式表格信息 + 端正分区，适合国企、银行、事业单位与传统行业',
    preview: '/thumbnails/template_hengjian.webp',
    tags: ['原创', '正式', '国企', '表格'],
  },
  {
    id: 'yiyetong',
    name: '一页通',
    description: '极致一页承载，压缩高效，适合海投和信息量较多的用户',
    preview: '/thumbnails/template_yiyetong.webp',
    tags: ['原创', '紧凑', '一页', '海投'],
  },
  {
    id: 'lanzhe',
    name: '蓝折',
    description: '蓝色折纸页眉 + 立体签条模块，紧凑精致，适合年轻用户、校招、实习与运营岗位',
    preview: '/thumbnails/template_lanzhe.webp',
    tags: ['原创', '校招', '折角', '紧凑'],
  },
].filter((template: TemplateCatalogItem) => !HIDDEN_TEMPLATE_IDS.has(template.id));
