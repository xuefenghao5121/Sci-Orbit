# 参数补全服务 - 最终合并版本设计文档

## 概述

本文档描述了合并子agent1和子agent2优点后的最终参数补全服务设计。根据柱子哥的裁决，我们采用：
**保留子agent2的四层架构，吸收子agent1的累积推断思想**。

## 架构设计

### 最终架构图

```
┌─────────────────────────────────────────────────────────────┐
│  User Input: CompletionRequest {tool, params, taskContext}  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 第一层：上下文层                                            │
│  ├─ EnvironmentContext: 环境信息 (GPU, CPU cores, MPI)      │
│  └─ TaskContext: 任务信息 (计算类型, 体系类型, 原子数)       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 第二层：推断器层 - 混合架构                                  │
│  ├─ 阶段1: 默认值推断                                        │
│  ├─ 阶段2: 独立推断器执行 (环境推断器, 任务推断器)            │
│  └─ 阶段3: 累积规则链执行 (顺序执行，后续依赖前面结果)         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 第三层：冲突解决层                                          │
│  ├─ 置信度比较                                              │
│  ├─ 冲突降级 (降低置信度)                                   │
│  └─ 完整冲突记录                                            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 第四层：验证层                                              │
│  ├─ 必填参数检查                                            │
│  ├─ 数值范围检查                                            │
│  └─ 参数一致性检查 (每个工具特定逻辑)                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 输出：CompletionResult 包含                                 │
│  ├─ allParams: 所有参数                                     │
│  ├─ confidence: 每个参数置信度                               │
│  ├─ conflicts: 冲突记录                                     │
│  └─ validation: 验证结果                                    │
└─────────────────────────────────────────────────────────────┘
```

### 设计决策

| 决策项 | 选择 | 原因 |
|--------|------|------|
| 整体架构 | 四层架构 | 保留子agent2设计，职责分离清晰 |
| 推断方式 | 混合架构 | 独立推断器 + 累积规则链，兼顾两者优点 |
| 参数依赖 | 支持累积推断 | 吸收子agent1，后续规则可以依赖前面结果 |
| 错误处理 | 单条错误隔离 | 继承子agent1，不影响整体补全 |
| 上下文分离 | Environment + Task | 保留子agent2，环境感知 + 任务感知 |
| 冲突解决 | 置信度比较 + 记录 | 修复子agent2要求，添加完整冲突记录 |
| 一致性验证 | 工具特定实现 | 实现了ABACUS/LAMMPS/GROMACS/VASP完整逻辑 |

## 核心特性

### 1. 用户优先原则

```typescript
// 用户已显式指定的参数绝不覆盖
if (inference.paramName in result.explicit) {
  return;
}
```

这个检查在每次应用推断时都执行，保证用户输入永远最高优先级，不会被覆盖。**修复了原agent1可能重复写入的问题**。

### 2. 置信度管理

每个参数都有独立置信度 (0-1)：
- 用户显式参数：置信度固定为 1.0
- 默认参数：在元数据中预定义置信度
- 推断结果：每个推断返回独立置信度
- 冲突发生：置信度自动降低
- 低置信度 (< 0.5)：自动添加警告

**修复了原agent1问题：为所有默认参数补全置信度配置**。

### 3. 累积推断支持

规则按顺序执行，后续规则可以访问已经推断出的结果：

```typescript
// 规则1: 推断 ISMEAR = 1 (金属体系)
// 规则2: 检查 ISMEAR 是否为 0，推断合适的 SIGMA
const ismer = req.params.ISMEAR ?? current.allParams.ISMEAR;
if (ismer === 0 && !('SIGMA' in req.params)) {
  // 推断 SIGMA = 0.05
}
```

### 4. 环境感知 + 任务感知

- **环境感知**：根据GPU检测自动设置并行参数
  - VASP: `NPAR=1` for GPU
  - ABACUS: `device=gpu`
  - LAMMPS: `gpu=on`
- **任务感知**：根据计算类型和体系类型推断参数
  - 金属 → ISMEAR=1 SIGMA=0.2
  - 绝缘体 → ISMEAR=0 SIGMA=0.05
  - 弛豫 → 设置合理的迭代步数

### 5. 错误隔离策略

```typescript
for (const rule of toolDef.rules) {
  try {
    // 执行规则
  } catch (e) {
    // 捕获异常，添加警告，继续执行其他规则
    result.validation.issues.push({...});
  }
}
```

单条规则/推断器错误不中断整个补全过程，服务总能返回部分结果。

### 6. 冲突记录

新增`conflicts`字段记录所有冲突：

```typescript
interface ConflictRecord {
  paramName: string;
  existingValue: any;
  existingConfidence: number;
  newValue: any;
  newConfidence: number;
  resolution: 'keep-existing' | 'replace' | 'reduce-confidence';
  reason: string;
}
```

**满足子agent2要求：添加冲突记录，在结果中添加冲突日志**。

### 7. 参数一致性验证

为每个工具实现了特定的一致性检查：

| 工具 | 检查内容 |
|------|---------|
| VASP | IBRION≠-1 但 NSW=0 → 警告；ISMEAR=0 但 SIGMA>0.1 → 警告；ISPIN=2 但无 MAGMOM → 警告 |
| ABACUS | calculation=relax 但 relax_nmax=0 → 警告；calculation=md 但 md_nstep=0 → 警告 |
| LAMMPS | gpu=on 但没有package声明 → 提示；real单位 timestep>5.0 → 警告 |
| GROMACS | integrator=md 但 nsteps=0 → 警告；rlist < rcoulomb/rvdw → 警告 |

**满足子agent2要求：实现一致性验证器的具体逻辑**。

## 接口定义

### 主要类

