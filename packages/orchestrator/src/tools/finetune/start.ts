import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { FinetuneStartInput, FinetuneStartOutput } from './schemas.js';

export async function finetuneStart(input: FinetuneStartInput): Promise<FinetuneStartOutput> {
  const { model_name, dataset_path, method, hyperparams, output_dir = './finetune_output' } = input;
  mkdirSync(output_dir, { recursive: true });
  const job_id = `ft_${randomUUID().slice(0, 8)}`;

  const config = generateConfig(model_name, dataset_path, method, hyperparams, output_dir);
  const configPath = join(output_dir, `config_${job_id}.yaml`);
  writeFileSync(configPath, config);

  const command = generateCommand(method, configPath, output_dir);
  return {
    job_id,
    config_file: configPath,
    command,
    estimated_time: `~${hyperparams.epochs * 2}h (estimated)`,
    gpu_required: method === 'qlora' ? '16GB VRAM' : '24GB+ VRAM',
  };
}

function generateConfig(model: string, dataset: string, method: string, hp: any, outputDir: string): string {
  const loraBlock = (method === 'lora' || method === 'qlora') ? `
lora_rank: ${hp.lora_r}
lora_alpha: ${hp.lora_alpha}
lora_target: all` : '';

  return `### Model
model_name_or_path: ${model}

### Method
finetune_type: ${method}${loraBlock}

### Dataset
dataset: ${dataset}
template: default
cutoff_len: ${hp.max_seq_length}

### Training
per_device_train_batch_size: ${Math.floor(hp.batch_size / 8)}
gradient_accumulation_steps: ${Math.max(1, Math.floor(hp.batch_size / (Math.floor(hp.batch_size / 8) * 8)))}
learning_rate: ${hp.learning_rate}
num_train_epochs: ${hp.epochs}
warmup_ratio: ${hp.warmup_ratio}
lr_scheduler_type: cosine
fp16: true

### Output
output_dir: ${outputDir}
logging_steps: 10
save_steps: 500
save_total_limit: 3
`;
}

function generateCommand(method: string, configPath: string, outputDir: string): string {
  return `llamafactory-cli train ${configPath} 2>&1 | tee ${outputDir}/training.log`;
}
