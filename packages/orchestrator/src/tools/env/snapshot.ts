/**
 * env_snapshot / env_diff MCP tools
 */
import type { MCPToolDefinition } from '../types.js';
import { EnvSnapshotService } from '../../services/env-snapshot.js';
import { wrapError, AI4SErrorCode } from '../../utils/errors.js';

const service = new EnvSnapshotService();

interface SnapshotInput { save_path?: string; format?: 'json' | 'conda' | 'dockerfile'; }
interface DiffInput { snapshot_a_path: string; snapshot_b_path: string; format?: 'json' | 'text'; ci?: boolean; }

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
      required: [],
    },
    handler: async (input) => {
      const { save_path, format } = input as SnapshotInput;
      try {
        const snapshot = await service.collect();
        let result: unknown = snapshot;
        if (format === 'conda') {
          result = service.toCondaEnv(snapshot);
        } else if (format === 'dockerfile') {
          result = service.toDockerfile(snapshot);
        }
        if (save_path && format !== 'conda' && format !== 'dockerfile') {
          const { writeFileSync } = await import('fs');
          try { writeFileSync(save_path, JSON.stringify(snapshot, null, 2)); }
          catch (e) { throw wrapError(e, AI4SErrorCode.FILE_SYSTEM_ERROR); }
          result = { ...snapshot, saved_to: save_path };
        }
        return result;
      } catch (e) { throw wrapError(e); }
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
        format: { type: 'string', enum: ['json', 'text'], description: 'Output format (default: json)' },
        ci: { type: 'boolean', description: 'CI mode: return structured result with exit-code semantics' },
      },
      required: ['snapshot_a_path', 'snapshot_b_path'],
    },
    handler: async (input) => {
      try {
        const { snapshot_a_path, snapshot_b_path, format, ci } = input as DiffInput;
        const { readFileSync } = await import('fs');
        const a = JSON.parse(readFileSync(snapshot_a_path, 'utf8'));
        const b = JSON.parse(readFileSync(snapshot_b_path, 'utf8'));
        const diff = service.diff(a, b);
        if (format === 'text' || ci) {
          const lines = [`Environment Diff Report`, `====================`, `Has differences: ${diff.has_diff}`, `Risk level: ${diff.risk_level}`, ''];
          if (diff.diffs.length > 0) {
            lines.push('Differences:');
            for (const d of diff.diffs) {
              lines.push(`  ${d.key}: ${d.a} → ${d.b}`);
            }
          } else {
            lines.push('No differences found. Environments are consistent.');
          }
          const textReport = lines.join('\n');
          if (ci) {
            return {
              exit_code: diff.has_diff ? 1 : 0,
              risk_level: diff.risk_level,
              diff_count: diff.diffs.length,
              report: textReport,
            };
          }
          return { report: textReport };
        }
        return diff;
      } catch (e) {
        throw wrapError(e, AI4SErrorCode.FILE_SYSTEM_ERROR);
      }
    },
  },
  {
    name: 'env_check',
    description: 'CI-friendly environment consistency check. Collects current snapshot and compares with baseline. Exit codes: 0=consistent, 1=has differences, 2=error.',
    inputSchema: {
      type: 'object',
      properties: {
        baseline_path: { type: 'string', description: 'Path to baseline snapshot JSON' },
        format: { type: 'string', enum: ['json', 'text'], description: 'Output format (default: text)' },
      },
      required: ['baseline_path'],
    },
    handler: async (input) => {
      const { baseline_path, format } = input as { baseline_path: string; format?: string };
      try {
        const { writeFileSync, readFileSync, mkdtempSync } = await import('fs');
        const { tmpdir } = await import('os');
        const { join } = await import('path');
        const snapshot = await service.collect();
        const tmpFile = join(mkdtempSync(join(tmpdir(), 'ai4s-')), 'current.json');
        writeFileSync(tmpFile, JSON.stringify(snapshot, null, 2));
        const baseline = JSON.parse(readFileSync(baseline_path, 'utf8'));
        const diff = service.diff(baseline, snapshot);
        const lines = [`AI4S Environment Check`, `=====================`, `Baseline: ${baseline_path}`, `Current: ${snapshot.hostname} (${snapshot.os})`, `Result: ${diff.has_diff ? 'DIFFERENCES FOUND' : 'CONSISTENT'}`, `Risk: ${diff.risk_level}`, `Diffs: ${diff.diffs.length}`, ''];
        if (diff.diffs.length > 0) {
          for (const d of diff.diffs) lines.push(`  ${d.key}: ${d.a} → ${d.b}`);
        }
        const report = lines.join('\n');
        return { exit_code: diff.has_diff ? 1 : 0, risk_level: diff.risk_level, diff_count: diff.diffs.length, report };
      } catch (e) {
        return { exit_code: 2, error: e instanceof Error ? e.message : 'Unknown error' };
      }
    },
  },
];
