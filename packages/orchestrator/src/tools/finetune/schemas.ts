import { z } from 'zod';

// finetune_prepare
export const finetunePrepareInput = z.object({
  data_source: z.object({
    type: z.enum(['knowledge_base_id', 'paper_id', 'directory']),
    path: z.string(),
  }),
  format: z.enum(['alpaca', 'sharegpt', 'custom']).default('alpaca'),
  output_dir: z.string().default('./finetune_data'),
});
export const finetunePrepareOutput = z.object({
  dataset_info: z.object({
    sample_count: z.number(),
    format: z.string(),
    path: z.string(),
    avg_instruction_length: z.number(),
    avg_output_length: z.number(),
  }),
  quality_report: z.object({
    total_samples: z.number(),
    empty_count: z.number(),
    duplicate_count: z.number(),
    avg_quality_score: z.number().min(0).max(1),
    issues: z.array(z.string()),
  }),
});
export type FinetunePrepareInput = z.infer<typeof finetunePrepareInput>;
export type FinetunePrepareOutput = z.infer<typeof finetunePrepareOutput>;

// finetune_start
export const finetuneStartInput = z.object({
  model_name: z.string(),
  dataset_path: z.string(),
  method: z.enum(['lora', 'qlora', 'full']).default('lora'),
  hyperparams: z.object({
    learning_rate: z.number().default(2e-4),
    epochs: z.number().default(3),
    batch_size: z.number().default(128),
    lora_r: z.number().default(64),
    lora_alpha: z.number().default(128),
    max_seq_length: z.number().default(2048),
    warmup_ratio: z.number().default(0.1),
  }).default(() => ({ learning_rate: 2e-4, epochs: 3, batch_size: 128, lora_r: 64, lora_alpha: 128, max_seq_length: 2048, warmup_ratio: 0.1 })),
  output_dir: z.string().default('./finetune_output'),
});
export const finetuneStartOutput = z.object({
  job_id: z.string(),
  config_file: z.string(),
  command: z.string(),
  estimated_time: z.string(),
  gpu_required: z.string(),
});
export type FinetuneStartInput = z.infer<typeof finetuneStartInput>;
export type FinetuneStartOutput = z.infer<typeof finetuneStartOutput>;

// finetune_monitor
export const finetuneMonitorInput = z.object({
  job_id: z.string(),
});
export const finetuneMonitorOutput = z.object({
  job_id: z.string(),
  status: z.enum(['running', 'completed', 'failed', 'queued']),
  current_epoch: z.number(),
  total_epochs: z.number(),
  train_loss: z.number().optional(),
  eval_loss: z.number().optional(),
  learning_rate: z.number().optional(),
  gpu_utilization: z.number().optional(),
  gpu_memory_used: z.number().optional(),
  eta: z.string().optional(),
  logs_tail: z.string().optional(),
});
export type FinetuneMonitorInput = z.infer<typeof finetuneMonitorInput>;
export type FinetuneMonitorOutput = z.infer<typeof finetuneMonitorOutput>;

// finetune_resume
export const finetuneResumeInput = z.object({
  job_id: z.string(),
  checkpoint_path: z.string(),
});
export const finetuneResumeOutput = z.object({
  new_job_id: z.string(),
  resumed_from_epoch: z.number(),
  config_file: z.string(),
  command: z.string(),
});
export type FinetuneResumeInput = z.infer<typeof finetuneResumeInput>;
export type FinetuneResumeOutput = z.infer<typeof finetuneResumeOutput>;

// finetune_merge
export const finetuneMergeInput = z.object({
  base_model: z.string(),
  adapter_path: z.string(),
  output_path: z.string(),
});
export const finetuneMergeOutput = z.object({
  merged_model_path: z.string(),
  size_comparison: z.object({
    base_model_size: z.string(),
    adapter_size: z.string(),
    merged_size: z.string(),
  }),
  command: z.string(),
});
export type FinetuneMergeInput = z.infer<typeof finetuneMergeInput>;
export type FinetuneMergeOutput = z.infer<typeof finetuneMergeOutput>;

// finetune_evaluate
export const finetuneEvaluateInput = z.object({
  model_path: z.string(),
  base_model_path: z.string().optional(),
  eval_dataset: z.string(),
  metrics: z.array(z.enum(['perplexity', 'scientific_qa', 'domain_specific'])).default(['perplexity']),
});
export const finetuneEvaluateOutput = z.object({
  model_path: z.string(),
  eval_results: z.object({
    perplexity: z.number().optional(),
    scientific_qa_accuracy: z.number().optional(),
    domain_specific_score: z.number().optional(),
  }),
  comparison_with_base: z.record(z.string(), z.number()).optional(),
  eval_script: z.string(),
});
export type FinetuneEvaluateInput = z.infer<typeof finetuneEvaluateInput>;
export type FinetuneEvaluateOutput = z.infer<typeof finetuneEvaluateOutput>;
