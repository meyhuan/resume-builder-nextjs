/**
 * Normalizes user-submitted Xiaohongshu text or links before sending to backend.
 * Handles:
 * - App share blurbs with xhslink.cn / xhslink.com
 * - Missing http/https protocol (e.g. xhslink.cn/..., www.xiaohongshu.com/...)
 * - Mobile web domains (m.xiaohongshu.com -> www.xiaohongshu.com)
 */
export function normalizeXhsRawText(raw: string): string {
  let text = raw.trim()
  if (!text) return ''

  // 1. Mobile subdomain m.xiaohongshu.com -> www.xiaohongshu.com
  text = text.replace(/https?:\/\/m\.xiaohongshu\.com\//g, 'https://www.xiaohongshu.com/')
  text = text.replace(/(^|[\s，。！!、(（[【])m\.xiaohongshu\.com\//g, '$1https://www.xiaohongshu.com/')

  // 2. Protocol-less xiaohongshu.com or xhs.com
  text = text.replace(
    /(^|[\s，。！!、(（[【])((?:www\.)?(?:xiaohongshu|xhs)\.com\/(?:explore|discovery\/item|item|note|notes)\/[0-9a-zA-Z]{24,32}[^\s]*)/g,
    '$1https://$2',
  )

  // 3. Protocol-less xhslink.com / xhslink.cn
  text = text.replace(
    /(^|[\s，。！!、(（[【])((?:www\.)?xhslink\.(?:com|cn)\/[A-Za-z0-9/_-]+[^\s]*)/g,
    '$1https://$2',
  )

  return text
}
