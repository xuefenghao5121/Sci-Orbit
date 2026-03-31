# ai4s-finetune Skill

> 版本: 1.0.0 | 灵码团队 | Phase 3

## Description
AI4S 大模型微调工作流。支持一键微调、论文知识注入、实验数据理解、自动评估部署。
触发词：微调、fine-tune、finetune、训练模型、领域适配、/finetune、/ft。

## 触发规则
1. 用户说"微调" / "fine-tune" / "finetune" → 触发
2. 用户发送 PDF + "训练" / "学习" → 论文复现工作流
3. 用户发送数据文件 + "微调" → 实验数据工作流
4. `/finetune` 或 `/ft` 命令 → 直接触发

## 命令路由

| 命令 | 别名 | 说明 |
|------|------|------|
| `/finetune [模型]` | `/ft` | 一键微调（自动检测→配置→训练→评估→部署） |
| `/finetune prepare` | `/ft prep` | 准备训练数据 |
| `/finetune start` | `/ft run` | 启动训练 |
| `/finetune status` | `/ft st` | 查看训练状态 |
| `/finetune compare` | `/ft cmp` | 前后对比评估 |
| `/finetune deploy` | `/ft dep` | 部署模型 |

## 工作目录

```
~/.openclaw/workspace/finetune/
├── data/           # 训练数据
│   ├── train.jsonl
│   ├── val.jsonl
│   └── meta.json
├── config.yaml     # 微调配置
├── output/         # 训练输出
│   ├── checkpoint-*/
│   ├── merged/
│   └── eval-report.md
└── logs/           # 训练日志
```

## 命令详解

### `/finetune prepare` — 数据准备

```
用法: /finetune prepare --source {conversation|paper|dataset|project}

选项:
  --source conversation  从当前对话历史提取
  --source paper FILE    从论文PDF提取知识
  --source dataset DIR   从数据集目录读取
  --source project DIR   从项目代码/文档提取
  --format jsonl         输出格式 (默认 jsonl)
  --samples N            生成样本数 (默认 500)
  --output DIR           输出目录
```

**核心能力**:
- **对话提取**: 扫描 session history，提取问答对，去重、质量过滤
- **论文解析**: PDF → 关键概念 + 公式 + 方法 → 自动生成 QA 对
- **数据集处理**: CSV/JSON/Parquet → 结构化描述 → 训练样本
- **项目扫描**: README + 代码注释 + 文档 → 领域知识库

**输出**: `finetune-data/train.jsonl`, `finetune-data/val.jsonl`, `finetune-data/meta.json`

### `/finetune start` — 启动训练

```
用法: /finetune start [--config FILE] [--background] [--resume]

选项:
  --config FILE    配置文件 (默认 finetune-config.yaml)
  --background     后台运行
  --resume         断点续训
```

**训练过程**:
1. 检查 GPU 可用性
2. 加载基座模型 + LoRA adapter
3. 加载训练数据
4. 开始训练，实时输出 loss 曲线
5. 训练结束保存 checkpoint

### `/finetune status` — 状态查询

输出示例:
```
🔄 训练进度: epoch 2/3, step 456/600
📉 Loss: 0.342 (↓ 67%)
⏱️  已用时间: 45min
🎯 预计剩余: 22min
💾 Checkpoint: epoch-1, epoch-2
🖥️  GPU: A100 40GB, 显存占用 28GB/40GB
```

### `/finetune compare` — 对比评估

```
用法: /finetune compare [--test-set FILE] [--metrics all]

自动评估维度:
  - 领域知识问答准确率
  - 通用能力退化检测 (MMLU/GSM8K 子集)
  - 推理延迟对比
  - 显存占用对比
  - 生成质量 (BLEU/ROUGE vs 基座)
```

### `/finetune deploy` — 部署

```
用法: /finetune deploy [--target {local|vllm|ollama}]

目标:
  local   -- 保存到本地 (默认)
  vllm    -- 启动 vLLM 推理服务
  ollama  -- 导出为 Ollama 模型
```

## 一键微调工作流

```
用户: "微调Qwen2.5，让它更懂流体力学"
    │
    ├─ 检测数据源 ─────────────────────────────┐
    │   ├─ 有对话历史 → 提取对话知识            │
    │   ├─ 有论文 → 解析论文                    │
    │   └─ 无数据 → 交互式引导补充              │
    │                                          │
    ├─ 生成训练数据 (500-1000 条 QA)            │
    │                                          │
    ├─ 自动配置参数 (硬件检测 + 推荐)           │
    │                                          │
    ├─ 启动训练                                │
    │   ├─ 实时 loss 监控                      │
    │   └─ 异常自动停止                        │
    │                                          │
    ├─ 自动评估                                │
    │   ├─ 领域准确率                          │
    │   ├─ 通用能力退化检测                    │
    │   └─ 生成 eval-report.md                 │
    │                                          │
    └─ 询问是否部署
```

**自动决策规则**:
- 数据量 < 100 条 → 提示用户补充或降低 epochs
- GPU 显存 < 模型要求 → 自动切换 QLoRA
- 通用能力退化 > 10% → 警告并建议降低学习率

## 论文微调工作流

```
触发: /finetune --paper FILE  或  用户发送 PDF + "微调"

步骤:
  1. PDF 解析 → 提取文本、公式、图表描述
  2. 知识结构化:
     - 核心概念 → definition QA
     - 方法/算法 → process QA
     - 公式推导 → math QA
     - 实验结果 → result QA
  3. 质量过滤: 去重、难度分层
  4. 生成训练数据 (300-1000 条)
  5. 自动配置 + 训练
  6. 论文相关问答评估
```

## 资源适配表

| 模型规模 | 最低 GPU | 推荐 GPU | LoRA 显存 | QLoRA 显存 | 训练时间(3ep,1k样本) |
|----------|----------|----------|-----------|------------|---------------------|
| 1.5B | T4 16GB | RTX 3060 12GB | 6GB | 4GB | ~5min |
| 7B | RTX 3090 24GB | A100 40GB | 18GB | 12GB | ~20min |
| 13B | A100 40GB | A100 80GB | 32GB | 20GB | ~45min |
| 72B | A100 80GB×2 | A100 80GB×4 | 120GB | 60GB | ~3h |

**CPU-Only 备选**: QLoRA + bitsandbytes 8bit，7B 模型需 32GB RAM，训练速度降低 10-20x。

## 配置模板

```yaml
# finetune-config.yaml
base_model: Qwen/Qwen2.5-7B-Instruct
method: lora
lora:
  rank: 16
  alpha: 32
  target_modules: [q_proj, k_proj, v_proj, o_proj]
training:
  learning_rate: 2e-4
  batch_size: 4
  gradient_accumulation: 4
  epochs: 3
  max_seq_length: 2048
  warmup_ratio: 0.1
hardware:
  gpu: auto
  mixed_precision: bf16
output:
  dir: ./finetune-output/
  merge: true
```

## 依赖工具
- Python 3.10+
- PyTorch 2.0+
- transformers, peft, trl, datasets
- CUDA GPU (推荐)
- llama-factory (可选)

## 串联命令
- `/paper` → 解析论文后可接 `/finetune --paper`
- `/exp` → 实验分析后可接 `/finetune --data`
- `/code` → 项目代码可接 `/finetune --project`
