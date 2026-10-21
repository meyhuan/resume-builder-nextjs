"""Build a local, inspectable report from the current WPS evaluation artifacts."""
import json
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from statistics import mean

root = Path('test-artifacts/wps-current-review')
rows = json.loads((root / 'comparison.json').read_text(encoding='utf-8'))
guards = json.loads((root / 'guard-probes.json').read_text(encoding='utf-8'))
unified = []
for variant in ['text', 'structured']:
    path = root / f'unified-{variant}.json'
    if path.exists():
        for item in json.loads(path.read_text(encoding='utf-8')):
            item['variant'] = variant
            unified.append(item)

def plain(value):
    return re.sub('<[^>]+>', '', value).strip()

def length(value):
    return len(re.sub(r'\s+|[*#]', '', plain(value)))

class Structure(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.roots = []
        self.ok = True
    def handle_starttag(self, tag, attrs):
        if not self.stack:
            self.roots.append(tag)
        if tag not in ['ul', 'li', 'strong']:
            self.ok = False
        self.stack.append(tag)
    def handle_endtag(self, tag):
        if not self.stack or self.stack.pop() != tag:
            self.ok = False

valid = 0
for row in rows:
    parser = Structure()
    parser.feed(row['ours'])
    valid += parser.ok and not parser.stack and parser.roots == ['ul']

metrics = {
    'model': rows[0]['model'], 'cases': len(rows), 'balancedSingleUl': valid,
    'numberDetectorFlags': sum(bool(r['stats']['oursUngroundedNums']) for r in rows),
    'newTermDetectorFlags': sum(bool(r['stats']['oursNewTerms']) for r in rows),
    'placeholderModules': sum(bool(r['stats']['oursPlaceholders']) for r in rows),
    'placeholders': sum(r['stats']['oursPlaceholders'] for r in rows),
    'confirmationMetadataCount': sum(len(r['missingFacts']) for r in rows),
    'skillsWithNewProficiency': [r['role'] for r in rows if r['module'] == '个人技能' and '熟练' in r['ours'] and '熟练' not in r['original']],
    'unifiedRuns': len(unified),
    'unifiedProposalRuns': sum(bool(r['result']['proposals']) for r in unified),
    'unifiedQuestionRuns': sum(bool(r['result']['questions']) for r in unified),
}
(root / 'metrics.json').write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding='utf-8')

def para(text):
    return '<p>' + escape(text) + '</p>'

def box(label, content):
    return '<div><h4>' + escape(label) + '</h4><pre>' + escape(content) + '</pre></div>'

parts = ['''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>当前代码与 WPS 实测对照</title>
<style>body{max-width:1500px;margin:40px auto;padding:0 24px;color:#172033;font:16px/1.75 system-ui,"Microsoft Yahei",sans-serif;background:#f8fafc}h1,h2,h3{line-height:1.4}h2{margin-top:40px}article,section{padding:24px;background:white;border:1px solid #ddd;border-radius:12px;margin:20px 0}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}h4{color:#6d28d9;margin:0 0 12px}td,th{padding:10px 16px;border:1px solid #ddd;text-align:left}table{border-collapse:collapse;width:100%}summary{cursor:pointer;font-weight:650}code{background:#f1f5f9;padding:2px 6px}@media(max-width:900px){.grid{grid-template-columns:1fr}}</style>
<h1>当前代码与 WPS：真实模型对照评估</h1><p>2026-10-18 · 当前未提交工作区 · 模型 deepseek-v4.1-flash</p>''']
parts += [para('结论：单模块润色在结构与篇幅上已接近 WPS 样本，数字留白也更克制；但不能认定达到稳定可交付质量。剩余主要差距是熟练度夸大、无依据的扩写、占位符语义与删除语法、以及桌面助手和单模块管线表现不一致。')]
parts += ['<section><h2>范围与结果</h2>', para('10 个岗位 × 7 个模块，共 70 份单模块真实模型输出；固定 graduate / professional / realisticMode=false，无 JD，temperature=0.35，max_tokens=4096。使用现有 WPS 存档样本为参照，没有重新调用 WPS。存档中的 HTML/Markdown 残片可能来自复制，不能据此推断 WPS 界面排版差。'),
    para(f'70/70 完成，{valid}/70 HTML 标签闭合且只有单个 ul。项目经历 10/10 为四条，自我评价 10/10 为三条。现有数字/新英文术语检测器均为 0 告警；这只是规则命中结果，不等于零事实错误。34 个模块共有 44 个 [X]，生成 44 条提示元数据，但提示语义并非全部有效。'),
    para(f'另跑桌面统一助手 {len(unified)} 次：文本块与结构化经历块分别抽测。{metrics["unifiedProposalRuns"]} 次返回建议，{metrics["unifiedQuestionRuns"]} 次只返回问题。测试直接调用当前引擎，不覆盖浏览器、登录、实际扣次或导出。'),
    para('工程验证：pnpm test:ai：203 项通过、11 项默认跳过（真实模型测试随后单独启用）；pnpm typecheck 通过。对照脚本的测试通过只代表请求完成、记录齐全，不代表文案已通过质量验收。每份样本本轮生成一次，结果不能当成长期稳定率或严格 A/B 胜率。'), '</section>']
