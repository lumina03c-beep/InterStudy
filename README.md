# InterStudy

把论文、博客、文档、GitHub 项目或复杂概念，变成可离线打开的单文件交互式 HTML 学习页。

## 特性

- **固定模板 + 内容注入**：AI 只生成 `topic.json`，引擎负责渲染
- **单文件离线**：无 CDN、无外部字体/脚本
- **完整学习结构**：知识树、章节叙事、概念弹窗、算法/模块深入、9 类 Scene、5 题测验、来源
- **轻量校验**：构建脚本检查引用、树结构、场景数据和基础质量

## 目录结构

```text
InterStudy/
  SKILL.md                 # 技能说明与工作流
  references/              # 写作、内容模型、场景指南
  template/                # 固定 HTML/CSS/JS 模板
  scripts/build.mjs        # 校验 + 构建
  fixtures/smoke-topic.json
  examples/                # 示例输出
```

## 快速开始

```bash
# 1. 准备 topic.json（见 references/content-model.md）
# 2. 构建
node scripts/build.mjs path/to/topic.json [output.html]
```

默认输出到当前终端目录：

```text
YYYY-MM-DD-<meta.slug>.html
```

## topic.json

顶层字段：

```json
{
  "meta": {},
  "tree": {},
  "chapters": [],
  "concepts": [],
  "algorithms": [],
  "modules": [],
  "scenes": [],
  "crossReferences": [],
  "sources": [],
  "quiz": []
}
```

详细字段与约定见：

- `references/content-model.md`
- `references/writing-guide.md`
- `references/scenes-guide.md`

## 支持的 Scene

`timeline`、`architecture`、`sequence`、`process`、`comparison`、`algorithm`、`data-structure`、`concept`、`future-scenario`

## 示例

- `examples/2026-11-26-q-learning-smoke.html`

## 许可证

[MIT](./LICENSE)
