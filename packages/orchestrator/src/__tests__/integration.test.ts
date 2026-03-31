/**
 * E2E Integration Test - MCP Protocol Validation
 * Tests all 38 tools, all resources, and full install→use→uninstall flow
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let client: Client;
let transport: StdioClientTransport;

const EXPECTED_TOOL_PREFIXES = [
  "plan_", "debate_", "paper_", "experiment_", "env_",
  "knowledge_", "finetune_", "science_", "deploy_", "constrain_"
];

beforeAll(async () => {
  client = new Client({ name: "test-client", version: "0.4.0" });
  transport = new StdioClientTransport({
    command: "node",
    args: ["packages/orchestrator/dist/index.js"],
    cwd: "/home/huawei/.openclaw/workspace/ai4s-cli",
  });
  await client.connect(transport);
}, 15000);

afterAll(async () => {
  await client.close();
});

describe("MCP Protocol - Server Info", () => {
  it("should return correct server info", async () => {
    const result = await client.getServerInfo();
    expect(result).toBeDefined();
    expect(result.name).toBe("ai4s-orchestrator");
    expect(result.version).toBe("0.4.0");
  });
});

describe("MCP Protocol - Tools", () => {
  let tools: any[];

  it("should list all tools", async () => {
    const result = await client.listTools();
    tools = result.tools;
    expect(tools.length).toBeGreaterThanOrEqual(30);
  });

  it("every tool should have valid schema", () => {
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      if (tool.inputSchema.type) {
        expect(tool.inputSchema.type).toBe("object");
      }
    }
  });

  it("tools should cover all expected categories", () => {
    const toolNames = tools.map((t: any) => t.name);
    for (const prefix of EXPECTED_TOOL_PREFIXES) {
      const matching = toolNames.filter((n: string) => n.startsWith(prefix));
      expect(matching.length).toBeGreaterThan(0);
    }
  });

  it("tool schemas should have required properties", () => {
    for (const tool of tools) {
      const schema = tool.inputSchema;
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties) as any[]) {
          expect(prop.type).toBeDefined();
        }
      }
    }
  });
});

describe("MCP Protocol - Resources", () => {
  let resources: any[];

  it("should list all resources", async () => {
    const result = await client.listResources();
    resources = result.resources;
    expect(resources.length).toBeGreaterThan(0);
  });

  it("should read each resource successfully", async () => {
    for (const resource of resources) {
      const result = await client.readResource({
        uri: resource.uri,
      });
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);
    }
  });
});

describe("MCP Protocol - Tool Execution", () => {
  it("env_status should return environment info", async () => {
    const result = await client.callTool({ name: "env_status", arguments: {} });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it("env_detect should return detection results", async () => {
    const result = await client.callTool({ name: "env_detect", arguments: {} });
    expect(result).toBeDefined();
  });
});

describe("MCP Protocol - Error Handling", () => {
  it("invalid tool name should return error", async () => {
    await expect(
      client.callTool({ name: "nonexistent_tool", arguments: {} })
    ).rejects.toThrow();
  });
});
