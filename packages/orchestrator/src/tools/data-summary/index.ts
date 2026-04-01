/**
 * 科学数据格式摘要 MCP tools
 */
import type { MCPToolDefinition } from '../plan-first/index.js';
import { DataSummarizerService } from '../../services/data-summarizer.js';

const service = new DataSummarizerService();

export const dataSummaryTools: MCPToolDefinition<unknown, unknown>[] = [
  {
    name: 'data_summarize',
    description: 'Summarize a scientific data file into LLM-readable text. Supports POSCAR, CIF, VASP OUTCAR, XYZ, ABACUS log, JSON, YAML. Extracts key physical quantities.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to the scientific data file' },
      },
      required: ['file_path'],
    },
    handler: async (input: any) => service.summarize(input.file_path),
  },
  {
    name: 'data_summarize_dir',
    description: 'Summarize all recognized scientific files in a directory',
    inputSchema: {
      type: 'object',
      properties: {
        dir_path: { type: 'string', description: 'Path to directory' },
      },
      required: ['dir_path'],
    },
    handler: async (input: any) => service.summarizeDirectory(input.dir_path),
  },
  {
    name: 'data_supported_formats',
    description: 'List all supported scientific data formats',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => service.supportedFormats(),
  },
];