parts += ['<section><h2>差距及修复顺序</h2><ol>']
findings = [
    'P1：技能熟练度保真。10 份单模块技能输出中，7 份把原文的“会用”等写成了“熟练”。例如前端 Git/Vue3、产品 XMind、新媒体剪映。WPS 样本也有这个问题，照着它提升措辞会违背项目的事实边界。应逐技能保留等级，发现提升后定向修正。',
    'P1：删除数据后的可读性。“累计服务参会人员 [X] 人次”变成“累计服务参会人员 多项”；“累计记录 [X] 天访问量”变成“累计记录 天访问量”；“累计触达老客户 [X] 位”留下“老客户 位”。先修复量词和整句处理，测试必须检查自然语句，不能只检查 [X] 消失。',
    'P1：统一入口的质量策略。桌面 >=768px 默认进入 unified 引擎；单模块 sanitizePolishedHtml 和数据原位填写芯片不在该路径。文本块的“项目经历/工作经历/校园经历”标题还会落到 generic。应统一模块识别、事实核查、后处理和待补信息的数据契约。',
    'P1：事实核对不能等同于数字清洗。探针证明：未提及的 Rust 不在替换表中，清洗后原样保留；“2025年7月”会让“完成7项项目”被当作已知数字；“零差错”改成“准确无误”仍是无证据的绝对结果。应按事实含义核验，不能靠有限词表或全局数字集合证明安全。',
    'P2：指标不是越多越好。前端练习项目无测量记录，却引导填“响应耗时低于 [X] 毫秒”；电工项目出现“能力得到 [X] 的实践锻炼”。指标应有来源、单位、测量口径和用户可回答性；没有数据时直接写已知交付物。',
    'P2：模块和内容不能机械套模板。电商教育把“熟练使用Excel”写在“技能证书”下；电工教育把“未取得证书”扩成“正在备考、已掌握安全规程”。自评全部三段“专业能力/职业态度/职业潜力”，相似句过多。应按真实信息选择维度，保留原文关键事实，允许省略空泛维度。',
]
parts += ['<li>' + escape(f) + '</li>' for f in findings]
parts += ['</ol>', para('优先做保真与交互闭环，再优化行文。并不建议为了追平 WPS 的“冲击力”加入原文没有的独立负责、量化成绩或认证。'), '</section>']
parts += ['<section><h2>篇幅对照（去标签、空白及 Markdown * # 后的字符均值）</h2><table><tr><th>模块</th><th>当前</th><th>WPS 存档</th><th>判断</th></tr>']
judgments = {'教育背景':'结构接近，证书与实践事实需更严谨','工作经历':'已不缺展开深度，部分句子偏长','实习经历':'略短，整体可用，注意不能丢原动作','项目经历':'更紧凑，四段结构已对齐，结果指标仍需谨慎','校园经历':'体量与展开接近，定性价值较模板化','个人技能':'篇幅接近，但技能等级保真未达标','个人总结':'结构一致但个性与辨识度偏弱'}
for module, judgment in judgments.items():
    selected = [r for r in rows if r['module'] == module]
    parts += [f'<tr><td>{module}</td><td>{round(mean(length(r["ours"]) for r in selected))}</td><td>{round(mean(length(r["wps"]) for r in selected))}</td><td>{judgment}</td></tr>']
