import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, mkdirSync, unlinkSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HPCAdapter, JobConfig, JobStatus, JobInfo, JobFilter, JobLog, JobResources } from "./types.js";

const execFileAsync = promisify(execFile);

function parseSlurmStatus(code: number | null, state?: string): JobStatus {
  if (!state) {
    if (code === 0) return 'completed';
    if (code !== null && code !== 0) return 'failed';
    return 'unknown';
  }
  const s = state.toUpperCase();
  if (s === 'PENDING' || s === 'CONFIGURING') return 'pending';
  if (s === 'RUNNING' || s === 'COMPLETING') return 'running';
  if (s === 'COMPLETED') return 'completed';
  if (s === 'FAILED' || s === 'NODE_FAIL' || s === 'OUT_OF_MEMORY' || s === 'TIMEOUT') return 'failed';
  if (s === 'CANCELLED') return 'cancelled';
  return 'unknown';
}

export class SlurmAdapter implements HPCAdapter {
  private workDir: string;

  constructor(workDir?: string) {
    this.workDir = workDir || '/tmp/ai4s-slurm';
    mkdirSync(this.workDir, { recursive: true });
  }

  async submit(config: JobConfig): Promise<string> {
    const scriptPath = join(this.workDir, `job_${Date.now()}.sh`);
    const script = this.generateSbatchScript(config);
    writeFileSync(scriptPath, script, { mode: 0o755 });

    try {
      const { stdout } = await execFileAsync('sbatch', [scriptPath]);
      const match = stdout.match(/Submitted batch job (\d+)/);
      if (!match) throw new Error(`Failed to parse sbatch output: ${stdout}`);
      return match[1];
    } finally {
      unlinkSync(scriptPath);
    }
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    try {
      const { stdout } = await execFileAsync('squeue', ['-j', jobId, '--format=%T', '--noheader']);
      if (!stdout.trim()) {
        // Job not in queue, check sacct
        return this.getStatusFromSacct(jobId);
      }
      return parseSlurmStatus(null, stdout.trim());
    } catch {
      return this.getStatusFromSacct(jobId);
    }
  }

  async cancel(jobId: string): Promise<void> {
    await execFileAsync('scancel', [jobId]);
  }

  async listJobs(filter?: JobFilter): Promise<JobInfo[]> {
    const args = ['--format=%i|%j|%T|%M|%N|%l|%C|%G', '--noheader'];
    if (filter?.name) args.push('--name', filter.name);
    const { stdout } = await execFileAsync('squeue', args);
    if (!stdout.trim()) return [];

    let lines = stdout.trim().split('\n');
    if (filter?.limit) lines = lines.slice(0, filter.limit);

    return lines.map(line => {
      const [id, name, state, , node] = line.split('|');
      return {
        jobId: id,
        name: name || '',
        status: parseSlurmStatus(null, state),
        node: node || undefined,
      };
    });
  }

  async getLogs(jobId: string): Promise<JobLog> {
    const logDir = this.workDir;
    const stdout = this.tryRead(join(logDir, `slurm-${jobId}.out`));
    const stderr = this.tryRead(join(logDir, `slurm-${jobId}.err`));
    return { jobId, stdout, stderr };
  }

  private generateSbatchScript(config: JobConfig): string {
    const res = config.resources ?? {};
    const lines: string[] = ['#!/bin/bash'];
    if (res.partition) lines.push(`#SBATCH --partition=${res.partition}`);
    if (res.nodes) lines.push(`#SBATCH --nodes=${res.nodes}`);
    if (res.cpus) lines.push(`#SBATCH --cpus-per-task=${res.cpus}`);
    if (res.gpus) lines.push(`#SBATCH --gpus=${res.gpus}`);
    if (res.memory) lines.push(`#SBATCH --mem=${res.memory}`);
    if (res.time) lines.push(`#SBATCH --time=${res.time}`);
    if (config.timeout) lines.push(`#SBATCH --time=${formatSeconds(config.timeout)}`);
    if (config.workdir) lines.push(`#SBATCH --chdir=${config.workdir}`);
    lines.push(`#SBATCH --job-name=${config.name}`);
    lines.push(`#SBATCH --output=${this.workDir}/slurm-%j.out`);
    lines.push(`#SBATCH --error=${this.workDir}/slurm-%j.err`);
    lines.push('');

    if (config.env) {
      for (const [k, v] of Object.entries(config.env)) {
        lines.push(`export ${k}="${v}"`);
      }
    }
    lines.push(config.script);
    return lines.join('\n');
  }

  private async getStatusFromSacct(jobId: string): Promise<JobStatus> {
    try {
      const { stdout } = await execFileAsync('sacct', ['-j', jobId, '--format=State,ExitCode', '--noheader', '-P']);
      const line = stdout.trim().split('\n')[0];
      if (!line) return 'unknown';
      const [state, exitCode] = line.split('|');
      return parseSlurmStatus(parseInt(exitCode?.split(':')[0] || '1'), state);
    } catch {
      return 'unknown';
    }
  }

  private tryRead(p: string): string {
    try {
      return existsSync(p) ? readFileSync(p, 'utf-8') : '';
    } catch {
      return '';
    }
  }
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
