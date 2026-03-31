/**
 * Finetune tools unit tests
 */
import { finetunePrepare } from '../finetune/prepare.js';
import { finetuneStart } from '../finetune/start.js';
import { finetuneMonitor, registerJob } from '../finetune/monitor.js';
import { finetuneResume } from '../finetune/resume.js';
import { finetuneMerge } from '../finetune/merge.js';
import { finetuneEvaluate } from '../finetune/evaluate.js';

describe('finetune_prepare', () => {
  it('should prepare config and dataset', async () => {
    const result = await finetunePrepare({
      model_name: 'qwen-7b',
      dataset_path: '/data/train.jsonl',
      method: 'lora',
    });
    expect(result.config_file).toBeTruthy();
    expect(result.dataset_info).toBeDefined();
  });
});

describe('finetune_start', () => {
  it('should return job_id', async () => {
    const result = await finetuneStart({
      model_name: 'qwen-7b',
      dataset_path: '/data/train.jsonl',
      method: 'lora',
    });
    expect(result.job_id).toBeTruthy();
    expect(result.status).toBeDefined();
  });
});

describe('finetune_monitor', () => {
  it('should return job status', async () => {
    registerJob('test-job', { config_file: 'cfg.yaml', output_dir: '/out', total_epochs: 3 });
    const result = await finetuneMonitor({ job_id: 'test-job' });
    expect(result.job_id).toBe('test-job');
    expect(result.status).toBeDefined();
  });
});

describe('finetune_resume', () => {
  it('should return resumed job info', async () => {
    const result = await finetuneResume({ job_id: 'test-job', checkpoint: '/out/checkpoint-1' });
    expect(result.job_id).toBe('test-job');
    expect(result.status).toBeDefined();
  });
});

describe('finetune_merge', () => {
  it('should return merge result', async () => {
    const result = await finetuneMerge({
      base_model: 'qwen-7b',
      adapter_path: '/out/adapter',
      output_dir: '/out/merged',
    });
    expect(result.merged_model_path).toBeTruthy();
  });
});

describe('finetune_evaluate', () => {
  it('should return evaluation metrics', async () => {
    const result = await finetuneEvaluate({
      model_path: '/out/merged',
      test_dataset: '/data/test.jsonl',
    });
    expect(result.metrics).toBeDefined();
  });
});
