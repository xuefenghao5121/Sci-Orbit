import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, mkdtempSync, unlinkSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HPCAdapter, JobConfig, JobStatus, JobInfo, JobFilter, JobLog } from "./types.js";

const execFileAsync = promisify(execFile);

function k8sStatusToJobStatus(phase?: string): JobStatus {
  switch (phase) {
    case 'Pending': return 'pending';
    case 'Running': return 'running';
    case 'Succeeded': return 'completed';
    case 'Failed': return 'failed';
    default: return 'unknown';
  }
}

export class K8sAdapter implements HPCAdapter {
  private namespace: string;
  private defaultImage: string;

  constructor(namespace?: string, defaultImage?: string) {
    this.namespace = namespace || 'default';
    this.defaultImage = defaultImage || 'ubuntu:22.04';
  }

  async submit(config: JobConfig): Promise<string> {
    const manifest = this.buildManifest(config);
    const yaml = this.toYaml(manifest);
    const tmpDir = mkdtempSync(join(tmpdir(), 'ai4s-k8s-'));
    const manifestPath = join(tmpDir, 'job.yaml');
    writeFileSync(manifestPath, yaml);

    try {
      await execFileAsync('kubectl', ['apply', '-f', manifestPath, '-n', this.namespace]);
      return manifest.metadata.name;
    } finally {
      unlinkSync(manifestPath);
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    try {
      const { stdout } = await execFileAsync('kubectl', ['get', 'job', jobId, '-n', this.namespace, '-o', 'jsonpath={.status.conditions[0].type}']);
      const type = stdout.trim();
      if (type === 'Complete') return 'completed';
      if (type === 'Failed') return 'failed';
    } catch { /* fall through */ }
    try {
      const { stdout: podPhase } = await execFileAsync('kubectl', ['get', 'pods', '-l', `job-name=${jobId}`, '-n', this.namespace, '-o', 'jsonpath={.items[0].status.phase}']);
      return k8sStatusToJobStatus(podPhase.trim() || undefined);
    } catch {
      return 'unknown';
    }
  }

  async cancel(jobId: string): Promise<void> {
    await execFileAsync('kubectl', ['delete', 'job', jobId, '-n', this.namespace]);
  }

  async listJobs(filter?: JobFilter): Promise<JobInfo[]> {
    const { stdout } = await execFileAsync('kubectl', ['get', 'jobs', '-n', this.namespace, '-o', 'json']);
    const data = JSON.parse(stdout);
    let result = (data.items || []).map((item: any) => ({
      jobId: item.metadata.name,
      name: item.metadata.labels?.['job-name'] || item.metadata.name,
      status: k8sStatusToJobStatus(item.status?.conditions?.[0]?.type),
      startTime: item.status?.startTime,
    }));
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      result = result.filter((j: JobInfo) => statuses.includes(j.status));
    }
    if (filter?.limit) result = result.slice(0, filter.limit);
    return result;
  }

  async getLogs(jobId: string): Promise<JobLog> {
    const { stdout } = await execFileAsync('kubectl', ['logs', `job/${jobId}`, '-n', this.namespace]);
    return { jobId, stdout, stderr: '' };
  }

  private buildManifest(config: JobConfig) {
    const res = config.resources ?? {};
    const labels = { app: 'ai4s', job: config.name };
    const requests: Record<string, string> = {};
    const limits: Record<string, string> = {};
    if (res.cpus) { requests['cpu'] = String(res.cpus); limits['cpu'] = String(res.cpus); }
    if (res.memory) { requests['memory'] = res.memory; limits['memory'] = res.memory; }
    if (res.gpus) limits['nvidia.com/gpu'] = String(res.gpus);

    const hasResources = Object.keys(requests).length > 0;

    return {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: { name: config.name, labels },
      spec: {
        backoffLimit: config.retry ?? 1,
        ttlSecondsAfterFinished: 3600,
        template: {
          metadata: { labels },
          spec: {
            restartPolicy: 'Never',
            containers: [{
              name: config.name,
              image: this.defaultImage,
              command: ['/bin/bash', '-c', config.script],
              env: config.env ? Object.entries(config.env).map(([k, v]) => ({ name: k, value: v })) : undefined,
              resources: hasResources ? { requests, limits } : undefined,
            }],
          },
        },
      },
    };
  }

  private toYaml(obj: any, indent = 0): string {
    const pad = '  '.repeat(indent);
    const lines: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      if (val === undefined || val === null) continue;
      if (Array.isArray(val)) {
        if (val.length === 0) continue;
        lines.push(`${pad}${key}:`);
        for (const item of val) {
          if (typeof item === 'object' && item !== null) {
            lines.push(this.toYaml(item, indent + 1).trimEnd());
          } else {
            lines.push(`${pad}  - ${item}`);
          }
        }
      } else if (typeof val === 'object') {
        if (Object.keys(val).length === 0) continue;
        lines.push(`${pad}${key}:`);
        lines.push(this.toYaml(val, indent + 1).trimEnd());
      } else {
        lines.push(`${pad}${key}: ${val}`);
      }
    }
    return lines.join('\n');
  }
}
