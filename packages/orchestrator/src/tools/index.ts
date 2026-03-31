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

export async function registerTools(server: McpServer): Promise<void> {
  const allTools = await loadAllTools();

  for (const tool of allTools) {
    const schema = tool.inputSchema as any;
    const shape: Record<string, z.ZodType> = {};
    if (schema.type === "object" && schema.properties) {
      for (const [key, val] of Object.entries(schema.properties)) {
        const prop = val as any;
        if (prop.type === "string") shape[key] = z.string().describe(prop.description || "");
        else if (prop.type === "number") shape[key] = z.number().describe(prop.description || "");
        else if (prop.type === "boolean") shape[key] = z.boolean().describe(prop.description || "");
        else if (prop.type === "array") shape[key] = z.array(z.unknown()).describe(prop.description || "");
        else shape[key] = z.unknown().describe(prop.description || "");
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
