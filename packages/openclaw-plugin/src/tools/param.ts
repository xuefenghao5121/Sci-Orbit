/**
 * 参数智能工具
 */
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { z } from "zod";
import { ParamCompleterService } from "/home/huawei/.openclaw/workspace/ai4s-cli/packages/orchestrator/dist/services/param-completer.js";
import { jsonResult } from "./adapter.js";

const service = new ParamCompleterService();

export function registerParamTools(api: OpenClawPluginApi) {
  api.registerTool({
    name: "param_complete",
    label: "Param Complete",
    description:
      "Auto-complete implicit parameters for scientific computing tools (VASP, LAMMPS, ABACUS). Infers hidden params from environment and task context.",
    parameters: z.object({
      tool: z.string().describe("Target tool name (vasp_dft, lammps_md, abacus_dft)"),
      params: z.record(z.string(), z.unknown()).describe("User-specified explicit parameters"),
    }),
    async execute(_toolCallId, params) {
      return jsonResult(await service.complete(params as any));
    },
  });

  api.registerTool({
    name: "param_validate",
    label: "Param Validate",
    description: "Validate parameters for scientific computing tools without auto-completion",
    parameters: z.object({
      tool: z.string().describe("Target tool name"),
      params: z.record(z.string(), z.unknown()).describe("Parameters to validate"),
    }),
    async execute(_toolCallId, params) {
      return jsonResult(await service.validate(params as any));
    },
  });

  api.registerTool({
    name: "param_list_templates",
    label: "Param List Templates",
    description: "List all supported tool parameter templates",
    parameters: z.object({}),
    async execute() {
      return jsonResult(await service.listTemplates());
    },
  });

  api.registerTool({
    name: "param_generate_incar",
    label: "Param Generate INCAR",
    description: "Generate VASP INCAR file from parameters",
    parameters: z.object({
      params: z.record(z.string(), z.unknown()).describe("Complete parameters (explicit + implicit)"),
      output_path: z.string().optional().describe("Optional path to save INCAR"),
    }),
    async execute(_toolCallId, params) {
      const { params: incarParams, output_path } = params as any;
      const content = service.generateIncar(incarParams);
      if (output_path) {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(output_path, content);
        return jsonResult({ content, saved_to: output_path });
      }
      return jsonResult({ content });
    },
  });

  api.registerTool({
    name: "param_generate_abacus_input",
    label: "Param Generate ABACUS INPUT",
    description: "Generate ABACUS INPUT file from parameters",
    parameters: z.object({
      params: z.record(z.string(), z.unknown()).describe("Complete parameters"),
      output_path: z.string().optional().describe("Optional path to save INPUT"),
    }),
    async execute(_toolCallId, params) {
      const { params: abacusParams, output_path } = params as any;
      const content = service.generateAbacusInput(abacusParams);
      if (output_path) {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(output_path, content);
        return jsonResult({ content, saved_to: output_path });
      }
      return jsonResult({ content });
    },
  });
}
