# Sci-Orbit MCP 工具分类分析：保留 vs 淘汰

> 核心原则：**我们是 Claude Code 的补充，不重复它已有的能力**

---

## Claude Code 已具备的能力（应淘汰/精简）

| 工具 | Claude Code 能力 | 判断 | 理由 |
|------|-----------------|------|------|
| `classify_task` | ✅ 强 | **淘汰** | Claude 天然擅长任务分类和理解 |
| `generate_plan` | ✅ 强 | **淘汰** | Claude 擅长生成分步计划 |
| `validate_plan` | ⚠️ 中 | **降级** | 结构检查有价值，但 Claude 自己也能做 |
| `review_plan` | ✅ 强 | **淘汰** | Claude 擅长审查计划的科学性 |
| `paper_parse` | ✅ 强 | **淘汰** | Claude 能直接读 PDF/网页提取信息 |
| `paper_compare` | ✅ 强 | **淘汰** | Claude 擅长对比分析 |
| `paper_implement` | ✅ 强 | **淘汰** | Claude 擅长从论文生成代码 |
| `exp_plan` | ✅ 强 | **淘汰** | 同 generate_plan |
| `exp_run` | ⚠️ 中 | **淘汰** | 生成脚本 = Claude 写 shell/python，已有能力 |
| `exp_monitor` | ⚠️ 中 | **淘汰** | 读日志文件 = Claude 读文件 |
| `exp_compare` | ✅ 强 | **淘汰** | Claude 擅长对比分析 |
| `kb_create/add/search/update` | ✅ 强 | **淘汰** | Claude Code 本身就能管理文件/知识，Claude 擅长文本搜索 |
| `kb_export` | ⚠️ 中 | **保留** | 转换为微调数据格式（alpaca/sharegpt）有实际价值 |
| `finetune_prepare` | ⚠️ 中 | **保留** | 数据格式转换和清洗有实际价值 |
| `finetune_start` | ❌ 弱 | **淘汰** | 只生成 YAML 配置，不执行，Claude 自己能写 YAML |
| `finetune_monitor` | ⚠️ 中 | **淘汰** | 读训练日志 = Claude 读文件 |
| `finetune_resume` | ❌ 弱 | **淘汰** | 当前只是生成命令 |
| `finetune_merge` | ❌ 弱 | **淘汰** | 当前只是生成命令 |
| `finetune_evaluate` | ❌ 弱 | **淘汰** | 当前只是占位 |
| `science_jupyter` | ✅ 强 | **淘汰** | Claude 能直接操作 .ipynb 文件 |
| `infer_start` | ⚠️ 中 | **淘汰** | 启动服务 = Claude 跑 shell 命令 |
| `infer_test` | ⚠️ 中 | **淘汰** | 发送请求 = Claude 跑 curl |
| `infer_stop` | ⚠️ 中 | **淘汰** | 停止服务 = Claude 跑 kill |
| `check_code` | ✅ 强 | **淘汰** | Claude 擅长代码审查 |
| `env_detect` | ⚠️ 中 | **淘汰** | 被新 env_snapshot 完全覆盖 |
| `env_setup` | ⚠️ 中 | **淘汰** | 生成 environment.yml = Claude 写文件 |

---

## Claude Code 不具备的能力（应保留 + 强化）

### 🟢 真正差异化（Claude 做不到或做不好）

| 工具 | Claude Code 能力 | 差异化价值 | 行动 |
|------|-----------------|-----------|------|
| `env_snapshot` | ❌ 无 | **一次调用全采集+结构化+可导出** | ✅ 保留，已实现 |
| `env_diff` | ❌ 无 | **环境差异对比+风险评估** | ✅ 保留，已实现 |
| `param_complete` | ❌ 无 | **VASP/LAMMPS/ABACUS 隐式参数推断** | ✅ 保留，已实现 |
| `param_validate` | ❌ 无 | **参数约束检查（ismear/sigma 等）** | ✅ 保留，已实现 |
| `param_generate_incar` | ❌ 无 | **生成标准 INCAR 文件** | ✅ 保留，已实现 |
| `param_generate_abacus_input` | ❌ 无 | **生成标准 ABACUS INPUT** | ✅ 保留，已实现 |
| `data_summarize` | ⚠️ 弱 | **POSCAR/CIF/OUTCAR 物理量提取** | ✅ 保留，已实现 |
| `check_dimension` | ❌ 无 | **物理量纲一致性检查** | ✅ 保留，已有 |
| `check_conservation` | ❌ 无 | **守恒定律验证（质量/能量/动量）** | ✅ 保留，已有 |
| `check_range` | ❌ 无 | **物理量范围合理性检查** | ✅ 保留，已有 |
| `science_pyscf` | ❌ 无 | **量子化学计算执行** | ✅ 保留，已有 |
| `science_rdkit` | ❌ 无 | **分子分析执行** | ✅ 保留，已有 |
| `science_openmm` | ❌ 无 | **分子动力学执行** | ✅ 保留，已有 |

