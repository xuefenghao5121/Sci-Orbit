# Parameter Completer Service - User Guide

## 什么是参数补全服务

参数补全服务（Parameter Completer Service）是 Sci-Orbit 为科学计算提供的核心功能，旨在解决**隐式参数问题**：

### 问题背景

科学计算软件（如 VASP、LAMMPS 等）需要大量输入参数。研究人员凭经验知道哪些参数对于特定系统是合理的，但通用 AI 编码助手不知道这些领域惯例。例如：
- 对于金属体系，VASP 需要使用 `ismear=1`（Metlis smearing），但对于半导体应该使用 `ismear=0`（Gaussian）
- 不同晶格常数的体系需要合理的 k 点密度
- 不同计算类型需要不同的收敛标准

**通用 AI 只会写你告诉它的参数，漏掉隐含参数 → 计算失败，浪费 GPU 时间**

### 我们的解决方案

参数补全服务通过：
1. **领域知识模板** - 预制主流科学计算软件的参数知识库
2. **系统类型推理** - 根据用户提供的少数参数推断物理系统类型
3. **约束验证** - 检查参数组合是否满足物理和软件约束
4. **置信度评分** - 对推断结果给出置信度，提醒用户检查低置信度结果
5. **自适应学习** - 记录用户修正，在未来推断中应用用户偏好

## 支持的工具

当前版本支持以下四个主流科学计算工具：

| 工具 | 类型 | 支持的计算模式 |
|------|------|----------------|
| **VASP** | DFT 电子结构计算 | 自洽计算、结构优化、MD 模拟 |
| **LAMMPS** | 分子动力学 | 通用 MD 模拟 |
| **ABACUS** | DFT 电子结构计算（国产） | PW 基组、LCAO 基组 |
| **GROMACS** | 分子动力学 | 生物分子、聚合物模拟 |

### 支持的参数类别

对于每种工具，参数补全服务可以自动补全：

- **精度控制参数**：收敛阈值、截断能等
- **展宽参数**：金属/半导体的不同 smearing
- **k 点设置**：根据晶格常数自动推荐 k 点密度
- **轨道起始占据**：根据带隙推荐初始占据
- **并行设置**：根据检测到的核数/GPU 设置并行参数
- **输出控制**：合理的输出频率和格式

## 如何使用参数补全服务

### 通过 MCP 工具使用（推荐）

在 Claude Code 或 OpenClaw 中直接调用工具：

```json
// 1. 基本参数补全
{
  "name": "param_complete",
  "arguments": {
    "tool": "vasp",
    "params": {
      "system": "Cu metal fcc",
      "encut": 500,
      "lattice": [3.615, 3.615, 3.615]
    }
  }
}
```

返回结果：

```json
{
  "completed": {
    "ismear": 1,
    "sigma": 0.2,
    "prec": "accurate",
    "ediff": 1e-6,
    "nsw": 0,
    "isif": 3
  },
  "confidence": {
    "ismear": 0.95,
    "sigma": 0.90,
    "prec": 0.85
  },
  "warnings": [
    "Cu detected as metal, using ismear=1 (confidence 0.95)"
  ]
}
```

```bash
# 2. 生成输入文件
param_generate_incar --params result.completed --output INCAR
```

### 在 TypeScript 代码中使用

```typescript
import { ParamCompleterFinal } from '../packages/orchestrator/src/services/param-completer-final';

// 创建补全器实例
const completer = new ParamCompleterFinal();

// 执行补全
const result = await completer.complete({
  tool: 'vasp',
  userParams: {
    encut: 500,
    system_type: 'metal'
  },
  environment: {
    num_nodes: 1,
    cores_per_node: 32
  }
});

console.log('Completed parameters:', result.completedParams);
console.log('Warnings:', result.warnings);

// 生成输入文件
await completer.generateInputFile('vasp', result.completedParams, './INCAR');
```

### 记录用户修正（自适应学习）

如果你不同意自动补全的结果，可以记录你的修正，系统会学习：

```json
{
  "name": "param_record_correction",
  "arguments": {
    "tool": "vasp",
    "param_name": "ismear",
    "corrected_value": 0,
    "system_context": "Cu surface calculation"
  }
}
```

下次遇到类似系统时，补全器会优先使用你的修正。

## 架构设计概述

### 分层架构

参数补全服务最终版本采用分层架构，关注点分离：

