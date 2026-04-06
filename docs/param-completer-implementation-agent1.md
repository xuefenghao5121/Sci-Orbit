# 参数补全服务 - 实现设计思路 (子agent1)

## 概述

本文档描述了参数补全服务 (ParamCompleterService) 的第一个独立实现。

## 架构设计

### 核心设计思想

采用**模板+规则**的可扩展架构：

1. **模板**：每个工具（VASP/ABACUS/LAMMPS）有自己的参数模板，包含：
   - 默认参数值
   - 默认置信度
   - 必填参数列表
   - 推断规则列表

2. **规则**：每条推断规则是独立的函数对象，包含：
   - 条件判断函数 `condition()`
   - 推断函数 `infer()`
   - 返回值：推断结果 + 置信度 + 可选警告

3. **补全顺序**：
   ```
   用户输入 → 填充默认参数 (用户未指定) → 顺序执行推断规则 → 检查必填参数 → 添加低置信度警告 → 返回结果
   ```

### 为什么这样设计？

1. **累积推断支持**：规则按顺序执行，后续规则可以依赖前面规则的推断结果。例如：
   - 第一条规则推断出 `ISMEAR=1`
   - 第二条规则检查 `ISMEAR` 的值，推断出合适的 `SIGMA`

2. **开放扩展**：新增工具只需添加新模板，新增规则只需在模板规则数组中添加，不需要修改核心逻辑。

3. **置信度分离**：每个参数独立维护置信度，诚实反映不确定性。低置信度自动触发警告。

4. **错误隔离**：单条规则执行错误不影响整体补全，只添加警告继续执行。

## 关键特性实现

### 1. 用户优先原则

```typescript
// 用户已显式指定的参数绝不覆盖
if (!(key in userInput.params)) {
  result.implicit[key] = value;
}
```

这个检查在默认填充和每条规则推断时都执行，保证用户显式输入优先级最高。

### 2. 环境感知推断

通过 `setEnvSnapshot()` 注入环境快照，规则可以根据环境信息调整参数：
- 检测到 GPU → VASP 设置 `NPAR=1`
- 检测到 GPU → ABACUS 设置 `device=gpu`
- 检测到 GPU → LAMMPS 建议开启 GPU 加速

### 3. 置信度管理

- 每个参数都有独立的置信度 (0-1)
- 默认参数在模板中预定义置信度
- 规则推断结果返回置信度
- 置信度 < 0.5 自动添加警告

### 4. 错误处理策略

- 未知工具：返回空结果 + error 警告
- 必填参数缺失：添加 error 警告但仍返回结果
- 规则执行错误：捕获异常，添加警告继续
- 整个服务绝不崩溃，总能返回部分结果

## 支持的推断规则示例

### VASP

| 规则名称 | 逻辑 | 置信度 |
|---------|------|--------|
| metal-smearing | 未指定 ISMEAR 时默认 1 (Methfessel-Paxton) | 0.6 |
| sigma-for-gaussian | ISMEAR=0 → SIGMA=0.05 | 0.8 |
| sigma-for-smearing | ISMEAR≠0 → SIGMA=0.2 | 0.85 |
| gpu-npar | GPU → NPAR=1 | 0.9 |
| relax-nsw | 弛豫未指定 NSW → 50 | 0.7 |
| spin-default | 未指定 ISPIN → 1 | 0.8 |

### ABACUS

| 规则名称 | 逻辑 | 置信度 |
|---------|------|--------|
| metal-sigma | 根据 smearing 类型推断 sigma | 0.7 |
| gpu-parallel | GPU → device=gpu | 0.9 |
| md-defaults | md 计算未指定 md_nstep → 1000 | 0.5 |

### LAMMPS

| 规则名称 | 逻辑 | 置信度 |
|---------|------|--------|
| lammps-gpu | GPU → gpu=on | 0.8 |
| units-default | 未指定单位制 → real | 0.5 |
| boundary-default | 未指定边界 → p p p | 0.7 |

## 接口设计

```typescript
// 用户输入
interface UserParams {
  tool: string;
  params: Record<string, any>;
}

// 补全结果
interface CompletedParams {
  explicit: Record<string, any>;
  implicit: Record<string, any>;
  warnings: ParamWarning[];
  confidence: Record<string, number>;
}

// 警告
interface ParamWarning {
  param: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  suggested_value?: any;
}
```

## 文件生成

- `generateVaspIncarlike()`: 生成标准 VASP INCAR 格式，自动在文件头注释警告信息
- `generateAbacusInput()`: 生成标准 ABACUS INPUT 格式，同样注释警告

## 优缺点分析

### 优点

1. ✅ 规则独立，易于理解和维护
2. ✅ 支持累积推断，满足参数依赖关系
3. ✅ 置信度诚实，低置信度强制警告
4. ✅ 完全错误隔离，服务不崩溃
5. ✅ 易于扩展新工具和新规则
6. ✅ 符合接口定义要求

### 缺点

1. ⚠️ 当前规则是硬编码的，未来可以考虑将规则抽取为配置文件，支持热更新
2. ⚠️ 没有机器学习自适应，只是基于规则的推断（符合当前项目要求）
3. ⚠️ 参数名提取逻辑 `extractParamNameFromRule` 是启发式的，依赖规则命名规范

## 代码统计

- 总行数：约 400 行
- 注释：充分注释，关键逻辑有说明
- 类型：完整 TypeScript 类型定义

## 总结

这是一个清晰、健壮、可扩展的实现，严格遵循题目要求的所有约束：
- ✅ 用户优先，不覆盖显式参数
- ✅ 优雅降级，环境探测失败依然工作
- ✅ 累积推断，支持参数依赖
- ✅ 置信度诚实，强制警告
- ✅ 错误处理，不抛异常，总是返回结果

