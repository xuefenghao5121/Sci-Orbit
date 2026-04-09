# EvoSkills 自进化参数补全架构设计

## 概述

基于 EvoSkills 论文的 **Self-Evolving + Co-Evolutionary Verification** 思想，对 Sci-Orbit 参数补全模块进行进化升级。

### 现状问题

| 现状 | 问题 |
|------|------|
| 参数模板硬编码在 `TOOL_TEMPLATES` 常量中 | 无法动态更新，新的知识需要改代码重新发布 |
| `param_record_correction` 只记录，不学习 | 用户修正存在那里，不会自动更新模板置信度 |
| 环境感知能力有限 | 只检测 GPU 存在，没有基于硬件调整并行参数等 |
| 无验证反馈循环 | 补全结果错了，只是记录，没有进化机制 |

### 设计目标

1. ✅ **动态参数模板库** - 替代硬编码，支持持久化存储和增量更新
2. ✅ **置信度管理机制** - 每个隐式参数规则都有置信度，根据反馈动态调整
3. ✅ **从用户修正中自动学习** - 记录→挖掘规则→更新模板，完整学习闭环
4. ✅ **环境感知适配** - 根据硬件（GPU/CPU、内核数、显存）自动调整并行参数
5. ✅ **共同进化验证机制** - Param Generator ↔ Param Verifier 双组件共同进化
6. ✅ **参数关联规则挖掘** - 自动发现参数间的依赖关系
7. ✅ **可操作反馈生成** - 给用户明确的修正建议，而不是简单说"错了"
8. ✅ **向后兼容** - 保持原有 API 不变，增量改进

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                       用户交互层                                      │
│  用户提供参数  →  param_complete  →  输出补全结果 + 置信度          │
│  用户修正错误  →  param_record_correction  →  反馈进入学习闭环       │
└─────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    动态参数模板库 (Dynamic Template Library)         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 内置基础模板 (从原有 TOOL_TEMPLATES 迁移)                    │   │
│  │  用户学习模板 (从用户修正中挖掘的新规则)                      │   │
│  │ 置信度存储 (每个规则都有 confidence 分数)                     │   │
│  │ 持久化 JSON / SQLite 存储                                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  第一层：Param Generator (参数生成器)                                │
│  • 基于模板和环境推断隐式参数                                         │
│  • 按置信度排序候选值                                                │
│  • 输出 k 个候选补全结果，带置信度                                   │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  第二层：Param Verifier (参数验证器)  ←───────────┐                │
│  • 检查参数约束违反                                               │  │
│  • 基于参数关联规则打分                                           │  │
│  • 基于环境适配检查（硬件是否支持）                                 │  │
│  • 生成可操作改进建议                                             │  │
│  • 给 Generator 返回每个候选的质量分数                             │  │
└─────────────────────────────────────────────────────────────────────┘  │
          │                                                              │
          ▼                                                              │
┌─────────────────────────────────────────────────────────────────────┐  │
│  选择最高分候选 → 输出给用户                                         │  │
└─────────────────────────────────────────────────────────────────────┘  │
                                                                         │
┌─────────────────────────────────────────────────────────────────────┐  │
│  反馈学习闭环 (当用户修正时)                                         │  │
│  • Generator: 根据用户修正调整规则置信度               ↑              │  │
│  • Verifier: 根据验证结果更新关联规则权重               └──────────────┘  │
│  • 共同进化：Generator 变好 → Verifier 训练数据更准 → Verifier 变好  │
│  •             Verifier 变好 → Generator 反馈更准 → Generator 变好   │
└─────────────────────────────────────────────────────────────────────┘
                              ↑
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                     参数关联规则挖掘                                  │
│  • 频繁项集挖掘：哪些参数经常一起出现                                 │
│  • 依赖规则：如果 A = x，则 B 应该 = y                                │
│  • 置信度加权：支持度越高，规则越可信                                 │
│  • 结果更新到 Verifier 的规则库                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 核心组件设计

#### 1. 动态参数模板库 (Dynamic Template Library)

**原有结构**：
```typescript
// 硬编码在代码中，无法动态更新
const TOOL_TEMPLATES: ToolParamTemplate[] = [...];
```

**新结构**：
```typescript
interface DynamicToolParamTemplate extends ToolParamTemplate {
  templateId: string;           // 唯一模板ID
  version: number;              // 版本号，每次更新递增
  createdAt: string;            // 创建时间
  updatedAt: string;            // 最后更新时间
  isLearned: boolean;           // 是否是学习得到的（不是内置）
  usageCount: number;           // 使用次数
  correctCount: number;         // 正确次数（用于计算置信度）
  
  // 每个隐式参数规则扩展置信度
  implicit_params: Record<string, ImplicitParamRuleWithConfidence>;
}

interface ImplicitParamRuleWithConfidence extends ImplicitParamRule {
  confidence: number;           // 当前置信度 0-1
  sampleCount: number;          // 样本数
  correctCount: number;         // 正确预测数
  // 支持条件置信度：在特定上下文条件下的置信度
  conditionalConfidence?: Record<string, number>;
}
```

