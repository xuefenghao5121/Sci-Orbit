/**
 * 环境智能工具 — env_snapshot, env_diff
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { z } from "zod";
import { EnvSnapshotService } from "/home/huawei/.openclaw/workspace/ai4s-cli/packages/orchestrator/dist/services/env-snapshot.js";
import { jsonResult } from "./adapter.js";

const service = new EnvSnapshotService();

export function registerEnvTools(api: OpenClawPluginApi) {
  api.registerTool({
    name: "env_snapshot",
    label: "Env Snapshot",
    description:
      "Collect a full environment snapshot for AI4S reproducibility. Detects GPU, CUDA, compilers, MPI, Python, scientific packages. Optionally save to file.",
    parameters: z.object({
      save_path: z.string().optional().describe("Optional path to save snapshot JSON"),
      format: z
        .enum(["json", "conda", "dockerfile"])
        .optional()
        .describe("Export format (default: json)"),
    }),
    async execute(_toolCallId, params) {
      const { save_path, format } = params as any;
      const snapshot = await service.collect();
      let result: any = snapshot;

      if (format === "conda") {
        result = service.toCondaEnv(snapshot);
      } else if (format === "dockerfile") {
        result = service.toDockerfile(snapshot);
      }

      if (save_path && format !== "conda" && format !== "dockerfile") {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(save_path, JSON.stringify(snapshot, null, 2));
        result = { ...snapshot, saved_to: save_path };
      }

      return jsonResult(result);
    },
  });

  api.registerTool({
    name: "env_diff",
    label: "Env Diff",
    description:
      "Compare two environment snapshots and identify differences that could affect reproducibility",
    parameters: z.object({
      snapshot_a_path: z.string().describe("Path to first snapshot JSON"),
      snapshot_b_path: z.string().describe("Path to second snapshot JSON"),
    }),
    async execute(_toolCallId, params) {
      const { snapshot_a_path, snapshot_b_path } = params as any;
      const { readFileSync } = await import("node:fs");
      const a = JSON.parse(readFileSync(snapshot_a_path, "utf8"));
      const b = JSON.parse(readFileSync(snapshot_b_path, "utf8"));
      return jsonResult(service.diff(a, b));
    },
  });
}
