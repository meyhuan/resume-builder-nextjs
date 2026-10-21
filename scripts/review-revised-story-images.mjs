import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'

const dir = path.resolve('outputs/story-sharing-ui/sage-revised-2026-10-20')
const prompts = JSON.parse(await fs.readFile(path.join(dir, 'prompts.json'), 'utf8'))
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
const images = []
for (const item of prompts.images) {
  const filename = `${item.id}.png`
  try {
    const data = await fs.readFile(path.join(dir, filename))
    const { width, height } = await sharp(data).metadata()
    images.push({ ...item, filename, width, height, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') })
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}
const missing = prompts.images.filter(item => !images.some(image => image.id === item.id)).map(item => item.id)
await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), images, missing }, null, 2))
const groups = prompts.packs.map(pack => `<section><h2>${esc(pack.name)}</h2><div class="grid">${images.filter(image => image.id.startsWith(`${pack.id}-`)).map(image => `<figure><a href="${image.filename}" target="_blank"><img src="${image.filename}" loading="lazy" alt="${esc(image.id)}"></a><figcaption>${esc(image.id)} · ${image.width} × ${image.height}<details><summary>生成提示词</summary><p>${esc(image.prompt)}</p></details></figcaption></figure>`).join('')}</div></section>`).join('')
await fs.writeFile(path.join(dir, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>新版分享配图 · 2026-10-20</title><style>body{margin:0;padding:32px;background:#f6f2e9;color:#293f36;font:16px/1.7 system-ui,sans-serif}main{max-width:1440px;margin:auto}h1{font-size:30px}section{margin:48px 0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0}img{display:block;width:100%;height:auto;border-radius:8px}figcaption{font-size:13px;margin-top:8px}details p{white-space:pre-wrap;overflow-wrap:anywhere}a{color:inherit}@media(max-width:650px){body{padding:16px}.grid{grid-template-columns:1fr}}</style><main><h1>新版分享配图</h1><p>2026-10-20 · ${images.length} / 36 张 · 点击图片查看原图</p>${missing.length ? `<p>待完成：${missing.map(esc).join('、')}</p>` : ''}${groups}</main></html>`)
console.log(JSON.stringify({ count: images.length, missing, gallery: path.join(dir, 'index.html'), invalid: images.filter(image => image.width < 1000 || Math.abs(image.width / image.height - .75) > .05).map(image => image.id) }))
if (missing.length && process.argv.includes('--require-complete')) process.exitCode = 1
