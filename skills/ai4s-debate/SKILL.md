# AI4S Debate Skill

> 触发命令: `/ai4s-debate` | 版本: 0.1.0 | 灵码团队

## 描述

科学方案辩论技能。当用户需要对计划进行评审、对方案有疑问、或需要多角度分析时触发。通过结构化的正反方辩论机制，确保方案经过充分论证后再执行。

## 触发条件

- 用户说"评审一下这个计划"、"辩论"、"有没有更好的方案"
- 用户对 `/ai4s-plan` 生成的计划提出疑问
- 用户说"这个方案靠谱吗"、"有什么风险"
- 高复杂度任务（complex 级别）自动触发辩论环节

## 行为流程

```
用户提交计划/方案
    ↓
① identify_core_claims — 识别核心论点
    ↓
② generate_arguments — 生成正反方论点
    ↓
③ multi_round_debate — 多轮辩论（默认 2 轮）
    ↓
④ verdict — 裁决
    ↓
⑤ revise_plan — 修正计划（如有必要）
    ↓
⑥ 输出修正后的计划
```

## 辩论模板

### 正方论点格式

```markdown
## 🔵 正方 (方案支持)

### 论点 1: {argument_title}
- **论据**: {supporting_evidence}
- **优势**: {benefit}
- **风险缓解**: {mitigation}

### 论点 2: {argument_title}
- **论据**: {supporting_evidence}
- **优势**: {benefit}
- **风险缓解**: {mitigation}
```

### 反方论点格式

```markdown
## 🔴 反方 (方案质疑)

### 论点 1: {argument_title}
- **质疑**: {challenge}
- **潜在问题**: {potential_issue}
- **替代方案**: {alternative}

### 论点 2: {argument_title}
- **质疑**: {challenge}
- **潜在问题**: {potential_issue}
- **替代方案**: {alternative}
```

### 裁决格式

```markdown
## ⚖️ 裁决

### 综合评估
| 维度 | 评分 (1-5) | 说明 |
|------|-----------|------|
| 技术可行性 | {score} | {note} |
| 资源合理性 | {score} | {note} |
| 风险可控性 | {score} | {note} |
| 创新价值 | {score} | {note} |

### 结论: {approve|conditional_approve|reject}

### 修正建议
1. {suggestion_1}
2. {suggestion_2}
```

## 辩论维度

根据任务类型自动选择辩论维度：

| 任务类型 | 辩论焦点 |
|----------|----------|
| 论文复现 | 方法可行性、数据可获得性、计算资源 |
| 算法创新 | 创新性、复杂度、验证方法 |
| 实验设计 | 变量控制、统计显著性、可复现性 |
| 工程实现 | 性能、可维护性、扩展性 |
| 模型训练 | 数据质量、过拟合风险、泛化能力 |

## 交互规范

- 辩论轮数默认 2 轮，用户可指定 `/ai4s-debate --rounds 3`
- 每轮辩论后可由用户介入补充论点
- 裁决结果和修正建议自动应用到计划
- 用户可随时说"跳过辩论"直接执行

## 状态文件

辩论记录保存到 `.ai4s/debates/<debate-id>/meta.json`

```json
{
  "id": "deb-001",
  "plan_id": "plan-001",
  "rounds": 2,
  "verdict": "conditional_approve",
  "revisions": ["增加对照组", "调整超参数范围"],
  "created_at": "2026-03-31T20:00:00Z"
}
```
