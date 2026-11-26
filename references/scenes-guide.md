# Scene 指南

场景是图解，不是装饰。每个场景都要有具体数据，并回答一个明确问题。

一页建议 3–6 个场景，至少 3 种类型。不要把同一张架构图复制到每一章。

## 通用字段

```json
{
  "id": "scene-id",
  "type": "timeline",
  "title": "场景标题",
  "description": "一句话说明这张图要回答什么。",
  "data": {},
  "sourceIds": ["source-id"]
}
```

## 1. timeline

用于历史、版本、路线变化。

```json
{
  "id": "scene-history",
  "type": "timeline",
  "title": "从动态规划到深度强化学习",
  "description": "关键事件与技术路线。",
  "data": {
    "events": [
      {
        "date": "1957",
        "title": "动态规划",
        "text": "Bellman 把序贯决策写成递推式。",
        "sourceIds": ["bellman1957"]
      },
      {
        "date": "1989",
        "title": "Q-learning",
        "text": "Watkins 提出无需环境模型的离线策略控制方法。",
        "sourceIds": ["watkins1992"]
      }
    ]
  },
  "sourceIds": ["sutton2018"]
}
```

要点：事件按时间排序；每条只讲一个变化；不要堆年份。

## 2. architecture

用于系统组成、模块职责、依赖关系。

```json
{
  "id": "scene-dqn",
  "type": "architecture",
  "title": "DQN 的训练闭环",
  "description": "数据如何从环境流到网络更新。",
  "data": {
    "width": 760,
    "height": 320,
    "nodes": [
      {
        "id": "env",
        "label": "Environment",
        "x": 40,
        "y": 40,
        "w": 160,
        "h": 56,
        "group": "external",
        "detail": "执行动作，返回 r 和 s′。"
      },
      {
        "id": "buffer",
        "label": "Replay Buffer",
        "x": 300,
        "y": 40,
        "w": 160,
        "h": 56,
        "group": "data",
        "detail": "保存历史转移，均匀采样 mini-batch。"
      },
      {
        "id": "qnet",
        "label": "Q Network",
        "x": 560,
        "y": 40,
        "w": 160,
        "h": 56,
        "group": "model",
        "detail": "输入状态，输出每个动作的 Q 值。"
      }
    ],
    "edges": [
      {"from": "env", "to": "buffer", "label": "transition"},
      {"from": "buffer", "to": "qnet", "label": "batch"},
      {"from": "qnet", "to": "env", "label": "action", "dashed": true}
    ]
  },
  "sourceIds": ["mnih2015"]
}
```

要点：节点坐标是左上角；标签短；长解释放 `detail`；边不要交叉太多。

## 3. sequence

用于消息传递、协议交互、调用顺序。

```json
{
  "id": "scene-loop",
  "type": "sequence",
  "title": "Agent 与 Environment 的一步交互",
  "description": "动作、奖励和下一状态如何流动。",
  "data": {
    "actors": ["Agent", "Environment"],
    "messages": [
      {
        "from": "Agent",
        "to": "Environment",
        "label": "action a_t",
        "note": "策略网络根据 s_t 选择动作。"
      },
      {
        "from": "Environment",
        "to": "Agent",
        "label": "r_t, s_{t+1}",
        "note": "环境执行动作并返回反馈。"
      }
    ]
  },
  "sourceIds": ["sutton2018"]
}
```

要点：actor 名称唯一；消息按时间顺序；每条消息只表达一次交互。

## 4. process

用于执行流程、训练步骤、数据处理管线。

```json
{
  "id": "scene-train",
  "type": "process",
  "title": "一次 DQN 更新",
  "description": "从采样到参数更新的五个步骤。",
  "data": {
    "steps": [
      {
        "title": "采样",
        "text": "从回放缓冲区取一批 transition。",
        "state": {"batch_size": "32", "policy": "ε-greedy"}
      },
      {
        "title": "计算目标",
        "text": "用目标网络计算 r + γ·max Q(s′,a′)。",
        "state": {"gamma": "0.99", "target_update": "每 1000 步"}
      },
      {
        "title": "计算损失",
        "text": "对当前 Q 与目标 Q 的均方误差求导。",
        "state": {"loss": "MSE"}
      }
    ]
  },
  "sourceIds": ["mnih2015"]
}
```

要点：步骤 3–7 个；每步有可观察的状态；不要把整篇论文塞进一张图。

## 5. comparison

用于新旧方案、算法路线、架构选择。

```json
{
  "id": "scene-compare",
  "type": "comparison",
  "title": "Q-learning 与 PPO 的取舍",
  "description": "从数据、稳定性和适用场景比较两类方法。",
  "data": {
    "dimensions": ["解决的问题", "核心原理", "样本效率", "适用场景"],
    "options": [
      {
        "name": "Q-learning",
        "values": ["离散动作价值", "时序差分", "较低", "离散控制"],
        "highlight": false
      },
      {
        "name": "PPO",
        "values": ["策略优化", "策略梯度 + 裁剪", "较高", "连续/离散控制"],
        "highlight": true
      }
    ],
    "note": "对比基于相同任务预算；样本效率是相对量级，不是精确排名。"
  },
  "sourceIds": ["sutton2018", "schulman2017"]
}
```

要点：3–5 个维度；2–4 个方案；先定评价标准；不要只写"更好"。

## 6. algorithm