**存储设计**：
- 内置模板：保留在代码中作为初始种子
- 学习模板：持久化到 `~/.ai4s/sci-orbit/templates.json`
- 加载顺序：内置模板 → 加载学习模板（覆盖同名），支持用户自定义覆盖

#### 2. 置信度管理机制

**置信度更新公式**:

\[
confidence = \frac{correctCount + \alpha}{sampleCount + 2\alpha}
\]

其中 \(\alpha = 1\) 是拉普拉斯平滑，避免零样本问题。

**初始置信度**:
- 内置规则：`confidence = 0.8` (领域知识，高初始置信度)
- 学习规则：`confidence = 0.5 + (correctCount / (sampleCount + 2)) * 0.3` (逐渐增加)

**置信度分层**:
- `confidence >= 0.8`: **高置信度**，不提示用户
- `0.5 <= confidence < 0.8`: **中置信度**，给出警告
- `confidence < 0.5`: **低置信度**，请求用户确认

#### 3. 环境感知适配

扩展 `EnvironmentInfo`，增加更多硬件信息用于参数推断：

```typescript
interface EnvironmentInfoEx extends EnvironmentInfo {
  // 并行计算相关
  cpuCores: number;             // CPU 核心数
  gpuCount: number;             // GPU 数量
  gpuVramGB: number;            // 单卡显存 GB
  
  // MPI 相关
  mpiAvailable: boolean;
  mpiVersion?: string;
  
  // 根据环境推断的并行参数建议
  recommendedParallel: {
    npar?: number;              // VASP bands 并行
    kpar?: number;              // VASP K-point 并行
    nnodes?: number;            // 节点数
    cpusPerNode?: number;       // 每节点 CPU 数
  };
}
```

**环境感知推理规则示例**:
- **VASP**: GPU 可用 → `npar = 1`, `kpar = min(cpuCores / 8, kpoints)`
- **VASP**: 多核 CPU → `kpar = number of K-points` (如果可整除)
- **LAMMPS**: GPU 可用 → 开启 `gpu` 包，调整 `neighbor` 列表参数
- **ABACUS**: `GPU available → device = gpu`

#### 4. Param Generator 设计

**职责**:
- 加载动态模板库
- 基于用户参数 + 环境信息，生成 k 个候选补全结果
- 每个候选附带置信度

**核心算法**:
```
1. 匹配模板：根据工具名找到对应模板
2. 对每个缺失的隐式参数：
   a. 如果有学习规则，按置信度从高到低排序候选值
   b. 如果没有，使用内置规则推断
   c. 应用用户偏好（来自修正历史）
3. 生成 beam 搜索保留 top-k 候选组合
4. 返回给 Verifier 打分
5. 选择 Verifier 打分最高的输出
```

**Beam Search 参数**:
- `beam_width = 3` → 保留 3 个最高置信度候选组合
- 只对低置信度参数多分支，高置信度参数直接确定

#### 5. Param Verifier 设计

**职责**:
- 验证参数约束满足
- 基于参数关联规则评估合理性
- 检查环境适配性
- 给每个候选组合打分
- 生成可操作反馈（如果有问题）

**打分公式**:

\[
score = w_1 \cdot constraintScore + w_2 \cdot associationScore + w_3 \cdot envScore
\]

其中:
- \(w_1 = 0.5\): 约束分数（违反约束扣分，没违反满分）
- \(w_2 = 0.3\): 参数关联分数（符合挖掘出的关联规则加分）
- \(w_3 = 0.2\): 环境适配分数（符合当前硬件加分）

**可操作反馈生成**:
当参数组合不合理时，不只说"不合理"，给出具体建议：
- ❌ 原错误：`"ismear=0 requires sigma < 0.1, got 0.2"`
- ✅ 新反馈：`"sigma=0.2 过大，因为 ismear=0 (半导体/绝缘体) 推荐 sigma = 0.05，是否修正？"`

#### 6. 参数关联规则挖掘

**频繁模式挖掘**:
- 从历史补全记录中挖掘参数关联规则
- 形如：`A = a ⇒ B = b` (支持度 > 阈值)
- 计算支持度：`support = count(A=a ∧ B=b) / total`
- 置信度：`confidence = count(A=a ⇒ B=b) / count(A=a)`
- 保留支持度 > 5% 且 confidence > 70% 的规则

**规则存储**:
```typescript
interface ParamAssociationRule {
  antecedent: Array<{param: string; value: any}>;  // 前提
  consequent: {param: string; value: any};         // 结论
  support: number;              // 支持度 0-1
  confidence: number;           // 规则置信度
  occurrences: number;          // 发生次数
}
```

