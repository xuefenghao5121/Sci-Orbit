import fs from "node:fs";
import path from "node:path";

const HOME = process.env.HOME!;
const CLAUDE_DIR = path.join(HOME, ".claude");

const SKILLS = ["ai4s-plan", "ai4s-status", "ai4s-paper", "ai4s-experiment", "ai4s-knowledge", "ai4s-env", "ai4s-config", "ai4s-hpc", "ai4s-finetune", "ai4s-inference", "ai4s-constraints", "ai4s-feedback"];
const AGENTS = ["ai4s-planner.md", "ai4s-reviewer.md", "ai4s-experimenter.md", "ai4s-analyst.md", "ai4s-hpc-operator.md", "ai4s-trainer.md"];

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

export async function uninstall(preserveUserData = true): Promise<void> {
  console.log("🗑️  Uninstalling AI4S orchestrator...\n");

  // 1. Remove ~/.claude/ai4s/ (but preserve user data if requested)
  const ai4sDir = path.join(CLAUDE_DIR, "ai4s");
  if (preserveUserData) {
    const userDataDirs = ["papers", "experiments", "knowledge", "exports"];
    console.log("📦 Preserving user data in ~/.claude/ai4s/ (papers, experiments, knowledge, exports)");
    // Keep user data directories, remove everything else
    const keep = new Set(userDataDirs);
    if (fs.existsSync(ai4sDir)) {
      for (const entry of fs.readdirSync(ai4sDir)) {
        if (!keep.has(entry)) {
          rmSafe(path.join(ai4sDir, entry));
        }
      }
    }
    console.log("✅ Cleaned ~/.claude/ai4s/ (user data preserved)");
  } else {
    rmSafe(ai4sDir);
    console.log("✅ Removed ~/.claude/ai4s/");
  }

  // 2. Remove from mcp.json
  const mcpPath = path.join(CLAUDE_DIR, "mcp.json");
  const mcpConfig = loadJson(mcpPath) as Record<string, unknown> | null;
  if (mcpConfig && mcpConfig.mcpServers && typeof mcpConfig.mcpServers === "object") {
    delete (mcpConfig.mcpServers as Record<string, unknown>)["ai4s-orchestrator"];
    saveJson(mcpPath, mcpConfig);
    console.log("✅ Removed ai4s-orchestrator from ~/.claude/mcp.json");
  }

  // 3. Remove Skills
  for (const skill of SKILLS) {
    rmSafe(path.join(CLAUDE_DIR, "skills", skill));
  }
  console.log(`✅ Removed ${SKILLS.length} skills`);

  // 4. Remove Agents
  for (const agent of AGENTS) {
    rmSafe(path.join(CLAUDE_DIR, "agents", agent));
  }
  console.log(`✅ Removed ${AGENTS.length} agents`);

  // 5. Clean settings.json hooks
  const settingsPath = path.join(CLAUDE_DIR, "settings.json");
  const settings = loadJson(settingsPath) as Record<string, unknown> | null;
  if (settings && settings.hooks && typeof settings.hooks === "object") {
    delete (settings.hooks as Record<string, unknown>)["ai4s-plan-first"];
    saveJson(settingsPath, settings);
    console.log("✅ Cleaned AI4S hooks from ~/.claude/settings.json");
  }

  console.log("\n✨ AI4S orchestrator uninstalled successfully!");
  if (preserveUserData) {
    console.log("   User data preserved in ~/.claude/ai4s/");
  }
}
