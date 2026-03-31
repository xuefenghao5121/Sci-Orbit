# 流体模拟演示

## Step 1: 任务规划

```
> /ai4s-plan 模拟二维方腔驱动流，Re=1000，使用有限差分法求解 N-S 方程
```

## Step 2: 约束检查

```
> 检查 N-S 方程的量纲一致性
```

调用 `check_dimension`：
- 输入: ∂u/∂t + u·∇u = -∇p/ρ + ν∇²u
- 变量: {u: m/s, t: s, p: Pa, ρ: kg/m³, ν: m²/s}
- 输出: ✅ 量纲一致

## Step 3: 模拟实现

```
> 使用 Jupyter 实现有限差分求解器
```

调用 `science_jupyter` 创建 Notebook：
- 网格设置: 100×100
- 时间步长: dt=0.001（CFL 条件验证）
- 边界条件: 顶部 lid u=1, 其余无滑移

## Step 4: 守恒验证

```
> 检查模拟结果中质量守恒
```

调用 `check_conservation`：
- 质量偏差: < 1e-10 ✅
- 动量偏差: < 1e-8 ✅

## Step 5: 结果对比

```
> 与 Ghia et al. 1982 基准解对比
```

`exp_compare` 对比模拟结果与基准数据，误差 < 1% ✅
