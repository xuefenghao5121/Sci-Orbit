# 📖 用户使用指南

## Plan-First 工作流详解

AI4S 的核心理念是 **Plan-First**：先规划、再执行、最后验证。

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ classify_task│────▶│ generate_plan│────▶│ validate_plan│────▶│  review_plan │
│   任务分类    │     │   生成计划    │     │   验证计划    │     │   科学审查   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                    │
                              ┌──────────────┐     ┌──────────────┐  │
                              │   exp_run    │────▶│ exp_monitor  │◀─┘
                              │   执行实验    │     │   监控实验   │
                              └──────────────┘     └──────────────┘
```

### 步骤说明

1. **classify_task** — 自动识别任务领域（流体力学、材料科学、量子化学等）、类型（论文复现、新方法、数据分析等）、复杂度
2. **generate_plan** — 根据分类结果生成结构化计划，包含阶段、步骤、预期结果
3. **validate_plan** — 检查计划的结构完整性：是否有明确目标、验证标准、资源配置
4. **review_plan** — 科学性审查：方法合理性、物理约束、量纲一致性
5. **debate（可选）** — 提案者/批评者辩论，完善计划

## 论文研读工作流

```
/paper read "path/to/paper.pdf"
    → paper_parse: 提取标题、作者、摘要、章节、关键发现、方法、公式
    → 自动存入知识库

/paper compare paper1 paper2
    → paper_compare: 对比多篇论文的异同和洞察

/paper implement paper1 --framework pytorch
    → paper_implement: 从论文生成代码原型
```

### 使用技巧

- 支持的输入格式：PDF、LaTeX 源码、纯文本
- 自动提取数学公式并标注
- 对比分析生成结构化表格
- 代码生成支持 PyTorch、JAX、NumPy

## 实验管理工作流

```
/exp plan "复现 Transformer 在 WMT 上的实验"
    → exp_plan: 生成实验计划（阶段、配置、预期结果）

/exp run
    → exp_run: 生成运行脚本

/exp monitor exp-001
    → exp_monitor: 从日志文件监控进度

/exp compare exp-001 exp-002 exp-003
    → exp_compare: 对比多次实验，找到最优配置
```

### 实验计划结构

每个实验计划包含：
- **phases**: 实验阶段列表（数据准备、模型训练、评估等）
- **configs**: 推荐配置参数
- **expected_results**: 预期结果指标
- **resource_requirements**: 资源需求（GPU、内存、时间）

## 微调工作流

```
# 1. 准备数据集
/finetune prepare --source kb:my-kb --format alpaca
    → finetune_prepare: 从知识库生成微调数据集

# 2. 启动训练
/finetune start --model qwen-7b --method qlora
    → finetune_start: 生成训练配置和命令

# 3. 监控训练
/finetune monitor
    → finetune_monitor: 查看训练进度、loss 曲线

# 4. 恢复训练（如中断）
/finetune resume --checkpoint checkpoint-1000

# 5. 合并权重
/finetune merge --base qwen-7b --adapter output/lora

# 6. 评估模型
/finetune evaluate --model merged-model --metrics accuracy,fluency
    → finetune_evaluate: 评估微调效果
```

### 支持的微调方法

| 方法 | 显存需求 | 速度 | 适用场景 |
|------|----------|------|----------|
| **LoRA** | 中 | 快 | 大模型轻量适配 |
| **QLoRA** | 低 | 中 | 显存受限环境 |
| **Full** | 高 | 慢 | 完全微调 |

## 记忆系统使用

AI4S 提供领域知识库（Knowledge Base），用于积累和检索科学知识。

```
# 创建知识库
/kb create --name "fluid-dynamics" --domain "流体力学"

# 添加知识条目
/kb add --id fluid-dynamics --title "Navier-Stokes 方程" --content "..." --tags "N-S,方程,流体"

# 搜索知识
/kb search --id fluid-dynamics --query "湍流模型"

# 导出为微调数据
/kb export --id fluid-dynamics --format finetune
```

## 约束检查使用

科学计算需要遵守物理定律，AI4S 提供自动约束检查：

| 工具 | 功能 | 示例 |
|------|------|------|
| `check_dimension` | 量纲一致性检查 | 验证方程两边单位是否匹配 |
| `check_conservation` | 守恒定律验证 | 检查质量/能量/动量守恒 |
| `check_range` | 物理量范围检查 | 温度是否在合理范围 |
| `check_code` | 代码质量检查 | 精度、可复现性、性能 |

```
# 量纲检查示例
> 检查 E = 0.5 * m * v^2 的量纲一致性
→ check_dimension: ✅ 能量 = kg·m²/s²

# 守恒检查示例
> 检查模拟结果中质量是否守恒
→ check_conservation: ✅ 质量偏差 < 1e-10
```

## HPC 使用

AI4S 支持多种 HPC 后端：

| 后端 | 适配器 | 适用场景 |
|------|--------|----------|
| **本地** | `local-adapter` | 单机 GPU 训练 |
| **SLURM** | `slurm-adapter` | 集群作业调度 |
| **K8s** | `k8s-adapter` | 云原生部署 |

```
# 提交 HPC 作业
/hpc submit --script train.sh --gpus 4 --memory 64G --time 24h

# 查看作业状态
/hpc status --job-id 12345

# 收集结果
/hpc collect --job-id 12345 --output results/
```
