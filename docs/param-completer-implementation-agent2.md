# 参数补全服务 V2 设计文档 - 子agent2 独立实现

## 设计思路

### 核心设计哲学

与子agent1的"模板+规则"设计不同，我采用了**分层推断架构**：

1. **上下文层** - 分离环境上下文和任务上下文，明确推理来源
2. **推断器层** - 按职责拆分多个独立推断器（默认值推断、环境推断、任务推断、冲突消解）
3. **验证层** - 独立的参数验证阶段，确保参数一致性
4. **置信度层** - 每个推断结果都带有来源分析和置信度计算

### 设计决策

#### 1. 为什么选择分层推断？

- **职责分离**：每个推断器只做一件事，便于测试和扩展
- **可组合性**：可以根据需要启用/禁用特定推断器
- **可追溯性**：每个参数的推断来源清晰可见
- **易于扩展**：添加新的推断规则不需要修改现有代码

#### 2. 置信度评估策略

我采用了**多维度置信度计算**：
- **来源基础分**：硬编码默认值(0.7)、环境推断(0.9)、任务推断(0.8)、用户显式(1.0)
- **冲突调整**：多个推断结果冲突时降低置信度
- **一致性加分**：参数之间满足约束关系时提高置信度

#### 3. 参数验证设计

验证分为三个级别：
- **必填检查**：检查工具必须的参数是否存在
- **范围检查**：检查数值参数是否在合理范围内
- **一致性检查**：检查参数之间的逻辑一致性

#### 4. 环境上下文推断

环境上下文包括：
- GPU检测：是否有GPU、GPU数量 → 影响并行设置
- CUDA版本 → 影响可选特性
- MPI可用性 → 影响进程设置
- 可用核心数 → 影响默认进程数

#### 5. 任务上下文推断

任务上下文包括：
- 计算类型（单点能、弛豫、MD、振动分析）→ 影响迭代步数、收敛阈值
- 体系类型（金属、绝缘体、半导体）→ 影响smearing方法
- 体系大小 → 影响精度设置和并行策略

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│  UserInput: { tool, partialParams, taskContext }            │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ContextCollector                                            │
│  ├─ Collect Environment Snapshot                            │
│  └─ Collect Task Context                                    │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Inference Pipeline                                         │
│  ├─ DefaultValueInferrer  → 补全工具通用默认值              │
│  ├─ EnvironmentInferrer   → 从环境推断并行/GPU设置         │
│  ├─ TaskInferrer         → 从任务上下文推断计算相关参数   │
│  └─ ConflictResolver     → 解决冲突，调整置信度           │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Validator                                                   │
│  ├─ RequiredChecker                                          │
│  ├─ RangeChecker                                             │
│  └─ ConsistencyChecker                                      │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  CompletedResult: { allParams, inferred, confidence,        │
│                     warnings, validation }                   │
└─────────────────────────────────────────────────────────────┘
```

## 接口设计

### 主要接口

```typescript
export class ParamCompleterServiceV2 {
  constructor();
  setEnvironment(env: EnvironmentContext): void;
  complete(params: CompletionRequest): CompletionResult;
  validate(params: Record<string, any>, tool: string): ValidationResult;
  generateInput(completed: CompletionResult): string;
  getSupportedTools(): string[];
}
```

### 数据结构

```typescript
interface EnvironmentContext {
  hasGpu: boolean;
  gpuCount: number;
  hasMpi: boolean;
  cpuCores: number;
  cudaVersion?: string;
}

interface TaskContext {
  calculationType: 'single-point' | 'relaxation' | 'md' | 'vibration';
  systemType: 'metal' | 'insulator' | 'semiconductor' | 'unknown';
  atomCount: number;
  spinPolarized?: boolean;
}

interface CompletionRequest {
  tool: string;
  params: Record<string, any>;
  taskContext?: Partial<TaskContext>;
}

interface InferenceResult {
  paramName: string;
  value: any;
  confidence: number;
  source: 'default' | 'environment' | 'task' | 'inference';
  reasoning: string;
}

interface ValidationIssue {
  param: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface CompletionResult {
  tool: string;
  explicit: Record<string, any>;
  inferred: InferenceResult[];
  allParams: Record<string, any>;
  confidence: Record<string, number>;
  validation: ValidationResult;
  sources: Record<string, string>; // 参数来源说明
}
```

## 支持的工具

当前版本支持：
- VASP
- LAMMPS
- ABACUS
- GROMACS

## 关键算法说明

### 置信度计算

```
confidence = baseScore
if conflictWithOtherInference: confidence *= 0.7
if consistentWithConstraints: confidence *= 1.1
confidence = clamp(confidence, 0, 1)
```

### 冲突解决策略

当多个推断器给出不同值时：
1. 优先选择置信度高的结果
2. 如果置信度相近，保留环境推断结果高于任务推断，任务推断高于默认值
3. 降低最终置信度

## 扩展性设计

- 新增工具只需要添加新的参数元数据定义
- 新增推断规则只需要添加新的推断器类
- 新增验证规则只需要添加新的验证器

## 使用示例

见代码末尾的使用示例。
