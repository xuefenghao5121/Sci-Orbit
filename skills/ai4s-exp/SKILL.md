# AI4S Experiment Skill

> 触发命令: `/exp` | 版本: 0.1.0 | 灵码团队

## 描述

实验工作流技能。覆盖实验方案生成、执行、监控、结果对比、报告输出的完整实验生命周期。

## 触发条件

- 用户说"跑一下实验"、"做实验"、"运行测试"
- 用户说"看看实验进度"、"对比实验结果"、"生成报告"
- `/exp` 命令直接触发
- `/ai4s-plan` 计划确认后自动建议生成实验方案

## 命令路由

| 命令 | 功能 | 参数 |
|------|------|------|
| `/exp plan --name <n> [--paper <id>]` | 生成实验方案 | 名称 + 可选论文 ID |
| `/exp run <exp-id> [--mode local\|remote\|gpu]` | 启动实验 | 实验 ID + 运行模式 |
| `/exp monitor [<exp-id>]` | 监控实验进度 | 可选实验 ID |
| `/exp compare <id1> <id2> ...` | 结果对比 | 多个实验 ID |
| `/exp report <exp-id> [--format md\|latex]` | 生成报告 | 实验 ID + 格式 |

## 执行流程

### /exp plan

```
输入: 实验名称 + 可选论文 ID
    ↓
① 加载关联论文笔记（如有）
    ↓
② 定义实验假设
    ↓
③ 设计变量和参数空间
    ↓
④ 生成配置文件 (.ai4s/experiments/<id>/config.yaml)
    ↓
⑤ 创建目录结构
    ↓
⑥ 输出方案摘要
```

### /exp run

```
输入: 实验 ID
    ↓
① 加载配置
    ↓
② /env detect — 环境检查
    ↓
③ 资源锁定 (记录 GPU/CPU/内存占用)
    ↓
④ 启动实验脚本 (exec 工具)
    ↓
⑤ 实时收集指标 (loss/metrics)
    ↓
⑥ 完成后更新 meta.json
    ↓
⑦ 输出关键指标摘要
```

### /exp monitor

```
输入: 可选实验 ID (不指定则显示全部)
    ↓
① 读取各实验 meta.json
    ↓
② 显示进度:
    - 运行状态 (running/completed/failed)
    - 已用时间 / 预计剩余
    - 关键指标 (loss, accuracy, etc.)
    - 资源占用
    ↓
③ 如有异常 (loss 爆炸, OOM) 发出警告
```

### /exp compare

```
输入: 多个实验 ID
    ↓
① 加载各实验结果
    ↓
② 对比表格:
    - 参数差异
    - 性能指标
    - 资源消耗
    - 统计显著性
    ↓
③ 生成对比图表描述
    ↓
④ 输出结论和推荐
```

### /exp report

```
输入: 实验 ID
    ↓
① 加载配置 + 结果 + 日志
    ↓
② 生成报告:
    - 实验概述
    - 方法描述
    - 详细结果
    - 可视化
    - 结论和建议
    ↓
③ write: 保存报告
    ↓
④ 输出报告路径
```

## 实验配置模板

```yaml
# .ai4s/experiments/<id>/config.yaml
name: "exp-001"
description: "论文 XXX 方法复现实验"
created_at: "2026-03-31T20:00:00Z"

# 关联
paper_id: "p-001"  # 可选
plan_id: "plan-001"  # 可选

# 假设
hypothesis: "方法 X 在数据集 Y 上优于基线 Z"

# 变量
variables:
  independent:
    - name: "learning_rate"
      values: [1e-4, 2e-4, 5e-4]
    - name: "batch_size"
      values: [16, 32]
  dependent:
    - name: "accuracy"
    - name: "loss"
    - name: "f1_score"
  controlled:
    - name: "seed"
      value: 42
    - name: "epochs"
      value: 100

# 环境
environment:
  python: "3.10"
  framework: "pytorch"
  gpu: true
  cuda_version: "12.1"

# 资源限制
resources:
  max_gpu_memory_gb: 24
  max_time_hours: 4
  max_cpu_cores: 8

# 检查点
checkpoints:
  save_every_n_steps: 500
  keep_last_n: 3

# 验证
validation:
  metric: "accuracy"
  threshold: 0.85
  baseline: 0.78

# 脚本
scripts:
  setup: "scripts/setup.sh"
  train: "scripts/train.py"
  evaluate: "scripts/evaluate.py"
```

## 实验目录结构

```
.ai4s/experiments/<id>/
├── config.yaml       # 实验配置
├── meta.json         # 运行状态和结果
├── outputs/
│   ├── logs/         # 训练日志
│   ├── checkpoints/  # 模型检查点
│   ├── metrics/      # 指标记录
│   └── plots/        # 可视化图表
└── report.md         # 实验报告 (exp report 生成)
```

## 状态文件

```json
// .ai4s/experiments/<id>/meta.json
{
  "id": "exp-001",
  "name": "...",
  "status": "running|completed|failed",
  "started_at": "2026-03-31T20:00:00Z",
  "completed_at": null,
  "resources": {
    "gpu": "NVIDIA A100",
    "max_memory_gb": 18
  },
  "metrics": {
    "final_loss": 0.342,
    "best_accuracy": 0.87
  },
  "git_commit": "abc1234"
}
```

## 串联命令

- `/ai4s-plan` → `/exp plan` — 计划确认后生成实验方案
- `/exp plan` → `/exp run` — 执行实验
- `/exp run` → `/exp monitor` — 监控进度
- `/exp run` → `/exp compare` — 对比结果
- `/exp run` → `/exp report` → `/memory add` — 保存实验经验
- `/exp run` → `/learn from experiment` — 从实验学习