**挖掘频率**:
- 每积累 10 条新的用户修正，触发一次挖掘
- 挖掘结果更新规则库，供 Verifier 使用

#### 7. 共同进化循环

**Generator → Verifier 共同进化**:

```
初始状态:
  Generator: 内置规则，置信度固定
  Verifier: 只有硬编码约束，没有关联规则

循环:
1. Generator 补全参数 → 输出给用户
2. 如果用户接受（不修正）:
   → Generator: 该规则正确计数 +1 → 置信度提高
   → 记录到数据集用于关联挖掘
3. 如果用户修正:
   → Generator: 该规则错误计数 +1 → 置信度降低
   → Generator: 新增/更新学习规则，使用用户修正值
   → 记录修正到数据集
   → 若积累足够数据，重新挖掘关联规则 → 更新 Verifier
4. Verifier 有了更好的规则 → 打分更准确 → Generator 选择更准
5. Generator 更准确 → 用户修正减少，但是修正质量更高 → 挖掘更好的规则 → Verifier 更好
... 持续循环，共同进化 ...
```

**收敛性质**:
- 初始：依赖人工内置知识，覆盖率有限
- 随着用户反馈积累：Generator 置信度越来越准，Verifier 关联规则越来越多
- 收敛：覆盖率 ↑，错误率 ↓，逐渐适应用户使用习惯

## 模块划分与文件结构

### 新增文件

```
packages/orchestrator/src/services/
├── param-evolution/
│   ├── index.ts              # 导出公共接口
│   ├── dynamic-template.ts   # 动态模板库实现
│   ├── confidence-manager.ts # 置信度管理器
│   ├── param-generator.ts    # 参数生成器（beam search）
│   ├── param-verifier.ts      # 参数验证器
│   ├── association-miner.ts  # 参数关联规则挖掘
│   ├── environment-adapter.ts # 环境适配扩展
│   └── storage.ts            # 持久化存储
```

### 修改文件

- `param-completer.ts`: 重构使用新的动态架构，保持原有 API
- `environment-detector.ts`: 扩展采集更多硬件信息
- `types.ts`: 新增类型定义

## 向后兼容性保证

1. **API 兼容**: 所有现有工具接口保持不变，输入输出 schema 不变
2. **数据兼容**: 原有偏好存储格式 `preferences.json` 会自动迁移到新格式
3. **模板兼容**: 原有内置模板全部保留，作为初始种子
4. **可回滚**: 可以通过配置禁用自进化，回退到原有静态行为

## 实施步骤

### 阶段 1: 基础设施 ✅ 立即开始
- [ ] 创建 `param-evolution/` 目录和类型定义
- [ ] 实现 `DynamicTemplateLibrary` 动态模板库
- [ ] 实现 `ConfidenceManager` 置信度管理
- [ ] 实现持久化存储
- [ ] 迁移原有硬编码模板到动态系统

### 阶段 2: 双组件共同进化架构 ⏳ 1-2 天
- [ ] 实现 `ParamGenerator` 带 beam search
- [ ] 实现 `ParamVerifier` 多维度打分
- [ ] 实现可操作反馈生成
- [ ] 集成到原有 `ParamCompleterService`

### 阶段 3: 环境感知适配 ⏳ 1 天
- [ ] 扩展 `EnvironmentDetectorService` 采集更多硬件信息
- [ ] 实现 `EnvironmentAdapter` 基于硬件推荐并行参数
- [ ] 添加 VASP/LAMMPS 并行参数推断规则

### 阶段 4: 参数关联规则挖掘 ⏳ 1-2 天
- [ ] 实现频繁项集挖掘算法
- [ ] 实现 `AssociationMiner`
- [ ] 集成到学习闭环
- [ ] 设置触发条件（积累 N 条修正后挖掘）

### 阶段 5: 测试与验证 ✅ 最后
- [ ] 单元测试覆盖所有新组件
- [ ] 集成测试：从原有数据迁移验证
- [ ] 端到端测试：完整补全 → 修正 → 学习流程
- [ ] 基准对比：进化前后准确率对比

## 预期收益

| 指标 | 进化前 | 预期进化后 |
|------|--------|------------|
| 补全准确率 | ~70% | ~85-90%+ |
| 支持参数规则 | 仅内置 | 内置 + 学习扩展 |
| 对用户环境适应性 | 静态 | 自适应硬件 |
| 持续改进能力 | 需改代码 | 自主从反馈学习 |
| 用户修正反馈闭环 | 只记录不学习 | 记录 → 学习 → 改进完整闭环 |

## 参考

- **EvoSkills**: [EvoSkills: Self-Evolving Agent Skills via Co-Evolutionary Verification](https://arxiv.org/abs/2604.01687)
- **Sci-Orbit 价值分析**: [Sci-Orbit-PTO-Gromacs-analysis.md](../../../zhuzige/Sci-Orbit-PTO-Gromacs-analysis.md)
