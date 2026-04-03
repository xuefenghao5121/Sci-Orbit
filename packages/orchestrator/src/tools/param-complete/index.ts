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
    description: 'Auto-complete implicit parameters for scientific computing tools (VASP, LAMMPS, ABACUS). Infers hidden params from environment and task context.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: { type: 'string', description: 'Target tool name (vasp_dft, lammps_md, abacus_dft)' },
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
];
