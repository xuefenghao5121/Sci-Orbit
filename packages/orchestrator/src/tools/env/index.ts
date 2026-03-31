export { envDetect } from './env-detect.js';
export { envSetup } from './env-setup.js';
export * from './schemas.js';
import { envDetect } from './env-detect.js';
import { envSetup } from './env-setup.js';
import type { MCPToolDefinition } from '../plan-first/index.js';
import type { EnvSetupInput } from './schemas.js';

export const envTools: MCPToolDefinition<unknown, unknown>[] = [
  { name: 'env_detect', description: 'Detect current runtime environment (OS, CPU, GPU, RAM, Python, CUDA, packages)', inputSchema: { type: 'object', properties: {}, required: [] }, handler: () => Promise.resolve(envDetect()) },
  { name: 'env_setup', description: 'Generate environment setup script (conda environment.yml or Dockerfile)', inputSchema: { type: 'object', properties: { requirements: { type: 'array', items: { type: 'string' } }, target: { type: 'string', enum: ['conda', 'docker'] }, name: { type: 'string' } }, required: ['requirements', 'target'] }, handler: (i) => Promise.resolve(envSetup(i as EnvSetupInput)) },
];
