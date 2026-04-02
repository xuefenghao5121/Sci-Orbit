/**
 * Sci-Orbit OpenClaw Plugin — 科学计算智能助手
 *
 * 将 MCP Server 工具适配为 OpenClaw 原生插件，
 * 提供环境检测、参数补全、数据摘要等科学计算辅助能力。
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { registerEnvTools } from "./tools/env.js";
import { registerParamTools } from "./tools/param.js";
import { registerDataTools } from "./tools/data.js";

const SYSTEM_CONTEXT = `
## Sci-Orbit — 科学计算智能助手

你拥有以下科学计算辅助工具：

### 环境智能
- **env_snapshot**: 采集完整环境快照（GPU、CUDA、编译器、MPI、Python、科学包），支持 json/conda/dockerfile 导出
- **env_diff**: 对比两个环境快照，识别影响可复现性的差异

### 参数智能
- **param_complete**: 自动补全 VASP/LAMMPS/ABACUS 的隐式参数（从环境+任务上下文推断）
- **param_validate**: 验证科学计算参数有效性
- **param_list_templates**: 列出所有支持的参数模板
- **param_generate_incar**: 从参数生成 VASP INCAR 文件
- **param_generate_abacus_input**: 从参数生成 ABACUS INPUT 文件

### 数据智能
- **data_summarize**: 将科学数据文件（POSCAR/CIF/OUTCAR/XYZ/ABACUS log/JSON/YAML）摘要为 LLM 可读文本
- **data_summarize_dir**: 摘要目录中所有识别到的科学文件
- **data_supported_formats**: 列出支持的科学数据格式

### 使用建议
- 启动科学计算任务前，先用 env_snapshot 检测环境
- 使用 param_complete 补全隐式参数，避免遗漏关键设置
- 读取科学数据文件时用 data_summarize 代替直接 cat
`.trim();

const plugin = {
  id: "sci-orbit",
  name: "Sci-Orbit",
  description: "Scientific computing intelligence plugin (env detection, param completion, data summarization)",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    // 注册工具
    registerEnvTools(api);
    registerParamTools(api);
    registerDataTools(api);

    // 注入系统上下文
    api.on("before_prompt_build", () => ({
      appendSystemContext: SYSTEM_CONTEXT,
    }));

    // Hook: agent_end — 实验结果通知
    api.on("agent_end", (event, ctx) => {
      if (event.success && event.durationMs && event.durationMs > 60_000) {
        api.logger.info(
          `[Sci-Orbit] Agent run completed in ${(event.durationMs / 1000).toFixed(1)}s`
        );
      }
    });
  },
};

export default plugin;
