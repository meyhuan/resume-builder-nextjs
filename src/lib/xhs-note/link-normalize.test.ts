import { describe, expect, it } from 'vitest'
import { normalizeXhsRawText } from './link-normalize'

describe('normalizeXhsRawText', () => {
  it('preserves complete app share blurb with xhslink.cn', () => {
    const input = 'https://xhslink.cn/o/3evPWmNafFe 把文本复制好，进入【小红书】即可浏览全文。'
    expect(normalizeXhsRawText(input)).toBe(input)
  })

  it('prepends https to bare xhslink.cn or xhslink.com', () => {
    expect(normalizeXhsRawText('xhslink.cn/o/3evPWmNafFe')).toBe('https://xhslink.cn/o/3evPWmNafFe')
    expect(normalizeXhsRawText('xhslink.com/a/ABCDE')).toBe('https://xhslink.com/a/ABCDE')
  })

  it('normalizes mobile subdomain m.xiaohongshu.com to www.xiaohongshu.com', () => {
    expect(normalizeXhsRawText('https://m.xiaohongshu.com/discovery/item/6abb2276000000001500dcdb')).toBe(
      'https://www.xiaohongshu.com/discovery/item/6abb2276000000001500dcdb',
    )
  })

  it('prepends https to protocol-less xiaohongshu web links', () => {
    expect(normalizeXhsRawText('www.xiaohongshu.com/discovery/item/6abb2276000000001500dcdb')).toBe(
      'https://www.xiaohongshu.com/discovery/item/6abb2276000000001500dcdb',
    )
    expect(normalizeXhsRawText('xiaohongshu.com/explore/6abb2276000000001500dcdb')).toBe(
      'https://xiaohongshu.com/explore/6abb2276000000001500dcdb',
    )
  })

  it('handles user shared web text with emoji and long query params', () => {
    const input =
      '67 【中国为什么要全面禁止卧铺大巴车？ - 乔松观 | 小红书 - 你的生活兴趣社区】 😆 kz3orF0EBoiu1vw 😆 https://www.xiaohongshu.com/discovery/item/6abb2276000000001500dcdb?source=webshare&xhsshare=pc_web&xsec_token=ABeWjiS7RSPtGnABda0E6aM8PNLCYFH_oLlJ_EcGmn-TI=&xsec_source=pc_share'
    expect(normalizeXhsRawText(input)).toBe(input)
  })
})
