# AI4S CLI — AI for Science Claude Code Extension

> 灵码：为 Claude Code 提供科学计算任务规划与编排能力的 MCP Server + CLI 工具

## 🏗️ 架构

```
ai4s-cli/
├── packages/
│   ├── orchestrator/    # MCP Server — 4 个 Plan-First 工具
│   └── cli/             # 安装/卸载 CLI
├── skills/              # Claude Code Skills
│   ├── ai4s-plan/       # /ai4s-plan 命令
│   └── ai4s-status/     # /ai4s-status 命令
├── agents/              # Claude Code Agents
│   ├── ai4s-planner.md
│   └── ai4s-reviewer.md
└── templates/           # Claude Code 配置模板
    ├── system-prompt.md
    ├── hooks.json
    └── INSTALL_MANIFEST.json
```

## 🔧 Plan-First 工具

| 工具 | 功能 |
|------|------|
| `classify_task` | 分类科学任务（领域、类型、复杂度） |
| `generate_plan` | 生成结构化分析计划 |
| `validate_plan` | 验证计划结构完整性 |
| `review_plan` | 科学审查（方法合理性、物理约束、量纲一致性） |

## 📦 安装

```bash
cd ai4s-cli
npm install
npm run build -w packages/orchestrator
npm run build -w packages/cli
npm link -w packages/cli
ai4s install
```

## 🚀 使用

安装后在 Claude Code 中：

```
/ai4s-plan 训练一个 Transformer 模型用于命名实体识别
```

Claude Code 会自动：
1. 调用 `classify_task` 分类任务
2. 调用 `generate_plan` 生成计划
3. 调用 `validate_plan` 验证结构
4. 调用 `review_plan` 科学审查

## 🔨 开发

```bash
# 构建
npm run build -w packages/orchestrator

# 测试
cd packages/orchestrator && npx vitest run

# E2E 测试
cd packages/orchestrator && npx vitest run src/__tests__/e2e.test.ts
```

## 📄 License

MIT
