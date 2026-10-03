# 选择式填写数据来源

核验与快照日期：2026-10-03。候选只辅助填写，用户可保留历史名称、海外信息或自定义文字。应用运行时不请求 WPS，也不会向数据来源发送用户输入。

## 城市

`city-suggestions.json` 共 781 个唯一名称，字段：显示/保存名称、所在地说明、全拼、首字母、完整行政名称。常见 60 个城市优先展示，支持省份、完整名称和拼音搜索。

- 发布者：[AreaCity-JsSpider-StatsGov](https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov)，版本 `2025.251231.260403`，发布于 2026-04-03。
- [原始压缩包](https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov/releases/download/2025.251231.260403/ok_data_level3-4.csv.7z)，提取 `ok_data_level3.csv`。
- CSV SHA-256：`dd5a1594565b65fa3fea5ce4b9935e0b28908226949ae44f07ebfd533428e8ff`。
- 发布者以高德地图为省市区主要来源，国家地名信息库 2025-12-31、腾讯地图行政区划 2025-11-19 为辅助来源；拼音由该项目维护。**这是第三方整理的快照，并非直接从官方 API 实时获取的名单。**
- 提取地级项、县级市、重庆直辖市；移除重庆城区/郊县这类填充项、重复名称和“国外”占位。部分省直辖县及港澳台项由源数据按市级组织，保留用于位置填写。普通区县、乡镇不作为城市候选。
- 同名地级区域及下辖县级市合并为一个保存名称（如恩施）；说明用于辨认，不改动保存值。新增区划、完整地址和海外城市可以自定义。
- 上游声明未包含新设和康县、和安县，也不包含大部分行政管理区（如雄安新区）；港澳台编码沿用其既有整理数据，不等于本次大陆数据的官方校验。不能宣称全覆盖。
- 授权：MIT，原始声明保存在 `areacity-LICENSE.txt`。

## 学校、专业

参见 [education-sources.md](./education-sources.md)。学校仍使用教育部 2026 年 2952 所普通高校名单；专业使用 2026 年 883 个本科专业。成人高校、海外学校、专科及研究生专业可自定义。学校简称独立维护，不自动确定歧义简称。

## 行业

`industry-suggestions.json` 保存 WPS 页面公开静态资源中的 95 个行业名称，去重、保留名称；再合并产品既有宽泛分类，共 112 个唯一选项。用于招聘场景的填写建议，**不是国家标准行业分类，也没有官方完整性保证**。

- 观察页面：[WPS 简历编辑器](https://clientweb.docer.wps.cn/resume_editor/template/336)。
- 静态资源：https://personal.wpscdn.cn/app/resume_helper_pc_editor/183.0af61dd.js
- 原始资源 SHA-256：`e2f3a689cd5dcca2817189b3fdbd68a7b8fb8e5074f00cf1c66f74d95aa26789`。
- 提取方式：TypeScript AST 读取 `JSON.parse` 的字符串常量，不执行下载的 JavaScript。未使用认证接口、账号凭据或简历内容；该候选名单没有明确的公开数据更新版本，按观察日期记录。
- 原有分类保留，导入的任意值和自定义值也可使用。未接入城市与行业、学校与专业之间的联动推断。

## 更新

下载上述 CSV 和 PDF 后，使用安装有 pypdf 的 Python：

```sh
python scripts/update-choice-dictionaries.py --cities-csv <ok_data_level3.csv> --majors-pdf <本科专业目录.pdf>
```

生成后审查差异、更新来源日期与哈希，执行编辑器单元和浏览器回归检查。行业快照若更新，也需重新人工核验名单；不自动跟踪 WPS 资源。搜索先匹配名称精确、别名精确，再按名称前缀、名称包含、别名前缀、别名包含排序，同分保留来源顺序。
