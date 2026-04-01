import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Sci-Orbit v0.5.0 — 精简工具注册
 * 
 * 原则：只保留 Claude Code 不具备的能力
 * 淘汰：plan-first(4), debate(3), paper(3), experiment(4), 
 *        knowledge(4), finetune(4), deploy(3), check_code(1),
 *        env_detect/setup(2), science_jupyter(1) = 29 个
 * 保留：env_snapshot(2), param(4), data_summary(3), 
 *        constrain物理(3), science计算(3), finetune准备(2) = 17 个
 */
const TOOL_LOADERS: Array<() => Promise<import("./tool-registry.js").ToolDefinition[]>> = [
  // 🌍 环境智能 — Claude Code 无法一次采集全量环境信息
  () => import("./env/index.js").then((m) => m.envSnapshotTools),
  // 🔧 参数智能 — Claude Code 不知道 VASP/LAMMPS/ABACUS 的隐式参数
  () => import("./param-complete/index.js").then((m) => m.paramCompleteTools),
  // 📊 数据智能 — Claude Code 无法理解 POSCAR/CIF/OUTCAR 等科学格式
  () => import("./data-summary/index.js").then((m) => m.dataSummaryTools),
  // ⚖️ 物理约束 — Claude Code 无法做量纲/守恒/范围检查
  () => import("./constrain/index.js").then((m) => m.constrainPhysicsTools),
  // 🔬 科学计算 — Claude Code 无法执行 PySCF/RDKit/OpenMM
  () => import("./science/index.js").then((m) => m.scienceComputeTools),
  // 📦 微调支持 — 数据准备和格式转换
  () => import("./finetune/index.js").then((m) => m.finetuneDataTools),
];

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: unknown) => Promise<unknown>;
}

// Cache for loaded tool modules
let loadedTools: ToolDefinition[] | null = null;

async function loadAllTools(): Promise<ToolDefinition[]> {
  if (loadedTools) return loadedTools;
  const results = await Promise.all(TOOL_LOADERS.map((loader) => loader()));
  loadedTools = results.flat();
  return loadedTools;
}

/**
 * Convert JSON Schema property to Zod type with full feature support
 */
function schemaPropertyToZod(prop: unknown): z.ZodType {
  const p = (prop || {}) as Record<string, unknown>;
  const propType = p.type as string;
  const propDesc = (p.description as string) || "";

  let schema: z.ZodType;

  switch (propType) {
    case "string": {
      if (p.enum && Array.isArray(p.enum)) {
        schema = z.enum(p.enum as [string, ...string[]]).describe(propDesc);
      } else {
        schema = z.string().describe(propDesc);
      }
      break;
    }
    case "number":
    case "integer": {
      schema = z.number().describe(propDesc);
      break;
    }
    case "boolean": {
      schema = z.boolean().describe(propDesc);
      break;
    }
    case "array": {
      if (p.items && typeof p.items === 'object') {
        schema = z.array(schemaPropertyToZod(p.items)).describe(propDesc);
      } else {
        schema = z.array(z.unknown()).describe(propDesc);
      }
      break;
    }
    case "object": {
      if (p.properties && typeof p.properties === 'object') {
        const nestedShape: Record<string, z.ZodType> = {};
        for (const [key, val] of Object.entries(p.properties)) {
          nestedShape[key] = schemaPropertyToZod(val);
        }
        schema = z.object(nestedShape).describe(propDesc);
      } else {
        schema = z.record(z.string(), z.unknown()).describe(propDesc);
      }
      break;
    }
    default:
      schema = z.unknown().describe(propDesc);
  }

  if (p.default !== undefined) {
    schema = schema.default(p.default);
  }

  return schema;
}

export async function registerTools(server: McpServer): Promise<void> {
  const allTools = await loadAllTools();

  for (const tool of allTools) {
    const schema = tool.inputSchema as Record<string, unknown>;
    const shape: Record<string, z.ZodType> = {};
    const required = new Set(schema.required as string[] || []);
    
    if (schema.type === "object" && schema.properties) {
      for (const [key, val] of Object.entries(schema.properties as Record<string, unknown>)) {
        const prop = val as Record<string, unknown>;
        let zodType = schemaPropertyToZod(prop);
        
        // Make optional if not in required array
        if (!required.has(key)) {
          zodType = zodType.optional();
        }
        shape[key] = zodType;
      }
    }
    
    server.tool(
      tool.name,
      tool.description,
      shape,
      async (input: unknown) => {
        const result = await tool.handler(input);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      }
    );
  }
}
