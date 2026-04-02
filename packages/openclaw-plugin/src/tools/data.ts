/**
 * 数据智能工具
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { z } from "zod";
import { DataSummarizerService } from "/home/huawei/.openclaw/workspace/ai4s-cli/packages/orchestrator/dist/services/data-summarizer.js";
import { jsonResult } from "./adapter.js";

const service = new DataSummarizerService();

export function registerDataTools(api: OpenClawPluginApi) {
  api.registerTool({
    name: "data_summarize",
    label: "Data Summarize",
    description:
      "Summarize a scientific data file into LLM-readable text. Supports POSCAR, CIF, VASP OUTCAR, XYZ, ABACUS log, JSON, YAML. Extracts key physical quantities.",
    parameters: z.object({
      file_path: z.string().describe("Path to the scientific data file"),
    }),
    async execute(_toolCallId, params) {
      return jsonResult(await service.summarize((params as any).file_path));
    },
  });

  api.registerTool({
    name: "data_summarize_dir",
    label: "Data Summarize Dir",
    description: "Summarize all recognized scientific files in a directory",
    parameters: z.object({
      dir_path: z.string().describe("Path to directory"),
    }),
    async execute(_toolCallId, params) {
      return jsonResult(await service.summarizeDirectory((params as any).dir_path));
    },
  });

  api.registerTool({
    name: "data_supported_formats",
    label: "Data Supported Formats",
    description: "List all supported scientific data formats",
    parameters: z.object({}),
    async execute() {
      return jsonResult(await service.supportedFormats());
    },
  });
}
