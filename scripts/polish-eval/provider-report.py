import json, statistics, html
from pathlib import Path
from html.parser import HTMLParser

root = Path('test-artifacts/provider-comparison')
data = json.loads((root / 'results.json').read_text(encoding='utf-8'))
rows = data['results']
def percentile(values, p):
    values = sorted(values)
    return values[min(len(values)-1, int((len(values)-1)*p))] if values else None
class Structure(HTMLParser):
    def __init__(self):
        super().__init__(); self.stack=[]; self.valid=True; self.roots=0
    def handle_starttag(self, tag, attrs):
        if tag not in ['ul','li','strong']: self.valid=False
        if not self.stack:
            self.roots+=1
            if tag!='ul': self.valid=False
        self.stack.append(tag)
    def handle_endtag(self, tag):
        if not self.stack or self.stack.pop()!=tag: self.valid=False
def valid_html(text):
    s=Structure(); s.feed(text)
    return s.valid and not s.stack and s.roots==1
summary={}
for provider in ['bailian','official']:
    group=[r for r in rows if r['provider']==provider]
    good=[r for r in group if r.get('ok')]
    total_prompt=sum(r['usage']['prompt_tokens'] for r in good if r.get('usage'))
    cached=sum(r['costs']['cachedTokens'] or 0 for r in good if r.get('costs'))
    summary[provider]={
        'requests':len(group),'successful':len(good),
        'firstContentMedianSeconds':statistics.median(r['firstContentMs'] for r in good)/1000 if good else None,
        'totalMedianSeconds':statistics.median(r['elapsedMs'] for r in good)/1000 if good else None,
        'totalP95Seconds':percentile([r['elapsedMs']/1000 for r in good],.95),
        'inputTokens':total_prompt,'outputTokens':sum(r['usage']['completion_tokens'] for r in good if r.get('usage')),
        'cachedTokens':cached,'cacheShare':cached/total_prompt if total_prompt else None,
        'missingUsage':sum(not r.get('usage') for r in group),
        'missingCacheUsage':sum(r.get('costs',{}).get('cachedTokens') is None for r in good),
        'estimatedOffPeakCNY':sum(r['costs']['offPeak'] for r in good if r.get('costs') and r['costs']['offPeak'] is not None),
        'estimatedPeakCNY':sum(r['costs']['peak'] for r in good if r.get('costs') and r['costs']['peak'] is not None),
        'validCleanedHtml':sum(valid_html(r['cleaned']) for r in good),
        **{f'{phase}_{flag}':sum(bool(r[f'{phase}Flags'][flag]) for r in good) for phase in ['raw','cleaned'] for flag in ['numbers','terms','placeholders','skillEscalation','style']},
    }
    summary[provider]['rounds']={str(i):{
        'count':len(g:=[r for r in good if r['round']==i]),
        'medianSeconds':statistics.median(r['elapsedMs']/1000 for r in g),
        'firstContentMedianSeconds':statistics.median(r['firstContentMs']/1000 for r in g),
        'offPeakCNY':sum(r['costs']['offPeak'] for r in g),
        'peakCNY':sum(r['costs']['peak'] for r in g),
    } for i in sorted(set(r['round'] for r in good))}
paired=[]
for key in set((r['round'],r['index']) for r in rows):
    pair={r['provider']:r for r in rows if (r['round'],r['index'])==key and r.get('ok')}
    if len(pair)==2:
        assert pair['bailian']['promptHash']==pair['official']['promptHash']
        paired.append(pair)
summary['paired']={'count':len(paired),
    'officialFaster':sum(p['official']['elapsedMs']<p['bailian']['elapsedMs'] for p in paired),
    'medianOfficialToBailianTimeRatio':statistics.median(p['official']['elapsedMs']/p['bailian']['elapsedMs'] for p in paired) if paired else None}