用于算法更新、数值演算、状态表变化。

```json
{
  "id": "scene-q-update",
  "type": "algorithm",
  "title": "一次 Q-learning 更新",
  "description": "α=0.1，γ=0.9，观察 Q 值如何变化。",
  "data": {
    "formula": "<math xmlns=\"http://www.w3.org/1998/Math/MathML\"><mi>Q</mi><mo>(</mo><mi>s</mi><mo>,</mo><mi>a</mi><mo>)</mo><mo>←</mo><mi>Q</mi><mo>(</mo><mi>s</mi><mo>,</mo><mi>a</mi><mo>)</mo><mo>+</mo><mi>α</mi><mo>[</mo><mi>r</mi><mo>+</mo><mi>γ</mi><munder><mo>max</mo><mi>a′</mi></munder><mi>Q</mi><mo>(</mo><mi>s′</mi><mo>,</mo><mi>a′</mi><mo>)</mo><mo>−</mo><mi>Q</mi><mo>(</mo><mi>s</mi><mo>,</mo><mi>a</mi><mo>)</mo><mo>]</mo></math>",
    "columns": ["步骤", "状态 s", "动作 a", "奖励 r", "下一状态 s′", "max Q(s′)", "Q(s,a) 更新"],
    "rows": [
      ["1", "s1", "右", "-1", "s2", "10.0", "0.00 → 0.90"],
      ["2", "s2", "下", "0", "s4", "10.0", "0.00 → 0.90"],
      ["3", "s4", "右", "1", "s5", "10.0", "0.00 → 1.90"]
    ],
    "note": "目标 = r + γ·max Q(s′)；更新量 = α·(目标 − 当前 Q)。"
  },
  "sourceIds": ["watkins1992"]
}
```

要点：至少一次真实数字；每列都有含义；行数 3–10；控制按钮会自动生成。

## 7. data-structure

用于数组、队列、哈希表、树等结构的状态变化。

```json
{
  "id": "scene-buffer",
  "type": "data-structure",
  "title": "环形缓冲区的写入",
  "description": "容量为 6，观察指针移动和覆盖。",
  "data": {
    "items": [
      {"label": "0", "value": "t1"},
      {"label": "1", "value": "t2"},
      {"label": "2", "value": "t3"},
      {"label": "3", "value": "—"},
      {"label": "4", "value": "—"},
      {"label": "5", "value": "—"}
    ],
    "steps": [
      {
        "title": "初始状态",
        "text": "缓冲区已写入 3 条 transition。",
        "highlight": [0, 1, 2]
      },
      {
        "title": "写入 t4",
        "text": "指针移动到下标 3，写入 t4。",
        "highlight": [3]
      },
      {
        "title": "写入 t7",
        "text": "缓冲区满后覆盖最旧的数据。",
        "highlight": [0]
      }
    ]
  },
  "sourceIds": ["mnih2015"]
}
```

要点：元素数量适中（6–12）；每一步只改变少量位置；`highlight` 是下标数组。

## 8. concept

用于术语全景和概念关系。

```json
{
  "id": "scene-concepts",
  "type": "concept",
  "title": "强化学习的核心概念",
  "description": "实体、学习对象和它们的关系。",
  "data": {
    "groups": [
      {"name": "核心实体", "concepts": ["agent", "environment"]},
      {"name": "学习对象", "concepts": ["policy", "value-function"]},
      {"name": "反馈信号", "concepts": ["reward", "return"]}
    ],
    "edges": [
      {"from": "agent", "to": "environment", "label": "动作/观测"},
      {"from": "policy", "to": "agent", "label": "决定动作"},
      {"from": "reward", "to": "return", "label": "折扣累加"}
    ]
  },
  "sourceIds": ["sutton2018"]
}
```

要点：分组 2–4 个；每组 2–6 个概念；概念 id 必须存在于 `concepts`；关系 3–8 条。

## 9. future-scenario

用于未来方向、路线分支、风险。

```json
{
  "id": "scene-future",
  "type": "future-scenario",
  "title": "强化学习的三个方向",
  "description": "区分已发生、进行中和推测。",
  "data": {
    "branches": [
      {
        "title": "离线强化学习",
        "status": "trend",
        "text": "从固定数据集中学习策略，减少在线交互。",
        "evidence": "多个基准和工业实践正在出现。",
        "sourceIds": ["levine2020"]
      },
      {
        "title": "通用智能体",
        "status": "speculation",
        "text": "用统一策略处理多任务、多环境。",
        "evidence": "目前缺乏统一证据，更多是研究方向。",
        "sourceIds": []
      }
    ]
  },
  "sourceIds": ["sutton2018"]
}
```

`status` 只能是：

- `fact`：已发生，有证据
- `trend`：进行中，有明确方向
- `speculation`：推测，必须标注

要点：每个分支都写证据或明确写"推测"；不要把所有方向都写成必然。

## 选择建议

| 内容 | 首选 |
|---|---|
| 历史、版本 | timeline |
| 组件、依赖 | architecture |
| 消息、协议 | sequence |
| 流程、训练步骤 | process |
| 方案取舍 | comparison |
| 数值更新、算法状态 | algorithm |
| 数组/队列/表状态 | data-structure |
| 术语与关系 | concept |
| 未来与风险 | future-scenario |

如果一张图超过 10 个节点或 8 个步骤，拆成两张。
