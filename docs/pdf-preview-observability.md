# PDF 内嵌预览问题观察

范围：PC 导出弹窗（含使用该布局的平板浏览器）。继续使用原生 iframe；预览问题不禁用 PDF 下载。移动端独立导出页不在此埋点范围。

使用现有 `app_error` 事件，`source=pdf_preview`、`stage=native_pdf_viewer`、`entry=pc_export_preview`，不混入 `export_failed` 下载失败指标。现有管理后台「数据分析」错误列表可查看 `PdfPreview_` 开头的错误类型及数量；该列表仅展示数量排名前 20 的错误，未上榜不代表没有发生。浏览器等详细维度保存在事件 properties，完整统计需查询 analytics_events 中对应 source 的事件。

| failureReason / errorType 后缀 | 触发条件 | 解读 |
| --- | --- | --- |
| viewer_unsupported | 浏览器明确返回 pdfViewerEnabled=false | 能力声明，不等同于实际渲染检测 |
| iframe_error | iframe 的 error 事件 | 收到加载错误信号 |
| load_timeout | 15 秒未收到 load 事件 | 疑似异常或慢加载，不等同于确定失败 |
| user_reported_blank | 用户点击「预览仍为空白？反馈问题」 | 用户主动反馈，包括已触发 load 但仍空白的情况 |

每次打开、切回 PDF、文件变更或重试会建立新的 previewAttemptId。同一尝试内同一原因只上报一次；不同原因可能同时存在，分析受影响尝试数时按 previewAttemptId 去重，不能直接相加。关闭、切换格式、替换文件会取消旧计时器。迟到的 load 会清除超时提示，但不会删除已记录的超时事实。

记录 elapsedMs、iframeLoadObserved、pdfViewerEnabled、userAgent（最多 500 字符）、viewportWidth、viewportHeight、visibilityState；用户和会话关联沿用现有埋点。不上报 PDF 地址、简历正文或文件名。

iframe 的 load 不保证 PDF 可见，部分浏览器也不触发 error，因此仍可能漏报。当前只记录异常信号，没有完整预览尝试分母，不能据此直接计算真实预览失败率。后台隐藏时发生的超时可通过 visibilityState 辅助判断。
