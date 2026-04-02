/**
 * E2E Tests — MCP Server integration
 * Tests the core 17 tools in Sci-Orbit v0.5.0
 */
import { describe, it, expect } from 'vitest';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function createClient() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    cwd: process.cwd(),
  });
  const client = new Client({ name: "e2e-test", version: "1.0" });
  await client.connect(transport);
  return client;
}

describe("MCP Server E2E", () => {
  it("starts and lists 10+ tools", async () => {
    const client = await createClient();
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(10);
    const names = tools.map((t: any) => t.name);
    expect(names).toContain("env_snapshot");
    expect(names).toContain("param_complete");
    expect(names).toContain("data_summarize");
    expect(names).toContain("check_dimension");
    await client.close();
  }, 10000);

  it("env_snapshot returns valid environment info", async () => {
    const client = await createClient();
    const result = await client.callTool({ 
      name: "env_snapshot", 
      arguments: {}
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("os");
    expect(data).toHaveProperty("kernel");
    expect(data).toHaveProperty("packages");
    expect(data).toHaveProperty("python");
    await client.close();
  }, 10000);

  it("data_summarize works with basic input", async () => {
    const client = await createClient();
    // This just tests that the tool accepts the request and returns something valid
    const result = await client.callTool({ 
      name: "data_summarize", 
      arguments: {
        path: "package.json",
      }
    });
    // Should return either JSON or text - check we got content
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    await client.close();
  }, 10000);

  it("check_dimension validates physical equation correctly", async () => {
    const client = await createClient();
    const result = await client.callTool({ 
      name: "check_dimension", 
      arguments: {
        equation: "E = m * c^2",
        variables: {
          "E": "[energy]",
          "m": "[mass]",
          "c": "[velocity]"
        }
      }
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("is_consistent");
    expect(data.is_consistent).toBe(true);
    await client.close();
  }, 10000);

  it("check_dimension detects inconsistency", async () => {
    const client = await createClient();
    const result = await client.callTool({ 
      name: "check_dimension", 
      arguments: {
        equation: "F = m * a^2",
        variables: {
          "F": "[force]",
          "m": "[mass]",
          "a": "[acceleration]"
        }
      }
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("is_consistent");
    expect(data.is_consistent).toBe(false);
    await client.close();
  }, 10000);
});
