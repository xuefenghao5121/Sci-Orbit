# 论文复现演示

## Step 1: 论文解析

```
> /paper read papers/attention-is-all-you-need.pdf
```

Claude Code 调用 `paper_parse`，输出：
- 标题、作者、摘要
- 关键发现：Multi-Head Attention、Positional Encoding
- 核心方法：Scaled Dot-Product Attention
- 关键公式：Attention(Q,K,V) = softmax(QK^T/√d_k)V

## Step 2: 任务规划

```
> /ai4s-plan 复现 Transformer 模型，在 WMT14 En-De 上验证 BLEU 分数
```

Claude Code 调用工具链：
1. `classify_task` → domain=general, type=paper_reproduction, complexity=complex
2. `generate_plan` → 4 阶段计划
3. `validate_plan` → ✅ 结构完整
4. `review_plan` → ✅ 方法合理

## Step 3: 实验计划

```
> /exp plan 基于解析的 Transformer 论文，设计训练实验
```

`exp_plan` 输出：
- Phase 1: 数据准备（WMT14 预处理）
- Phase 2: 模型实现（d_model=512, heads=8, layers=6）
- Phase 3: 训练（lr=0.0003, warmup=4000）
- Phase 4: 评估（BLEU、困惑度）

## Step 4: 执行实验

```
> /exp run
```

`exp_run` 生成 PyTorch 训练脚本，自动配置环境。

```
> /exp monitor exp-001
```

`exp_monitor` 实时显示训练进度、loss 曲线。

## Step 5: 对比结果

```
> /exp compare exp-001 exp-002 exp-003
```

`exp_compare` 对比不同超参数配置，推荐最优方案。
