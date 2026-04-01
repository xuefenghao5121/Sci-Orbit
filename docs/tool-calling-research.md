# AI4S 工具调用特征调研报告

> 版本: 1.0 | 日期: 2026-04-01 | 团队: 灵码

---

## 摘要

AI4S 领域的工具调用与通用编程存在**本质差异**：参数复杂度高（物理量+隐式环境依赖）、调用密度大（单任务10-50次）、可重复性要求严格（确定性结果）。Claude Code 当前工具系统为通用编程设计，在 AI4S 场景下存在 5 个核心短板。MVP 应聚焦**参数智能补全 + 环境快照 + 量纲检查**三个高价值点。

---

## 1. 工具调用类型数

### 分析

AI4S 工作流涉及远多于通用编程的工具类型：

| 类别 | 典型工具 | 数量级 |
|------|---------|--------|
| **计算引擎** | VASP, ABACUS, LAMMPS, GROMACS, Quantum ESPRESSO, CP2K | 10+ |
| **分子建模** | RDKit, OpenMM, ASE, PySCF, Psi4 | 8+ |
| **数据分析** | NumPy, Pandas, Matplotlib, Plotly, Seaborn | 6+ |
| **环境管理** | Conda, Docker, Singularity, Module, pip | 5+ |
| **任务调度** | Slurm, PBS, srun, torchrun | 4+ |
| **版本/数据** | Git, DVC, HDF5, NetCDF, CIF parser | 5+ |
| **文献/知识** | Semantic Scholar, arXiv, PubMed, Zotero | 4+ |
| **可视化** | VMD, OVITO, Jmol, NGLView | 4+ |
| **AI/ML** | PyTorch, DeepSpeed, LLaMA Factory, HuggingFace | 6+ |

**单次完整工作流通常需要 8-15 种不同类型工具**，远超通用编程的 3-5 种。

### 与通用编程对比

| 维度 | 通用编程 (Claude Code) | AI4S |
|------|----------------------|------|
| 工具类型数 | 3-5 种 (shell, git, editor, browser, search) | 8-15 种 |
| 领域特异性 | 低（通用） | 高（物理/化学/生物） |
| 工具间耦合 | 松散 | 紧密（数据格式强依赖） |

### MVP 启示

**不需要全部实现**。MVP 聚焦高频工具类型：环境检测、计算提交、结果解析。其他类型按需扩展。

---

## 2. 调用密度

### 分析

典型 AI4S 任务的调用链：

```
DFT 计算任务（完整流程）：
1. env_detect          → 检测环境
2. env_configure       → 配置环境（Conda/Module）
3. prepare_input       → 生成 POSCAR/INCAR
4. validate_input      → 验证输入（量纲、参数范围）
5. submit_job          → 提交 Slurm 任务
6. monitor_job         → 监控进度（轮询多次）
7. parse_output        → 解析 OUTCAR
8. visualize           → 可视化结果
9. validate_result     → 验证物理合理性
10. archive            → 归档（DVC/Git）

总计：10-20 次工具调用（含监控轮询可达 30+）
```

**典型对比**：

| 任务类型 | 工具调用次数 | 调用深度 | 说明 |
|---------|------------|---------|------|
| 通用编程 Bug 修复 | 3-8 次 | 1-2 层 | shell + edit + test |
| AI4S DFT 计算 | 10-20 次 | 2-4 层 | 环境→准备→提交→监控→解析 |
| AI4S 模型微调 | 15-30 次 | 3-5 层 | 数据→配置→训练→监控→评估→合并 |
| AI4S 论文复现 | 20-50 次 | 3-6 层 | 全流程 |

### 瓶颈识别

1. **Claude Code 上下文窗口压力**：30+ 次工具调用，每次返回结果都占 context，容易溢出
2. **串行依赖链长**：必须等上一步完成才能下一步（提交作业→等结果→解析）
3. **监控轮询浪费 token**：反复调用 monitor 检查进度

### MVP 启示

- **Plan-First 状态机**：一次调用返回完整计划，减少交互轮次
- **批量工具调用**：`validate_input + prepare_input + submit_job` 合并为单次调用
- **异步监控**：后台轮询，完成后回调通知

---

## 3. 工具调用参数复杂度

### 分析

AI4S 工具参数远比通用编程复杂：

#### 参数层级

| 层级 | 通用编程 | AI4S | 示例 |
|------|---------|------|------|
| 简单参数 | 文件路径、字符串 | 同左 | `input_file: "POSCAR"` |
| 结构化参数 | JSON config | YAML + 嵌套模板 | INCAR: 20+ 参数嵌套 |
| 隐式依赖参数 | 很少 | **大量** | CUDA版本、MPI版本、编译器 |
| 物理量参数 | 无 | **核心** | eV、Å、GPa、K、原子单位制 |

