# AI4S Project Skill

> 触发命令: `/project` | 版本: 0.1.0 | 灵码团队

## 描述

项目管理技能。覆盖 AI4S 项目初始化、架构设计、代码审查的项目生命周期管理。

## 触发条件

- 用户说"创建项目"、"初始化项目"、"新建 AI4S 项目"
- 用户说"设计架构"、"架构方案"
- 用户说"审查代码"、"代码 review"
- `/project` 命令直接触发

## 命令路由

| 命令 | 功能 | 参数 |
|------|------|------|
| `/project init --name <n> --type ml\|sim\|data` | 初始化项目 | 名称 + 类型 |
| `/project arch [--from <paper-id>]` | 架构设计 | 可选从论文生成 |
| `/project review [--focus perf\|security\|correctness]` | 代码审查 | 可选聚焦方向 |

## 执行流程

### /project init

```
输入: 项目名称 + 类型
    ↓
① 创建标准目录结构
    ↓
② 生成配置文件:
    - .ai4s/config.json (项目配置)
    - .ai4s/env.json (环境配置)
    - CLAUDE.md (项目上下文)
    - requirements.txt / environment.yaml
    - .gitignore
    ↓
③ 初始化 Git 仓库
    ↓
④ 输出项目结构摘要
```

### /project arch

```
输入: 可选论文 ID
    ↓
① 加载论文笔记（如有）
    ↓
② 分析需求:
    - 功能需求
    - 非功能需求 (性能/精度/可扩展性)
    - 技术约束
    ↓
③ 生成架构设计:
    - 模块划分
    - 接口定义
    - 数据流图
    - 依赖关系
    ↓
④ 输出架构文档 (docs/arch.md)
```

### /project review

```
输入: 可选聚焦方向
    ↓
① 扫描项目源代码
    ↓
② 多维度审查:
    - 科学正确性
    - 数值稳定性
    - 计算性能
    - 代码质量
    - 可复现性
    ↓
③ 按严重程度排序输出问题
    ↓
④ 生成审查报告
```

## 项目目录结构模板

```
<project-name>/
├── .ai4s/                    # AI4S 项目配置
│   ├── config.json           # 项目元信息
│   ├── env.json              # 环境配置
│   ├── plans/                # 计划存储
│   ├── experiments/          # 实验记录
│   └── papers/               # 论文笔记
├── .git/                     # Git 仓库
├── docs/                     # 文档
│   ├── arch.md               # 架构设计
│   └── api.md                # API 文档
├── src/                      # 源代码
│   ├── __init__.py
│   ├── core/                 # 核心算法
│   ├── data/                 # 数据处理
│   ├── models/               # 模型定义
│   ├── training/             # 训练脚本
│   └── utils/                # 工具函数
├── configs/                  # 配置文件
│   └── default.yaml
├── scripts/                  # 辅助脚本
│   ├── setup.sh
│   └── evaluate.py
├── tests/                    # 测试
│   ├── test_core.py
│   └── test_integration.py
├── data/                     # 数据目录 (不提交 Git)
├── notebooks/                # Jupyter 笔记本
├── requirements.txt          # Python 依赖
├── environment.yaml          # Conda 环境
├── CLAUDE.md                 # 项目上下文
└── README.md                 # 项目说明
```

## 项目配置模板

```json
// .ai4s/config.json
{
  "name": "project-name",
  "type": "ml|sim|data",
  "created_at": "2026-03-31T20:00:00Z",
  "description": "项目描述",
  "domain": "科学领域",
  "language": "python",
  "framework": "pytorch"
}
```

## 审查维度

### 科学正确性 (Critical)
- [ ] 数值稳定性（除零、溢出、精度丢失）
- [ ] 随机种子固定（可复现性）
- [ ] 指标计算与论文定义一致
- [ ] 数据泄露风险（训练/验证/测试分离）
- [ ] 物理约束满足（如适用）

### 计算性能 (Warning)
- [ ] GPU 利用率优化（batch size, 数据加载并行）
- [ ] 内存效率（gradient checkpointing, 混合精度）
- [ ] I/O 优化（数据预取、缓存）
- [ ] 计算复杂度合理

### 工程质量 (Info)
- [ ] 实验配置可追溯（Git commit + config）
- [ ] 超参数有明确记录
- [ ] 日志和指标完整输出
- [ ] 错误处理和异常恢复
- [ ] 类型注解和文档字符串

## 串联命令

- `/project init` → `/env setup` — 配置环境
- `/project init` → `/ai4s-plan` — 生成项目计划
- `/project arch` → `/project review` — 审查架构实现
- `/paper read` → `/project arch --from <id>` — 基于论文设计架构
