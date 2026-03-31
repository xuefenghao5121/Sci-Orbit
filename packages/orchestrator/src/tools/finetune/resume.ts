import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import type { FinetuneResumeInput, FinetuneResumeOutput } from './schemas.js';
import { jobStore } from './monitor.js';

export async function finetuneResume(input: FinetuneResumeInput): Promise<FinetuneResumeOutput> {
  const { job_id, checkpoint_path } = input;
  const job = jobStore.get(job_id);

  if (!job) {
    throw new Error(`Job ${job_id} not found`);
  }

  const new_job_id = `ft_${randomUUID().slice(0, 8)}`;

  // Read original config and modify for resume
  let originalConfig = '';
  try { originalConfig = readFileSync(job.config_file, 'utf-8'); } catch { /* empty */ }

  const resumeConfig = originalConfig + `\n### Resume\nresume_from_checkpoint: ${checkpoint_path}\n`;
  const newConfigPath = job.config_file.replace(/config_[^.]+\.yaml/, `config_${new_job_id}.yaml`);
  const { writeFileSync } = await import('fs');
  writeFileSync(newConfigPath, resumeConfig);

  const command = `llamafactory-cli train ${newConfigPath} 2>&1 | tee ${job.output_dir}/training_resume.log`;

  return {
    new_job_id,
    resumed_from_epoch: 0,
    config_file: newConfigPath,
    command,
  };
}
