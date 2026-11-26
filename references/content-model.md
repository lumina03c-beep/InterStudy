# 内容模型

`topic.json` 是唯一需要生成的数据文件。模板、样式和交互由固定引擎提供。

## 顶层结构

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

## meta

```json
{
  "title": "Q-learning 的一次真实更新",
  "subtitle": "从贝尔曼方程到 Q 表变化",
  "description": "用 10 分钟理解 Q-learning 如何把一次经验变成一次更新。",
  "language": "zh-CN",
  "slug": "q-learning-update",
  "createdAt": "2026-11-26"
}
```

- `title`：必填，页面主标题。
- `subtitle`：可选，副标题。
- `description`：必填，一两句话说明这篇要解决什么问题。
- `language`：BCP 47，例如 `zh-CN`、`en`。
- `slug`：必填，ASCII 短名，用于文件名；不要含空格。
- `createdAt`：`YYYY-MM-DD`。

## tree

树只表达归属关系。依赖、对比、协作等关系放在 `crossReferences`。

```json
{
  "rootId": "root",
  "nodes": [
    {
      "id": "root",
      "parentId": null,
      "type": "topic",
      "title": "Q-learning",
      "description": "主题全景",
      "order": 0
    },
    {
      "id": "ch-bg",
      "parentId": "root",
      "type": "chapter",
      "title": "背景",
      "targetId": "background",
      "order": 1
    },
    {
      "id": "c-mdp",
      "parentId": "ch-bg",
      "type": "concept",
      "title": "MDP",
      "targetId": "mdp",
      "order": 1
    }
  ]
}
```

节点类型：

| type | 行为 | targetId 指向 |
|---|---|---|
| `topic` | 回到页面顶部 | 无 |
| `chapter` | 滚动到章节 | `chapter.id` |
| `section` | 滚动到章节内锚点 | 正文元素的 `id` |
| `concept` | 打开概念弹窗 | `concept.id` |
| `algorithm` | 打开算法深入视图 | `algorithm.id` |
| `module` | 打开模块深入视图 | `module.id` |
| `component` | 打开模块深入视图 | `module.id` |
| `process` | 打开流程深入视图 | `algorithm.id` 或 `module.id` |

规则：

- `rootId` 必须存在，且 `parentId` 为 `null`。
- 除根节点外，每个节点必须有有效 `parentId`。
- 同一父节点下按 `order` 升序显示。
- 不允许环。
- 不要为了树形结构复制同一知识对象；用 `crossReferences` 表达多对多关系。

## chapters

```json
{
  "id": "background",
  "title": "背景：从试错到贝尔曼方程",
  "summary": "本章回答：为什么需要把长期回报写成一个递推式。",
  "order": 1,
  "content": "<p>正文……</p><div data-scene=\"scene-history\"></div>",
  "sceneIds": ["scene-history"],
  "sourceIds": ["sutton2018"]
}
```

- `content`：HTML 字符串。章节标题由引擎根据 `title` 渲染，正文不要重复 `<h2>`。
- `sceneIds`：本章使用的场景。正文中用 `<div data-scene="id"></div>` 放置；未放置的场景会自动追加到章末。
- `sourceIds`：本章关键结论的来源；引擎会在章末渲染来源条。
- `order`：章节顺序。

## concepts

```json
{
  "id": "mdp",
  "name": "马尔可夫决策过程",
  "definition": "一个五元组 (S, A, P, R, γ)。",
  "explanation": "用状态、动作、转移、奖励和折扣描述序贯决策。",
  "principles": ["未来只依赖当前状态，不依赖完整历史。"],
  "examples": ["网格世界中，状态是格子，动作是上下左右。"],
  "relatedConceptIds": ["state", "action"],
  "sourceIds": ["sutton2018"]
}
```

- `definition`、`explanation`、`principles[]`、`examples[]` 可以包含行内 HTML。
- `name` 是纯文本，会被转义。
- `relatedConceptIds` 必须存在。

## algorithms

```json
{
  "id": "q-learning",
  "name": "Q-learning",
  "problem": "在未知环境模型中学习最优动作价值。",
  "background": "TD 控制方法的一种离线策略变体。",
  "prerequisites": ["MDP", "Bellman 最优方程", "TD 误差"],
  "principle": "用即时奖励加下一状态的最大 Q 值作为目标，沿 TD 误差更新。",
  "formulas": [
    "<math xmlns=\"http://www.w3.org/1998/Math/MathML\"><mi>Q</mi><mo>(</mo><mi>s</mi><mo>,</mo><mi>a</mi><mo>)</mo><mo>←</mo><mi>Q</mi><mo>(</mo><mi>s</mi><mo>,</mo><mi>a</mi><mo>)</mo><mo>+</mo><mi>α</mi><mo>[</mo><mi>r</mi><mo>+</mo><mi>γ</mi><munder><mo>max</mo><mi>a′</mi></munder><mi>Q</mi><mo>(</mo><mi>s′</mi><mo>,</mo><mi>a′</mi><mo>)</mo><mo>−</mo><mi>Q</mi><mo>(</mo><mi>s</mi><mo>,</mo><mi>a</mi><mo>)</mo><mo>]</mo></math>"
  ],
  "pseudocode": "for each episode:\n  choose a\n  observe r, s'\n  Q[s,a] += alpha * (r + gamma * max(Q[s']) - Q[s,a])",
  "steps": [
    {"title": "观察当前状态", "text": "从环境中读取 s。"},
    {"title": "选择动作", "text": "用 ε-greedy 选择 a。"}
  ],
  "complexity": {"time": "每次更新 O(|A|)", "space": "Q 表 O(|S||A|)"},
  "advantages": ["不需要环境模型", "实现简单"],
  "limitations": ["离散动作空间", "样本效率低"],
  "applications": ["网格世界", "离散控制"],
  "relatedAlgorithmIds": ["sarsa"],
  "sourceIds": ["watkins1992"]
}
```