(root/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
esc=lambda s:html.escape(str(s))
page=['<!doctype html><html lang="zh"><meta charset="utf-8"><title>百炼与 DeepSeek 官方实测</title><style>body{font:15px/1.7 system-ui;max-width:1400px;margin:32px auto;padding:0 24px;color:#0f172a}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f8fafc;padding:12px}details{border:1px solid #ddd;border-radius:10px;margin:14px 0;padding:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}h1,h2{color:#6d28d9}</style><h1>百炼 vs DeepSeek 官方：同样本对照</h1>']
page+=['<p>相同 10 类岗位 × 7 模块，两轮重复；同样提示词、temperature=0.35、max_tokens=4096、关闭思考。每家并发 1，两家配对同时发起。费用为实际返回 Token 用量乘公开单价，不是账单；规则命中不等于人工判定的虚构率。</p>', '<p>时间从本地测试机器测得；未包含统一助手的规划、事实审核、多轮修复。百炼忙时为每日 08–22 点；官网高峰为工作日 09–12、14–18 点。本次周日白天应比较百炼高峰价与官网空闲价。具体模型修订版本未证实相同。</p>']
b,o=summary['bailian'],summary['official']
page += [f'<p><strong>已完成 {len(rows)} 次调用：百炼 {b["successful"]}/{b["requests"]} 成功，官方 {o["successful"]}/{o["requests"]} 成功。</strong>官方在 {summary["paired"]["count"]} 组配对中有 {summary["paired"]["officialFaster"]} 组更快。总耗时中位数：百炼 {b["totalMedianSeconds"]:.2f} 秒，官方 {o["totalMedianSeconds"]:.2f} 秒。</p>',f'<p>按本次周日白天时段估算：百炼 ¥{b["estimatedPeakCNY"]:.4f}，官方 ¥{o["estimatedOffPeakCNY"]:.4f}；若统一按闲时估算：百炼 ¥{b["estimatedOffPeakCNY"]:.4f}，官方 ¥{o["estimatedOffPeakCNY"]:.4f}。未计入独立预检的 2 次请求。</p>']
page+=['<h2>汇总指标</h2><table><tr><th>指标</th><th>百炼</th><th>官方</th></tr>']
labels={'requests':'调用数','successful':'成功数','firstContentMedianSeconds':'首个正文片段中位数（秒）','totalMedianSeconds':'生成完成中位数（秒）','totalP95Seconds':'生成完成 P95（秒）','inputTokens':'输入 Token','outputTokens':'输出 Token','cachedTokens':'缓存命中 Token','cacheShare':'输入缓存命中比例','missingUsage':'缺失用量数','missingCacheUsage':'缺失缓存用量数','estimatedOffPeakCNY':'全部按闲时估算（元）','estimatedPeakCNY':'全部按忙时估算（元）','validCleanedHtml':'通过基础 HTML 结构检查数'}
for key in summary['bailian']:
    if key!='rounds':page.append(f'<tr><td>{esc(labels.get(key,key))}</td><td>{esc(round(summary["bailian"][key],4) if isinstance(summary["bailian"][key],float) else summary["bailian"][key])}</td><td>{esc(round(summary["official"][key],4) if isinstance(summary["official"][key],float) else summary["official"][key])}</td></tr>')
page+=['</table><h2>人工核查与判断</h2><p>建议把官方作为小流量切换候选，主要收益是响应速度；尚无证据表明文案质量有明显提升。两边都需要继续改进事实约束。</p><ul><li>前端个人技能：原文“会 Vue3、Git 提交”，两边都出现“熟练”；百炼还扩展了分支管理。</li><li>前端项目经历：原文只有本地运行效果，两边均增加“页面交互响应耗时低于 [X] 毫秒”。占位符没有捏造具体数值，但测量事实本身并未提供。</li><li>软件测试个人技能：官方把 Python 基础扩写成可完成简单脚本编写；百炼措辞相对保守。</li><li>仓库个人技能：两边保留没有叉车证的信息；官方将 Excel 数量登记写为熟练使用。</li><li>电气教育背景：原文只有“还没有取得低压电工作业证”，两边都自行增加“正在备考”和已掌握安全规范，数字检查没有发现此类事实扩写。</li><li>数控个人技能：两边均保留编程和调机需要指导的边界，官方有“尚不能完成编程与调试”的偏强否定。</li></ul><p>以上为第一轮选定案例的人工核查，不是盲评或全量人工评分。第二轮重复请求会影响缓存命中，本次缓存率不能直接代表生产流量。</p><p>切换前还需在部署服务器测量延迟，并验证统一助手的规划、追问、事实审核、应用修改与下一段流程。本报告不能替代这些端到端验证。</p><p>价格来源：<a href="https://help.aliyun.com/zh/model-studio/deepseek-v4-1-flash">百炼官方价格</a> · <a href="https://api-docs.deepseek.com/zh-cn/quick_start/pricing/?tab=case-studies">DeepSeek 官方价格</a>（2026-10-18）。</p><h2>逐样本核查</h2>']
for round_index,index in sorted(set((r['round'],r['index']) for r in rows)):
    pair=[r for r in rows if r['round']==round_index and r['index']==index]
    first=pair[0]
    page.append(f'<details><summary>第 {round_index+1} 轮 · {index+1} · {esc(first["role"])} · {esc(first["module"])}</summary><p>原文：{esc(first["original"])}</p><div class="pair">')
    for provider in ['bailian','official']:
        r=next((x for x in pair if x['provider']==provider),None)
        if not r:page.append('<div>尚未返回</div>');continue
        page.append(f'<div><h3>{provider}</h3><p>总耗时 {r.get("elapsedMs",0)/1000:.2f}s · 首字 {(r.get("firstContentMs") or 0)/1000:.2f}s</p><pre>{esc(r.get("cleaned","失败"))}</pre><details><summary>模型原文与用量</summary><pre>{esc(r.get("raw",""))}</pre><pre>{esc(json.dumps(r.get("usage"),ensure_ascii=False))}</pre></details></div>')
    page.append('</div></details>')
page+=['</html>']
(root/'report.html').write_text(''.join(page),encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
