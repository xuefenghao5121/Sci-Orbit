# 🛠️ 开发者指南

## 项目结构

```
ai4s-cli/
├── packages/
│   ├── cli/                    # CLI 工具（init/uninstall）
│   │   └── src/
│   │       ├── index.ts        # CLI 入口
│   │       ├── install.ts      # 安装逻辑
│   │       └── uninstall.ts    # 卸载逻辑
│   └── orchestrator/           # MCP Server 核心
│       └── src/
│           ├── server.ts       # MCP Server 启动
│           ├── tools/          # MCP 工具实现
│           │   ├── plan-first/ # Plan-First 工作流（4个工具）
│           │   ├── debate/     # 辩论系统（3个工具）
│           │   ├── paper/      # 论文工具（3个工具）
│           │   ├── experiment/ # 实验管理（4个工具）
│           │   ├── env/        # 环境管理（2个工具）
│           │   ├── knowledge/  # 知识库（5个工具）
│           │   ├── finetune/   # 微调（6个工具）
│           │   ├── science/    # 科学计算（4个工具）
│           │   ├── deploy/     # 推理部署（3个工具）
│           │   └── constrain/  # 约束检查（4个工具）
│           ├── resources/      # MCP Resources
│           ├── services/       # 服务层
│           │   ├── config.ts
│           │   ├── storage.ts
│           │   ├── llm-client.ts
│           │   ├── paper-parser.ts
│           │   ├── experiment-manager.ts
│           │   ├── knowledge-manager.ts
│           │   ├── environment-detector.ts
│           │   ├── constraints/    # 约束引擎
│           │   ├── finetune/       # 微调服务
│           │   ├── hpc/            # HPC 适配器
│           │   ├── inference/      # 推理服务
│           │   └── feedback/       # 反馈收集
│           ├── security/       # 安全层
│           └── utils/          # 工具函数
├── agents/                     # Claude Code Agent 定义
├── skills/                     # Claude Code Skill 定义（16个）
├── templates/                  # 安装模板
│   ├── INSTALL_MANIFEST.json
│   ├── hooks.json
│   └── system-prompt.md
└── docs/                       # 文档
```

## 添加新工具

以添加 `weather_check` 工具为例：

### 1. 创建 Schema

```typescript
// src/tools/weather/schemas.ts
import { z } from 'zod';

export const weatherCheckInput = z.object({
  location: z.string().describe('Location name'),
  units: z.enum(['celsius', 'fahrenheit']).optional(),
});
export type WeatherCheckInput = z.infer<typeof weatherCheckInput>;

export const weatherCheckOutput = z.object({
  temperature: z.number(),
  humidity: z.number(),
  conditions: z.string(),
});
```

### 2. 实现处理函数

```typescript
// src/tools/weather/handler.ts
export function weatherCheck(input: WeatherCheckInput) {
  // 实现逻辑
  return { temperature: 25, humidity: 60, conditions: 'sunny' };
}
```

### 3. 注册到 MCP

```typescript
// src/tools/weather/index.ts
import { Tool } from '../../types.js';
import { weatherCheck } from './handler.js';

export const weatherTools: Tool[] = [
  {
    name: 'weather_check',
    description: 'Check weather conditions for a location',
    inputSchema: { type: 'object', properties: { location: { type: 'string' } }, required: ['location'] },
    handler: (input) => Promise.resolve(weatherCheck(input)),
  },
];
```

### 4. 注册到总入口

```typescript
// src/tools/index.ts — 添加到 allTools 数组
import { weatherTools } from './weather/index.js';
// ... spread into allTools
```

## 添加新 Skill

在 `skills/` 目录下创建：

```
skills/weather/
├── SKILL.md        # Skill 定义（触发条件、指令）
└── references/     # 参考文件（可选）
```

**SKILL.md 模板：**

```markdown
---
name: ai4s-weather
description: 天气数据查询与分析。当用户询问天气条件、气温、湿度时触发。
---

# Weather Skill

## 使用场景
- 查询实验地点的天气条件
- 检查环境温湿度是否影响实验

## 工具调用
使用 `weather_check` MCP 工具获取天气数据。

## 示例
> 查询北京的天气
> → 调用 weather_check(location="Beijing")
```

## 添加新 Agent

在 `agents/` 目录下创建 Markdown 文件：

```markdown
# ai4s-weather-agent

你是一个天气分析专家。...

## 工具
- weather_check

## 工作流程
1. 解析用户查询中的地点
2. 调用 weather_check 获取数据
3. 结合科学任务上下文给出建议
```

## 添加新服务

```typescript
// src/services/weather/index.ts
export class WeatherService {
  constructor(private config: ConfigService) {}

  async getWeather(location: string) { /* ... */ }
}

// src/services/index.ts — 导出
export { WeatherService } from './weather/index.js';
```

## 测试指南

```bash
# 运行所有测试
cd packages/orchestrator && npm test

# 运行特定模块测试
npx jest src/tools/weather/__tests__/

# 运行 E2E 测试
npx jest src/__tests__/e2e.test.ts

# 查看覆盖率
npx jest --coverage
```

### 测试文件结构

```
src/tools/weather/__tests__/
└── weather.test.ts
```

## 调试技巧

### 1. MCP Server 调试

```bash
# 直接运行 MCP Server（stdio 模式）
node packages/orchestrator/dist/server.js

# 使用 MCP Inspector 调试
npx @modelcontextprotocol/inspector node packages/orchestrator/dist/server.js
```

### 2. 日志

设置日志级别：
```bash
export AI4S_LOG_LEVEL=debug
```

### 3. LLM 调用调试

```bash
export AI4S_LLM_LOG_REQUESTS=true
```
