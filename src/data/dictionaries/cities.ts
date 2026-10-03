import type { AutocompleteOption } from '@/components/ui/autocomplete-input'

/** Common cities; free input remains available for other cities and overseas locations. */
export const POPULAR_CITIES: readonly string[] = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安', '苏州',
  '天津', '重庆', '长沙', '郑州', '青岛', '大连', '沈阳', '哈尔滨', '济南', '宁波',
  '厦门', '福州', '合肥', '南昌', '昆明', '贵阳', '南宁', '兰州', '太原', '石家庄',
  '东莞', '佛山', '中山', '珠海', '惠州', '无锡', '常州', '温州', '金华', '绍兴',
  '烟台', '潍坊', '唐山', '保定', '廊坊', '徐州', '盐城', '南通', '扬州', '镇江',
  '泉州', '漳州', '桂林', '海口', '三亚', '呼和浩特', '银川', '西宁', '乌鲁木齐', '拉萨',
]

const CITY_PINYIN = [
  ['beijing', 'bj'], ['shanghai', 'sh'], ['guangzhou', 'gz'], ['shenzhen', 'sz'], ['hangzhou', 'hz'],
  ['chengdu', 'cd'], ['nanjing', 'nj'], ['wuhan', 'wh'], ['xian', 'xa'], ['suzhou', 'sz'],
  ['tianjin', 'tj'], ['chongqing', 'cq'], ['changsha', 'cs'], ['zhengzhou', 'zz'], ['qingdao', 'qd'],
  ['dalian', 'dl'], ['shenyang', 'sy'], ['haerbin', 'heb'], ['jinan', 'jn'], ['ningbo', 'nb'],
  ['xiamen', 'xm'], ['fuzhou', 'fz'], ['hefei', 'hf'], ['nanchang', 'nc'], ['kunming', 'km'],
  ['guiyang', 'gy'], ['nanning', 'nn'], ['lanzhou', 'lz'], ['taiyuan', 'ty'], ['shijiazhuang', 'sjz'],
  ['dongguan', 'dg'], ['foshan', 'fs'], ['zhongshan', 'zs'], ['zhuhai', 'zh'], ['huizhou', 'hz'],
  ['wuxi', 'wx'], ['changzhou', 'cz'], ['wenzhou', 'wz'], ['jinhua', 'jh'], ['shaoxing', 'sx'],
  ['yantai', 'yt'], ['weifang', 'wf'], ['tangshan', 'ts'], ['baoding', 'bd'], ['langfang', 'lf'],
  ['xuzhou', 'xz'], ['yancheng', 'yc'], ['nantong', 'nt'], ['yangzhou', 'yz'], ['zhenjiang', 'zj'],
  ['quanzhou', 'qz'], ['zhangzhou', 'zz'], ['guilin', 'gl'], ['haikou', 'hk'], ['sanya', 'sy'],
  ['huhehaote', 'hhht'], ['yinchuan', 'yc'], ['xining', 'xn'], ['wulumuqi', 'wlmq'], ['lasa', 'ls'],
] as const

export const CITY_OPTIONS: readonly AutocompleteOption[] = POPULAR_CITIES.map((city, index) => ({
  value: city, label: city, aliases: CITY_PINYIN[index],
}))
export const INTENTION_CITY_OPTIONS: readonly AutocompleteOption[] = [{ value: '不限', label: '不限' }, ...CITY_OPTIONS]