#### 关键问题：隐式依赖参数

```yaml
# Claude Code 能看到的（显式）
input_file: POSCAR
kpoints: 4 4 4
encut: 500

# Claude Code 看不到但影响结果的（隐式）
mpi_version: openmpi-4.1.4
compiler: gcc-11.3
vasp_version: 6.4.2
cuda_version: 12.1
precision: double
parallel_method: kpar+ncore
```

**隐式参数错误 → 结果错误但代码不报错 → 最危险的 bug 类型**

#### 参数错误的代价

| 错误类型 | 通用编程 | AI4S |
|---------|---------|------|
| 运行报错 | 秒级发现，快速修复 | 秒级发现，但排队等了几小时 |
| 结果错误 | 测试覆盖率高，易发现 | **很难发现**，可能发表错误论文 |
| GPU 浪费 | 不涉及 | **几百到几千元/次** |

### MVP 启示

**P0：参数智能补全** — 根据环境自动推断隐式参数
```typescript
interface SmartParamCompletion {
  // 从环境推断
  detectImplicitParams(env: EnvInfo): ImplicitParams;
  // 检查参数一致性
  checkConsistency(params: AllParams, env: EnvInfo): ParamWarning[];
  // 生成完整参数（显式+隐式）
  completeParams(userParams: UserParams, env: EnvInfo): CompleteParams;
}
```

---

## 4. 环境依赖敏感度

### 分析

AI4S 工具对环境的敏感度极高：

| 依赖类型 | 敏感度 | 出错频率 | 影响 |
|---------|--------|---------|------|
| **CUDA 版本** | 🔴 极高 | 常见 | 编译失败/运行时崩溃 |
| **编译器版本** | 🔴 高 | 常见 | 结果数值差异 |
| **MPI 实现** | 🟡 中 | 中等 | 性能差异，偶尔崩溃 |
| **Python 版本** | 🟡 中 | 中等 | API 不兼容 |
| **库版本** | 🔴 高 | 常见 | ABI 不兼容，结果差异 |
| **GPU 型号** | 🟡 中 | 少见 | 精度差异（FP16/FP32） |

**统计数据**（基于 Nature 2023 + CORE-Bench）：
- 科学软件部署成功率：50-60%
- 环境问题导致的失败占 **40%+**
- 环境不一致导致的结果差异：**5-15%**

### 现有解决方案对比

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| Conda | 包管理成熟 | 环境膨胀，冲突多 | Python 生态 |
| Docker | 完全隔离 | GPU 支持弱，HPC 不友好 | 服务器部署 |
| Singularity | HPC 友好 | 构建复杂 | 超算集群 |
| Environment Modules | 轻量 | 版本冲突 | 传统 HPC |
| Nix | 可复现 | 学习曲线陡 | 理想方案 |

### MVP 启示

**P0：环境快照 + 自动记录**
```typescript
interface EnvSnapshot {
  // 自动采集
  os: string;
  cpu: string;
  gpu: { model: string; driver: string; cuda: string; memory: number }[];
  compiler: string;
  mpi: string;
  python: string;
  packages: Record<string, string>;  // name -> version
  
  // 导出为可复现格式
  toCondaEnv(): string;      // environment.yml
  toDockerfile(): string;    // Dockerfile
  toSingularityDef(): string; // Singularity def
}
```

每次执行任务前自动采集，结果中附带环境快照，实现一键复现。

---

## 5. 可重复性要求

### 分析

| 可重复性层级 | 通用编程 | AI4S | Claude Code 支持 |
|-------------|---------|------|-----------------|
| **代码级** | Git 管理 | Git 管理 | ✅ 支持 |
| **环境级** | requirements.txt | Conda/Docker + CUDA + 编译器 | ❌ 不支持 |
| **数据级** | seed 控制 | 随机种子 + 分子初始构型 | ❌ 不支持 |
| **结果级** | 单元测试 | 基准值对比 + 误差分析 | ❌ 不支持 |

**AI4S 可重复性面临的独特挑战**：
1. **浮点非确定性**：GPU 并行计算顺序不确定 → 结果微小差异
2. **随机种子管理**：NumPy/PyTorch/CUDA 各自的种子需要统一管理
3. **中间结果管理**：TB 级中间数据，选择性保存
4. **软件版本漂移**：几个月后库升级，旧代码可能跑出不同结果

### MVP 启示

**P1：可重复性检查清单**（不实现完整系统，只做检查）
```typescript
interface ReproducibilityChecklist {
  checkEnvironmentSnapshot(): boolean;    // 有无环境快照
  checkRandomSeeds(): boolean;            // 随机种子是否固定
  checkDataVersion(): boolean;            // 数据集版本是否记录
  checkSoftwareVersions(): boolean;       // 软件版本是否锁定
  generateReport(): ReproducibilityReport;
}
```

