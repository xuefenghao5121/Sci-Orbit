# 📚 API 参考

## MCP 工具完整 Schema

### Plan-First 工作流（4个工具）

#### `classify_task`

分类科学任务的领域、类型和复杂度。

**输入：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_description` | string | ✅ | 用户的科学任务描述 |

**输出：**
```json
{
  "domain": "fluid_dynamics | materials_science | molecular_dynamics | quantum_chemistry | bioinformatics | astronomy | earth_science | general",
  "task_type": "paper_reproduction | new_method | data_analysis | visualization | modeling | optimization | other",
  "complexity": "simple | medium | complex",
  "recommended_approach": "numerical_simulation | machine_learning | symbolic_computation | hybrid",
  "estimated_duration": "hours | days | weeks"
}
```

#### `generate_plan`

为科学任务生成结构化分析计划。

**输入：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_description` | string | ✅ | 任务描述 |
| `classification` | object | ✅ | classify_task 的输出 |
| `constraints` | string[] | ❌ | 约束条件列表 |

**输出：** 包含 phases（阶段）、steps（步骤）、expected_results（预期结果）的计划对象。

#### `validate_plan`

验证计划的结构完整性。

**输入：** plan 对象

**输出：** `{ valid: boolean, issues: string[], suggestions: string[] }`

#### `review_plan`

科学性审查计划。

**输出：** `{ method_rationality: object, physical_constraints: object, dimensional_consistency: object, validation_criteria: object }`

---

### 辩论系统（3个工具）

#### `debate_submit`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `plan` | string | ✅ | 待辩论的计划 |
| `task_description` | string | ✅ | 原始任务描述 |

#### `debate_round`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `debate_id` | string | ✅ | 辩论 ID |
| `role` | string | ✅ | `proposer` 或 `critic` |
| `argument` | string | ✅ | 论点 |

#### `debate_resolve`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `debate_id` | string | ✅ | 辩论 ID |
| `rounds` | object[] | ✅ | 所有辩论轮次 |

---

### 论文工具（3个工具）

#### `paper_parse`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | string | ❌ | 论文文本内容 |
| `file_path` | string | ❌ | 论文文件路径 |

**输出：** `{ title, authors, abstract, sections[], key_findings[], methods[], formulas[] }`

#### `paper_compare`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `papers` | object[] | ✅ | 已解析的论文数组 |

**输出：** `{ comparison_table[], similarities[], differences[], insights[] }`

#### `paper_implement`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `paper` | object | ✅ | 已解析的论文 |
| `target_framework` | string | ✅ | `pytorch` / `jax` / `numpy` |

---

### 实验管理（4个工具）

#### `exp_plan`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task` | string | ✅ | 实验任务 |
| `paper` | object | ❌ | 关联的解析论文 |
| `resources` | object | ❌ | `{ gpu, cpu_cores, ram_gb, time_limit_hours }` |

**输出：** `{ experiment_id, task, phases[], configs[], expected_results[], resource_requirements }`

#### `exp_run`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `experiment_plan` | object | ✅ | 实验计划 |
| `config_overrides` | object | ❌ | 配置覆盖 |

#### `exp_monitor`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `experiment_id` | string | ✅ | 实验 ID |
| `log_file` | string | ❌ | 日志文件路径 |

#### `exp_compare`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `results` | object[] | ✅ | `{ config, metrics }[]` |

---

### 环境管理（2个工具）

#### `env_detect`

无输入参数。

**输出：** `{ os, cpu, gpu, ram, python, cuda, packages[] }`

#### `env_setup`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `requirements` | string[] | ✅ | 依赖列表 |
| `target` | string | ✅ | `conda` / `docker` |
| `name` | string | ❌ | 环境名称 |

---

### 知识库（5个工具）

#### `kb_create`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 知识库名称 |
| `domain` | string | ✅ | 领域 |
| `description` | string | ❌ | 描述 |

#### `kb_add`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `kb_id` | string | ✅ | 知识库 ID |
| `title` | string | ✅ | 条目标题 |
| `content` | string | ✅ | 条目内容 |
| `tags` | string[] | ❌ | 标签 |
| `source` | string | ❌ | 来源 |

#### `kb_search`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `kb_id` | string | ✅ | 知识库 ID |
| `query` | string | ✅ | 搜索查询 |
| `limit` | number | ❌ | 结果数量（默认 5） |

#### `kb_update`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `kb_id` | string | ✅ | 知识库 ID |
| `entry_id` | string | ✅ | 条目 ID |
| `title` | string | ❌ | 新标题 |
| `content` | string | ❌ | 新内容 |
| `tags` | string[] | ❌ | 新标签 |

