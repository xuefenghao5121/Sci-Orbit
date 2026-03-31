# AI4S — AI for Scientific Computing

> 🔬 Claude Code 的科学计算编排引擎：38 个 MCP 工具 · 16 个 Skill · 5 个 Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.4.0-green.svg)](CHANGELOG.md)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

---

## ✨ 功能特性

### Phase 1 — MVP 基础
- ✅ Plan-First 工作流（分类 → 规划 → 验证 → 审查）
- ✅ 论文解析与结构化提取
- ✅ 实验管理（计划 → 运行 → 监控 → 对比）
- ✅ 环境检测与自动配置

### Phase 2 — 核心功能
- ✅ 辩论系统（提案者/批评者结构化辩论）
- ✅ 领域知识库（创建/添加/搜索/更新/导出）
- ✅ 科学计算集成（PySCF、OpenMM、RDKit、Jupyter）
- ✅ 约束检查引擎（量纲/守恒/范围/代码）

### Phase 3 — 离线微调 + HPC
- ✅ 离线微调流水线（LoRA/QLoRA/Full）
- ✅ HPC 多后端（本地/SLURM/K8s）
- ✅ 推理服务部署（vLLM/Ollama/llama.cpp）
- ✅ 反馈收集系统

### Phase 4 — 生产化
- ✅ 安全层（输入校验、命令净化、速率限制）
- ✅ 完整文档体系
- ✅ 5 个端到端示例项目
- ✅ 一键安装/卸载

## 🚀 安装

```bash
npx @ai4s/cli init
```

安装后重启 Claude Code，使用 `/ai4s-status` 验证。

## ⚡ 快速演示

```bash
claude
> 帮我复现论文 "Attention Is All You Need" 中的 Transformer
```

AI4S 自动执行：任务分类 → 计划生成 → 论文解析 → 实验规划 → 代码生成

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code CLI                       │
├─────────────────────────────────────────────────────────┤
│  Agents          │  Skills          │  MCP Client       │
│  (5 个)          │  (16 个)         │                   │
├──────────────────┴──────────────────┴───────────────────┤
│                   MCP Server                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │
│  │ Tools   │ │Resources│ │Services │ │  Security   │  │
│  │ (38个)  │ │ (6 URI) │ │ (12个)  │ │   Layer     │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────────┘  │
├─────────────────────────────────────────────────────────┤
│  HPC Adapters  │  Inference Servers  │  Storage        │
│  (local/slurm/k8s) │ (vllm/ollama/cpp) │ (filesystem) │
└─────────────────────────────────────────────────────────┘
```

## 🔧 工具清单（38 个）

### Plan-First（4）
| 工具 | 说明 |
|------|------|
| `classify_task` | 任务分类（领域/类型/复杂度） |
| `generate_plan` | 生成结构化分析计划 |
| `validate_plan` | 验证计划结构完整性 |
| `review_plan` | 科学性审查 |

### 辩论系统（3）
| 工具 | 说明 |
|------|------|
| `debate_submit` | 提交计划进行辩论 |
| `debate_round` | 执行辩论轮次 |
| `debate_resolve` | 解析辩论并生成共识计划 |

### 论文工具（3）
| 工具 | 说明 |
|------|------|
| `paper_parse` | 解析论文（标题/作者/摘要/公式） |
| `paper_compare` | 对比多篇论文 |
| `paper_implement` | 从论文生成代码原型 |

### 实验管理（4）
| 工具 | 说明 |
|------|------|
| `exp_plan` | 生成实验计划 |
| `exp_run` | 生成运行脚本 |
| `exp_monitor` | 监控实验进度 |
| `exp_compare` | 对比实验结果 |

### 环境管理（2）
| 工具 | 说明 |
|------|------|
| `env_detect` | 检测运行环境 |
| `env_setup` | 生成环境配置 |

### 知识库（5）
| 工具 | 说明 |
|------|------|
| `kb_create` | 创建知识库 |
| `kb_add` | 添加知识条目 |
| `kb_search` | 搜索知识 |
| `kb_update` | 更新条目 |
| `kb_export` | 导出训练数据 |

### 微调（6）
| 工具 | 说明 |
|------|------|
| `finetune_prepare` | 准备微调数据集 |
| `finetune_start` | 启动微调 |
| `finetune_monitor` | 监控训练 |
| `finetune_resume` | 恢复训练 |
| `finetune_merge` | 合并 LoRA 权重 |
| `finetune_evaluate` | 评估模型 |

### 科学计算（4）
| 工具 | 说明 |
|------|------|
| `science_pyscf` | 量子化学计算 |
| `science_rdkit` | 分子分析 |
| `science_openmm` | 分子动力学 |
| `science_jupyter` | Notebook 操作 |

### 推理部署（3）
| 工具 | 说明 |
|------|------|
| `infer_start` | 启动推理服务 |
| `infer_test` | 测试推理质量 |
| `infer_stop` | 停止推理服务 |

### 约束检查（4）
| 工具 | 说明 |
|------|------|
| `check_dimension` | 量纲一致性检查 |
| `check_conservation` | 守恒定律验证 |
| `check_range` | 物理量范围检查 |
| `check_code` | 代码质量检查 |

## 📋 Skill 清单（16 个）

`ai4s-plan` · `ai4s-debate` · `ai4s-paper` · `ai4s-exp` · `ai4s-env` · `ai4s-memory` · `ai4s-finetune` · `ai4s-hpc` · `ai4s-infer` · `ai4s-science` · `ai4s-constrain` · `ai4s-learn` · `ai4s-feedback` · `ai4s-project` · `ai4s-status` · `ai4s-deploy`

## 🤖 Agent 清单（5 个）

| Agent | 职责 |
|-------|------|
| `ai4s-planner` | 任务分析与计划生成 |
| `ai4s-executor` | 实验执行与监控 |
| `ai4s-reviewer` | 科学审查与验证 |
| `ai4s-scientist` | 领域知识推理 |
| `ai4s-deployer` | 模型部署与推理 |

## 📁 示例项目

| 示例 | 场景 | 关键工具 |
|------|------|----------|
| [01-paper-reproduction](examples/01-paper-reproduction/) | 论文复现 | paper_parse → exp_plan → exp_run |
| [02-fluid-simulation](examples/02-fluid-simulation/) | 流体模拟 | check_dimension → science_jupyter |
| [03-model-finetuning](examples/03-model-finetuning/) | 模型微调 | kb_export → finetune_start → infer_start |
| [04-hpc-deployment](examples/04-hpc-deployment/) | HPC 部署 | exp_run → hpc submit → collect |
| [05-knowledge-accumulation](examples/05-knowledge-accumulation/) | 知识积累 | paper_parse → kb_add → kb_export |

## 📚 文档

- [快速开始](docs/getting-started.md)
- [用户指南](docs/user-guide.md)
- [配置参考](docs/configuration.md)
- [开发者指南](docs/developer-guide.md)
- [API 参考](docs/api-reference.md)
- [更新日志](CHANGELOG.md)

## 🤝 贡献

欢迎贡献！请阅读 [开发者指南](docs/developer-guide.md) 了解项目结构和开发流程。

## 📄 许可证

[MIT License](LICENSE)
