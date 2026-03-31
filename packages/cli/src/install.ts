import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME!;
const CLAUDE_DIR = path.join(HOME, ".claude");
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

const SKILLS = ["ai4s-plan", "ai4s-status", "ai4s-paper", "ai4s-experiment", "ai4s-knowledge", "ai4s-env", "ai4s-config", "ai4s-hpc", "ai4s-finetune", "ai4s-inference", "ai4s-constraints", "ai4s-feedback"];
const AGENTS = ["ai4s-planner.md", "ai4s-reviewer.md", "ai4s-experimenter.md", "ai4s-analyst.md", "ai4s-hpc-operator.md", "ai4s-trainer.md"];

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

  // 1. Create ~/.claude/ai4s/ directory structure
  const ai4sDir = path.join(CLAUDE_DIR, "ai4s");
  const subDirs = ["papers", "experiments", "knowledge", "exports"];
  for (const sub of subDirs) {
    fs.mkdirSync(path.join(ai4sDir, sub), { recursive: true });
  }
  console.log("✅ Created ~/.claude/ai4s/ directory structure");

  // 2. Write default config
  const configPath = path.join(ai4sDir, "config.json");
  if (!fs.existsSync(configPath)) {
    saveJson(configPath, {
      version: "0.2.0",
      llm: { provider: "anthropic", maxTokens: 4096, temperature: 0.7 },
      storage: { basePath: ai4sDir },
      experiment: { autoSaveInterval: 60, maxParallelExperiments: 3 },
      knowledge: { defaultExportFormat: "alpaca" },
    });
    console.log("✅ Created default config at ~/.claude/ai4s/config.json");
  }

  // 3. Write mcp.json (merge with existing)
  const mcpPath = path.join(CLAUDE_DIR, "mcp.json");
  const mcpConfig = (loadJson(mcpPath) ?? { mcpServers: {} }) as McpConfig;
  mcpConfig.mcpServers["ai4s-orchestrator"] = {
    command: "npx",
    args: ["-y", "@ai4s/orchestrator"],
    env: {},
  };
  saveJson(mcpPath, mcpConfig);
  console.log("✅ Written ai4s-orchestrator to ~/.claude/mcp.json");

  // 4. Copy Skills (7 skills)
  for (const skill of SKILLS) {
    const skillsSrc = path.join(PROJECT_ROOT, "skills", skill);
    const skillsDest = path.join(CLAUDE_DIR, "skills", skill);
    if (fs.existsSync(skillsSrc)) {
      copyDirRecursive(skillsSrc, skillsDest);
      console.log(`✅ Copied skill: ${skill}`);
    } else {
      console.log(`⚠️  Skill not found: ${skill}`);
    }
  }

  // 5. Copy Agents (4 agents)
  for (const agent of AGENTS) {
    const agentSrc = path.join(PROJECT_ROOT, "agents", agent);
    const agentDest = path.join(CLAUDE_DIR, "agents", agent);
    if (fs.existsSync(agentSrc)) {
      fs.mkdirSync(path.dirname(agentDest), { recursive: true });
      fs.copyFileSync(agentSrc, agentDest);
      console.log(`✅ Copied agent: ${agent}`);
    } else {
      console.log(`⚠️  Agent not found: ${agent}`);
    }
  }

  // 6. Write settings.json (merge hooks)
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  const settings = (loadJson(settingsPath) ?? {}) as Record<string, unknown>;
  if (!settings.hooks) settings.hooks = {};
  (settings.hooks as Record<string, unknown>)["ai4s-plan-first"] = {
    event: "user_prompt",
    pattern: "/ai4s-plan",
    action: "trigger_skill",
    skill: "ai4s-plan",
  };
  saveJson(settingsPath, settings);
  console.log("✅ Written hook config to ~/.claude/settings.json");

  console.log("\n🎉 AI4S orchestrator v0.2.0 installed successfully!");
  console.log("   Restart Claude Code to activate.");
}
