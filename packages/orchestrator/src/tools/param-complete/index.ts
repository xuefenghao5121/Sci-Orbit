/**
 * 参数智能补全 MCP tools
 */
import type { MCPToolDefinition } from '../types.js';
import { ParamCompleterService } from '../../services/param-completer.js';
import { AI4SError, AI4SErrorCode, wrapError } from '../../utils/errors.js';

const service = new ParamCompleterService();

export const paramCompleteTools: MCPToolDefinition<unknown, unknown>[] = [
  {
    name: 'param_complete',
    description: 'Auto-complete implicit parameters for scientific computing tools (VASP, LAMMPS, ABACUS, GPAW, CP2K, Quantum ESPRESSO). Infers hidden params from environment and task context.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Target tool name (vasp_dft, lammps_md, abacus_dft, gpaw_dft, cp2k_dft, qe_pw)' },
        params: { type: 'object', description: 'User-specified explicit parameters' },
      },
      required: ['tool', 'params'],
    },
    handler: async (input) => {
      try { return await service.complete(input as { tool: string; params: Record<string, unknown> }); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'param_validate',
    description: 'Validate parameters for scientific computing tools without auto-completion',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Target tool name' },
        params: { type: 'object', description: 'Parameters to validate' },
      },
      required: ['tool', 'params'],
    },
    handler: async (input) => {
      try { return await service.validate(input as { tool: string; params: Record<string, unknown> }); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'param_list_templates',
    description: 'List all supported tool parameter templates',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try { return await service.listTemplates(); }
      catch (e) { throw wrapError(e); }
    },
  },
  {
    name: 'param_generate_incar',
    description: 'Generate VASP INCAR file from parameters',
    inputSchema: {
      type: 'object',
      properties: {
        params: { type: 'object', description: 'Complete parameters (explicit + implicit)' },
        output_path: { type: 'string', description: 'Optional path to save INCAR' },
      },
      required: ['params'],
    },
    handler: async (input) => {
      const { params, output_path } = input as { params: Record<string, unknown>; output_path?: string };
      try {
        const content = service.generateIncar(params);
        if (output_path) {
          const { writeFileSync } = await import('fs');
          try { writeFileSync(output_path, content); }
          catch (e) { throw wrapError(e, AI4SErrorCode.FILE_SYSTEM_ERROR); }
          return { content, saved_to: output_path };
        }
        return { content };
      } catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'param_generate_abacus_input',
    description: 'Generate ABACUS INPUT file from parameters',
    inputSchema: {
      type: 'object',
      properties: {
        params: { type: 'object', description: 'Complete parameters' },
        output_path: { type: 'string', description: 'Optional path to save INPUT' },
      },
      required: ['params'],
    },
    handler: async (input) => {
      const { params, output_path } = input as { params: Record<string, unknown>; output_path?: string };
      try {
        const content = service.generateAbacusInput(params);
        if (output_path) {
          const { writeFileSync } = await import('fs');
          try { writeFileSync(output_path, content); }
          catch (e) { throw wrapError(e, AI4SErrorCode.FILE_SYSTEM_ERROR); }
          return { content, saved_to: output_path };
        }
        return { content };
      } catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'param_generate_qe_input',
    description: 'Generate Quantum ESPRESSO pw.x input file from parameters',
    inputSchema: {
      type: 'object',
      properties: {
        params: { type: 'object', description: 'Complete parameters' },
        output_path: { type: 'string', description: 'Optional path to save input' },
      },
      required: ['params'],
    },
    handler: async (input) => {
      const { params, output_path } = input as { params: Record<string, unknown>; output_path?: string };
      try {
        const content = service.generateQeInput(params);
        if (output_path) {
          const { writeFileSync } = await import('fs');
          try { writeFileSync(output_path, content); }
          catch (e) { throw wrapError(e, AI4SErrorCode.FILE_SYSTEM_ERROR); }
          return { content, saved_to: output_path };
        }
        return { content };
      } catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'param_generate_cp2k_input',
    description: 'Generate CP2K input file from parameters',
    inputSchema: {
      type: 'object',
      properties: {
        params: { type: 'object', description: 'Complete parameters' },
        output_path: { type: 'string', description: 'Optional path to save input' },
      },
      required: ['params'],
    },
    handler: async (input) => {
      const { params, output_path } = input as { params: Record<string, unknown>; output_path?: string };
      try {
        const content = service.generateCp2kInput(params);
        if (output_path) {
          const { writeFileSync } = await import('fs');
          try { writeFileSync(output_path, content); }
          catch (e) { throw wrapError(e, AI4SErrorCode.FILE_SYSTEM_ERROR); }
          return { content, saved_to: output_path };
        }
        return { content };
      } catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'param_record_correction',
    description: 'Record a user correction to auto-completed parameters for adaptive learning',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Tool name' },
        param: { type: 'string', description: 'Parameter name' },
        auto_value: { type: 'string', description: 'Auto-completed value that was wrong' },
        user_value: { type: 'string', description: 'User-corrected value' },
        context: { type: 'object', description: 'Optional context for pattern matching' },
      },
      required: ['tool', 'param', 'auto_value', 'user_value'],
    },
    handler: async (input) => {
      const { tool, param, auto_value, user_value, context } = input as { tool: string; param: string; auto_value: unknown; user_value: unknown; context?: Record<string, unknown> };
      try {
        service.recordCorrection(tool, param, auto_value, user_value, context || {});
        return { status: 'ok', message: `Correction recorded for ${tool}:${param}` };
      } catch (e) { throw wrapError(e); }
    },
  },
  {
    name: 'param_generate_ci_workflow',
    description: 'Generate GitHub Actions workflow template for environment snapshot CI checks',
    inputSchema: {
      type: 'object',
      properties: {
        baseline_path: { type: 'string', description: 'Path to baseline snapshot JSON' },
        output_path: { type: 'string', description: 'Optional path to save workflow file' },
      },
      required: ['baseline_path'],
    },
    handler: async (input) => {
      const { baseline_path, output_path } = input as { baseline_path: string; output_path?: string };
      try {
        const workflow = service.generateCIWorkflow(baseline_path, output_path);
        return { content: workflow, ...(output_path ? { saved_to: output_path } : {}) };
      } catch (e) { throw wrapError(e); }
    },
  },
];
