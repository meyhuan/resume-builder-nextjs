import type { AutocompleteOption } from '@/components/ui/autocomplete-input'
import cities from './city-suggestions.json'

/** Display common choices first. Coverage and snapshot limitations: choice-sources.md. */
export const POPULAR_CITIES: readonly string[] = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安', '苏州',
  '天津', '重庆', '长沙', '郑州', '青岛', '大连', '沈阳', '哈尔滨', '济南', '宁波',
  '厦门', '福州', '合肥', '南昌', '昆明', '贵阳', '南宁', '兰州', '太原', '石家庄',
  '东莞', '佛山', '中山', '珠海', '惠州', '无锡', '常州', '温州', '金华', '绍兴',
  '烟台', '潍坊', '唐山', '保定', '廊坊', '徐州', '盐城', '南通', '扬州', '镇江',
  '泉州', '漳州', '桂林', '海口', '三亚', '呼和浩特', '银川', '西宁', '乌鲁木齐', '拉萨',
]

const popularOrder = new Map(POPULAR_CITIES.map((name, index) => [name, index]))
export const CITY_OPTIONS: readonly AutocompleteOption[] = cities
  .map(([name, context, pinyin, initials, fullName]) => ({
    value: name, label: name, description: context || undefined,
    aliases: [pinyin, initials, fullName, context],
  }))
  .sort((a, b) => (popularOrder.get(a.value) ?? POPULAR_CITIES.length) - (popularOrder.get(b.value) ?? POPULAR_CITIES.length))
export const INTENTION_CITY_OPTIONS: readonly AutocompleteOption[] = [{ value: '不限', label: '不限' }, ...CITY_OPTIONS]
