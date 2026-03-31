# AI4S 工作流串联文档

> 版本: 0.1.0 | 灵码团队 | Phase 2

## 工作流总览

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AI4S 工作流地图                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📄 论文复现流水线                                                    │
│  /paper read → /ai4s-plan → /ai4s-debate → /exp plan               │
│       → /exp run → /exp monitor → /exp report                      │
│                                                                      │
│  🧪 实验迭代流水线                                                    │
│  /exp run → /exp compare → (不满足) → /exp plan --iterate           │
│       → /exp run → (满足) → /exp report → /memory add              │
│       → /learn from experiment                                       │
│                                                                      │
│  🏗️ 项目初始化流水线                                                  │
│  /project init → /env setup → /env snapshot → /ai4s-plan           │
│       → /project arch → /project review                             │
│                                                                      │
│  🧠 知识积累流水线                                                    │
│  /paper read → /learn from paper → /memory add                     │
│  /exp run → /learn from experiment → /memory add                   │
│  /memory review → /memory export → /finetune prepare                │
│                                                                      │
│  🚀 部署流水线                                                       │
│  /exp report → (验证通过) → /project review → 部署                  │
│  /finetune deploy → vLLM/Ollama/HPC                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 工作流 1: 论文复现流水线

**目标**: 从论文到可运行代码 + 实验报告的完整链路。

### 流程

```
/paper read paper.pdf
    │
    ├─ 解析论文 → 结构化笔记 (.ai4s/papers/<id>/notes.md)
    │
    ↓
/ai4s-plan --paper <id>
    │
    ├─ 基于论文生成复现计划
    ├─ 分类领域、评估复杂度、推荐工具
    │
    ↓
/ai4s-debate (complex 任务自动触发)
    │
    ├─ 正方: 方案可行性论证
    ├─ 反方: 风险和替代方案
    ├─ 裁决: 通过/有条件通过/否决
    ├─ 修正计划 (如有必要)
    │
    ↓
/exp plan --paper <id>
    │
    ├─ 生成实验配置 (.ai4s/experiments/<id>/config.yaml)
    ├─ 定义变量、假设、验证标准
    │
    ↓
/exp run <exp-id>
    │
    ├─ 环境检查 + 资源锁定
    ├─ 执行实验 + 实时监控
    │
    ↓
/exp report <exp-id>
    │
    ├─ 生成实验报告
    ├─ 与论文结果对比
    └─ 输出结论和下一步建议
```

### 断点续传

每步完成后写 `.ai4s/workflows/<wf-id>/checkpoint.json`，中断后可从任意步骤恢复。

### 触发方式

- 逐步执行: 手动输入每个命令
- 一键执行: `/ai4s workflow run paper-reproduce --paper paper.pdf`

---

## 工作流 2: 实验迭代流水线

**目标**: 通过多轮实验迭代优化结果。

### 流程

```
/exp run <exp-id>
    │
    ↓
/exp compare <id1> <id2> ...
    │
    ├─ 多维度对比 (参数/指标/资源)
    ├─ 统计显著性检验
    │
    ↓
┌─ 满足验证标准 ──────────────────────┐
│                                     │
│  /exp report                        │
│      │                              │
│      ├─ 生成实验报告                │
│      ├─ /memory add — 保存经验      │
│      ├─ /learn from experiment      │
│      └─ 完成 ✅                     │
│                                     │
└─ 不满足 ────────────────────────────┐
                                     │
  /exp plan --iterate                │
      │                              │
      ├─ 基于对比结果调整参数        │
      ├─ 缩小搜索空间                │
      │                              │
      ↓                              │
  /exp run <new-exp-id> ─────────────┘
```

### 自动迭代规则

| 情况 | 自动调整 |
|------|----------|
| Loss 不下降 | 降低学习率，增加 warmup |
| 过拟合 (训练↓验证↑) | 增加 dropout/weight decay，减小模型 |
| 欠拟合 | 增加模型容量，训练更多 epoch |
| OOM | 减小 batch_size，启用梯度检查点 |
| 训练太慢 | 增加 gradient_accumulation，启用混合精度 |

---

## 工作流 3: 项目初始化流水线

**目标**: 从零创建一个 AI4S 科学计算项目。

### 流程

```
/project init --name <name> --type ml|sim|data
    │
    ├─ 创建标准目录结构
    ├─ 生成 .ai4s/config.json, CLAUDE.md
    ├─ 初始化 Git 仓库
    │
    ↓
/env setup
    │
    ├─ 检测环境差异
    ├─ 安装依赖
    │
    ↓
/env snapshot --name "initial"
    │
    ├─ 保存初始环境快照
    │
    ↓
/ai4s-plan
    │
    ├─ 生成项目执行计划
    │
    ↓
/project arch [--from <paper-id>]
    │
    ├─ 设计项目架构
    ├─ 生成 docs/arch.md
    │
    ↓
/project review
    │
    ├─ 审查项目代码
    └─ 输出改进建议
```

---

## 工作流 4: 知识积累流水线

**目标**: 从论文和实验中持续积累领域知识，为微调提供数据。

### 流程

