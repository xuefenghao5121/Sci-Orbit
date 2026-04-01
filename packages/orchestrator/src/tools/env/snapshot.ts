/**
 * env_snapshot / env_diff MCP tools
 */
import type { MCPToolDefinition } from '../plan-first/index.js';
import { EnvSnapshotService } from '../../services/env-snapshot.js';

const service = new EnvSnapshotService();

interface SnapshotInput { save_path?: string; format?: 'json' | 'conda' | 'dockerfile'; }
interface DiffInput { snapshot_a_path: string; snapshot_b_path: string; }

export const snapshotTools: MCPToolDefinition<unknown, unknown>[] = [
  {
    name: 'env_snapshot',
    description: 'Collect a full environment snapshot for AI4S reproducibility. Detects GPU, CUDA, compilers, MPI, Python, scientific packages. Optionally save to file.',
    inputSchema: {
      type: 'object',
      properties: {
        save_path: { type: 'string', description: 'Optional path to save snapshot JSON' },
        format: { type: 'string', enum: ['json', 'conda', 'dockerfile'], description: 'Export format (default: json)' },
      },
    },
    handler: async (input) => {
      const { save_path, format } = input as SnapshotInput;
      const snapshot = await service.collect();
      let result: any = snapshot;
      if (format === 'conda') {
        result = service.toCondaEnv(snapshot);
      } else if (format === 'dockerfile') {
        result = service.toDockerfile(snapshot);
      }
      if (save_path && format !== 'conda' && format !== 'dockerfile') {
        const { writeFileSync } = await import('fs');
        writeFileSync(save_path, JSON.stringify(snapshot, null, 2));
        result = { ...snapshot, saved_to: save_path };
      }
      return result;
    },
  },
  {
    name: 'env_diff',
    description: 'Compare two environment snapshots and identify differences that could affect reproducibility',
    inputSchema: {
      type: 'object',
      properties: {
        snapshot_a_path: { type: 'string', description: 'Path to first snapshot JSON' },
        snapshot_b_path: { type: 'string', description: 'Path to second snapshot JSON' },
      },
      required: ['snapshot_a_path', 'snapshot_b_path'],
    },
    handler: async (input) => {
      const { snapshot_a_path, snapshot_b_path } = input as DiffInput;
      const { readFileSync } = await import('fs');
      const a = JSON.parse(readFileSync(snapshot_a_path, 'utf8'));
      const b = JSON.parse(readFileSync(snapshot_b_path, 'utf8'));
      return service.diff(a, b);
    },
  },
];
