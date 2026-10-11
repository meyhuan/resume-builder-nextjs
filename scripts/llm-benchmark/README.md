# OpenAI 兼容模型基准测试

这是只供开发和运营使用的模型对比工具，不属于产品运行时。它直接调用 OpenAI 兼容接口，对一组与简历产品相关的固定题目进行测试，并输出首个流式内容、首个 reasoning 内容、首个最终答案 Token、完整响应耗时、Token 消耗、质量评分和综合排名。当前题目覆盖经历润色、三条经历生成、短简历结构化导入、长简历导入、职位匹配、求职信、提示注入防护和面试行为题。

## 快速开始

在项目根目录执行：

```powershell
pnpm run benchmark:llm -- --models qwen3.8-flash,qwen3.8-max,qwen3.7-plus,qwen3.7-flash,deepseek-v4.1-flash --thinking enabled --runs 2

# 阿里云百炼 DeepSeek（模型 ID 以当前业务空间实际可用项为准）
pnpm run benchmark:llm -- --models deepseek-v4-pro,deepseek-v4-flash-0731 --runs 1

# DeepSeek 官方 API：DeepSeek-V4.1-Flash 的当前 API 模型 ID 是 deepseek-flash
$env:BENCHMARK_API_KEY = '<仅在当前进程设置，不要写入文件>'
$env:BENCHMARK_BASE_URL = 'https://api.deepseek.com'
pnpm run benchmark:llm -- --models deepseek-flash --runs 1

# DeepSeek 非思考模式（更偏速度；默认是 thinking enabled）
pnpm run benchmark:llm -- --models deepseek-flash --thinking disabled --runs 3
```

默认模型列表是百炼当前推荐线：`qwen3.8-max`、`qwen3.8-flash`、`qwen3.7-plus`、`qwen3.7-flash`、`deepseek-v4.1-flash`。默认读取项目根目录 `.env.local` 或 `.env` 中的 `DASHSCOPE_API_KEY` 和 `DASHSCOPE_BASE_URL`，也可用 `BENCHMARK_API_KEY` 和 `BENCHMARK_BASE_URL` 临时覆盖供应商；默认题目是 `scripts/llm-benchmark/cases.json`。测试结果写入 `test-artifacts/llm-benchmark/<timestamp>/`，该目录已被 Git 忽略，也不会进入正式 Release zip。

常用参数：

```text
--models qwen-plus,qwen-max,qwen-turbo    要测试的模型，支持当前 endpoint 可用的模型名
--cases path/to/cases.json                自定义题目文件
--runs 3                                  每个模型 × 每道题重复次数
--timeout-ms 120000                       单次请求超时
--thinking enabled|disabled               覆盖支持该参数的模型的思考模式
--output-dir test-artifacts/...           结果目录
--no-output                               报告中不保存模型原文
--json                                   只打印最终报告路径
```

模型名称不需要先改应用代码。模型是否可用、价格以及质量表现都以本次真实请求为准；可在题目文件的 `models` 字段中补充价格（每百万 Token 的人民币价格），未配置价格时仍会记录 Token，但不估算费用。旧的 `qwen-plus`、`qwen-max`、`qwen-flash` 仍可通过 `--models` 显式回归。DeepSeek 的模型 ID 需要使用百炼控制台和当前业务空间实际显示的名称，例如 `deepseek-v4.1-flash`、`deepseek-v4-pro`；不同供应商的模型可能使用 `siliconflow/deepseek-v3.2` 这样的前缀。

## 评分方法

每道题的质量由题目文件声明的规则计算：必需内容、禁止内容、长度范围和 JSON 字段。质量分是规则通过率，避免把主观的“看起来不错”误当成稳定指标。当前这套规则覆盖事实保留、结构化输出、长文本召回、无关指令隔离和表达长度；它仍属于自动化回归，不替代人工抽检真实用户简历。

综合分默认是：质量 60%、速度 25%、Token 效率 15%。质量使用所有成功样本的平均规则通过率，并额外报告最差题目质量；综合速度仍使用 p50 总耗时和 p50 首最终答案 Token，报告另外记录首个流式内容和首个 reasoning 内容，避免把思考模式的推理等待误认为网络首包延迟。Token 效率按 p50 总 Token 计算。报告同时给出每个维度的原始值和有效样本数；如果模型出现错误或超时，会降低可用性并从综合排名中剔除无成功样本。

正式选择模型前，建议至少运行 3 次，并在更新模型或提示词后重新运行同一组题目。不要把真实用户简历放进公共或提交到仓库的题目文件中。
