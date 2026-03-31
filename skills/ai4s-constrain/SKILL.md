# ai4s-constrain Skill

> 版本: 1.0.0 | 灵码团队 | Phase 3

## Description
物理约束检查系统。在科学计算中自动或手动触发约束验证，确保结果物理合理。
触发词：约束检查、物理约束、量纲检查、conservation、dimension、/constrain。

## 命令路由

| 命令 | 说明 |
|------|------|
| `/constrain enable [type]` | 启用约束检查（可指定类型） |
| `/constrain check` | 手动触发当前结果检查 |
| `/constrain configure` | 配置约束参数和阈值 |
| `/constrain report` | 生成约束检查报告 |

## 约束类型

| 类型 | 标识 | 说明 |
|------|------|------|
| 量纲检查 | `dimension` | 验证公式量纲一致性 |
| 守恒检查 | `conservation` | 质量/能量/动量守恒 |
| 范围检查 | `range` | 物理量是否在合理范围 |
| 代码检查 | `code` | 数值稳定性（NaN/Inf/条件数） |

## 命令详解

### `/constrain enable` — 启用约束

```
用法: /constrain enable [--type dimension|conservation|range|code|all]

示例:
  /constrain enable all        # 启用全部
  /constrain enable dimension conservation  # 指定类型
```

启用后，每次数值计算自动触发对应检查。

### `/constrain check` — 手动检查

```
用法: /constrain check [--target FILE|RESULT]

对最近的计算结果或指定文件执行全量约束检查。
输出: 逐项检查结果 + 严重度标记 (PASS/WARN/FAIL)
```

### `/constrain configure` — 配置参数

```yaml
# .ai4s/constrain-config.yaml
dimension:
  enabled: true
  strict: true       # 严格模式：量纲不匹配直接报错
conservation:
  enabled: true
  tolerance: 1e-6    # 守恒量偏差容忍度
  check_mass: true
  check_energy: true
  check_momentum: true
range:
  enabled: true
  rules:
    temperature: [0, 1e8]       # K
    pressure: [0, 1e12]         # Pa
    density: [0, 25000]         # kg/m³
    velocity: [0, 3e8]          # m/s
    reynolds: [0, 1e10]
code:
  enabled: true
  max_condition_number: 1e12
  check_nan: true
  check_inf: true
  check_overflow: true
```

### `/constrain report` — 检查报告

```
用法: /constrain report [--format markdown|json]

输出报告包含:
  - 检查时间、范围
  - 各约束类型通过/警告/失败统计
  - 失败项详细说明和修复建议
  - 历史趋势（如果有多次检查）
```

## 物理约束检查清单

### 通用检查
- [ ] 所有数值无 NaN / Inf
- [ ] 输入数据范围合理
- [ ] 量纲一致（公式两端单位匹配）
- [ ] 矩阵条件数 < 10^12

### 流体力学
- [ ] 质量守恒：∫ρ dV 变化率 = 0（稳态）或 = 源项
- [ ] 能量守恒：总能量输入 = 总耗散 + 输出
- [ ] 动量守恒：合力 = 动量变化率
- [ ] 速度 < 光速 (3×10⁸ m/s)
- [ ] 雷诺数在合理范围
- [ ] CFL < 1（显式时间推进）
- [ ] y+ 合理（壁面函数 / DNS）

### 材料科学
- [ ] 能量收敛（DFT 自洽迭代）
- [ ] 力收敛 < 阈值
- [ ] 晶格常数在已知范围
- [ ] 结合能在物理范围
- [ ] 温度 > 0 K

### 热力学
- [ ] 温度 > 0 K（绝对零度不可达）
- [ ] 熵增（孤立系统）
- [ ] 压力 > 0
- [ ] 吉布斯自由能最低（平衡态）

### 量子力学
- [ ] 波函数归一化 ∫|ψ|² = 1
- [ ] 概率密度 ≥ 0
- [ ] 能量本征值为实数
- [ ] 不确定性关系 ΔxΔp ≥ ℏ/2

## Hook 集成

约束检查可通过 hooks.json 自动触发：
- `PostToolUse` 匹配 Bash 输出时自动执行 range + code 检查
- `/exp run` 完成后自动执行 conservation 检查
