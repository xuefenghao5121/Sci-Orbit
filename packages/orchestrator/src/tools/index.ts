import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { planFirstTools } from "./plan-first/index.js";

export function registerTools(server: McpServer): void {
  for (const tool of planFirstTools) {
    const schema = tool.inputSchema as any;
    const shape: Record<string, z.ZodType> = {};
    if (schema.type === 'object' && schema.properties) {
      for (const [key, val] of Object.entries(schema.properties)) {
        const prop = val as any;
        if (prop.type === 'string') shape[key] = z.string().describe(prop.description || '');
        else if (prop.type === 'number') shape[key] = z.number().describe(prop.description || '');
        else if (prop.type === 'boolean') shape[key] = z.boolean().describe(prop.description || '');
        else if (prop.type === 'array') shape[key] = z.array(z.unknown()).describe(prop.description || '');
        else shape[key] = z.unknown().describe(prop.description || '');
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
