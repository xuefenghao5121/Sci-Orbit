# AI4S Memory Skill

> 触发命令: `/memory` | 版本: 0.1.0 | 灵码团队

## 描述

记忆管理技能。通过知识库的创建、添加、搜索、审查和导出，实现在线微调的数据积累。基于三层记忆架构（OpenViking）。

## 触发条件

- 用户说"记住这个"、"添加知识"、"创建知识库"
- 用户说"搜索记忆"、"查找知识"
- 用户说"审查记忆"、"清理记忆"、"导出训练数据"
- `/memory` 命令直接触发
- 对话中出现可学习的技术知识（自动触发 /memory add）

## 命令路由

| 命令 | 功能 | 参数 |
|------|------|------|
| `/memory create <domain>` | 创建领域知识库 | 领域名称 |
| `/memory add <content> [--domain <d>] [--tag <t>]` | 添加知识条目 | 内容 + 领域 + 标签 |
| `/memory search <query> [--domain <d>] [--limit <n>]` | 语义搜索记忆 | 查询 + 可选过滤 |
| `/memory review [--domain <d>]` | 审查记忆质量 | 可选领域过滤 |
| `/memory export [--domain <d>] [--format jsonl\|md]` | 导出训练数据 | 可选领域 + 格式 |

## 执行流程

### /memory create

```
输入: 领域名称
    ↓
① 创建目录: memory/openviking/resources/knowledge/<domain>/
    ↓
② 初始化元数据:
    - domain.json (领域信息)
    - index.json (知识索引)
    ↓
③ 添加到知识库注册表
    ↓
④ 输出创建确认
```

### /memory add

```
输入: 知识内容 + 领域 + 标签
    ↓
① 解析内容，提取结构化信息:
    - 实体 (概念、术语)
    - 关系 (因果、依赖、对比)
    - 属性 (参数、数值)
    ↓
② 生成知识条目 (JSON)
    ↓
③ 冲突检测: 与已有知识是否矛盾
    ↓
④ 保存到知识库
    ↓
⑤ 更新索引
    ↓
⑥ 输出确认 + 知识 ID
```

### /memory search

```
输入: 查询文本
    ↓
① 语义搜索 (OpenViking search API)
    ↓
② 按相关性排序
    ↓
③ 返回匹配的知识条目
    ↓
④ 如有匹配，输出摘要 + 完整路径
```

### /memory review

```
输入: 可选领域过滤
    ↓
① 加载指定领域的所有知识条目
    ↓
② 质量检查:
    - 过时检测 (创建时间 > 6个月)
    - 冲突检测 (矛盾条目)
    - 孤立检测 (从未被引用)
    - 重复检测 (相似内容)
    ↓
③ 输出审查报告:
    - 待清理条目列表
    - 推荐操作 (删除/合并/更新)
    ↓
④ 用户确认后执行清理
```

### /memory export

```
输入: 可选领域 + 格式
    ↓
① 加载指定领域的知识条目
    ↓
② 格式转换:
    - jsonl: 每行一个 JSON 训练样本
    - md: Markdown 文档格式
    ↓
③ 写入文件:
    - .ai4s/memory/export/<domain>_<date>.jsonl
    - .ai4s/memory/export/<domain>_<date>.md
    ↓
④ 输出文件路径和统计
```

## 知识条目格式

```json
{
  "id": "mem_20260331_001",
  "domain": "cfd",
  "type": "fact",
  "content": "k-ε 模型在壁面附近需要使用壁面函数处理",
  "source": "conversation",
  "confidence": 0.95,
  "created": "2026-03-31T20:00:00Z",
  "tags": ["turbulence", "wall-function", "cfd"],
  "references": [],
  "deprecated": false
}
```

## 导出格式

### JSONL (训练数据)

```jsonl
{"instruction": "什么是壁面函数？为什么 k-ε 模型需要它？", "input": "", "output": "k-ε 模型在壁面附近由于网格无法解析粘性底层，需要使用壁面函数来近似处理壁面边界条件..."}
```

### Markdown

```markdown
# 领域知识库: CFD

## mem_20260331_001
- **类型**: fact
- **内容**: k-ε 模型在壁面附近需要使用壁面函数处理
- **标签**: turbulence, wall-function, cfd
- **来源**: conversation
- **置信度**: 0.95
```

## 自动学习规则

以下情况自动触发 `/memory add`：
1. 用户分享了技术结论（"我们发现..."、"结果表明..."）
2. 用户纠正了 Agent 回答（反馈学习）
3. 论文处理完成（核心概念自动入库）
4. 实验完成（关键结果自动提取）
5. 同类问题出现 ≥3 次（生成规则）

**不自动学习**：
- 闲聊、非技术对话
- 群组中他人的对话（隐私）
- 明确标记"不要记住"的内容

## 存储路径

```
memory/openviking/resources/knowledge/<domain>/    # 领域知识库
memory/openviking/memories/user/feedback/          # 反馈记忆
.ai4s/memory/export/                               # 导出文件
```

## 串联命令

- `/paper read` → `/memory add` — 论文知识自动入库
- `/exp run` → `/memory add` — 实验经验自动入库
- `/memory export` → `/finetune prepare` — 导出数据用于微调
- `/memory search` → 任意命令 — 检索相关知识辅助决策
- `/memory review` → `/memory add` — 清理后补充新知识
