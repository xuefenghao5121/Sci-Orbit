import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** Lazy-load tool modules on first access */
const TOOL_LOADERS: Array<() => Promise<import("./tool-registry.js").ToolDefinition[]>> = [
  () => import("./plan-first/index.js").then((m) => m.planFirstTools),
  () => import("./debate/index.js").then((m) => m.debateTools),
  () => import("./paper/index.js").then((m) => m.paperTools),
  () => import("./experiment/index.js").then((m) => m.experimentTools),
  () => import("./env/index.js").then((m) => m.envTools),
  () => import("./knowledge/index.js").then((m) => m.knowledgeTools),
  () => import("./finetune/index.js").then((m) => m.finetuneTools),
  () => import("./science/index.js").then((m) => m.scienceTools),
  () => import("./deploy/index.js").then((m) => m.deployTools),
  () => import("./constrain/index.js").then((m) => m.constrainTools),
  () => import("./data-summary/index.js").then((m) => m.dataSummaryTools),
  () => import("./param-complete/index.js").then((m) => m.paramCompleteTools),
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
