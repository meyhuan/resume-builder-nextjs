export interface FieldOption {
  value: string;
  label: string;
}

export type FieldKind =
  | "text"
  | "select"
  | "suggest"
  | "date"
  | "month"
  | "number"
  | "email"
  | "tel"
  | "url"
  | "textarea";

export interface ProfileFieldConfig {
  label: string;
  kind?: FieldKind;
  options?: readonly (string | FieldOption)[];
  quickOptions?: readonly string[];
  placeholder?: string;
  suffix?: string;
  autoComplete?: string;
}

export const cities = [
  "北京",
  "上海",
  "广州",
  "深圳",
  "杭州",
  "成都",
  "南京",
  "武汉",
  "西安",
  "苏州",
  "天津",
  "重庆",
  "长沙",
  "郑州",
  "青岛",
  "厦门",
  "合肥",
  "宁波",
  "东莞",
  "佛山",
  "无锡",
  "济南",
  "大连",
  "福州",
  "昆明",
  "南昌",
  "珠海",
  "海外",
  "不限",
] as const;

export const ethnicities = [
  "汉族",
  "蒙古族",
  "回族",
  "藏族",
  "维吾尔族",
  "苗族",
  "彝族",
  "壮族",
  "布依族",
  "朝鲜族",
  "满族",
  "侗族",
  "瑶族",
  "白族",
  "土家族",
  "哈尼族",
  "哈萨克族",
  "傣族",
  "黎族",
  "傈僳族",
  "佤族",
  "畲族",
  "高山族",
  "拉祜族",
  "水族",
  "东乡族",
  "纳西族",
  "景颇族",
  "柯尔克孜族",
  "土族",
  "达斡尔族",
  "仫佬族",
  "羌族",
  "布朗族",
  "撒拉族",
  "毛南族",
  "仡佬族",
  "锡伯族",
  "阿昌族",
  "普米族",
  "塔吉克族",
  "怒族",
  "乌孜别克族",
  "俄罗斯族",
  "鄂温克族",
  "德昂族",
  "保安族",
  "裕固族",
  "京族",
  "塔塔尔族",
  "独龙族",
  "鄂伦春族",
  "赫哲族",
  "门巴族",
  "珞巴族",
  "基诺族",
] as const;

export const industries = [
  "互联网/IT",
  "人工智能",
  "电子商务",
  "游戏",
  "通信",
  "电子/半导体",
  "金融",
  "咨询",
  "教育培训",
  "快消/零售",
  "汽车",
  "新能源",
  "制造业",
  "医疗健康",
  "生物医药",
  "房地产",
  "物流/供应链",
  "文化传媒",
  "政府/公共事业",
  "专业服务",
] as const;

export const roles = [
  "产品经理",
  "项目经理",
  "软件开发",
  "前端开发",
  "后端开发",
  "客户端开发",
  "测试开发",
  "算法工程师",
  "数据分析师",
  "数据开发",
  "运维/云计算",
  "交互设计",
  "视觉设计",
  "用户研究",
  "市场营销",
  "内容运营",
  "用户运营",
  "销售",
  "人力资源",
  "财务",
  "供应链",
  "管培生",
] as const;

export const salaryRanges = [
  "面议",
  "3K以下",
  "3K-5K",
  "5K-8K",
  "8K-10K",
  "10K-15K",
  "15K-20K",
  "20K-30K",
  "30K-50K",
  "50K以上",
] as const;

export const nationalities = [
  "中国",
  "中国香港",
  "中国澳门",
  "中国台湾",
] as const;

export const relationships = [
  "父亲",
  "母亲",
  "配偶",
  "兄弟",
  "姐妹",
  "子女",
  "亲属",
  "朋友",
  "同学",
  "同事",
] as const;

export const commonQuestions = [
  "请做一个简短的自我介绍",
  "为什么选择我们公司？",
  "为什么申请这个岗位？",
  "你的职业规划是什么？",
  "你的优势和不足是什么？",
  "请描述一次最有挑战的经历",
  "你最有成就感的一件事是什么？",
  "是否接受岗位或工作地点调剂？",
] as const;