---

## 6. 工具间数据格式

### 分析

AI4S 工具链中的数据格式远比通用编程复杂：

| 格式类型 | 示例 | 解析难度 | Claude Code 理解能力 |
|---------|------|---------|-------------------|
| **晶体结构** | CIF, POSCAR, xyz, mol2 | 🟡 中 | ❌ 差（不了解原子坐标含义） |
| **分子结构** | PDB, SDF, MOL, SMILES | 🟡 中 | ❌ 差 |
| **量子化学** | Gaussian log, VASP OUTCAR, ORCA output | 🔴 高 | ❌ 差 |
| **轨迹数据** | DCD, XTC, TRR, LAMMPS dump | 🔴 高 | ❌ 差 |
| **科学数据** | HDF5, NetCDF, FITS | 🟡 中 | ❌ 差 |
| **配置文件** | INCAR, pw.x input, CP2K input | 🟡 中 | ⚠️ 一般 |
| **通用格式** | JSON, YAML, CSV | 🟢 低 | ✅ 好 |

**关键摩擦点**：
1. **格式转换频繁**：VASP POSCAR → ASE Atoms → RDKit Mol → ...
2. **二进制格式难读**：HDF5/NetCDF 内部是二进制，Claude Code 无法直接理解
3. **大文件处理**：轨迹文件可达 GB 级，无法全部读入 context

### MVP 启示

**P0：科学数据格式摘要器**
```typescript
interface DataFormatSummarizer {
  // 将科学数据格式转换为 LLM 可理解的摘要
  summarize(file: string): DataSummary;
  
  // 示例输出
  // POSCAR → "Si 晶体，FCC 结构，a=5.43Å，2个原子，54个K点"
  // OUTCAR → "DFT 收敛，能量=-5.43eV/atom，力<0.01eV/Å"
}
```

不需要完整解析，只需要**提取关键物理量生成摘要**，让 Claude Code 能理解科学数据的含义。

---

## 7. MVP 设计建议

### 核心聚焦：工具调用专项优化

基于以上调研，MVP 应聚焦 **3 个高价值能力**：

#### P0 必做（Week 1-2）

| 功能 | 解决的问题 | 实现复杂度 |
|------|-----------|-----------|
| **环境快照自动采集** | 环境依赖敏感度 (§4) | 低 — 已有 env_detect 基础 |
| **参数智能补全** | 参数复杂度 (§3) | 中 — 需新增推理逻辑 |
| **科学数据格式摘要** | 数据格式 (§6) | 低 — 解析器已有基础 |

#### P1 应做（Week 3-4）

| 功能 | 解决的问题 | 实现复杂度 |
|------|-----------|-----------|
| **Plan-First 状态机** | 调用密度 (§2) | 中 — 重构现有工具 |
| **量纲检查增强** | 参数复杂度 (§3) | 低 — 已有基础 |
| **可重复性检查清单** | 可重复性 (§5) | 低 — 检查逻辑简单 |

#### P2 后做（Week 5+）

| 功能 | 解决的问题 | 实现复杂度 |
|------|-----------|-----------|
| 双模型辩论引擎 | 高级评审 | 高 |
| 真训练执行引擎 | 微调全流程 | 高 |
| 批量工具调用 | 调用密度 | 中 |

### Claude Code 插件形态

**Phase 1：纯 MCP Server（推荐起点）**

```bash
# 安装
claude mcp add ai4s -- node /path/to/ai4s-cli/dist/server.js

# 使用 - Claude Code 自动发现 38+ 工具
claude> 帮我跑一个硅的 DFT 计算
# Claude 自动调用：env_snapshot → param_complete → prepare_input → validate → submit
```

**Phase 2：编排型 MCP（加编排工具）**

```bash
claude> 用 ai4s_plan 分析这个任务
# 一次调用返回完整计划 + 风险评估 + 环境要求
```

### 不做什么（MVP 明确排除）

- ❌ 不实现真双模型辩论（MVP 用单模型 prompt 即可）
- ❌ 不实现真训练执行（MVP 只生成配置）
- ❌ 不实现完整可重复性系统（MVP 只做检查清单）
- ❌ 不实现 GPU 调度（MVP 不管资源分配）
- ❌ 不做 UI（纯 CLI + MCP）

---

## 附录：调研数据来源

- **Agent4S**: arXiv:2506.23692 — 五级分类体系
- **DSWizard**: Plan-First 机制验证，准确率 13% → 55%
- **Deploy-Master**: 双模型辩论，部署成功率 50% → 95%
- **CORE-Bench**: AI4S 评测基准，困难任务准确率仅 21%
- **Nature 2023**: AI 科学可重复性危机，<1/3 研究可重复
- **DeepModeling/AI4S-agent-tools**: 28+ MCP 科学工具
