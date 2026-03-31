# AI4S Environment Skill

> 触发命令: `/env` | 版本: 0.1.0 | 灵码团队

## 描述

环境管理技能。自动检测计算环境、配置依赖、保存环境快照，确保实验可复现。

## 触发条件

- 用户说"检查环境"、"环境配置"、"安装依赖"
- 用户说"环境快照"、"保存环境"
- `/env` 命令直接触发
- `/exp run` 执行前自动触发 `/env detect`

## 命令路由

| 命令 | 功能 | 参数 |
|------|------|------|
| `/env detect` | 检测当前环境 | 无 |
| `/env setup [--requirements <file>]` | 配置环境 | 可选 requirements 文件 |
| `/env snapshot [--name <n>]` | 保存环境快照 | 可选快照名称 |

## 执行流程

### /env detect

```
    ↓
① 系统信息:
    - OS 版本、内核版本
    - CPU 型号、核心数
    - 内存大小
    ↓
② GPU 信息:
    - GPU 型号、数量
    - CUDA 版本、显存
    - 驱动版本
    ↓
③ Python 环境:
    - Python 版本
    - 虚拟环境类型 (conda/venv)
    - 已安装的关键包及版本:
      - pytorch, tensorflow, jax
      - numpy, scipy, pandas
      - transformers, peft
      - openfoam (如安装)
    ↓
④ 编译器:
    - gcc/g++ 版本
    - cuda/nvcc 版本
    - cmake 版本
    ↓
⑤ 输出环境报告
```

### /env setup

```
输入: 可选 requirements 文件
    ↓
① 读取项目 .ai4s/config.json 中的环境需求
    ↓
② 检测当前环境与需求的差异
    ↓
③ 生成安装/更新命令:
    - pip install / conda install
    - 系统包 (apt/yum)
    ↓
④ 展示差异和操作计划
    ↓
⑤ 用户确认后执行
    ↓
⑥ 验证安装成功
    ↓
⑦ 保存环境快照
```

### /env snapshot

```
输入: 可选快照名称
    ↓
① 收集完整环境信息
    ↓
② 生成快照文件:
    - .ai4s/env/snapshots/<name>_<date>.yaml
    - 包含: OS, CPU, GPU, Python, 依赖版本
    ↓
③ 更新 .ai4s/env.json 指向最新快照
    ↓
④ 输出快照路径
```

## 环境快照格式

```yaml
# .ai4s/env/snapshots/<name>_<date>.yaml
name: "gpu-server"
created_at: "2026-03-31T20:00:00Z"
git_commit: "abc1234"

system:
  os: "Ubuntu 22.04"
  kernel: "5.15.0-170-generic"
  cpu: "Intel Xeon Platinum 8369B"
  cpu_cores: 64
  ram_gb: 256

gpu:
  - model: "NVIDIA A100"
    count: 2
    memory_gb: 80
    cuda_version: "12.1"
    driver_version: "535.129.03"

python:
  version: "3.10.12"
  environment: "conda (base)"
  packages:
    torch: "2.1.0"
    numpy: "1.24.3"
    scipy: "1.11.4"
    pandas: "2.1.4"
    transformers: "4.36.0"
    peft: "0.7.0"

compilers:
  gcc: "11.4.0"
  nvcc: "12.1.105"
  cmake: "3.25.1"
```

## 串联命令

- `/project init` → `/env setup` — 初始化后配置环境
- `/exp run` → `/env detect` — 运行前检查环境
- `/env snapshot` → `/exp run` — 快照后运行确保可复现
- `/env setup` → `/env snapshot` — 配置后保存快照