#### `kb_export`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `kb_id` | string | ✅ | 知识库 ID |
| `format` | string | ❌ | `jsonl` / `csv` / `finetune` |

---

### 微调（6个工具）

#### `finetune_prepare`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data_source` | object | ✅ | `{ type, path }` |
| `format` | string | ❌ | `alpaca` / `sharegpt` / `custom` |
| `output_dir` | string | ❌ | 输出目录 |

#### `finetune_start`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model_name` | string | ✅ | 基础模型名 |
| `dataset_path` | string | ✅ | 数据集路径 |
| `method` | string | ❌ | `lora` / `qlora` / `full` |
| `hyperparams` | object | ❌ | 超参数 |
| `output_dir` | string | ❌ | 输出目录 |

#### `finetune_monitor`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `job_id` | string | ✅ | 训练任务 ID |

#### `finetune_resume`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `job_id` | string | ✅ | 任务 ID |
| `checkpoint` | string | ❌ | 检查点路径 |

#### `finetune_merge`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `base_model` | string | ✅ | 基础模型 |
| `adapter_path` | string | ✅ | LoRA 适配器路径 |
| `output_dir` | string | ❌ | 输出目录 |

#### `finetune_evaluate`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model_path` | string | ✅ | 模型路径 |
| `test_data` | string | ❌ | 测试数据路径 |
| `metrics` | string[] | ❌ | 评估指标 |

---

### 科学计算（4个工具）

#### `science_pyscf`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `calculation_type` | string | ✅ | `scf` / `opt` / `freq` |
| `molecule` | object | ✅ | `{ format, value }` |
| `basis_set` | string | ❌ | 基组（默认 `6-31G*`） |
| `charge` | number | ❌ | 电荷 |
| `spin` | number | ❌ | 自旋多重度 |
| `functional` | string | ❌ | DFT 泛函 |

#### `science_rdkit`

分子描述符、指纹、3D 坐标、相似性分析。

#### `science_openmm`

分子动力学模拟（力场、积分器、模拟参数）。

#### `science_jupyter`

Notebook 创建、运行、导出。

---

### 推理部署（3个工具）

#### `infer_start`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `backend` | string | ❌ | `vllm` / `ollama` / `llama.cpp` |
| `model_path` | string | ✅ | 模型路径 |
| `gpu_id` | number | ❌ | GPU 设备 ID |

#### `infer_test`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `endpoint` | string | ✅ | 推理服务地址 |
| `test_prompts` | string[] | ❌ | 测试提示词 |

#### `infer_stop`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `service_id` | string | ✅ | 服务 ID |

---

### 约束检查（4个工具）

#### `check_dimension`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `equation` | string | ✅ | 物理方程 |
| `variables` | object | ✅ | 变量到量纲的映射 |

#### `check_conservation`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data` | object | ✅ | 模拟结果数据 |
| `law` | string | ✅ | 守恒定律类型 |

#### `check_range`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `values` | object | ✅ | 待检查的物理量 |
| `constraints` | object | ❌ | 范围约束 |

#### `check_code`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | ✅ | 待检查代码 |
| `language` | string | ❌ | 编程语言 |

---

## MCP Resources

| URI | 方法 | 说明 |
|-----|------|------|
| `ai4s://status` | GET | 系统状态概览 |
| `ai4s://experiments/{id}` | GET | 实验详情 |
| `ai4s://experiments/{id}/logs` | GET | 实验日志 |
| `ai4s://inference/status` | GET | 推理服务状态 |
| `ai4s://knowledge/{id}` | GET | 知识库内容 |
| `ai4s://papers/{id}` | GET | 论文笔记 |

## 服务层 API

服务层通过依赖注入方式提供给工具使用：

| 服务 | 模块 | 说明 |
|------|------|------|
| `ConfigService` | `services/config.ts` | 配置管理 |
| `StorageService` | `services/storage.ts` | 文件存储 |
| `LLMClient` | `services/llm-client.ts` | LLM API 客户端 |
| `PaperParser` | `services/paper-parser.ts` | 论文解析 |
| `ExperimentManager` | `services/experiment-manager.ts` | 实验管理 |
| `KnowledgeManager` | `services/knowledge-manager.ts` | 知识库管理 |
| `EnvironmentDetector` | `services/environment-detector.ts` | 环境检测 |
| `ConstraintEngine` | `services/constraints/engine.ts` | 约束引擎 |
| `TrainingManager` | `services/finetune/training-manager.ts` | 微调管理 |
| `HpcManager` | `services/hpc/index.ts` | HPC 作业管理 |
| `InferenceServerManager` | `services/inference/server-manager.ts` | 推理服务管理 |
| `FeedbackCollector` | `services/feedback/collector.ts` | 反馈收集 |
