import { describe, it, expect } from 'vitest';
import { TrainingManager, ConfigGenerator, CheckpointManager } from '../index.js';

describe('TrainingManager', () => {
  it('should prepare dataset from string', async () => {
    const tm = new TrainingManager('/tmp/ai4s-test-training');
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync('/tmp/ai4s-test-ds', { recursive: true });
    writeFileSync('/tmp/ai4s-test-ds/data.jsonl', '{"instruction":"hi","output":"hello"}\n{"instruction":"bye","output":"goodbye"}');
    const info = await tm.prepareDataset('/tmp/ai4s-test-ds/data.jsonl', 'alpaca');
    expect(info.samples).toBe(2);
    expect(info.columns).toContain('instruction');
  });

  it('should monitor training', async () => {
    const tm = new TrainingManager();
    const status = await tm.monitorTraining('nonexistent');
    expect(['unknown', 'failed']).toContain(status.status);
  });
});

describe('ConfigGenerator', () => {
  it('should generate LLaMA Factory config', async () => {
    const gen = new ConfigGenerator();
    const yaml = await gen.generateLLaMAFactoryConfig({
      model_name_or_path: '/tmp/model',
      dataset: 'alpaca_zh',
      num_train_epochs: 5,
    });
    expect(yaml).toContain('model_name_or_path: /tmp/model');
    expect(yaml).toContain('num_train_epochs: 5');
  });

  it('should generate Axolotl config', async () => {
    const gen = new ConfigGenerator();
    const yaml = await gen.generateAxolotlConfig({ model_name_or_path: 'meta-llama/Llama-2-7b' });
    expect(yaml).toContain('base_model: meta-llama/Llama-2-7b');
  });

  it('should recommend config based on resources', async () => {
    const gen = new ConfigGenerator();
    const config = await gen.recommendConfig({ gpus: [{ count: 1, type: 'A100', memoryGB: 80 }], cpus: 16, memoryGB: 64, diskFreeGB: 500 }, '7');
    expect(config.lora_rank).toBe(8);
    expect(config.fp16).toBe(true);
  });
});

describe('CheckpointManager', () => {
  it('should list and get latest checkpoint', () => {
    const cm = new CheckpointManager('/tmp/ai4s-test-cp');
    expect(cm.listCheckpoints('nonexistent')).toEqual([]);
    expect(cm.getLatestCheckpoint('nonexistent')).toBeNull();
  });
});
