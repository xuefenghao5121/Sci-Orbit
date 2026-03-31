import fs from "node:fs";
import path from "node:path";

const HOME = process.env.HOME!;
const CLAUDE_DIR = path.join(HOME, ".claude");

function loadJson(filePath: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function saveJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function rmSafe(target: string): void {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export async function uninstall(): Promise<void> {
  console.log("🗑️  Uninstalling AI4S orchestrator...\n");

  // 1. Remove ~/.claude/ai4s/
  rmSafe(path.join(CLAUDE_DIR, "ai4s"));
  console.log("✅ Removed ~/.claude/ai4s/");

  // 2. Remove from mcp.json
  const mcpPath = path.join(CLAUDE_DIR, "mcp.json");
  const mcpConfig = loadJson(mcpPath) as Record<string, unknown> | null;
  if (mcpConfig && mcpConfig.mcpServers && typeof mcpConfig.mcpServers === "object") {
    delete (mcpConfig.mcpServers as Record<string, unknown>)["ai4s-orchestrator"];
    saveJson(mcpPath, mcpConfig);
    console.log("✅ Removed ai4s-orchestrator from ~/.claude/mcp.json");
  }

  // 3. Remove Skills
  rmSafe(path.join(CLAUDE_DIR, "skills", "ai4s-plan"));
  console.log("✅ Removed ~/.claude/skills/ai4s-plan/");

  // 4. Remove Agents
  rmSafe(path.join(CLAUDE_DIR, "agents", "ai4s-planner.md"));
  console.log("✅ Removed ~/.claude/agents/ai4s-planner.md");

  // 5. Clean settings.json hooks
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  const settings = loadJson(settingsPath) as Record<string, unknown> | null;
  if (settings && settings.hooks && typeof settings.hooks === "object") {
    delete (settings.hooks as Record<string, unknown>)["ai4s-plan-first"];
    saveJson(settingsPath, settings);
    console.log("✅ Cleaned AI4S hooks from ~/.claude/settings.json");
  }

  console.log("\n✨ AI4S orchestrator uninstalled successfully!");
}
