import { describe, it } from 'vitest';
import { finetunePrepare } from '../prepare.js';
import { finetuneStart } from '../start.js';
import { finetuneMonitor } from '../monitor.js';
import { finetuneMerge } from '../merge.js';
import { finetuneEvaluate } from '../evaluate.js';

describe('finetune tools', () => {
  it('prepare generates script', async () => {
    const result = await finetunePrepare({
      data_source: { type: 'directory', path: '/tmp/test_data.json' },
      format: 'alpaca',
      output_dir: '/tmp/ft_test',
    });
    console.log('prepare result:', JSON.stringify(result, null, 2));
    if (result.quality_report) {
      console.log('issues:', result.quality_report.issues);
    }
  });

  it('start generates config and command', async () => {
    const result = await finetuneStart({
      model_name: 'meta-llama/Llama-3-8B',
      dataset_path: '/tmp/data.json',
      method: 'lora',
      hyperparams: { learning_rate: 2e-4, epochs: 3, batch_size: 128, lora_r: 64, lora_alpha: 128, max_seq_length: 2048, warmup_ratio: 0.1 },
    });
    console.log('start result:', JSON.stringify(result, null, 2));
  });

  it('monitor returns job status', async () => {
    const result = await finetuneMonitor({ job_id: 'nonexistent' });
    console.log('monitor result:', JSON.stringify(result, null, 2));
  });

  it('merge generates command', async () => {
    const result = await finetuneMerge({
      base_model: 'meta-llama/Llama-3-8B',
      adapter_path: '/tmp/adapter',
      output_path: '/tmp/merged',
    });
    console.log('merge result:', JSON.stringify(result, null, 2));
  });

  it('evaluate generates script', async () => {
    const result = await finetuneEvaluate({
      model_path: '/tmp/model',
      eval_dataset: '/tmp/eval.json',
      metrics: ['perplexity'],
    });
    console.log('evaluate result:', JSON.stringify(result, null, 2));
  });
});