```
┌─────────────────────────────────────────────────────────────┐
│  Public API                                                 │
│  (ParamCompleterFinal class)                               │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Inference Pipeline                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. Context Classification                           │   │
│  │     • Detect system type (metal/semiconductor/insulator)│ │
│  │     • Extract lattice, formula, calculation type    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  2. Template Matching                                │   │
│  │     • Load base template for tool/calculation type   │   │
│  │     • Apply system-type specific overrides          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  3. Constraint Validation                            │   │
│  │     • Check mutual exclusions                        │   │
│  │     • Check physical ranges                          │   │
│  │     • Check tool version compatibility              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  4. Confidence Scoring                               │   │
│  │     • Score based on evidence strength              │   │
│  │     • Generate warnings for low confidence          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  5. Adaptive Correction                               │   │
│  │     • Apply previously recorded user corrections    │   │
│  │     • Adjust confidence based on history           │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│  Storage Layer                                              │
│  • Templates: JSON/YAML per tool/calculation type          │
│  • User corrections: SQLite for persistence                │
│  • Environment detection: integration with env_snapshot    │
└─────────────────────────────────────────────────────────────┘
```

### 核心设计原则

1. **关注点分离**：每个层只做一件事，易于测试和扩展
2. **类型安全**：完整的 TypeScript 类型定义，编译时检查
3. **可测试性**：纯函数设计，每层都可独立单元测试
4. **可扩展性**：添加新工具只需要添加模板，不需要修改核心代码
5. **可追溯性**：每一步推断都记录置信度和理由，便于调试

### 主要组件

| 组件 | 职责 |
|------|------|
| `ParamCompleterFinal` | 主入口类，协调补全流程 |
| `ContextClassifier` | 从用户参数中分类系统类型 |
| `TemplateLoader` | 加载工具模板和默认参数 |
| `ConstraintValidator` | 验证参数约束 |
| `ConfidenceScorer` | 给推断结果打分 |
| `AdaptiveEngine` | 应用用户修正历史 |
| `InputGenerator` | 生成最终输入文件 |

### 数据流

```
User Input (partial params)
    ↓
ContextClassifier → system info (metal, volume, etc.)
    ↓
TemplateLoader → base params + candidate inferences
    ↓
ConstraintValidator → filter invalid inferences
    ↓
ConfidenceScorer → score each inference
    ↓
AdaptiveEngine → apply user-specific corrections
    ↓
Merge with user input → completed params
    ↓
Generate output + warnings → return to user
```

## 使用示例

### 示例 1：金属铜的 DFT 计算（VASP）

用户提供：
```typescript
{
  encut: 500,
  lattice: [3.615, 3.615, 3.615],
  atoms: ['Cu']
}
```

自动补全结果：
- `ismear: 1` (因为检测到金属，置信度 0.95)
- `sigma: 0.2` (适合金属的展宽，置信度 0.90)
- `prec: "accurate"` (默认精度，置信度 0.85)
- `ediff: 1e-6` (收敛阈值，置信度 0.80)
- `kpoints: [11, 11, 11]` (根据晶格常数自动计算，置信度 0.85)

### 示例 2：硅半导体的 DFT 计算（VASP）

用户提供：
```typescript
{
  encut: 400,
  lattice: [5.43, 5.43, 5.43],
  atoms: ['Si', 'Si']
}
```

自动补全结果：
- `ismear: 0` (半导体使用高斯展宽，置信度 0.92)
- `sigma: 0.05` (较小的展宽适合半导体，置信度 0.88)
- `prec: "normal"` (足够精度，置信度 0.80)
- `kpoints: [8, 8, 8]` (自动计算，置信度 0.85)

### 示例 3：水盒子的 MD 模拟（GROMACS）

用户提供：
```typescript
{
  nsteps: 1000000, // 1 ns simulation
  temperature: 300
}
```

自动补全结果：
- `integrator: md` (蛙跳积分，置信度 0.99)
- `dt: 0.002` (2 fs 时间步，置信度 0.95)
- `tcoupl: berendsen` (浴热耦合，置信度 0.85)
- `pcoupl: parrinello-rahman` (压强耦合，置信度 0.80)
- `nstxtcout: 5000` (每 10 ps 输出坐标，置信度 0.90)

## 最佳实践

1. **提供尽可能多的上下文**：晶格常数、原子种类、计算类型有助于提高推断准确度
2. **关注警告信息**：低置信度推断会产生警告，务必人工检查
3. **记录你的修正**：如果你经常修正某个参数，记录它让系统学习你的偏好
4. **验证结果**：自动补全是辅助，关键计算仍需人工验证

## 更多阅读

- 完整架构设计：[param-completer-final-design.md](./param-completer-final-design.md)
- API 参考：[api-reference.md](./api-reference.md)
- 开发者指南：[developer-guide.md](./developer-guide.md)

## 贡献

欢迎贡献新的工具模板和改进！请提交 Pull Request 到 GitHub 仓库。
