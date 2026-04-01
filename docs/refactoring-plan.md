# AI4S CLI 重构方案：Agent 编排层设计

> 版本: 1.0 | 日期: 2026-04-01 | 团队: 灵码

---

## 1. 当前问题分析

### 1.1 三大核心机制的实现缺陷

| 机制 | 当前实现 | 核心问题 |
|------|---------|---------|
| **Plan-First** | 4个散装MCP工具（classify_task, generate_plan, validate_plan, review_plan） | 无状态机，调用方需自行编排流程；验证失败后无自动迭代 |
| **Dual-Model Debate** | 3个MCP工具，内部用**单个模型** self-prompt 模拟辩论 | 不是真双模型；辩论状态全靠外部维护；无自动收敛机制 |
| **Finetune** | 6个MCP工具，只**生成YAML配置和命令字符串** | 不执行训练；无GPU监控；无断点续训；无进度推送 |

### 1.2 纯 MCP 工具的局限性

- **MCP 是"能力暴露"而非"流程编排"**：工具调用顺序、条件分支、循环迭代全靠调用方（Claude Code/OpenClaw）
- **Claude Code 不了解 AI4S 工作流**：它不知道 DFT 计算要先分类→生成计划→验证→评审→执行→分析
- **上下文浪费**：每次工具调用都是独立的，状态需要在 prompt 中来回传递

---

## 2. 目标架构

```
┌─────────────────────────────────────────────────────────┐
│              平台适配层 (Platform Adapter)                │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Claude Code  │  │   OpenClaw   │                    │
│  │ MCP + Slash  │  │ Skill+Agent  │                    │
│  └──────┬───────┘  └──────┬───────┘                    │
└─────────┼──────────────────┼────────────────────────────┘
          │                  │
┌─────────┼──────────────────┼────────────────────────────┐
│         │    Agent 编排层 (NEW)                          │
│  ┌──────┴──────────────────┴──────┐                    │
│  │     AI4S Orchestrator          │                    │
│  │  ┌──────────┐ ┌──────────────┐ │                    │
│  │  │Plan-First│ │  Debate      │ │                    │
│  │  │ Engine   │ │  Engine      │ │                    │
│  │  └──────────┘ └──────────────┘ │                    │
│  │  ┌──────────┐ ┌──────────────┐ │                    │
│  │  │Finetune  │ │  Experiment  │ │                    │
│  │  │ Engine   │ │  Engine      │ │                    │
│  │  └──────────┘ └──────────────┘ │                    │
│  └────────────────────────────────┘                    │
│                        │                               │
└────────────────────────┼───────────────────────────────┘
                         │
┌────────────────────────┼───────────────────────────────┐
│              MCP 工具层 (保留)                           │
│  38个工具 — 底层能力，不承担编排职责                       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Plan-First Engine 设计

### 3.1 状态机

```
                    ┌─────────────┐
                    │    IDLE     │
                    └──────┬──────┘
                           │ classify_task()
                           ▼
                    ┌─────────────┐
                    │ CLASSIFIED  │
                    └──────┬──────┘
                           │ generate_plan()
                           ▼
                    ┌─────────────┐
           ┌───────│  PLANNED    │───────┐
           │       └──────┬──────┘       │
           │              │              │
           │              │ validate_plan()
           │              ▼              │
           │       ┌─────────────┐       │
           │       │  VALIDATED  │       │
           │       └──────┬──────┘       │
           │              │              │
           │              │ review_plan()
           │              ▼              │
           │       ┌─────────────┐       │
           │       │  REVIEWED   │       │
           │       └──────┬──────┘       │
           │              │              │
           │         通过？              │
           │        /    \               │
           │      是      否             │
           │      │        │             │
           │      ▼        └──→ ITERATING ──→ 重新generate_plan()
           │  ┌─────────┐     (max 3次)       │
           │  │ APPROVED│ ←──────────────────┘
           │  └─────────┘
           │
           └──→ 超过最大迭代 → 返回最佳计划 + 警告
```

### 3.2 TypeScript 接口

```typescript
// packages/orchestrator/src/engines/plan-engine.ts

enum PlanState {
  IDLE = 'idle',
  CLASSIFIED = 'classified',
  PLANNED = 'planned',
  VALIDATED = 'validated',
  REVIEWED = 'reviewed',
  ITERATING = 'iterating',
  APPROVED = 'approved',
  FAILED = 'failed',
}

