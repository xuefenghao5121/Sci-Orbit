import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync, unlinkSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { HPCAdapter, JobConfig, JobStatus, JobInfo, JobFilter, JobLog } from "./types.js";

interface LocalJob {
  id: string;
  name: string;
  process: ChildProcess;
  status: JobStatus;
  startTime: string;
  endTime?: string;
  exitCode?: number;
  workdir?: string;
  stdoutPath: string;
  stderrPath: string;
}

export class LocalAdapter implements HPCAdapter {
  private jobs = new Map<string, LocalJob>();
  private logDir: string;

  constructor(logDir?: string) {
    this.logDir = logDir || '/tmp/ai4s-local';
    mkdirSync(this.logDir, { recursive: true });
  }

  async submit(config: JobConfig): Promise<string> {
    const jobId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const stdoutPath = join(this.logDir, `${jobId}.out`);
    const stderrPath = join(this.logDir, `${jobId}.err`);

    const stdoutFile = writeFileSync(stdoutPath, '', 'utf-8');
    const stderrFile = writeFileSync(stderrPath, '', 'utf-8');

    const proc = spawn('/bin/bash', ['-c', config.script], {
      cwd: config.workdir,
      env: { ...process.env, ...config.env },
      detached: true,
    });

    proc.stdout?.on('data', (data: Buffer) => appendFileSync(stdoutPath, data, 'utf-8'));
    proc.stderr?.on('data', (data: Buffer) => appendFileSync(stderrPath, data, 'utf-8'));

    proc.on('close', (code) => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = code === 0 ? 'completed' : 'failed';
        job.exitCode = code ?? undefined;
        job.endTime = new Date().toISOString();
      }
    });

    proc.on('error', () => {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.endTime = new Date().toISOString();
      }
    });

    proc.unref();

    const job: LocalJob = {
      id: jobId,
      name: config.name,
      process: proc,
      status: 'running',
      startTime: new Date().toISOString(),
      workdir: config.workdir,
      stdoutPath,
      stderrPath,
    };

    this.jobs.set(jobId, job);
    return jobId;
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    const job = this.jobs.get(jobId);
    if (!job) return 'unknown';
    // Re-check if process is still running
    if (job.status === 'running' && !this.isRunning(job.process)) {
      job.status = job.exitCode === 0 ? 'completed' : 'failed';
      job.endTime = new Date().toISOString();
    }
    return job.status;
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.process.pid) {
      try {
        process.kill(-job.process.pid, 'SIGTERM');
      } catch {
        process.kill(job.process.pid, 'SIGTERM');
      }
    }
    job.status = 'cancelled';
    job.endTime = new Date().toISOString();
  }

  async listJobs(filter?: JobFilter): Promise<JobInfo[]> {
    let result: JobInfo[] = Array.from(this.jobs.values()).map(job => ({
      jobId: job.id,
      name: job.name,
      status: job.status,
      startTime: job.startTime,
      endTime: job.endTime,
      exitCode: job.exitCode,
      workdir: job.workdir,
    }));

    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      result = result.filter(j => statuses.includes(j.status));
    }
    if (filter?.name) result = result.filter(j => j.name.includes(filter.name!));
    if (filter?.limit) result = result.slice(0, filter.limit);
    return result;
  }

  async getLogs(jobId: string): Promise<JobLog> {
    const stdout = this.tryRead(join(this.logDir, `${jobId}.out`));
    const stderr = this.tryRead(join(this.logDir, `${jobId}.err`));
    return { jobId, stdout, stderr };
  }

  private isRunning(proc: ChildProcess): boolean {
    return !!(proc.pid && proc.exitCode === null && proc.signalCode === null);
  }

  private tryRead(p: string): string {
    try {
      return existsSync(p) ? readFileSync(p, 'utf-8') : '';
    } catch {
      return '';
    }
  }
}
