export { envDetect } from './env-detect.js';
export { envSetup } from './env-setup.js';
export * from './schemas.js';
export { snapshotTools } from './snapshot.js';
import { envDetect } from './env-detect.js';
import { envSetup } from './env-setup.js';
import { snapshotTools } from './snapshot.js';
import type { MCPToolDefinition } from '../plan-first/index.js';
import type { EnvSetupInput } from './schemas.js';

// v0.5.0 精简：env_detect/env_setup 被 env_snapshot 替代，Claude Code 能自己生成环境配置
// 保留原始导出供内部使用
export const envTools: MCPToolDefinition<unknown, unknown>[] = [
  { name: 'env_detect', description: 'Detect current runtime environment (OS, CPU, GPU, RAM, Python, CUDA, packages)', inputSchema: { type: 'object', properties: {}, required: [] }, handler: () => Promise.resolve(envDetect()) },
  { name: 'env_setup', description: 'Generate environment setup script (conda environment.yml or Dockerfile)', inputSchema: { type: 'object', properties: { requirements: { type: 'array', items: { type: 'string' } }, target: { type: 'string', enum: ['conda', 'docker'] }, name: { type: 'string' } }, required: ['requirements', 'target'] }, handler: (i) => Promise.resolve(envSetup(i as EnvSetupInput)) },
  ...snapshotTools,
];

// v0.5.0 精简导出：只暴露 env_snapshot + env_diff
export const envSnapshotTools: MCPToolDefinition<unknown, unknown>[] = [...snapshotTools];
