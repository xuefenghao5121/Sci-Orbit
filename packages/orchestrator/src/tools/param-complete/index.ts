/**
 * 参数智能补全 MCP tools
 */
import type { MCPToolDefinition } from '../plan-first/index.js';
import { ParamCompleterService } from '../../services/param-completer.js';

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
    handler: async (input) => service.complete(input as any),
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
    handler: async (input) => service.validate(input as any),
  },
  {
    name: 'param_list_templates',
    description: 'List all supported tool parameter templates',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => service.listTemplates(),
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
    handler: async (input: any) => {
      const content = service.generateIncar(input.params);
      if (input.output_path) {
        const { writeFileSync } = await import('fs');
        writeFileSync(input.output_path, content);
        return { content, saved_to: input.output_path };
      }
      return { content };
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
    handler: async (input: any) => {
      const content = service.generateAbacusInput(input.params);
      if (input.output_path) {
        const { writeFileSync } = await import('fs');
        writeFileSync(input.output_path, content);
        return { content, saved_to: input.output_path };
      }
      return { content };
    },
  },
];
