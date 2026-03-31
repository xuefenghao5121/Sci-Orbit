# ai4s-science Skill

> 版本: 1.0.0 | 灵码团队 | Phase 3

## Description
科学计算工具集成。提供统一的科学计算命令接口，支持多种计算工具和可视化。
触发词：科学计算、计算、模拟、可视化、/science。

## 命令路由

| 命令 | 说明 |
|------|------|
| `/science run` | 执行科学计算任务 |
| `/science viz` | 可视化计算结果 |
| `/science batch` | 批量参数扫描计算 |

## 支持的科学工具

| 工具 | 领域 | 用途 | 依赖 |
|------|------|------|------|
| NumPy/SciPy | 通用 | 数值计算、线性代数、优化 | Python |
| Matplotlib/Plotly | 可视化 | 2D/3D 绑图、交互式可视化 | Python |
| SymPy | 符号计算 | 公式推导、符号求解 | Python |
| FEniCS | PDE | 有限元求解偏微分方程 | Python |
| OpenFOAM | 流体 | CFD 有限体积求解 | 独立 |
| LAMMPS | 材料 | 分子动力学模拟 | 独立 |
| VASP | 材料 | 第一性原理计算 (DFT) | 独立 |
| Quantum ESPRESSO | 量子 | 材料电子结构 | 独立 |
| GROMACS | 生物 | 分子动力学 (生物大分子) | 独立 |
| Astropy | 天文 | 天文数据处理 | Python |
| Qiskit | 量子 | 量子电路模拟 | Python |
| scikit-learn | ML | 数据分析、机器学习 | Python |

## 命令详解

### `/science run` — 执行计算

```
用法: /science run --tool TOOL --script FILE [--args ARGS]

示例:
  /science run --tool numpy --script "solve_eigen.py"
  /science run --tool lammps --script "in.melt" --args "-var T 300"
  /science run --tool sympy --expr "integrate(exp(-x**2), (x, -oo, oo))"
```

**自动流程**:
1. 检查工具是否安装，未安装则提示安装命令
2. 环境检查（conda/venv、GPU、内存）
3. 执行计算
4. 数值约束检查（调用 /constrain check）
5. 结果摘要

### `/science viz` — 可视化

```
用法: /science viz --input FILE [--type {2d|3d|interactive}]

选项:
  --type 2d           静态 2D 图 (matplotlib, PNG)
  --type 3d           3D 可视化 (matplotlib/pyvista)
  --type interactive  交互式 (plotly/html)
  --x COL             X 轴列名
  --y COL             Y 轴列名
  --title TITLE       图表标题
  --save FILE         保存路径

示例:
  /science viz --input results.csv --x time --y temperature --type interactive
  /science viz --input field.vtk --type 3d
```

### `/science batch` — 批量计算

```
用法: /science batch --tool TOOL --script FILE --params PARAMS

参数扫描格式:
  --params "T=300,400,500; P=1,10,100"   # 全组合
  --params "lr=logspace(-4,-1,10)"         # 对数空间
  --params "grid:N=10:100:10"             # 线性网格

示例:
  /science batch --tool lammps --script "in.sim" --params "T=300,400,500"
  /science batch --tool python --script "optimize.py" --params "lr=logspace(-4,-1,10)"
```

**批量执行流程**:
1. 解析参数组合
2. 生成任务列表
3. 顺序执行（本地）或提交 HPC（`/hpc submit`）
4. 汇总结果 + 自动对比

## 工具使用指南

### FEniCS PDE 求解模板
```python
from fenics import *
mesh = UnitSquareMesh(32, 32)
V = FunctionSpace(mesh, 'P', 1)
u = TrialFunction(V)
v = TestFunction(V)
a = dot(grad(u), grad(v)) * dx
L = f * v * dx
u = Function(V)
solve(a == L, u, bc)
```

### LAMMPS 模拟模板
```bash
units           metal
dimension       3
boundary        p p p
atom_style      atomic
read_data       data.lmp
pair_style      eam/alloy
pair_coeff      * * Al99.eam.alloy Al
velocity        all create 300 12345
fix             1 all npt temp 300 300 0.1 iso 0 0 1.0
timestep        0.001
run             100000
```

### SymPy 符号计算
```python
from sympy import symbols, integrate, diff, solve
x = symbols('x')
result = integrate(x**2 * exp(-x), (x, 0, oo))
```

## 输出规范
- 数值结果标注单位和精度
- 图表包含坐标轴标签、图例、标题
- 批量结果自动生成对比表
- 所有中间结果可追溯
