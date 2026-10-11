#!/usr/bin/env node

/**
 * Development-only OpenAI-compatible model benchmark.
 * It is deliberately kept under scripts/; deploy.ps1 packages no source files.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { performance } from 'node:perf_hooks'
import OpenAI from 'openai'

const ROOT = process.cwd()
const DEFAULT_CASES = path.join(ROOT, 'scripts', 'llm-benchmark', 'cases.json')
const DEFAULT_OUTPUT = path.join(ROOT, 'test-artifacts', 'llm-benchmark')
const DEFAULT_BASE_URL = 'https://llm-wwerfrg4elkhrxzz.cn-beijing.maas.aliyuncs.com/compatible-mode/v1'

function parseArgs(argv) {
  const args = { models: '', cases: DEFAULT_CASES, runs: 1, timeoutMs: 120000, outputDir: '', includeOutput: true, jsonOnly: false, thinking: '' }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--no-output') args.includeOutput = false
    else if (token === '--json') args.jsonOnly = true
    else if (token.startsWith('--')) {
      const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      const value = argv[i + 1]
      if (!value || value.startsWith('--')) throw new Error(`缺少参数值: ${token}`)
      i += 1
      if (key === 'runs' || key === 'timeoutMs') args[key] = Number(value)
      else args[key] = value
    } else throw new Error(`未知参数: ${token}`)
  }
  if (!Number.isInteger(args.runs) || args.runs < 1 || args.runs > 20) throw new Error('--runs 必须是 1 到 20 的整数')
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1000) throw new Error('--timeout-ms 至少为 1000')
  if (args.thinking && !['enabled', 'disabled'].includes(args.thinking)) throw new Error('--thinking 必须是 enabled 或 disabled')
  return args
}

async function loadEnvFile(file) {
  try {
    const text = await fs.readFile(file, 'utf8')
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!match || process.env[match[1]]) continue
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function average(values) {
  const usable = values.filter(Number.isFinite)
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null
}

function round(value, digits = 1) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null
}

function parseJson(text) {
  const cleaned = String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(cleaned) } catch { return null }
}

function getPath(value, pathString) {
  return pathString.split('.').reduce((current, key) => current == null ? undefined : current[key], value)
}

function evaluate(output, rules, responseFormat) {
  const text = String(output || '')
  const json = responseFormat === 'json_object' ? parseJson(text) : null
  const checks = []
  const add = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail })
  for (const value of rules.requiredAll || []) add(`required:${value}`, text.includes(value), `必须包含“${value}”`)
  for (const group of rules.requiredAny || []) add(`requiredAny:${group.join('|')}`, group.some((value) => text.includes(value)), `至少包含：${group.join('、')}`)
  for (const value of rules.forbidden || []) add(`forbidden:${value}`, !text.includes(value), `不得包含“${value}”`)
  if (rules.minLength != null) add('minLength', text.length >= rules.minLength, `${text.length} >= ${rules.minLength}`)
  if (rules.maxLength != null) add('maxLength', text.length <= rules.maxLength, `${text.length} <= ${rules.maxLength}`)
  if (responseFormat === 'json_object') add('validJson', json !== null, '响应必须是有效 JSON')
  for (const requiredPath of rules.jsonRequiredPaths || []) add(`jsonPath:${requiredPath}`, json !== null && getPath(json, requiredPath) !== undefined, `JSON 必须有 ${requiredPath}`)
  for (const expected of rules.jsonRequiredValues || []) add(`jsonValue:${expected}`, json !== null && JSON.stringify(json).includes(expected), `JSON 必须包含“${expected}”`)
  const passed = checks.filter((check) => check.passed).length
  return { score: checks.length ? (passed / checks.length) * 100 : null, checks, parsedJson: json }
}

function usageFromChunk(usage) {
  if (!usage) return null
  return {
    inputTokens: Number(usage.prompt_tokens ?? usage.input_tokens ?? 0),
    outputTokens: Number(usage.completion_tokens ?? usage.output_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    reasoningTokens: Number(usage.completion_tokens_details?.reasoning_tokens ?? usage.reasoning_tokens ?? 0),
  }
}

async function requestModel({ client, model, testCase, timeoutMs, thinking, baseURL }) {
  const startedAt = new Date().toISOString()
  const start = performance.now()
  let firstChunkMs = null
  let firstReasoningMs = null
  let firstTokenMs = null
  let output = ''
  let usage = null
  try {
    const signal = AbortSignal.timeout(timeoutMs)
    const stream = await client.chat.completions.create({
      model,
      messages: [{ role: 'system', content: testCase.system }, { role: 'user', content: testCase.prompt }],
      temperature: 0,
      ...(testCase.responseFormat ? { response_format: { type: testCase.responseFormat } } : {}),
      ...(thinking ? {
        // Node.js OpenAI-compatible examples put these provider-specific
        // fields at the request top level (Python uses extra_body).
        ...(baseURL.includes('api.deepseek.com')
          ? { thinking: { type: thinking } }
          : { enable_thinking: thinking === 'enabled' }),
      } : {}),
      stream: true,
      stream_options: { include_usage: true },
      signal,
    })
    for await (const chunk of stream) {
      if (chunk.usage) usage = usageFromChunk(chunk.usage)
      const deltaObject = chunk.choices?.[0]?.delta || {}
      const delta = deltaObject.content || ''
      const reasoningDelta = deltaObject.reasoning_content || ''
      if ((delta || reasoningDelta) && firstChunkMs === null) firstChunkMs = performance.now() - start
      if (reasoningDelta && firstReasoningMs === null) firstReasoningMs = performance.now() - start
      if (delta && firstTokenMs === null) firstTokenMs = performance.now() - start
      output += delta
    }
    const totalMs = performance.now() - start
    return { status: 'ok', startedAt, firstChunkMs, firstReasoningMs, firstTokenMs, totalMs, output, usage }
  } catch (error) {
    return { status: 'error', startedAt, firstChunkMs, firstReasoningMs, firstTokenMs, totalMs: performance.now() - start, output, usage, error: error instanceof Error ? error.message : String(error) }
  }
}

function aggregateModel(model, attempts, config, weights) {
  const successes = attempts.filter((attempt) => attempt.status === 'ok')
  const qualityValues = successes.map((attempt) => attempt.quality.score).filter(Number.isFinite)
  const totalMs = successes.map((attempt) => attempt.totalMs)
  const firstChunkMs = successes.map((attempt) => attempt.firstChunkMs)
  const firstReasoningMs = successes.map((attempt) => attempt.firstReasoningMs)
  const firstTokenMs = successes.map((attempt) => attempt.firstTokenMs)
  const totalTokens = successes.map((attempt) => attempt.usage?.totalTokens).filter(Number.isFinite)
  const p50TotalMs = percentile(totalMs, 0.5)
  const p50FirstChunkMs = percentile(firstChunkMs, 0.5)
  const p50FirstReasoningMs = percentile(firstReasoningMs, 0.5)
  const p50FirstTokenMs = percentile(firstTokenMs, 0.5)
  const p50Tokens = percentile(totalTokens, 0.5)
  const reasoningTokens = successes.map((attempt) => attempt.usage?.reasoningTokens).filter(Number.isFinite)
  const p50ReasoningTokens = percentile(reasoningTokens, 0.5)
  const inputRate = config?.inputCnyPerMillion == null ? null : Number(config.inputCnyPerMillion)
  const outputRate = config?.outputCnyPerMillion == null ? null : Number(config.outputCnyPerMillion)
  const cost = inputRate != null && outputRate != null && Number.isFinite(inputRate) && Number.isFinite(outputRate) ? successes.map((attempt) => {
    const usage = attempt.usage
    return usage ? (usage.inputTokens / 1e6) * inputRate + (usage.outputTokens / 1e6) * outputRate : null
  }).filter(Number.isFinite) : []
  const caseQuality = Object.fromEntries([...new Set(attempts.map((attempt) => attempt.caseId))].map((caseId) => {
    const values = successes.filter((attempt) => attempt.caseId === caseId).map((attempt) => attempt.quality.score)
    return [caseId, round(average(values))]
  }))
  return {
    model,
    attempts: attempts.length,
    successes: successes.length,
    successRate: attempts.length ? (successes.length / attempts.length) * 100 : 0,
    quality: round(average(qualityValues)),
    qualityMin: round(Math.min(...qualityValues), 1),
    caseQuality,
    p50TotalMs: round(p50TotalMs),
    p50FirstChunkMs: round(p50FirstChunkMs),
    p50FirstReasoningMs: round(p50FirstReasoningMs),
    p50FirstTokenMs: round(p50FirstTokenMs),
    p50TotalTokens: round(p50Tokens, 0),
    p50ReasoningTokens: round(p50ReasoningTokens, 0),
    p50CostCny: round(percentile(cost, 0.5), 5),
    weights,
    _raw: { p50TotalMs, p50FirstTokenMs, p50Tokens, quality: average(qualityValues) ?? 0 },
  }
}

function rankModels(summaries, weights) {
  const viable = summaries.filter((summary) => summary.successes > 0)
  const fastest = Math.min(...viable.map((summary) => summary._raw.p50TotalMs || Infinity))
  const fastestFirst = Math.min(...viable.map((summary) => summary._raw.p50FirstTokenMs || Infinity))
  const lowestTokens = Math.min(...viable.map((summary) => summary._raw.p50Tokens || Infinity))
  for (const summary of summaries) {
    const raw = summary._raw
    const speed = summary.successes ? ((fastest / raw.p50TotalMs) * 0.7 + (fastestFirst / raw.p50FirstTokenMs) * 0.3) * 100 : 0
    const efficiency = summary.successes && Number.isFinite(raw.p50Tokens) ? (lowestTokens / raw.p50Tokens) * 100 : 0
    summary.speedScore = round(Math.min(100, speed))
    summary.efficiencyScore = round(Math.min(100, efficiency))
    summary.overallScore = round(summary.successes ? (raw.quality * weights.quality + speed * weights.speed + efficiency * weights.efficiency) * 1 : 0)
  }
  summaries.sort((a, b) => b.overallScore - a.overallScore)
  summaries.forEach((summary, index) => { summary.rank = index + 1; delete summary._raw })
  return summaries
}

function printSummary(report) {
  const lines = ['模型基准测试完成', `样本：${report.metadata.models.length} 个模型 × ${report.metadata.caseCount} 道题 × ${report.metadata.runs} 次`, '', '排名  模型                 综合  质量  最低质量  速度  Token效率  成功率  p50总耗时  p50首Token']
  for (const summary of report.summary) lines.push(`${String(summary.rank).padStart(2)}    ${summary.model.padEnd(20)} ${String(summary.overallScore).padStart(5)} ${String(summary.quality).padStart(5)} ${String(summary.qualityMin).padStart(8)} ${String(summary.speedScore).padStart(5)} ${String(summary.efficiencyScore).padStart(9)} ${String(round(summary.successRate)).padStart(6)}% ${String(summary.p50TotalMs ?? '-').padStart(9)}ms ${String(summary.p50FirstTokenMs ?? '-').padStart(10)}ms`)
  if (report.recommendation) lines.push('', `建议：${report.recommendation.model}（${report.recommendation.reason}）`)
  lines.push('', `详细报告：${report.metadata.reportPath}`)
  console.log(lines.join('\n'))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await loadEnvFile(path.join(ROOT, '.env.local'))
  await loadEnvFile(path.join(ROOT, '.env'))
  const fixture = JSON.parse(await fs.readFile(args.cases, 'utf8'))
  // pnpm may normalize a comma-separated value to a space-separated argv value on Windows.
  const models = (args.models || Object.keys(fixture.models || {}).join(',') || 'qwen-plus,qwen-max').split(/[\s,]+/).map((model) => model.trim()).filter(Boolean)
  // BENCHMARK_* is an ephemeral provider override for testing another
  // OpenAI-compatible endpoint (for example the official DeepSeek API).
  // The existing DashScope variables remain the default for project tests.
  const apiKey = process.env.BENCHMARK_API_KEY || process.env.DASHSCOPE_API_KEY
  if (!apiKey) throw new Error('缺少 BENCHMARK_API_KEY 或 DASHSCOPE_API_KEY；请在进程环境或 .env.local/.env 中配置')
  const baseURL = process.env.BENCHMARK_BASE_URL || process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL
  const outputDir = args.outputDir ? path.resolve(args.outputDir) : path.join(DEFAULT_OUTPUT, new Date().toISOString().replace(/[:.]/g, '-'))
  await fs.mkdir(outputDir, { recursive: true })
  const weights = { quality: Number(fixture.weights?.quality ?? 0.6), speed: Number(fixture.weights?.speed ?? 0.25), efficiency: Number(fixture.weights?.efficiency ?? 0.15) }
  const client = new OpenAI({ apiKey, baseURL, timeout: args.timeoutMs })
  const details = []
  const attemptsByModel = new Map(models.map((model) => [model, []]))
  for (const model of models) {
    for (const testCase of fixture.cases) {
      for (let run = 1; run <= args.runs; run += 1) {
        const result = await requestModel({ client, model, testCase, timeoutMs: args.timeoutMs, thinking: args.thinking, baseURL })
        const quality = evaluate(result.output, testCase.rules || {}, testCase.responseFormat)
        const attempt = { model, caseId: testCase.id, run, ...result, quality: { score: round(quality.score), checks: quality.checks }, ...(args.includeOutput ? { output: result.output } : {}) }
        attemptsByModel.get(model).push(attempt)
        details.push(attempt)
        if (!args.jsonOnly) console.log(`${model} / ${testCase.id} / ${run}: ${result.status} ${Math.round(result.totalMs)}ms${result.error ? ` — ${result.error}` : ''}`)
      }
    }
  }
  const summary = rankModels(models.map((model) => aggregateModel(model, attemptsByModel.get(model), fixture.models?.[model], weights)), weights)
  const winner = summary.find((item) => item.successes > 0)
  const report = {
    metadata: { generatedAt: new Date().toISOString(), baseURL, models, thinking: args.thinking || null, caseCount: fixture.cases.length, runs: args.runs, timeoutMs: args.timeoutMs, reportPath: path.join(outputDir, 'report.json') },
    scoring: { weights, quality: '题目规则通过率的平均值，并报告最低题目质量；速度由 p50 总耗时 70% + p50 首 token 30% 归一化；效率按 p50 总 Token 归一化' },
    recommendation: winner ? { model: winner.model, reason: `综合分 ${winner.overallScore}，质量 ${winner.quality}，p50 总耗时 ${winner.p50TotalMs}ms，成功率 ${round(winner.successRate)}%` } : null,
    summary,
    details,
  }
  await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8')
  if (!args.jsonOnly) printSummary(report)
  else console.log(JSON.stringify({ reportPath: report.metadata.reportPath, recommendation: report.recommendation, summary: report.summary }))
}

main().catch((error) => { console.error(`模型基准测试失败：${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1 })