```
/paper read paper.pdf
    │
    ├─ 提取核心概念、方法、结论
    │
    ↓
/learn from paper <id>
    │
    ├─ 生成知识条目
    ├─ 关联已有知识
    ├─ 批量 /memory add
    │
    ↓                                    /exp run → 完成
    │                                        │
    ↓                                        ↓
/memory search "相关概念" ←── /learn from experiment
    │                                        │
    ↓                                        ↓
/memory review                              │
    │                                        │
    ├─ 清理过时/矛盾条目                     │
    ├─ 合并重复内容                          │
    │                                        │
    ↓                                        ↓
/memory export --format jsonl
    │
    ├─ 导出训练数据
    │
    ↓
/finetune prepare --source exported/
    │
    ├─ 数据质量过滤
    ├─ 生成 train.jsonl / val.jsonl
    │
    ↓
/finetune start
    │
    └─ 微调模型
```

---

## 工作流 5: 部署流水线

**目标**: 将验证通过的模型部署到生产环境。

### 流程

```
/exp report (验证通过)
    │
    ↓
/project review --focus correctness
    │
    ├─ 最终代码审查
    │
    ↓
/env snapshot --name "pre-deploy"
    │
    ├─ 部署前环境快照
    │
    ↓
部署 (ai4s-deployer Agent)
    │
    ├─ 模型打包 (合并 LoRA / 量化)
    ├─ 容器化 (Docker/Singularity)
    ├─ 部署到目标环境
    │   ├─ 本地: vLLM / Ollama
    │   ├─ GPU 服务器: Docker + vLLM
    │   └─ HPC: Singularity + Slurm
    ├─ 健康检查
    ├─ 性能基准测试
    └─ 输出运维信息
```

---

## 工作流 6: 微调工作流 (Phase 3)

**目标**: 将领域知识注入大模型，提升特定领域表现。

### 一键微调流程

```
/finetune [模型] --domain <领域>
    │
    ├─ 检测数据源 (对话/论文/数据集/项目)
    ├─ 自动生成训练数据 (500-1000 条 QA)
    ├─ 硬件检测 + 参数推荐
    ├─ 启动训练 (LoRA/QLoRA)
    │   ├─ 实时 loss 监控
    │   └─ 异常自动停止
    ├─ 自动评估 (领域准确率 + 通用退化检测)
    └─ 询问是否部署 → /finetune deploy
```

### 论文→微调串联

```
/paper read paper.pdf
    → /finetune --paper output/
    → 一键完成论文知识注入
```

### 微调→推理串联

```
/finetune deploy --target vllm
    → /infer start --model ./finetune-output/merged
    → /infer test --benchmark all
```

## 工作流 7: HPC 工作流 (Phase 3)

**目标**: 将重型计算任务提交到 HPC 集群，监控执行。

### 流程

```
/science batch 或 /finetune start (GPU 不足)
    │
    ├─ 检测本地资源不足
    ├─ 自动生成作业脚本 (Slurm/K8s)
    │
    ↓
/hpc submit --script job.sh --gpus 2 --time 48:00:00
    │
    ├─ 返回 JOBID
    │
    ↓
/hpc status JOBID
    │
    ├─ 实时监控: 运行时间/资源使用/输出预览
    ├─ 完成通知
    │
    ↓
结果处理
    ├─ /science viz — 可视化
    ├─ /exp compare — 对比
    └─ /constrain check — 约束验证
```

### HPC 适配

- **Slurm**: 自动生成 sbatch 脚本，支持数组作业和依赖
- **K8s**: 自动生成 Job YAML，支持 GPU 资源请求
- 自动检测集群类型，透明适配

## Agent 协作矩阵

| 场景 | 规划者 | 执行者 | 审查者 | 部署者 | 辩论 |
|------|--------|--------|--------|--------|------|
| 论文复现 | ✅ 制定计划 | ✅ 执行代码 | ✅ 审查代码 | — | ✅ 评审方案 |
| 实验迭代 | ✅ 调整参数 | ✅ 运行实验 | — | — | — |
| 项目初始化 | ✅ 项目计划 | — | — | — | — |
| 模型部署 | ✅ 资源规划 | ✅ 准备产物 | ✅ 审查配置 | ✅ 执行部署 | — |
| 微调训练 | ✅ 数据/参数规划 | ✅ 执行训练 | — | ✅ 部署模型 | — |
| 科学计算 | — | ✅ 执行计算 | ✅ 约束检查 | — | — |
| HPC 任务 | ✅ 资源规划 | ✅ 提交/监控 | — | — | — |
| 反馈学习 | — | — | — | — | — |

---

## 状态持久化

所有工作流状态存储在 `.ai4s/` 目录：

```
.ai4s/
├── config.json           # 项目配置
├── env.json              # 环境信息
├── plans/                # 计划存储
├── experiments/          # 实验记录
│   └── <id>/
│       ├── config.yaml
│       ├── meta.json
│       ├── outputs/
│       └── report.md
├── papers/               # 论文笔记
│   ├── index.json
│   └── <id>/notes.md
├── debates/              # 辩论记录
│   └── <id>/meta.json
├── workflows/            # 工作流状态
│   └── <wf-id>/checkpoint.json
├── memory/               # 记忆导出
│   └── export/
└── learn/                # 学习统计
    └── stats.json
```
