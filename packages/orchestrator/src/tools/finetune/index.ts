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
import type { MCPToolDefinition } from '../types.js';
import type { FinetunePrepareInput, FinetuneStartInput, FinetuneMonitorInput, FinetuneResumeInput, FinetuneMergeInput, FinetuneEvaluateInput } from './schemas.js';
import { wrapError, AI4SErrorCode } from '../../utils/errors.js';

export const finetuneTools: MCPToolDefinition<unknown, unknown>[] = [
  {
    name: 'finetune_prepare',
    description: 'Prepare fine-tuning dataset from knowledge base, paper, or directory',
    inputSchema: { type: 'object', properties: { data_source: { type: 'object', description: 'Source: {type: knowledge_base_id|paper_id|directory, path: string}' }, format: { type: 'string', enum: ['alpaca', 'sharegpt', 'custom'] }, output_dir: { type: 'string' } }, required: ['data_source'] },
    handler: (i) => {
      try { return finetunePrepare(i as FinetunePrepareInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'finetune_start',
    description: 'Start a fine-tuning job (generates config and command, does not execute)',
    inputSchema: { type: 'object', properties: { model_name: { type: 'string' }, dataset_path: { type: 'string' }, method: { type: 'string', enum: ['lora', 'qlora', 'full'] }, hyperparams: { type: 'object' }, output_dir: { type: 'string' } }, required: ['model_name', 'dataset_path'] },
    handler: (i) => {
      try { return finetuneStart(i as FinetuneStartInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'finetune_monitor',
    description: 'Monitor fine-tuning job progress',
    inputSchema: { type: 'object', properties: { job_id: { type: 'string' } }, required: ['job_id'] },
    handler: (i) => {
      try { return finetuneMonitor(i as FinetuneMonitorInput); }
      catch (e) { throw wrapError(e); }
    },
  },
  {
    name: 'finetune_resume',
    description: 'Resume fine-tuning from checkpoint',
    inputSchema: { type: 'object', properties: { job_id: { type: 'string' }, checkpoint_path: { type: 'string' } }, required: ['job_id', 'checkpoint_path'] },
    handler: (i) => {
      try { return finetuneResume(i as FinetuneResumeInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'finetune_merge',
    description: 'Merge LoRA adapter weights with base model',
    inputSchema: { type: 'object', properties: { base_model: { type: 'string' }, adapter_path: { type: 'string' }, output_path: { type: 'string' } }, required: ['base_model', 'adapter_path', 'output_path'] },
    handler: (i) => {
      try { return finetuneMerge(i as FinetuneMergeInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
  {
    name: 'finetune_evaluate',
    description: 'Evaluate fine-tuned model on metrics',
    inputSchema: { type: 'object', properties: { model_path: { type: 'string' }, base_model_path: { type: 'string' }, eval_dataset: { type: 'string' }, metrics: { type: 'array', items: { type: 'string', enum: ['perplexity', 'scientific_qa', 'domain_specific'] } } }, required: ['model_path', 'eval_dataset'] },
    handler: (i) => {
      try { return finetuneEvaluate(i as FinetuneEvaluateInput); }
      catch (e) { throw wrapError(e, AI4SErrorCode.PARAM_INVALID); }
    },
  },
];

// v0.5.0 精简导出：只保留数据准备（start/monitor/resume/merge/evaluate 由 Claude Code 通过 shell 执行）
export const finetuneDataTools: MCPToolDefinition<unknown, unknown>[] = finetuneTools.filter(t => t.name === 'finetune_prepare');
