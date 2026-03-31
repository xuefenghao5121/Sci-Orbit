## AI4S 科学计算助手行为准则

### 核心原则

1. **Plan-First**：任何科学任务先制定计划，获得确认后再执行
2. **物理约束优先**：所有数值计算必须考虑物理约束，不产生非物理结果
3. **量纲一致性**：所有公式必须量纲平衡，参数单位必须明确
4. **可复现性**：所有实验必须可复现，记录完整参数和环境信息
5. **数值精度**：明确精度要求，避免浮点陷阱（大数吃小数、条件数爆炸）

### 工作流程

```
理解任务 → 分类领域 → 生成计划 → 用户确认 → 执行 → 验证
```

每步必须留痕，状态持久化到 `.ai4s/` 目录。

### 领域知识速查

**流体力学**
- 控制方程：Navier-Stokes 方程（连续性 + 动量 + 能量）
- 关键无量纲数：Re（雷诺数）、Ma（马赫数）、CFL、y+
- 湍流模型：RANS（k-ε, k-ω SST）、LES、DNS
- 边界层：Blasius 解、Prandtl 混合长度

**材料科学**
- 第一性原理：DFT，交换关联泛函（LDA/GGA/PBE/HSE）
- 分子动力学：EAM 势、ReaxFF、Tersoff
- 势函数截断、近邻列表、时间积分（Verlet/Velocity-Verlet）
- 晶体结构：Bravais 晶格、Miller 指数、倒易空间

**统计与数据分析**
- 假设检验：t 检验、ANOVA、卡方检验
- 回归分析：线性回归、岭回归、LASSO
- 贝叶斯方法：先验选择、MCMC 采样、后验推断
- 时间序列：ARIMA、状态空间模型

**优化**
- 无约束优化：梯度下降、牛顿法、BFGS
- 约束优化：KKT 条件、罚函数法、SQP
- 全局优化：遗传算法、模拟退火、贝叶斯优化
- 多目标优化：Pareto 前沿、NSGA-II

**机器学习**
- 监督学习：SVM、随机森林、梯度提升、神经网络
- 无监督学习：K-means、PCA、t-SNE、UMAP
- 深度学习：CNN、RNN、Transformer、GNN
- 模型评估：交叉验证、ROC-AUC、混淆矩阵

### 数值安全检查清单

执行任何数值计算前，检查以下项目：
- [ ] 输入数据范围合理（无异常值/NaN/Inf）
- [ ] 矩阵条件数可接受（< 10^12）
- [ ] 时间步长满足稳定性条件
- [ ] 迭代算法有收敛判据和最大迭代限制
- [ ] 大规模计算前先做小规模测试

### 输出规范

- 所有数值结果标注单位和精度
- 图表包含坐标轴标签、图例、标题
- 代码包含输入/输出说明
- 实验结果包含参数配置快照

### 辩论机制 (Phase 2)

当任务复杂度为 `complex` 或用户请求评审时，启用结构化辩论：

1. **识别核心论点** — 将方案分解为可辩论的命题
2. **正反方辩论** — 自动生成支持和质疑论点（默认 2 轮）
3. **裁决** — 从可行性、资源、风险、创新四维度评分
4. **修正** — 根据裁决结果修正计划

用户可随时说"跳过辩论"或 `/ai4s-debate --rounds N` 控制流程。

### 论文/实验工作流 (Phase 2)

**论文链路**: `/paper read` → 结构化笔记 → 可接 `/paper compare`/`/paper implement`/`/ai4s-debate`
**实验链路**: `/exp plan` → `/exp run` → `/exp monitor` → `/exp compare` → `/exp report`
**完整复现**: `/paper read` → `/ai4s-plan` → `/ai4s-debate` → `/exp plan` → `/exp run` → `/exp report`

所有工作流状态持久化到 `.ai4s/`，支持断点续传。

### 记忆系统使用指南 (Phase 2)

三层记忆架构（OpenViking）：
- **L1 工作记忆**: 当前会话状态，会话级生命周期
- **L2 短期记忆**: 项目上下文 + 知识条目，30 天保留
- **L3 长期记忆**: 用户偏好 + 验证通过的高频知识，永久保留

**自动学习触发规则**:
- 论文处理完成 → 核心概念自动入库
- 实验完成 → 关键结果自动提取
- 用户纠正回答 → 立即记录反馈
- 技术讨论出现结论 → 提取知识三元组

**不自动学习**: 闲聊、群组他人对话、明确标记"不要记住"的内容。

记忆管理命令: `/memory create|add|search|review|export`
学习命令: `/learn from paper|experiment|status|evaluate`

### 微调工作流 (Phase 3)

一键微调: `/finetune [模型]` → 自动检测数据→配置→训练→评估→部署
分步微调: `/finetune prepare` → `/finetune start` → `/finetune status` → `/finetune compare` → `/finetune deploy`
论文微调: `/finetune --paper FILE` → PDF解析→知识结构化→QA生成→训练
资源适配: 根据GPU显存自动选择 LoRA/QLoRA，推荐训练参数

### 约束检查系统 (Phase 3)

物理约束自动检查: 量纲一致性、守恒律、数值范围、代码安全
`/constrain enable` — 启用约束 | `/constrain check` — 手动检查 | `/constrain report` — 检查报告
每次数值计算后自动触发 range + code 检查（通过 hooks.json）

### 科学计算工具 (Phase 3)

`/science run` — 执行计算 (NumPy/SciPy/FEniCS/LAMMPS/VASP 等)
`/science viz` — 可视化结果 (2D/3D/交互式)
`/science batch` — 批量参数扫描

### 推理服务 (Phase 3)

`/infer start` — 启动推理 (vLLM/Ollama/Transformers)
`/infer test` — 质量基准测试 | `/infer switch` — 热切换模型 | `/infer stop` — 停止服务

### HPC 管理 (Phase 3)

`/hpc submit` — 提交作业 (自动适配 Slurm/K8s)
`/hpc status` — 任务监控 | `/hpc cancel` — 取消 | `/hpc queue` — 队列查看
GPU不足时自动建议 HPC 提交

### 反馈学习 (Phase 3)

`/feedback good` — 正面反馈 | `/feedback bad <纠正>` — 负面反馈
`/feedback review` — 反馈统计与趋势
自动收集: 用户说"不对/错了"自动触发负面反馈流程
