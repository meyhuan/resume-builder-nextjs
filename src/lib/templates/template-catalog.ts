type TemplateCatalogItem = {
  id: string;
  name: string;
  description: string;
  preview: string;
  tags: readonly string[];
};

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
    preview: '/thumbnails/template_lanxin.svg',
    tags: ['通用', '时间轴', '浅蓝', '专业'],
  },
  {
    id: 'tablegrid',
    name: '表格',
    description: '传统表格结构，信息分区清晰，适合正式投递与标准化简历',
    preview: '/thumbnails/template_tablegrid.svg',
    tags: ['通用', '表格', '正式', '标准'],
  },
];
