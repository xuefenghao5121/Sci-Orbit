import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME!;
const CLAUDE_DIR = path.join(HOME, ".claude");

// Template files are at project root level (skills/, agents/)
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

interface McpConfig {
  mcpServers: Record<string, unknown>;
}

function loadJson(filePath: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function saveJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export async function install(): Promise<void> {
  console.log("🚀 Installing AI4S orchestrator for Claude Code...\n");

  // 1. Create ~/.claude/ai4s/ directory
  const ai4sDir = path.join(CLAUDE_DIR, "ai4s");
  fs.mkdirSync(ai4sDir, { recursive: true });
  console.log("✅ Created ~/.claude/ai4s/");

  // 2. Write mcp.json (merge with existing)
  const mcpPath = path.join(CLAUDE_DIR, "mcp.json");
  const mcpConfig = (loadJson(mcpPath) ?? { mcpServers: {} }) as McpConfig;
  mcpConfig.mcpServers["ai4s-orchestrator"] = {
    command: "npx",
    args: ["-y", "@ai4s/orchestrator"],
    env: {},
  };
  saveJson(mcpPath, mcpConfig);
  console.log("✅ Written ai4s-orchestrator to ~/.claude/mcp.json");

  // 3. Copy Skills
  const skillsSrc = path.join(PROJECT_ROOT, "skills", "ai4s-plan");
  const skillsDest = path.join(CLAUDE_DIR, "skills", "ai4s-plan");
  if (fs.existsSync(skillsSrc)) {
    copyDirRecursive(skillsSrc, skillsDest);
    console.log("✅ Copied skills to ~/.claude/skills/ai4s-plan/");
  }

  // 4. Copy Agents
  const agentsSrc = path.join(PROJECT_ROOT, "agents", "ai4s-planner.md");
  const agentsDest = path.join(CLAUDE_DIR, "agents", "ai4s-planner.md");
  if (fs.existsSync(agentsSrc)) {
    fs.copyFileSync(agentsSrc, agentsDest);
    console.log("✅ Copied agent to ~/.claude/agents/ai4s-planner.md");
  }

  // 5. Write settings.json (merge hooks)
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  const settings = (loadJson(settingsPath) ?? {}) as Record<string, unknown>;
  if (!settings.hooks) {
    settings.hooks = {};
  }
  (settings.hooks as Record<string, unknown>)["ai4s-plan-first"] = {
    event: "user_prompt",
    pattern: "/ai4s-plan",
    action: "trigger_skill",
    skill: "ai4s-plan",
  };
  saveJson(settingsPath, settings);
  console.log("✅ Written hook config to ~/.claude/settings.json");

  console.log("\n🎉 AI4S orchestrator installed successfully!");
  console.log("   Restart Claude Code to activate.");
}
