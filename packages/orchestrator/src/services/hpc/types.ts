// HPC types shared across adapters

export type HPCBackend = 'slurm' | 'k8s' | 'local';

export interface JobConfig {
  name: string;
  script: string;
  workdir?: string;
  env?: Record<string, string>;
  resources?: JobResources;
  timeout?: number; // seconds
  retry?: number;
}

export interface JobResources {
  cpus?: number;
  gpus?: number;
  memory?: string; // e.g. "16Gi"
  nodes?: number;
  partition?: string;
  time?: string; // slurm time format "01:00:00"
  gpuType?: string;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'unknown';

export interface JobInfo {
  jobId: string;
  name: string;
  status: JobStatus;
  startTime?: string;
  endTime?: string;
  exitCode?: number;
  resources?: JobResources;
  workdir?: string;
  node?: string;
}

export interface JobFilter {
  status?: JobStatus | JobStatus[];
  name?: string;
  since?: string;
  limit?: number;
}

export interface JobLog {
  jobId: string;
  stdout: string;
  stderr: string;
}

export interface HPCAdapter {
  submit(config: JobConfig): Promise<string>;
  getStatus(jobId: string): Promise<JobStatus>;
  cancel(jobId: string): Promise<void>;
  listJobs(filter?: JobFilter): Promise<JobInfo[]>;
  getLogs(jobId: string): Promise<JobLog>;
}
