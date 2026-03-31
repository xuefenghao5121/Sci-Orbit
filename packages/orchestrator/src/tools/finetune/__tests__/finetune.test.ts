/**
 * Finetune tools unit tests
 */
import { describe, it, expect } from 'vitest';
import { finetunePrepare } from '../prepare.js';
import { finetuneStart } from '../start.js';
import { finetuneMonitor, registerJob } from '../monitor.js';
import { finetuneMerge } from '../merge.js';
import { finetuneEvaluate } from '../evaluate.js';

describe('finetune tools', () => {
  it('prepare generates dataset', async () => {
    const result = await finetunePrepare({
      data_source: { type: 'directory', path: '/tmp/test_data.json' },
      format: 'alpaca',
      output_dir: '/tmp/ft_test',
    });
    expect(result.dataset_info).toBeDefined();
    expect(result.quality_report).toBeDefined();
  });

  it('start generates config and command', async () => {
    const result = await finetuneStart({
      model_name: 'meta-llama/Llama-3-8B',
      dataset_path: '/tmp/data.json',
      method: 'lora',
      hyperparams: { learning_rate: 2e-4, epochs: 3, batch_size: 128, lora_r: 64, lora_alpha: 128, max_seq_length: 2048, warmup_ratio: 0.1 },
    });
    expect(result.job_id).toBeTruthy();
    expect(result.config_file).toBeTruthy();
    expect(result.command).toBeTruthy();
  });

  it('monitor returns job status', async () => {
    registerJob('test-job', { config_file: 'cfg.yaml', output_dir: '/out', total_epochs: 3 });
    const result = await finetuneMonitor({ job_id: 'test-job' });
    expect(result.job_id).toBe('test-job');
    expect(result.status).toBeDefined();
  });

  it('merge generates command', async () => {
    const result = await finetuneMerge({
      base_model: 'meta-llama/Llama-3-8B',
      adapter_path: '/tmp/adapter',
      output_path: '/tmp/merged',
    });
    expect(result.merged_model_path).toBeTruthy();
    expect(result.command).toBeTruthy();
  });

  it('evaluate generates script', async () => {
    const result = await finetuneEvaluate({
      model_path: '/tmp/model',
      eval_dataset: '/tmp/eval.json',
      metrics: ['perplexity'],
    });
    expect(result.model_path).toBeTruthy();
    expect(result.eval_script).toBeTruthy();
  });
});