- `formulas`：HTML 字符串数组，使用 MathML 或简单 HTML。
- `pseudocode`：纯文本，引擎转义后放入 `<pre><code>`。
- `steps`：`{title, text}` 数组。
- `complexity`：可选，`{time, space}`。
- 所有 `relatedAlgorithmIds` 必须存在。

## modules

```json
{
  "id": "replay-buffer",
  "name": "Experience Replay Buffer",
  "responsibility": "保存历史转移，并从中采样小批量数据。",
  "inputs": ["transition (s, a, r, s′)"],
  "outputs": ["mini-batch"],
  "components": ["环形缓冲区", "均匀采样器"],
  "dependencies": ["随机数生成器"],
  "executionFlow": ["写入 transition", "采样 batch", "送入网络更新"],
  "implementation": "class ReplayBuffer:\n    def push(self, transition): ...\n    def sample(self, batch_size): ...",
  "sourceIds": ["mnih2015"]
}
```

- `implementation`：纯文本代码，引擎转义后放入 `<pre><code>`。
- 列表字段可以包含行内 HTML，但建议保持简短。

## scenes

```json
{
  "id": "scene-history",
  "type": "timeline",
  "title": "从动态规划到深度强化学习",
  "description": "关键事件与技术路线。",
  "data": {"events": []},
  "sourceIds": ["sutton2018"]
}
```

允许的 `type`：

```text
timeline
architecture
sequence
process
comparison
algorithm
data-structure
concept
future-scenario
```

各类型 `data` 格式见 `scenes-guide.md`。场景必须有具体数据，不要用占位符。

## crossReferences

```json
{
  "id": "xref-q-bellman",
  "sourceId": "q-learning",
  "targetId": "bellman",
  "type": "depends-on",
  "description": "Q-learning 的更新目标来自贝尔曼最优方程。"
}
```

`sourceId` / `targetId` 可以是 concept、algorithm、module 或 chapter 的 id。

类型建议：

```text
depends-on
related-to
compared-with
implements
extends
communicates-with
alternative-to
```

## sources

```json
{
  "id": "sutton2018",
  "title": "Reinforcement Learning: An Introduction",
  "url": "http://incompleteideas.net/book/the-book-2nd.html",
  "type": "book",
  "publisher": "MIT Press",
  "author": "Richard S. Sutton, Andrew G. Barto",
  "publishedAt": "2018",
  "accessedAt": "2026-11-26",
  "evidenceDescription": "第 6 章给出 TD 与 Q-learning 的标准表述。"
}
```

`type`：

```text
official-documentation
academic-paper
github
technical-blog
book
other
```

## quiz

```json
{
  "question": "Q-learning 的更新目标是什么？",
  "options": [
    "当前 Q 值",
    "即时奖励加下一状态最大 Q 值",
    "整个回合的总奖励",
    "下一状态的平均 Q 值"
  ],
  "answer": 1,
  "explanation": "目标是 r + γ·max Q(s′,a′)，再乘以学习率去修正当前 Q。"
}
```

- 建议恰好 5 题；构建脚本会在不是 5 题时警告。
- `answer` 从 0 开始。
- `options` 是纯文本，会被转义。
- `explanation` 可以包含行内 HTML。

## 正文 HTML 约定

允许的常用标签：

```html
<p>段落</p>
<h3 id="sec-anchor">小节标题</h3>
<ul><li>列表</li></ul>
<blockquote>引用</blockquote>
<pre><code data-lang="python">print("hello")</code></pre>
<math xmlns="http://www.w3.org/1998/Math/MathML">...</math>
<div data-scene="scene-id"></div>
<button class="concept-link" data-concept="concept-id">概念名</button>
<button class="concept-link" data-algorithm="algorithm-id">算法名</button>
<button class="concept-link" data-module="module-id">模块名</button>
<a href="#src-sutton2018" class="source-ref">[1]</a>
```

规则：

- 不要写 `<script>`、`<iframe>`、外部 `<link>`。
- 代码块中的 `<`、`>`、`&` 必须转义。
- 公式用 MathML；不依赖 KaTeX。
- 场景占位符放在块级位置，不要塞进 `<p>`。
- 小节锚点用 `<h3 id="...">`，树节点 `targetId` 与它一致。
- 章节内引用来源用 `#src-<sourceId>`。

## 校验规则

构建脚本会检查：

- `meta` 必填字段
- 所有 id 唯一
- 树根、父子关系、无环
- `targetId` 指向存在的对象（`section` 除外）
- 章节、场景、概念、算法、模块的引用有效
- 场景类型合法
- 来源引用有效
- quiz 答案下标合法
- 正文中不出现外部脚本/样式/iframe

内容质量（背景、直觉、对比、局限、5 题等）由写作指南和最终检查清单保证。