```typescript
export class ParamCompleterFinalService {
  constructor();
  setEnvironment(env: EnvironmentContext): void;
  getEnvironment(): EnvironmentContext | undefined;
  complete(request: CompletionRequest): CompletionResult;
  validate(params: Record<string, any>, tool: string): ValidationResult;
  generateVaspIncarlike(result: CompletionResult): string;
  generateAbacusInput(result: CompletionResult): string;
  generateGromacsMdp(result: CompletionResult): string;
  generateLammpsInput(result: CompletionResult): string;
  getSupportedTools(): string[];
  recordCorrection(...): void;
}
```

### 数据结构

```typescript
// 环境上下文
interface EnvironmentContext {
  hasGpu: boolean;
  gpuCount: number;
  hasMpi: boolean;
  cpuCores: number;
  cudaVersion?: string;
  totalMemoryGB?: number;
}

// 任务上下文
interface TaskContext {
  calculationType: 'single-point' | 'relaxation' | 'md' | 'vibration';
  systemType: 'metal' | 'insulator' | 'semiconductor' | 'unknown';
  atomCount: number;
  spinPolarized?: boolean;
  isSurface?: boolean;
  forceField?: string;
}

// 补全请求
interface CompletionRequest {
  tool: string;
  params: Record<string, any>;
  taskContext?: Partial<TaskContext>;
}

// 单个推断结果
interface InferenceResult {
  paramName: string;
  value: any;
  confidence: number;
  source: 'default' | 'environment' | 'task' | 'rule' | 'inference';
  reasoning: string;
}

// 冲突记录
interface ConflictRecord {
  paramName: string;
  existingValue: any;
  existingConfidence: number;
  newValue: any;
  newConfidence: number;
  resolution: 'keep-existing' | 'replace' | 'reduce-confidence';
  reason: string;
}

// 验证问题
interface ValidationIssue {
  param: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// 验证结果
interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// 最终补全结果
interface CompletionResult {
  tool: string;
  explicit: Record<string, any>;
  inferred: InferenceResult[];
  allParams: Record<string, any>;
  confidence: Record<string, number>;
  sources: Record<string, string>;
  conflicts: ConflictRecord[];
  validation: ValidationResult;
}
```

## 支持的工具

当前支持：
- ✅ VASP
- ✅ ABACUS
- ✅ LAMMPS
- ✅ GROMACS

## Bug修复清单

### 来自agent1的修复

| Bug | 修复状态 | 修复说明 |
|-----|---------|---------|
| 参数名提取逻辑 `extractParamNameFromRule` 可能提取错误 | ✅ 已修复 | 采用不同设计，我们在每条规则推断结果中显式指定 `paramName`，不再需要启发式提取，从根本上解决问题 |
| 为所有默认参数补全置信度配置 | ✅ 已修复 | 每个参数元数据都包含 `defaultConfidence`，必填参数为0，可选参数都有合理置信度配置 |
| 参数可能重复写入的问题 | ✅ 已修复 | 在 `applyInference` 开头检查 `paramName in result.explicit`，用户参数直接返回不写入，杜绝重复覆盖 |

### 来自agent2的修复

| Bug | 修复状态 | 修复说明 |
|-----|---------|---------|
| 修复方法名拼写错误 | ✅ 已修复 | 检查所有方法名，修正了缩进和拼写问题 |
| 添加冲突记录，在结果中添加冲突日志 | ✅ 已修复 | 新增 `conflicts: ConflictRecord[]` 字段，每次冲突都完整记录参数值、置信度、解决策略和原因 |
| 实现一致性验证器的具体逻辑 (ABACUS/LAMMPS/GROMACS) | ✅ 已修复 | 为四个工具都实现了特定的一致性检查，详见上文 |
| 确保置信度计算正确应用 | ✅ 已修复 | - 用户参数固定置信度1.0<br>- 冲突解决时正确调整置信度<br>- 低置信度自动添加警告<br>- 每个推断结果置信度正确传递 |

## 使用示例

```typescript
import { ParamCompleterFinalService } from './param-completer-final.js';

// 创建服务实例
const completer = new ParamCompleterFinalService();

// 设置环境上下文（通常从 env_snapshot 获取）
completer.setEnvironment({
  hasGpu: true,
  gpuCount: 1,
  hasMpi: true,
  cpuCores: 8,
});

// 发起补全请求
const result = completer.complete({
  tool: 'vasp',
  params: {
    ENCUT: 500,
  },
  taskContext: {
    calculationType: 'relaxation',
    systemType: 'metal',
    atomCount: 100,
  },
});

console.log('补全结果:');
console.log('所有参数:', result.allParams);
console.log('置信度:', result.confidence);
console.log('冲突记录:', result.conflicts);
console.log('验证结果:', result.validation);

// 生成INCAR文件
const incar = completer.generateVaspIncarlike(result);
console.log('INCAR:\n', incar);

// 独立验证
const validation = completer.validate(result.allParams, 'vasp');
console.log('验证:', validation);
```

## 扩展性

- **新增工具**：只需添加新的参数元数据定义和规则
- **新增推断器**：只需在 `independentInferrers` 中添加
- **新增规则**：只需在对应工具的 `rules` 数组中添加
- **新增验证**：只需在一致性检查方法中添加

## 总结

最终版本合并了两个实现的所有优点：

✅ **四层清晰架构** (上下文 → 推断 → 冲突 → 验证)
✅ **累积推断支持** (规则顺序执行，支持参数依赖)
✅ **完整冲突记录** (每次冲突都有日志)
✅ **完整一致性验证** (四个工具都实现)
✅ **每个参数都有置信度**
✅ **错误隔离** (单条错误不影响整体)
✅ **用户优先** (绝不覆盖用户输入)
✅ **环境感知 + 任务感知**
✅ **编译通过，无类型错误**