interface PlanContext {
  taskDescription: string;
  classification?: TaskClassification;
  plan?: ExecutionPlan;
  validation?: ValidationResult;
  review?: ReviewResult;
  iterationCount: number;
  history: PlanIteration[];
}

interface PlanEngineConfig {
  maxIterations: number;       // 默认 3
  autoValidate: boolean;       // 默认 true
  autoReview: boolean;         // 默认 true
  model: string;               // LLM 模型
}

class PlanEngine {
  private state: PlanState = PlanState.IDLE;
  private context: PlanContext;
  private config: PlanEngineConfig;

  /** 一键执行完整流程：classify → plan → validate → review → iterate */
  async execute(taskDescription: string): Promise<PlanResult>;

  /** 单步执行 */
  async classify(): Promise<TaskClassification>;
  async generate(): Promise<ExecutionPlan>;
  async validate(): Promise<ValidationResult>;
  async review(): Promise<ReviewResult>;
  async iterate(): Promise<PlanResult>;

  /** 查询 */
  getState(): PlanState;
  getContext(): PlanContext;
}
```

### 3.3 LLM Prompt 模板

```typescript
const PROMPTS = {
  classify: `你是一个科学计算任务分类专家。分析以下任务，返回 JSON：
{
  "domain": "计算化学|计算物理|材料科学|生物信息|数据科学|其他",
  "task_type": "模拟计算|模型训练|数据分析|可视化|部署运维",
  "complexity": "low|medium|high",
  "estimated_tools": ["工具1", "工具2"],
  "approach": "推荐方法描述"
}

任务：{task}`,

  generate: `基于以下分类结果，生成结构化执行计划：
分类：{classification}
任务：{task}

返回 JSON 计划，包含：steps[], dependencies[], risks[], validation_criteria[]`,

  review: `作为科学计算专家，评审以下计划的合理性：
任务：{task}
计划：{plan}

检查维度：
1. 方法论合理性（10分）
2. 物理约束满足（10分）
3. 量纲一致性（10分）
4. 验证标准完备性（10分）

返回 JSON：{scores, issues, suggestions, approved: boolean}`
};
```

---

## 4. Debate Engine 设计

### 4.1 真双模型架构

```
┌──────────────┐     论点      ┌──────────────┐
│   Proposer   │ ──────────→  │    Critic    │
│  (模型 A)    │              │   (模型 B)   │
│              │ ←──────────  │              │
└──────────────┘     反驳      └──────────────┘
         │                            │
         │        ┌──────────────┐    │
         └──────→ │    Judge     │ ←──┘
                  │  (模型 C)    │
                  └──────────────┘
                        │
                  收敛判断
                  ┌────┴────┐
                  │         │
              收敛 ✓    达到上限
                  │         │
              输出最终计划  输出+警告
```

### 4.2 TypeScript 接口

```typescript
// packages/orchestrator/src/engines/debate-engine.ts

enum DebateState {
  INIT = 'init',
  PROPOSING = 'proposing',
  CRITIQUING = 'critiquing',
  JUDGING = 'judging',
  CONVERGED = 'converged',
  REACHED_MAX = 'reached_max',
}

interface DebateConfig {
  proposerModel: string;     // 提出者模型
  criticModel: string;       // 批评者模型
  judgeModel: string;        // 评判者模型
  maxRounds: number;         // 默认 5
  convergenceThreshold: number; // 评分差异阈值，默认 1.5
}

interface DebateRound {
  round: number;
  proposerArgument: string;
  criticArgument: string;
  judgeScores: {
    logical_coherence: number;    // 0-10
    evidence_strength: number;    // 0-10
    feasibility: number;          // 0-10
    overall: number;              // 0-10
  };
  modifications: string[];
}

class DebateEngine {
  private state: DebateState = DebateState.INIT;
  private rounds: DebateRound[] = [];
  private config: DebateConfig;

  /** 一键执行完整辩论 */
  async debate(plan: string, taskDescription: string): Promise<DebateResult>;

  /** 单轮执行 */
  async propose(): Promise<string>;
  async critique(proposal: string): Promise<string>;
  async judge(proposal: string, critique: string): Promise<JudgeResult>;

