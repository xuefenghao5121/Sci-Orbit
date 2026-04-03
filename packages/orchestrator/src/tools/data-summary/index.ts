/**
 * 科学数据格式摘要 MCP tools
 */
import type { MCPToolDefinition } from '../types.js';
import { DataSummarizerService } from '../../services/data-summarizer.js';
import { wrapError, AI4SErrorCode } from '../../utils/errors.js';

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
    handler: async (input) => {
      try { return await service.summarize((input as { file_path: string }).file_path); }
      catch (e) { throw wrapError(e, AI4SErrorCode.FILE_SYSTEM_ERROR); }
    },
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
    handler: async (input) => {
      try { return await service.summarizeDirectory((input as { dir_path: string }).dir_path); }
      catch (e) { throw wrapError(e, AI4SErrorCode.FILE_SYSTEM_ERROR); }
    },
  },
  {
    name: 'data_supported_formats',
    description: 'List all supported scientific data formats',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      try { return await service.supportedFormats(); }
      catch (e) { throw wrapError(e); }
    },
  },
];