parts += ['</table></section><h2>关键问题案例</h2>']
for index in [5, 28, 63, 66, 3, 23]:
    row = rows[index]
    notes = {5:'“会”被升级为“熟练”。',28:'Excel 使用能力被归类为技能证书，且新增营销活动策划。',63:'未持证不等于已备考、已掌握安全规程。该单模块输入未提供其他段落背景。',66:'第二个 [X] 不是可填写的数值指标。',3:'响应耗时是未经测量证据支持的指标，不应因 WPS 写了 200ms 就默认需要补。',23:'原文“拍活动现场”的实际动作在本次改写中被遗漏。'}
    parts += [f'<article><h3>#{index+1} {row["role"]} · {row["module"]}</h3>',para(notes[index]),'<div class="grid">',box('原文',row['original']),box('WPS 存档',row['wps']),box('当前最终输出',plain(row['ours'])),'</div></article>']
parts += ['<h2>全部 70 份输出</h2>']
for index,row in enumerate(rows):
    parts += [f'<article><details><summary>#{index+1} {row["role"]} · {row["module"]}</summary><div class="grid">',box('原文',row['original']),box('WPS 存档',row['wps']),box('当前最终输出',plain(row['ours'])),'</div><details><summary>模型原始 HTML 与待确认项</summary>',box('原始输出',row['rawOurs']),box('待确认项',json.dumps(row['missingFacts'],ensure_ascii=False,indent=2)),'</details></details></article>']
parts += ['<h2>桌面统一助手抽测（模型核对通过不代表人工认可）</h2>']
for row in unified:
    output = '\n'.join(p.get('html','') for p in row['result']['proposals'])
    questions = json.dumps(row['result']['questions'],ensure_ascii=False,indent=2)
    parts += [f'<article><h3>{row["variant"]} · {row["role"]} · {row["module"]}</h3><div class="grid">',box('原文',row['original']),box('输出',plain(output) or '无修改建议'),box('问题',questions),'</div></article>']
parts += ['<h2>“不写此数据”全部操作结果</h2>']
for row in guards['removals']:
    parts += [f'<article><details><summary>{row["role"]} · {row["module"]}</summary>',box('删除全部占位符之后',plain(row['removed'])),'</details></article>']
parts += ['<section><h2>复现与文件</h2>',box('真实模型单模块命令',"$env:AI_LIVE_EVAL='1'; $env:WPS_COMPARE_ROLES='0,1,2,3,4,5,6,7,8,9'; $env:WPS_COMPARE_OUT='test-artifacts/wps-current-review/comparison.json'; node --env-file=.env node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts scripts/polish-eval/wps-compare.live.test.ts"),
    box('统一助手命令',"$env:AI_LIVE_EVAL='1'; $env:WPS_BLOCK_VARIANT='text'; node --env-file=.env node_modules/vitest/vitest.mjs run --config scripts/vitest.unified-ai.config.ts scripts/polish-eval/wps-unified.live.test.ts\n再将 WPS_BLOCK_VARIANT 设为 structured 重跑。"),
    box('离线探针与报告',"$env:WPS_GUARD_REVIEW='1'; pnpm exec vitest run --config scripts/vitest.unified-ai.config.ts scripts/polish-eval/wps-guards-review.test.ts\npython scripts/polish-eval/build-review-report.py"),
    para('原始证据：comparison.json（含模型原始和后处理结果）、unified-text.json、unified-structured.json、guard-probes.json、metrics.json。本轮只修改/新增评测脚本与报告，没有修改产品生成逻辑或部署。'), '</section></html>']
(root / 'report.html').write_text('\n'.join(parts),encoding='utf-8')
print(json.dumps(metrics,ensure_ascii=False,indent=2))
