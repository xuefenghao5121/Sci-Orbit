import { existsSync, readFileSync } from 'fs';
import type { FinetuneMonitorInput, FinetuneMonitorOutput } from './schemas.js';

// Job store (in-memory for now; production would use a DB/file)
export const jobStore = new Map<string, any>();

export function registerJob(jobId: string, config: { config_file: string; output_dir: string; total_epochs: number }): void {
  jobStore.set(jobId, { ...config, status: 'queued', started_at: Date.now() });
}

export async function finetuneMonitor(input: FinetuneMonitorInput): Promise<FinetuneMonitorOutput> {
  const { job_id } = input;
  const job = jobStore.get(job_id);

  if (!job) {
    return { job_id, status: 'failed', current_epoch: 0, total_epochs: 0, logs_tail: 'Job not found' };
  }

  // Try to parse training log for live stats
  const logPath = `${job.output_dir}/training.log`;
  let logsTail = '';
  let trainLoss: number | undefined;
  let evalLoss: number | undefined;
  let currentEpoch = 0;

  if (existsSync(logPath)) {
    const logContent = readFileSync(logPath, 'utf-8');
    const lines = logContent.split('\n');
    logsTail = lines.slice(-10).join('\n');

    for (const line of lines) {
      const lossMatch = line.match(/'loss':\s*([\d.]+)/);
      if (lossMatch) trainLoss = parseFloat(lossMatch[1]);
      const evalMatch = line.match(/'eval_loss':\s*([\d.]+)/);
      if (evalMatch) evalLoss = parseFloat(evalMatch[1]);
      const epochMatch = line.match(/Epoch\s*(\d+)/i);
      if (epochMatch) currentEpoch = Math.max(currentEpoch, parseInt(epochMatch[1]));
    }
  }

  const elapsed = Date.now() - job.started_at;
  const progress = job.total_epochs > 0 ? currentEpoch / job.total_epochs : 0;
  const eta = progress > 0 ? `~${Math.round((elapsed / progress - elapsed) / 60000)}min` : 'calculating...';

  return {
    job_id,
    status: currentEpoch >= job.total_epochs ? 'completed' : 'running',
    current_epoch: currentEpoch,
    total_epochs: job.total_epochs,
    train_loss: trainLoss,
    eval_loss: evalLoss,
    learning_rate: undefined,
    gpu_utilization: undefined,
    gpu_memory_used: undefined,
    eta,
    logs_tail: logsTail || undefined,
  };
}
