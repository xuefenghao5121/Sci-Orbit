# AI4S Paper Skill

> 触发命令: `/paper` | 版本: 0.1.0 | 灵码团队

## 描述

论文工作流技能。覆盖论文研读、对比分析、引用生成、代码原型实现的完整链路。

## 触发条件

- 用户发送 PDF 文件或论文 URL
- 用户说"读一下这篇论文"、"分析论文"、"论文笔记"
- 用户说"对比这两篇论文"、"生成引用"、"实现论文方法"
- `/paper` 命令直接触发

## 命令路由

| 命令 | 功能 | 参数 |
|------|------|------|
| `/paper read <file-or-url>` | 解析论文 → 结构化笔记 | PDF 路径或 arXiv URL |
| `/paper compare <id1> <id2> ...` | 多篇论文多维度对比 | 已读论文 ID |
| `/paper cite [--format bib\|latex\|md]` | 生成引用条目和文献综述 | 已读论文 ID |
| `/paper implement <paper-id> [--step <n>]` | 从论文生成代码原型 | 论文 ID + 可选步骤号 |

## 执行流程

### /paper read

```
输入: PDF 路径或 URL
    ↓
① pdf: 解析全文
    ↓
② extract_structure: 识别标题/作者/摘要/章节/参考文献
    ↓
③ extract_contributions: 提取关键贡献
    ↓
④ extract_methods: 提取方法和公式
    ↓
⑤ extract_results: 提取实验结果
    ↓
⑥ generate_notes: 按模板生成结构化笔记
    ↓
⑦ write: 保存到 .ai4s/papers/<paper-id>/notes.md
    ↓
⑧ update_index: 追加到 .ai4s/papers/index.json
```

### /paper compare

```
输入: 多个论文 ID
    ↓
① 加载各论文笔记
    ↓
② 多维度对比:
    - 问题定义对比
    - 方法论对比
    - 实验设置对比
    - 性能指标对比
    - 局限性对比
    ↓
③ 生成对比表格 + 分析
    ↓
④ 输出 Markdown 对比报告
```

### /paper cite

```
输入: 论文 ID + 格式
    ↓
① 加载论文元数据
    ↓
② 生成指定格式的引用条目:
    - bib: BibTeX 条目
    - latex: LaTeX \cite{} 引用
    - md: Markdown 引用
    ↓
③ 生成文献综述段落（可选）
```

### /paper implement

```
输入: 论文 ID
    ↓
① 加载论文笔记，提取算法/方法
    ↓
② 分解为可实现的步骤
    ↓
③ 逐步生成代码原型:
    - 数据预处理
    - 模型/算法核心
    - 训练/求解流程
    - 评估/验证
    ↓
④ write: 保存到 src/<paper-id>/
    ↓
⑤ 生成 README + 运行说明
```

## 论文笔记模板

```markdown
# 论文笔记: {title}

## 基本信息
- **标题**: {title}
- **作者**: {authors}
- **年份**: {year}
- **会议/期刊**: {venue}
- **arXiv**: {arxiv_id}
- **PDF**: {local_path}

## 一句话摘要
{one-line summary}

## 关键贡献
1. {contribution_1}
2. {contribution_2}
3. {contribution_3}

## 方法概要
### 核心思想
{core_idea}

### 关键公式
$$
{formula_1}
$$

### 算法流程
{algorithm_steps}

## 实验结果
| 数据集/场景 | 指标 | 结果 | 对比基线 |
|------------|------|------|---------|
| {dataset} | {metric} | {result} | {baseline} |

## 局限性
1. {limitation_1}
2. {limitation_2}

## 与我的项目相关性
- **相关度**: {high|medium|low}
- **可复现的创新点**: {actionable_innovations}
- **需要的资源**: {required_resources}
- **复现难度**: {easy|moderate|hard}

## 代码原型
- **路径**: `src/<paper-id>/`
- **状态**: {not_started|in_progress|completed}

## 标签
{tags}
```

## 状态文件

```json
// .ai4s/papers/index.json
{
  "papers": [
    {
      "id": "p-001",
      "title": "...",
      "authors": "...",
      "year": 2026,
      "tags": ["transformer", "nlp"],
      "notes_path": ".ai4s/papers/p-001/notes.md",
      "added_at": "2026-03-31T20:00:00Z"
    }
  ]
}
```

## 串联命令

- `/paper read` → `/ai4s-plan` — 基于论文生成复现计划
- `/paper read` → `/ai4s-debate` — 评审复现方案
- `/paper implement` → `/exp plan` — 生成实验方案
- `/paper read` → `/finetune --paper` — 论文知识注入微调
- `/paper read` → `/learn from paper` — 从论文学习
