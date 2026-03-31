# ai4s-feedback Skill

> 版本: 1.0.0 | 灵码团队 | Phase 3

## Description
用户反馈收集与学习系统。收集正面/负面反馈，自动调整行为策略。
触发词：反馈、feedback、纠正、/feedback。

## 命令路由

| 命令 | 说明 |
|------|------|
| `/feedback good` | 正面反馈（标记正确行为） |
| `/feedback bad [纠正内容]` | 负面反馈 + 纠正 |
| `/feedback review` | 审查所有反馈记录 |

## 命令详解

### `/feedback good` — 正面反馈

```
用法: /feedback good [备注]

示例:
  /feedback good                    # 标记最近的回答为好
  /feedback good 这个推导过程很清晰  # 带备注
```

**处理**: 记录到 `.ai4s/feedback/positive.jsonl`，更新行为权重。

### `/feedback bad` — 负面反馈

```
用法: /feedback bad <纠正内容>

示例:
  /feedback bad 公式推导有误，应该是...正确的形式是...
  /feedback bad 不应该用 Euler 方法，这个问题的刚性需要用隐式方法
```

**处理**:
1. 记录到 `.ai4s/feedback/negative.jsonl`
2. 提取纠正模式（规则/事实/方法）
3. 立即更新相关记忆
4. 标记需要避免的模式

### `/feedback review` — 审查反馈

```
用法: /feedback review [--all|--recent N|--domain DOMAIN]

输出:
  📊 反馈统计
  ✅ 正面: 23 条 | ❌ 负面: 7 条
  
  最近 5 条:
  1. [❌] 公式推导错误 (2h ago)
  2. [✅] 代码运行正确 (3h ago)
  3. [❌] 工具选择不当 (1d ago)
  
  改进趋势: ⬆️ 错误率下降 30%
```

## 自动反馈收集规则

以下场景自动触发反馈收集（无需用户显式命令）：

| 触发条件 | 行为 |
|----------|------|
| 用户说"不对"/"错了"/"不是" | 自动记录为负面反馈，询问纠正内容 |
| 用户说"对"/"正确"/"好的" | 记录为正面反馈 |
| 用户直接给出正确答案 | 对比差异，提取纠正规则 |
| 实验结果与预期不符 | 自动标记，关联到相关命令和参数 |
| 同一错误出现 2 次以上 | 升级为高优先级修正规则 |

**不自动收集**: 闲聊中的模糊否定（"嗯"、"还行"）、群组中他人对话。

## 存储结构

```
.ai4s/feedback/
├── positive.jsonl    # 正面反馈记录
├── negative.jsonl    # 负面反馈记录
├── patterns.json     # 提取的纠正模式
└── stats.json        # 统计数据
```

## 反馈记录格式

```json
{"timestamp": "2026-03-31T22:00:00Z", "type": "negative", "context": "流体力学计算", "original": "使用了 Euler 显式方法", "correction": "应使用隐式方法处理刚性方程", "command": "/science run", "priority": "high"}
```

## 反馈驱动改进

负面反馈积累后自动触发以下改进：
1. **规则更新**: 将纠正内容转化为约束规则（`/constrain configure`）
2. **记忆修正**: 更新知识库中的错误条目
3. **工具偏好**: 调整工具选择优先级
4. **微调数据**: 积累足够反馈后生成微调训练样本
