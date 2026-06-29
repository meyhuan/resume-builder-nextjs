type TemplateCatalogItem = {
  id: string;
  name: string;
  description: string;
  preview: string;
  tags: readonly string[];
};

const HIDDEN_TEMPLATE_IDS: ReadonlySet<string> = new Set(['lanxin']);

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
  {
    id: 'dense',
    name: '密排',
    description: '青绿时间线 + 极高信息密度，适合内容较多、希望尽量压缩到一页的简历',
    preview: '/thumbnails/template_dense.webp',
    tags: ['原创', '紧凑', '时间轴', '一页'],
  },
  {
    id: 'ziji',
    name: '紫记',
    description: '紫色渐变头图 + 双栏履历笔记，适合个人主页感、运营、产品与创意岗位',
    preview: '/thumbnails/template_ziji.webp',
    tags: ['原创', '双栏', '紫色', '个人履历'],
  },
  {
    id: 'lanfa',
    name: '蓝法',
    description: '深蓝法务风格 + 端正信息分区，适合法务、行政与商务支持岗位',
    preview: '/thumbnails/template_lanfa.webp',
    tags: ['原创', '蓝色', '正式', '法务'],
  },
  {
    id: 'lanying',
    name: '蓝营',
    description: '蓝色商务条幅 + 清晰模块标题，适合市场、运营和销售支持岗位',
    preview: '/thumbnails/template_lanying.webp',
    tags: ['原创', '蓝色', '市场', '商务'],
  },
  {
    id: 'qiance',
    name: '浅策',
    description: '浅蓝柔和页眉 + 清爽单栏排版，适合策划、运营和校招简历',
    preview: '/thumbnails/template_qiance.webp',
    tags: ['原创', '浅蓝', '策划', '清爽'],
  },
  {
    id: 'heijiao',
    name: '黑教',
    description: '黑白教师风格 + 严谨分区，适合教师、教培和学术类岗位',
    preview: '/thumbnails/template_heijiao.webp',
    tags: ['原创', '黑白', '教师', '正式'],
  },
  {
    id: 'shanglan',
    name: '商蓝',
    description: '蓝紫侧栏 + 商务应届布局，适合应届生、实习和商务通用岗位',
    preview: '/thumbnails/template_shanglan.webp',
    tags: ['原创', '双栏', '应届生', '蓝紫'],
  },
  {
    id: 'jinhang',
    name: '金行',
    description: '金色银行风格 + 稳重线条，适合银行、金融和传统行业岗位',
    preview: '/thumbnails/template_jinhang.webp',
    tags: ['原创', '金色', '银行', '金融'],
  },
  {
    id: 'jijian',
    name: '极简黑',
    description: '黑白极简 + 高信息密度，适合希望快速压缩内容的一页简历',
    preview: '/thumbnails/template_jijian.webp',
    tags: ['原创', '黑白', '极简', '一页'],
  },
  {
    id: 'lanzix',
    name: '蓝紫',
    description: '蓝紫点线装饰 + 应届生友好排版，适合校招、实习和初级岗位',
    preview: '/thumbnails/template_lanzix.webp',
    tags: ['原创', '蓝紫', '校招', '应届生'],
  },
].filter((template: TemplateCatalogItem) => !HIDDEN_TEMPLATE_IDS.has(template.id));