### 🟡 包装价值（省轮次，但 Claude 也能做到）

| 工具 | 行动 | 理由 |
|------|------|------|
| `param_list_templates` | ✅ 保留 | 低成本，信息查询 |
| `data_summarize_dir` | ✅ 保留 | 批量操作，省 token |
| `data_supported_formats` | ✅ 保留 | 低成本，信息查询 |
| `kb_export` | ⚠️ 可选 | 转换为 alpaca/sharegpt 格式有实际价值 |
| `finetune_prepare` | ⚠️ 可选 | 数据清洗有实际价值 |

---

## 精简后的工具清单（推荐 Sci-Orbit v0.5.0）

从 48 个 → **20 个核心工具**，全部是 Claude Code 做不到的：

### 环境智能 (3)
- `env_snapshot` — 全量环境采集 + 导出
- `env_diff` — 环境差异对比 + 风险评估

### 参数智能 (4)
- `param_complete` — 隐式参数推断
- `param_validate` — 参数约束检查
- `param_generate_incar` — VASP INCAR 生成
- `param_generate_abacus_input` — ABACUS INPUT 生成

### 数据智能 (3)
- `data_summarize` — 科学数据格式摘要
- `data_summarize_dir` — 批量摘要
- `data_supported_formats` — 支持格式列表

### 物理约束 (3)
- `check_dimension` — 量纲一致性
- `check_conservation` — 守恒定律
- `check_range` — 物理量范围

### 科学计算 (3)
- `science_pyscf` — 量子化学
- `science_rdkit` — 分子分析
- `science_openmm` — 分子动力学

### 微调支持 (2) — 待强化
- `finetune_prepare` — 数据准备（保留，后续加强为真执行）
- `kb_export` — 导出训练数据

### Plan-First (2) — Phase 2 重构
- `plan_submit` — 提交任务到状态机（新设计）
- `plan_status` — 查询计划状态（新设计）

---

## 淘汰清单（26 个）

| 工具 | 原因 |
|------|------|
| `classify_task` | Claude 擅长 |
| `generate_plan` | Claude 擅长 |
| `validate_plan` | Claude 擅长 |
| `review_plan` | Claude 擅长 |
| `paper_parse` | Claude 擅长 |
| `paper_compare` | Claude 擅长 |
| `paper_implement` | Claude 擅长 |
| `exp_plan` | Claude 擅长 |
| `exp_run` | Claude 写脚本 |
| `exp_monitor` | Claude 读日志 |
| `exp_compare` | Claude 擅长 |
| `kb_create` | Claude 管理文件 |
| `kb_add` | Claude 管理文件 |
| `kb_search` | Claude 搜索文本 |
| `kb_update` | Claude 编辑文件 |
| `finetune_start` | 只生成 YAML |
| `finetune_monitor` | Claude 读日志 |
| `finetune_resume` | 只生成命令 |
| `finetune_merge` | 只生成命令 |
| `finetune_evaluate` | 占位符 |
| `science_jupyter` | Claude 操作 .ipynb |
| `infer_start` | Claude 跑命令 |
| `infer_test` | Claude 跑 curl |
| `infer_stop` | Claude 跑 kill |
| `check_code` | Claude 审查代码 |
| `env_detect` | 被 env_snapshot 替代 |
| `env_setup` | Claude 写文件 |

---

## 重构建议

1. **立即执行**：从 `tools/index.ts` 中移除淘汰工具的注册
2. **保留源码**：不删除文件，只是不注册为 MCP 工具（向后兼容）
3. **更新 README**：只展示 20 个核心工具
4. **后续强化**：
   - 参数模板：扩展到 GPAW、CP2K、Quantum ESPRESSO
   - 物理约束：加入更多守恒定律和范围规则
   - Plan-First：设计状态机替代被淘汰的 4 个 plan 工具
