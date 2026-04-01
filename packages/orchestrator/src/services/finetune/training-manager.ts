import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import type { HPCAdapter } from "../hpc/types.js";

const execFileAsync = promisify(execFile);

export interface ResourceInfo {
  gpus: { count: number; type: string; memoryGB: number }[];
  cpus: number;
  memoryGB: number;
  diskFreeGB: number;
}

export interface TrainingConfig {
  model_name_or_path: string;
  dataset: string;
  template?: string;
  finetuning_type?: string;
  lora_rank?: number;
  lora_alpha?: number;
  lora_target?: string[];
  per_device_train_batch_size?: number;
  gradient_accumulation_steps?: number;
  learning_rate?: number;
  num_train_epochs?: number;
  max_samples?: number;
  output_dir?: string;
  fp16?: boolean;
  bf16?: boolean;
  [key: string]: unknown;
}

export interface DatasetInfo {
  path: string;
  format: string;
  samples: number;
  columns: string[];
  sizeBytes: number;
}

export interface TrainingStatus {
  jobId: string;
  status: 'preparing' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  currentEpoch?: number;
  totalEpochs?: number;
  loss?: number;
  evalLoss?: number;
  checkpoint?: string;
  outputDir?: string;
}

export interface EvalResult {
  model_path: string;
  metrics: Record<string, number>;
  predictions: Array<{ prompt: string; expected?: string; actual: string }>;
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export class TrainingManager {
  private hpcManager: HPCAdapter | null = null;
  private workDir: string;
  private statusMap = new Map<string, TrainingStatus>();

  constructor(workDir?: string) {
    this.workDir = workDir || '/tmp/ai4s-training';
    ensureDir(this.workDir);
  }

  setHPCManager(manager: HPCAdapter): void {
    this.hpcManager = manager;
  }

  async prepareDataset(source: string, format: string): Promise<DatasetInfo> {
    const stats = statSync(source);
    if (stats.isDirectory()) {
      const files = readdirSync(source).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));
      const totalLines = files.reduce((acc, f) => {
        const content = readFileSync(join(source, f), 'utf-8');
        return acc + content.trim().split('\n').length;
      }, 0);
      return { path: source, format, samples: totalLines, columns: ['instruction', 'input', 'output'], sizeBytes: stats.size };
    }
    const content = readFileSync(source, 'utf-8');
    const lines = content.trim().split('\n');
    let columns: string[] = [];
    try { columns = Object.keys(JSON.parse(lines[0])); } catch { /* skip */ }
    return { path: source, format, samples: lines.length, columns, sizeBytes: stats.size };
  }

  async startTraining(config: TrainingConfig): Promise<string> {
    const jobId = `train_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const outputDir = config.output_dir || join(this.workDir, jobId);
    ensureDir(outputDir);

    const status: TrainingStatus = { jobId, status: 'preparing', totalEpochs: config.num_train_epochs ?? 3, outputDir };
    this.statusMap.set(jobId, status);

    const configYaml = generateLLaMAFactoryConfig({ ...config, output_dir: outputDir });
    writeFileSync(join(outputDir, 'config.yaml'), configYaml, 'utf-8');

    status.status = 'running';

    if (this.hpcManager) {
      await this.hpcManager.submit({
        name: jobId,
        script: `cd ${outputDir} && llamafactory-cli train config.yaml`,
        workdir: outputDir,
      });
    } else {
      const { spawn } = await import('node:child_process');
      const proc = spawn('llamafactory-cli', ['train', join(outputDir, 'config.yaml')], {
        cwd: outputDir, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      });
      proc.stdout?.on('data', (data: Buffer) => this.parseTrainingLog(jobId, data.toString()));
      proc.stderr?.on('data', (data: Buffer) => this.parseTrainingLog(jobId, data.toString()));
      proc.on('close', (code) => {
        const s = this.statusMap.get(jobId);
        if (s) s.status = code === 0 ? 'completed' : 'failed';
      });
      proc.unref();
    }

    return jobId;
  }

  async monitorTraining(jobId: string): Promise<TrainingStatus> {
    return this.statusMap.get(jobId) || { jobId, status: 'failed' };
  }

  async resumeTraining(jobId: string, checkpoint?: string): Promise<string> {
    const prev = this.statusMap.get(jobId);
    if (!prev) throw new Error(`Training job ${jobId} not found`);
    const newJobId = `train_${Date.now()}_resume`;
    const outputDir = prev.outputDir || join(this.workDir, newJobId);
    ensureDir(outputDir);
    const status: TrainingStatus = { jobId: newJobId, status: 'running', totalEpochs: prev.totalEpochs, outputDir };
    this.statusMap.set(newJobId, status);
    return newJobId;
  }

  async mergeWeights(baseModel: string, adapterPath: string, outputPath: string): Promise<string> {
    ensureDir(outputPath);
    const mergeConfig = `model_name_or_path: ${baseModel}\nfinetuning_type: lora\ntemplate: default\nadapter_name_or_path: ${adapterPath}\nexport_dir: ${outputPath}\nexport_size: 2\nexport_legacy_format: false\n`;
    const configPath = join(outputPath, 'merge_config.yaml');
    writeFileSync(configPath, mergeConfig, 'utf-8');
    try { await execFileAsync('llamafactory-cli', ['export', configPath]); } catch {
      await execFileAsync('python', ['-m', 'llamafactory.cli.export', configPath]);
    }
    return outputPath;
  }

  async evaluateModel(modelPath: string, evalConfig: Record<string, unknown>): Promise<EvalResult> {
    const prompts = (evalConfig.prompts as string[]) || ['Hello, world!'];
    return {
      model_path: modelPath,
      metrics: { dummy_score: 0 },
      predictions: prompts.map(p => ({ prompt: p, actual: '[requires inference service]' })),
    };
  }

  private parseTrainingLog(jobId: string, log: string): void {
    const status = this.statusMap.get(jobId);
    if (!status) return;
    const lossMatch = log.match(/['"]loss['"]\s*:\s*([\d.]+)/);
    if (lossMatch) status.loss = parseFloat(lossMatch[1]);
    const epochMatch = log.match(/['"]epoch['"]\s*:\s*([\d.]+)/);
    if (epochMatch) {
      status.currentEpoch = Math.floor(parseFloat(epochMatch[1]));
      if (status.totalEpochs) status.progress = Math.round((status.currentEpoch / status.totalEpochs) * 100);
    }
  }
}

export class ConfigGenerator {
  async generateLLaMAFactoryConfig(params: TrainingConfig): Promise<string> {
    return generateLLaMAFactoryConfig(params);
  }

  async generateAxolotlConfig(params: Record<string, unknown>): Promise<string> {
    return generateAxolotlConfig(params);
  }

  async autoDetectResources(): Promise<ResourceInfo> {
    try {
      const { stdout } = await execFileAsync('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader']);
      const gpus = stdout.trim().split('\n').map(line => {
        const [name, mem] = line.split(',').map(s => s.trim());
        return { count: 1, type: name, memoryGB: parseInt(mem) / 1024 };
      });
      return { gpus, cpus: os.cpus().length, memoryGB: Math.round(os.totalmem() / (1024 ** 3)), diskFreeGB: 100 };
    } catch {
      return { gpus: [], cpus: os.cpus().length, memoryGB: Math.round(os.totalmem() / (1024 ** 3)), diskFreeGB: 100 };
    }
  }

  async recommendConfig(resources: ResourceInfo, modelSize: string): Promise<TrainingConfig> {
    const sizeGB = parseFloat(modelSize) || 7;
    const hasGPU = resources.gpus.length > 0;
    const gpuMem = hasGPU ? resources.gpus[0].memoryGB * resources.gpus[0].count : 0;
    const base: TrainingConfig = { model_name_or_path: '', dataset: '', per_device_train_batch_size: 1, gradient_accumulation_steps: 8, learning_rate: 5e-5, num_train_epochs: 3, max_samples: 10000 };
    if (hasGPU && gpuMem > sizeGB * 2) {
      base.fp16 = true;
      base.per_device_train_batch_size = Math.max(1, Math.floor(gpuMem / (sizeGB * 2)));
    } else {
      base.gradient_accumulation_steps = 16;
    }
    if (sizeGB > 13) { base.lora_rank = 16; base.lora_alpha = 32; }
    else { base.lora_rank = 8; base.lora_alpha = 16; }
    return base;
  }
}

export class CheckpointManager {
  private workDir: string;
  constructor(workDir?: string) { this.workDir = workDir || '/tmp/ai4s-training'; }

  listCheckpoints(jobId: string): string[] {
    const parent = join(this.workDir, jobId);
    if (!existsSync(parent)) return [];
    return readdirSync(parent).filter(d => d.startsWith('checkpoint-')).sort().map(d => join(parent, d));
  }

  getLatestCheckpoint(jobId: string): string | null {
    const cps = this.listCheckpoints(jobId);
    return cps.length > 0 ? cps[cps.length - 1] : null;
  }

  cleanupOldCheckpoints(jobId: string, keepLastN: number = 2): number {
    const cps = this.listCheckpoints(jobId);
    if (cps.length <= keepLastN) return 0;
    const toRemove = cps.slice(0, cps.length - keepLastN);
    for (const dir of toRemove) {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    return toRemove.length;
  }
}

function generateLLaMAFactoryConfig(p: TrainingConfig): string {
  const lines: string[] = [];
  lines.push(`model_name_or_path: ${p.model_name_or_path}`);
  lines.push(`dataset: ${p.dataset}`);
  if (p.template) lines.push(`template: ${p.template}`);
  if (p.finetuning_type) lines.push(`finetuning_type: ${p.finetuning_type}`);
  if (p.lora_rank) lines.push(`lora_rank: ${p.lora_rank}`);
  if (p.lora_alpha) lines.push(`lora_alpha: ${p.lora_alpha}`);
  if (p.lora_target) lines.push(`lora_target: [${p.lora_target.map(t => `"${t}"`).join(', ')}]`);
  lines.push(`per_device_train_batch_size: ${p.per_device_train_batch_size ?? 2}`);
  lines.push(`gradient_accumulation_steps: ${p.gradient_accumulation_steps ?? 8}`);
  lines.push(`learning_rate: ${p.learning_rate ?? 5e-5}`);
  lines.push(`num_train_epochs: ${p.num_train_epochs ?? 3}`);
  if (p.max_samples) lines.push(`max_samples: ${p.max_samples}`);
  lines.push(`output_dir: ${p.output_dir || '/tmp/ai4s-training/output'}`);
  if (p.fp16) lines.push('fp16: true');
  if (p.bf16) lines.push('bf16: true');
  lines.push('logging_steps: 10');
  lines.push('save_steps: 500');
  lines.push('save_total_limit: 3');
  return lines.join('\n');
}

function generateAxolotlConfig(p: Record<string, unknown>): string {
  return `base_model: ${p.model_name_or_path || 'meta-llama/Llama-2-7b-hf'}
model_type: LlamaForCausalLM
load_in_8bit: false
datasets:
  - path: ${p.dataset || 'data.jsonl'}
    type: sharegpt
    conversation: chatml
dataset_prepared_path: last_run_prepared
output_dir: ${p.output_dir || './lora-out'}
adapter: lora
lora_r: ${p.lora_rank || 8}
lora_alpha: ${p.lora_alpha || 16}
lora_dropout: 0.05
micro_batch_size: ${p.per_device_train_batch_size || 2}
gradient_accumulation_steps: ${p.gradient_accumulation_steps || 8}
learning_rate: ${p.learning_rate || 5e-5}
num_epochs: ${p.num_train_epochs || 3}
bf16: ${p.bf16 ?? true}
fp16: ${p.fp16 ?? false}
`;
}
