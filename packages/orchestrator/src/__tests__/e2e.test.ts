/**
 * E2E Tests — MCP Server integration
 */
import { describe, it, expect } from 'vitest';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function createClient() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    cwd: new URL("..", import.meta.url).pathname,
  });
  const client = new Client({ name: "e2e-test", version: "1.0" });
  await client.connect(transport);
  return client;
}

describe("MCP Server E2E", () => {
  it("starts and lists 4+ tools", async () => {
    const client = await createClient();
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);
    const names = tools.map((t: any) => t.name);
    expect(names).toContain("classify_task");
    expect(names).toContain("generate_plan");
    expect(names).toContain("validate_plan");
    expect(names).toContain("review_plan");
    await client.close();
  });

  it("classify_task returns valid classification", async () => {
    const client = await createClient();
    const result = await client.callTool("classify_task", {
      task_description: "Train a transformer model for NER",
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("domain");
    expect(data).toHaveProperty("complexity");
    expect(["low", "medium", "high"]).toContain(data.complexity);
    await client.close();
  });

  it("generate_plan returns valid plan", async () => {
    const client = await createClient();
    const classification = { domain: "ml", task_type: "modeling", complexity: "medium" };
    const result = await client.callTool("generate_plan", {
      task_description: "Train a transformer model for NER",
      classification,
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("phases");
    expect(Array.isArray(data.phases)).toBe(true);
    await client.close();
  });

  it("validate_plan validates structure", async () => {
    const client = await createClient();
    const plan = {
      phases: [{ name: "data", steps: ["collect data"] }],
    };
    const result = await client.callTool("validate_plan", { plan });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("valid");
    expect(typeof data.valid).toBe("boolean");
    await client.close();
  });

  it("review_plan returns review result", async () => {
    const client = await createClient();
    const plan = {
      phases: [{ name: "data", steps: ["collect data"] }],
    };
    const result = await client.callTool("review_plan", { plan });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("overall_rating");
    await client.close();
  });
});
