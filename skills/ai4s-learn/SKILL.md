# AI4S Learn Skill

> 触发命令: `/learn` | 版本: 0.1.0 | 灵码团队

## 描述

自动学习技能。从论文、实验、对话中提取知识，积累经验，评估学习效果。实现在线微调的知识积累层。

## 触发条件

- 用户说"从论文学习"、"从实验学习"
- 用户说"学习状态"、"评估学习效果"
- `/learn` 命令直接触发
- `/paper read` 完成后建议触发 `/learn from paper`
- `/exp run` 完成后建议触发 `/learn from experiment`

## 命令路由

| 命令 | 功能 | 参数 |
|------|------|------|
| `/learn from paper <paper-id>` | 从论文学习 | 论文 ID |
| `/learn from experiment <exp-id>` | 从实验学习 | 实验 ID |
| `/learn status` | 查看学习状态 | 无 |
| `/learn evaluate [--domain <d>]` | 评估学习效果 | 可选领域 |

## 执行流程

### /learn from paper

```
输入: 论文 ID
    ↓
① 加载论文笔记 (.ai4s/papers/<id>/notes.md)
    ↓
② 提取知识:
    - 核心概念 → definition 条目
    - 方法/算法 → method 条目
    - 公式/定理 → formula 条目
    - 实验结论 → conclusion 条目
    - 局限性 → limitation 条目
    ↓
③ 关联已有知识:
    - 语义搜索相似知识
    - 建立知识图谱链接
    - 标注冲突/补充/验证关系
    ↓
④ 批量添加到知识库 (/memory add)
    ↓
⑤ 更新学习统计
    ↓
⑥ 输出学习摘要:
    - 提取了 N 条知识
    - 发现 M 个关联
    - 发现 K 个冲突/补充
```

### /learn from experiment

```
输入: 实验 ID
    ↓
① 加载实验配置和结果
    ↓
② 提取经验:
    - 成功模式 (什么参数组合效果好)
    - 失败模式 (什么导致了失败)
    - 参数敏感性 (哪些参数影响最大)
    - 性能瓶颈 (哪里是瓶颈)
    - 异常模式 (什么情况会出错)
    ↓
③ 与历史实验对比:
    - 趋势分析 (指标是否在改善)
    - 最优参数区域
    - 经验规则提取
    ↓
④ 保存经验到知识库
    ↓
⑤ 更新约束规则 (如发现常见错误)
    ↓
⑥ 输出学习摘要
```

### /learn status

```
    ↓
① 加载学习统计:
    - 各领域知识库大小
    - 学习频率趋势
    - 知识来源分布 (paper/experiment/conversation)
    - 最近学习记录
    ↓
② 显示三层记忆使用情况:
    - L1: 当前会话记忆
    - L2: 短期记忆 (30天)
    - L3: 长期记忆
    ↓
③ 待学习队列 (如有)
    ↓
④ 输出状态报告
```

### /learn evaluate

```
输入: 可选领域
    ↓
① 设计评估问题:
    - 从知识库中抽样生成测试问题
    - 覆盖不同知识类型 (概念/方法/结论)
    ↓
② 回答测试问题
    ↓
③ 对比知识库中的标准答案
    ↓
④ 计算准确率和覆盖率
    ↓
⑤ 输出评估报告:
    - 各维度得分
    - 薄弱领域识别
    - 改进建议
```

## 学习统计格式

```json
// .ai4s/learn/stats.json
{
  "total_knowledge": 156,
  "by_domain": {
    "cfd": 45,
    "ml": 38,
    "materials": 28,
    "optimization": 25,
    "other": 20
  },
  "by_source": {
    "paper": 62,
    "experiment": 48,
    "conversation": 35,
    "manual": 11
  },
  "by_type": {
    "fact": 50,
    "concept": 35,
    "method": 30,
    "conclusion": 25,
    "pattern": 16
  },
  "recent_learning": [
    {
      "source": "paper:p-005",
      "entries_added": 12,
      "date": "2026-03-31"
    }
  ],
  "last_updated": "2026-03-31T20:00:00Z"
}
```

## 自动学习触发规则

| 事件 | 自动动作 | 条件 |
|------|----------|------|
| `/paper read` 完成 | 建议 `/learn from paper` | 提取到 >3 个核心概念 |
| `/exp run` 完成 | 建议 `/learn from experiment` | 实验有明确结论 |
| 用户纠正回答 | 立即 `/memory add` | 反馈学习 (最高优先级) |
| 技术讨论结束 | 自动提取知识 | 检测到结论性语句 |
| 同类问题 ≥3 次 | 生成 FAQ 规则 | 自动去重 |

## 串联命令

- `/paper read` → `/learn from paper` — 论文知识积累
- `/exp run` → `/learn from experiment` — 实验经验积累
- `/learn from paper` → `/memory search` — 检查已有知识避免重复
- `/learn evaluate` → `/memory review` — 评估后清理
- `/learn from experiment` → `/finetune --data` — 实验数据用于微调
