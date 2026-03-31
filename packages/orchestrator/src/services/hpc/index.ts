import type { HPCAdapter, JobConfig, JobStatus, JobInfo, JobFilter, JobLog, HPCBackend } from "./types.js";
import { SlurmAdapter } from "./slurm-adapter.js";
import { K8sAdapter } from "./k8s-adapter.js";
import { LocalAdapter } from "./local-adapter.js";

export class HPCManager {
  private adapter: HPCAdapter;
  private backend: HPCBackend;

  constructor(backend: HPCBackend = 'local', options?: Record<string, string>) {
    this.backend = backend;
    switch (backend) {
      case 'slurm':
        this.adapter = new SlurmAdapter(options?.workDir);
        break;
      case 'k8s':
        this.adapter = new K8sAdapter(options?.namespace, options?.image);
        break;
      case 'local':
      default:
        this.adapter = new LocalAdapter(options?.logDir);
        break;
    }
  }

  async submitJob(config: JobConfig): Promise<string> {
    return this.adapter.submit(config);
  }

  async getStatus(jobId: string): Promise<JobStatus> {
    return this.adapter.getStatus(jobId);
  }

  async cancelJob(jobId: string): Promise<void> {
    return this.adapter.cancel(jobId);
  }

  async listJobs(filter?: JobFilter): Promise<JobInfo[]> {
    return this.adapter.listJobs(filter);
  }

  async getLogs(jobId: string): Promise<JobLog> {
    return this.adapter.getLogs(jobId);
  }

  getBackend(): HPCBackend {
    return this.backend;
  }
}

export type { HPCBackend, JobConfig, JobStatus, JobInfo, JobFilter, JobLog, JobResources } from "./types.js";
export { SlurmAdapter } from "./slurm-adapter.js";
export { K8sAdapter } from "./k8s-adapter.js";
export { LocalAdapter } from "./local-adapter.js";
export type { HPCAdapter } from "./types.js";
