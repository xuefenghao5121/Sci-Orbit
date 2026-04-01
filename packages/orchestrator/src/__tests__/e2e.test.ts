/**
 * E2E Tests — MCP Server integration
 */
import { describe, it, expect } from 'vitest';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function createClient() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["packages/orchestrator/dist/index.js"],
    cwd: "/home/huawei/.openclaw/workspace/ai4s-cli",
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
  }, 10000);

  it("classify_task returns valid classification", async () => {
    const client = await createClient();
    const result = await client.callTool({ 
      name: "classify_task", 
      arguments: {
        task_description: "Train a transformer model for NER",
      }
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("domain");
    expect(data).toHaveProperty("complexity");
    // Accept both old ('low'/'medium'/'high') and new ('simple'/'moderate'/'complex') complexity values
    expect(["low", "medium", "high", "simple", "moderate", "complex"]).toContain(data.complexity);
    await client.close();
  }, 10000);

  it("generate_plan returns valid plan", async () => {
    const client = await createClient();
    const classification = { 
      domain: "general", 
      task_type: "modeling", 
      complexity: "medium",
      approach: "hybrid",
      estimated_duration: "days",
      dependencies: [],
      confidence: 0.8,
      reasoning: "Test classification"
    };
    const result = await client.callTool({ 
      name: "generate_plan", 
      arguments: {
        task_description: "Train a transformer model for NER",
        classification,
      }
    });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("steps");
    expect(Array.isArray(data.steps)).toBe(true);
    await client.close();
  }, 10000);

  it("validate_plan validates structure", async () => {
    const client = await createClient();
    const plan = {
      phases: [{ name: "data", steps: ["collect data"] }],
    };
    const result = await client.callTool({ name: "validate_plan", arguments: { plan } });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("valid");
    expect(typeof data.valid).toBe("boolean");
    await client.close();
  }, 10000);

  it("review_plan returns review result", async () => {
    const client = await createClient();
    const plan = {
      phases: [{ name: "data", steps: ["collect data"] }],
    };
    const result = await client.callTool({ name: "review_plan", arguments: { plan } });
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveProperty("overall_score");
    await client.close();
  }, 10000);
});