  /** 判断收敛 */
  isConverged(): boolean;
  getRounds(): DebateRound[];
}
```

### 4.3 收敛机制

```typescript
function checkConvergence(rounds: DebateRound[], threshold: number): boolean {
  if (rounds.length < 3) return false;
  const last3 = rounds.slice(-3);
  const scores = last3.map(r => r.judgeScores.overall);
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean(scores), 2), 0) / scores.length;
  return Math.sqrt(variance) < threshold;
}
```

---

## 5. Finetune Engine 设计

### 5.1 真训练执行架构

```
┌─────────────────────────────────────────┐
│           Finetune Engine                │
│                                          │
│  ┌────────────┐  ┌──────────────────┐   │
│  │ Prepare    │  │  LLaMA Factory   │   │
│  │ 数据准备    │→│  训练执行         │   │
│  └────────────┘  │  (真实subprocess)│   │
│                  └────────┬─────────┘   │
│                           │              │
│  ┌────────────┐  ┌────────┴─────────┐   │
│  │ Monitor    │←│  Log Parser      │   │
│  │ 进度监控    │  │  loss/acc 解析   │   │
│  └──────┬─────┘  └──────────────────┘   │
│         │                               │
│  ┌──────┴─────┐  ┌──────────────────┐   │
│  │ GPU Monitor│  │  Callback        │   │
│  │ nvidia-smi │  │  飞书/webhook    │   │
│  └────────────┘  └──────────────────┘   │
│                                          │
│  ┌────────────┐  ┌──────────────────┐   │
│  │ Resume     │  │  Merge           │   │
│  │ 断点续训    │  │  LoRA权重合并    │   │
│  └────────────┘  └──────────────────┘   │
└─────────────────────────────────────────┘
```

### 5.2 TypeScript 接口

```typescript
// packages/orchestrator/src/engines/finetune-engine.ts

interface FinetuneConfig {
  // 训练参数
  modelName: string;
  datasetPath: string;
  method: 'lora' | 'qlora' | 'full';
  hyperparams: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    loraR?: number;
    loraAlpha?: number;
    maxSeqLength?: number;
  };

  // 执行参数
  outputDir: string;
  llamaFactoryPath?: string;  // LLaMA Factory 安装路径
  gpuIds?: number[];          // 指定 GPU

  // 监控参数
  monitorIntervalMs: number;  // 默认 5000
  callbacks?: ProgressCallback[];
}

interface TrainingProgress {
  jobId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentEpoch: number;
  totalEpochs: number;
  currentStep: number;
  totalSteps: number;
  trainLoss: number;
  evalLoss?: number;
  learningRate: number;
  gpuUsage: {
    gpuId: number;
    memoryUsed: number;
    memoryTotal: number;
    utilization: number;
  }[];
  estimatedTimeRemaining: string;
}

type ProgressCallback = (progress: TrainingProgress) => void;

class FinetuneEngine {
  private process?: ChildProcess;
  private config: FinetuneConfig;

  /** 准备数据集 */
  async prepare(dataSource: DataSource, format: string): Promise<DatasetInfo>;

  /** 启动训练（真实执行，不是生成命令） */
  async start(): Promise<TrainingJob>;

  /** 监控训练进度 */
  monitor(jobId: string): AsyncIterable<TrainingProgress>;

  /** 暂停训练 */
  async pause(jobId: string): Promise<void>;

  /** 断点续训 */
  async resume(jobId: string): Promise<TrainingJob>;

  /** 合并 LoRA 权重 */
  async merge(jobId: string, outputPath: string): Promise<MergeResult>;

  /** 评估微调模型 */
  async evaluate(jobId: string, evalDataset: string): Promise<EvalResult>;
}
```

### 5.3 日志解析器

```typescript
class TrainingLogParser {
  /** 解析 LLaMA Factory 训练日志 */
  parse(line: string): LogEntry | null {
    // 匹配: {'loss': 0.234, 'learning_rate': 2e-5, 'epoch': 1.0}
    const match = line.match(/loss['":\s]+([\d.]+)/);
    if (match) {
      return { type: 'progress', loss: parseFloat(match[1]), raw: line };
    }
    // 匹配: {'eval_loss': 0.156}
    const evalMatch = line.match(/eval_loss['":\s]+([\d.]+)/);
    if (evalMatch) {
      return { type: 'eval', evalLoss: parseFloat(evalMatch[1]), raw: line };
    }
    return null;
  }
}
```

---

## 6. Claude Code 插件接入方案

### 6.1 MCP Server 接入（零改造）

```bash
# Claude Code 原生支持 MCP
claude mcp add ai4s -- node /path/to/ai4s-cli/packages/orchestrator/dist/server.js

# 使用
claude> 帮我分析一下这个DFT计算任务
# Claude Code 自动调用 classify_task → generate_plan → ...
```

### 6.2 Agent 编排层接入（Phase 2）

在 Claude Code 中通过 MCP 暴露编排入口：

```typescript
// 新增编排工具
const orchestrationTools = [
  {
    name: 'ai4s_plan_and_execute',
    description: '一键执行 AI4S 完整工作流：任务分类→计划生成→验证→评审→辩论→执行',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string' },
        enable_debate: { type: 'boolean', default: false },
        auto_execute: { type: 'boolean', default: false },
      },
      required: ['task'],
    },
  },
  {
    name: 'ai4s_finetune_run',
    description: '一键执行微调：准备数据→配置→训练→监控→合并',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string' },
        dataset: { type: 'string' },
        method: { type: 'string', enum: ['lora', 'qlora', 'full'] },
      },
      required: ['model', 'dataset'],
    },
  },
];
```

---

## 7. OpenClaw Skill 接入方案

### 7.1 Skill 结构

```
ai4s-skill/
├── SKILL.md                    # 技能定义
├── scripts/
│   ├── gpu_monitor.py          # GPU 监控脚本
│   └── experiment_watchdog.sh  # 实验看门狗
└── templates/
    └── plan_template.md        # 计划模板
