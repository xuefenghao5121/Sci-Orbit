/**
 * Finetune Tools — MCP Tool Definitions & Exports
 */
export { finetunePrepare } from './prepare.js';
export { finetuneStart } from './start.js';
export { finetuneMonitor, registerJob } from './monitor.js';
export { finetuneResume } from './resume.js';
export { finetuneMerge } from './merge.js';
export { finetuneEvaluate } from './evaluate.js';
export * from './schemas.js';

import { finetunePrepare } from './prepare.js';
import { finetuneStart } from './start.js';
import { finetuneMonitor } from './monitor.js';
import { finetuneResume } from './resume.js';
import { finetuneMerge } from './merge.js';
import { finetuneEvaluate } from './evaluate.js';
import type { MCPToolDefinition } from '../plan-first/index.js';
import type { FinetunePrepareInput, FinetuneStartInput, FinetuneMonitorInput, FinetuneResumeInput, FinetuneMergeInput, FinetuneEvaluateInput } from './schemas.js';

export const finetuneTools: MCPToolDefinition<unknown, unknown>[] = [
  {
    name: 'finetune_prepare',
    description: 'Prepare fine-tuning dataset from knowledge base, paper, or directory',
    inputSchema: { type: 'object', properties: { data_source: { type: 'object', description: 'Source: {type: knowledge_base_id|paper_id|directory, path: string}' }, format: { type: 'string', enum: ['alpaca', 'sharegpt', 'custom'] }, output_dir: { type: 'string' } }, required: ['data_source'] },
    handler: (i) => finetunePrepare(i as FinetunePrepareInput),
  },
  {
    name: 'finetune_start',
    description: 'Start a fine-tuning job (generates config and command, does not execute)',
    inputSchema: { type: 'object', properties: { model_name: { type: 'string' }, dataset_path: { type: 'string' }, method: { type: 'string', enum: ['lora', 'qlora', 'full'] }, hyperparams: { type: 'object' }, output_dir: { type: 'string' } }, required: ['model_name', 'dataset_path'] },
    handler: (i) => finetuneStart(i as FinetuneStartInput),
  },
  {
    name: 'finetune_monitor',
    description: 'Monitor fine-tuning job progress',
    inputSchema: { type: 'object', properties: { job_id: { type: 'string' } }, required: ['job_id'] },
    handler: (i) => finetuneMonitor(i as FinetuneMonitorInput),
  },
  {
    name: 'finetune_resume',
    description: 'Resume fine-tuning from checkpoint',
    inputSchema: { type: 'object', properties: { job_id: { type: 'string' }, checkpoint_path: { type: 'string' } }, required: ['job_id', 'checkpoint_path'] },
    handler: (i) => finetuneResume(i as FinetuneResumeInput),
  },
  {
    name: 'finetune_merge',
    description: 'Merge LoRA adapter weights with base model',
    inputSchema: { type: 'object', properties: { base_model: { type: 'string' }, adapter_path: { type: 'string' }, output_path: { type: 'string' } }, required: ['base_model', 'adapter_path', 'output_path'] },
    handler: (i) => finetuneMerge(i as FinetuneMergeInput),
  },
  {
    name: 'finetune_evaluate',
    description: 'Evaluate fine-tuned model on metrics',
    inputSchema: { type: 'object', properties: { model_path: { type: 'string' }, base_model_path: { type: 'string' }, eval_dataset: { type: 'string' }, metrics: { type: 'array', items: { type: 'string', enum: ['perplexity', 'scientific_qa', 'domain_specific'] } } }, required: ['model_path', 'eval_dataset'] },
    handler: (i) => finetuneEvaluate(i as FinetuneEvaluateInput),
  },
];
