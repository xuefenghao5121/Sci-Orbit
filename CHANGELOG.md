# Changelog

All notable changes to Sci-Orbit will be documented in this file.

## [0.5.0] - 2026-04-01

### ⚠️ Breaking Change — 工具精简 (38 → 17)

从 38 个 MCP 工具精简到 **17 个核心工具**，淘汰 Claude Code 已具备的能力。

**原则**：只保留 Claude Code 做不到的领域特定能力。

#### Removed (21 tools — Claude Code 已具备)
- `classify_task`, `generate_plan`, `validate_plan`, `review_plan` — Claude 天然擅长
- `paper_parse`, `paper_compare`, `paper_implement` — Claude 能直接读论文
- `exp_plan`, `exp_run`, `exp_monitor`, `exp_compare` — Claude 写脚本/读日志
- `kb_create`, `kb_add`, `kb_search`, `kb_update` — Claude 管理文件
- `finetune_start`, `finetune_monitor`, `finetune_resume`, `finetune_merge`, `finetune_evaluate`
- `infer_start`, `infer_test`, `infer_stop` — Claude 跑 shell 命令
- `check_code` — Claude 代码审查
- `env_detect`, `env_setup` — 被 env_snapshot 替代
- `science_jupyter` — Claude 操作 .ipynb
- `debate_submit`, `debate_round`, `debate_resolve` — Phase 2 重构

#### Added (12 new tools)
- 🌍 `env_snapshot` / `env_diff` — 环境采集 + 对比
- 🔧 `param_complete` / `param_validate` / `param_list_templates` / `param_generate_incar` / `param_generate_abacus_input`
- 📊 `data_summarize` / `data_summarize_dir` / `data_supported_formats`
- 📦 `finetune_prepare` / `kb_export`

#### Retained (5 tools)
- ⚖️ `check_dimension` / `check_conservation` / `check_range`
- 🔬 `science_pyscf` / `science_rdkit` / `science_openmm`

#### Infrastructure
- 项目更名为 **Sci-Orbit**
- GitHub: https://github.com/xuefenghao5121/Sci-Orbit
- 新增 `docs/tool-audit.md`, `docs/tool-calling-research.md`, `docs/refactoring-plan.md`

## [0.4.0] - 2026-03-31

### Phase 4 — 生产化

### Added
- **安全层**: 输入校验（validator）、命令净化（sanitizer）、速率限制（rate-limiter）
- **完整文档体系**: 快速开始、用户指南、配置参考、开发者指南、API 参考
- **5 个端到端示例项目**: 论文复现、流体模拟、模型微调、HPC 部署、知识积累
- **一键安装/卸载**: `npx @ai4s/cli init` / `npx @ai4s/cli uninstall`
- **反馈收集系统**: FeedbackCollector 服务
- **MCP Inspector 支持**: 便于调试工具
- **MIT 许可证**

### Improved
- 约束引擎支持物理/化学/数值/代码四类规则
- 知识库导出支持 finetune 格式
- HPC 适配器支持 SLURM 模板自定义

## [0.3.0] - 2026-03-28

### Phase 3 — 离线微调 + HPC

### Added
- **微调流水线**: prepare → start → monitor → resume → merge → evaluate
- **LoRA/QLoRA/Full** 三种微调方法
- **HPC 多后端**: local-adapter、slurm-adapter、k8s-adapter
- **推理服务部署**: vLLM、Ollama、llama.cpp
- **TrainingManager** 服务：训练任务注册、监控、恢复
- **InferenceServerManager** 服务

## [0.2.0] - 2026-03-25

### Phase 2 — 核心功能

### Added
- **辩论系统**: debate_submit、debate_round、debate_resolve
- **领域知识库**: kb_create、kb_add、kb_search、kb_update、kb_export
- **科学计算集成**: PySCF、OpenMM、RDKit、Jupyter
- **约束检查引擎**: check_dimension、check_conservation、check_range、check_code
- **KnowledgeManager** 服务
- **ConstraintEngine** 服务
- **MCP Resources**: 6 个资源 URI

## [0.1.0] - 2026-03-22

### Phase 1 — MVP

### Added
- **Plan-First 工作流**: classify_task、generate_plan、validate_plan、review_plan
- **论文工具**: paper_parse、paper_compare、paper_implement
- **实验管理**: exp_plan、exp_run、exp_monitor、exp_compare
- **环境管理**: env_detect、env_setup
- **MCP Server** 基于 @modelcontextprotocol/sdk
- **LLM 客户端**: 支持阿里云 DashScope 兼容 API
- **5 个 Claude Code Agent**: Planner、Executor、Reviewer、Scientist、Deployer
- **16 个 Claude Code Skill**
