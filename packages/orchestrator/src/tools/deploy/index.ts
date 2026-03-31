/**
 * Deploy Tools — MCP Tool Definitions & Exports
 */
export { inferStart } from './start.js';
export { inferTest } from './test.js';
export { inferStop } from './stop.js';
export * from './schemas.js';

import { inferStart } from './start.js';
import { inferTest } from './test.js';
import { inferStop } from './stop.js';
import type { MCPToolDefinition } from '../plan-first/index.js';
import type { InferStartInput, InferTestInput, InferStopInput } from './schemas.js';

export const deployTools: MCPToolDefinition<unknown, unknown>[] = [
  {
    name: 'infer_start',
    description: 'Start local inference service (vLLM, Ollama, or llama.cpp)',
    inputSchema: { type: 'object', properties: { model_path: { type: 'string' }, engine: { type: 'string', enum: ['vllm', 'ollama', 'llama_cpp'] }, params: { type: 'object' } }, required: ['model_path'] },
    handler: (i) => inferStart(i as InferStartInput),
  },
  {
    name: 'infer_test',
    description: 'Test inference service quality and latency',
    inputSchema: { type: 'object', properties: { service_url: { type: 'string' }, test_cases: { type: 'array', items: { type: 'object' } } }, required: ['service_url', 'test_cases'] },
    handler: (i) => inferTest(i as InferTestInput),
  },
  {
    name: 'infer_stop',
    description: 'Stop inference service',
    inputSchema: { type: 'object', properties: { service_url: { type: 'string' }, pid: { type: 'string' } }, required: [] },
    handler: (i) => inferStop(i as InferStopInput),
  },
];
