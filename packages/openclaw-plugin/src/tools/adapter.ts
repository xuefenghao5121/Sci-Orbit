/**
 * 工具注册辅助函数
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { z } from "zod";
import type { AnyAgentTool } from "openclaw/plugin-sdk";

/**
 * JSON Schema property → Zod type
 */
function toZod(prop: any): z.ZodType {
  const type = prop?.type as string;
  const desc = (prop?.description as string) || "";
  let schema: z.ZodType;

  switch (type) {
    case "string":
      schema = prop?.enum
        ? z.enum(prop.enum as [string, ...string[]]).describe(desc)
        : z.string().describe(desc);
      break;
    case "number":
    case "integer":
      schema = z.number().describe(desc);
      break;
    case "boolean":
      schema = z.boolean().describe(desc);
      break;
    case "array":
      schema = prop?.items
        ? z.array(toZod(prop.items)).describe(desc)
        : z.array(z.unknown()).describe(desc);
      break;
    case "object":
      if (prop?.properties) {
        const shape: Record<string, z.ZodType> = {};
        for (const [k, v] of Object.entries(prop.properties)) {
          shape[k] = toZod(v);
        }
        schema = z.object(shape).describe(desc);
      } else {
        schema = z.record(z.string(), z.unknown()).describe(desc);
      }
      break;
    default:
      schema = z.unknown().describe(desc);
  }

  if (prop?.default !== undefined) {
    schema = schema.default(prop.default);
  }
  return schema;
}

/** Convert result to OpenClaw tool result format */
export function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

/** Convert MCP JSON Schema to Zod object schema */
export function schemaToZod(
  inputSchema: Record<string, unknown>,
  required: string[] = []
): z.ZodObject<any> {
  const schema = inputSchema as any;
  const shape: Record<string, z.ZodType> = {};

  if (schema?.type === "object" && schema.properties) {
    for (const [key, val] of Object.entries(schema.properties)) {
      let zodType = toZod(val);
      if (!required.includes(key)) {
        zodType = zodType.optional();
      }
      shape[key] = zodType;
    }
  }

  return z.object(shape);
}

export type { OpenClawPluginApi, AnyAgentTool };