```

### 7.2 SKILL.md 示例

```markdown
# AI4S Skill

## 描述
AI for Science 科学计算增强插件。提供 Plan-First、Debate、Finetune 三大核心机制。

## 使用方式
当用户提出科学计算相关任务时：
1. 调用 ai4s_plan_and_execute 执行完整工作流
2. 复杂任务启用 debate 模式
3. 微调任务使用 ai4s_finetune_run

## 可用工具
- ai4s_plan_and_execute: 完整工作流
- ai4s_classify_task: 任务分类
- ai4s_generate_plan: 生成计划
- ai4s_validate_plan: 验证计划
- ai4s_review_plan: 评审计划
- ai4s_debate: 双模型辩论
- ai4s_finetune_run: 微调执行
```

### 7.3 子Agent编排

通过 OpenClaw 的 `sessions_spawn` 启动独立子Agent执行长时间任务（训练、实验），避免阻塞主会话。

---

## 8. 实现路线图

### Phase 1: 工具调用优化插件（MVP）⚡ 1-2周

**目标**：作为 Claude Code MCP 插件发布，聚焦工具调用专项优化

| 功能 | 优先级 | 说明 |
|------|--------|------|
| MCP Server 接入 | P0 | 零改造，`claude mcp add` 即用 |
| Plan-First 状态机 | P0 | 自动编排分类→生成→验证→评审 |
| 参数智能补全 | P1 | 根据环境自动推断隐式参数 |
| 量纲检查增强 | P1 | 真正的物理量纲验证 |
| 环境快照 | P1 | 实验环境自动记录 |

### Phase 2: Agent 编排层 🔧 2-4周

| 功能 | 优先级 | 说明 |
|------|--------|------|
| Debate Engine | P0 | 真双模型辩论 + 自动收敛 |
| Finetune Engine | P0 | 真训练执行 + GPU监控 |
| Experiment Engine | P1 | 实验全生命周期管理 |
| 进度推送 | P1 | 飞书/webhook 回调 |

### Phase 3: 平台深度集成 🚀 4-8周

| 功能 | 优先级 | 说明 |
|------|--------|------|
| OpenClaw Skill | P0 | 完整 Skill + Cron + 子Agent |
| Claude Code Extension | P1 | Slash 命令 + UI 面板 |
| 知识库集成 | P1 | 自动沉淀实验记录 |
| 多模型调度 | P2 | 根据任务自动选择最优模型 |

---

## 附录：文件结构

```
packages/orchestrator/src/
├── server.ts                     # MCP Server 入口（保留）
├── tools/                        # MCP 工具层（保留）
│   ├── index.ts
│   ├── plan-first/
│   ├── debate/
│   ├── finetune/
│   └── ...
├── engines/                      # Agent 编排层（新增）⭐
│   ├── plan-engine.ts            # Plan-First 状态机
│   ├── debate-engine.ts          # 双模型辩论引擎
│   ├── finetune-engine.ts        # 微调执行引擎
│   ├── orchestrator.ts           # 总编排器
│   ├── llm-client.ts             # 统一 LLM 调用客户端
│   └── types.ts                  # 共享类型定义
├── services/                     # 服务层（保留+增强）
│   ├── constraints/
│   └── ...
└── utils/                        # 工具函数（保留）
```
