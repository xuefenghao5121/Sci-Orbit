import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readdirSync, statSync, mkdirSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import os from "node:os";

const execFileAsync = promisify(execFile);

export type InferenceEngine = 'vllm' | 'llamacpp' | 'ollama' | 'transformers';

export interface ServerParams {
  host?: string;
  port?: number;
  gpuMemoryUtilization?: number;
  maxModelLen?: number;
  quantization?: string;
  numGpus?: number;
  tpSize?: number;
  ctxSize?: number;
  threads?: number;
}

export interface ServiceInfo {
  pid: number;
  url: string;
  engine: InferenceEngine;
  modelPath: string;
  startTime: string;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs?: number;
  model?: string;
  gpuMemoryUsed?: number;
  error?: string;
}

export interface ModelInfo {
  name: string;
  path: string;
  sizeGB: number;
  format: string;
  parameters?: string;
}

export interface InferenceResult {
  prompt: string;
  response: string;
  latencyMs: number;
  tokensPerSecond?: number;
}

const runningServers = new Map<string, { proc: ChildProcess; info: ServiceInfo }>();

export class ServerManager {
  private defaultHost = '127.0.0.1';

  async startServer(modelPath: string, engine: InferenceEngine, params: ServerParams = {}): Promise<ServiceInfo> {
    const host = params.host || this.defaultHost;
    const port = params.port || this.findFreePort();

    let proc: ChildProcess;
    switch (engine) {
      case 'vllm':
        proc = this.startVLLM(modelPath, host, port, params);
        break;
      case 'llamacpp':
        proc = this.startLlamaCpp(modelPath, host, port, params);
        break;
      case 'ollama':
        proc = this.startOllama(modelPath, host, port, params);
        break;
      case 'transformers':
        proc = this.startTransformers(modelPath, host, port, params);
        break;
      default:
        throw new Error(`Unknown engine: ${engine}`);
    }

    const url = `http://${host}:${port}`;
    const info: ServiceInfo = { pid: proc.pid!, url, engine, modelPath, startTime: new Date().toISOString() };
    runningServers.set(url, { proc, info });

    return info;
  }

  async stopServer(serviceUrl: string): Promise<void> {
    const entry = runningServers.get(serviceUrl);
    if (!entry) throw new Error(`Server not found: ${serviceUrl}`);
    if (entry.proc.pid) {
      try { process.kill(entry.proc.pid, 'SIGTERM'); } catch { process.kill(entry.proc.pid, 'SIGKILL'); }
    }
    runningServers.delete(serviceUrl);
  }

  async healthCheck(serviceUrl: string): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const res = await fetch(`${serviceUrl}/health`);
      const latencyMs = Date.now() - start;
      if (!res.ok) return { healthy: false, error: `HTTP ${res.status}`, latencyMs };
      const data = await res.json().catch(() => ({}));
      return { healthy: true, latencyMs, model: (data as any).model };
    } catch (e: any) {
      return { healthy: false, error: e.message, latencyMs: Date.now() - start };
    }
  }

  async testInference(serviceUrl: string, prompts: string[]): Promise<InferenceResult[]> {
    const results: InferenceResult[] = [];
    for (const prompt of prompts) {
      const start = Date.now();
      try {
        const res = await fetch(`${serviceUrl}/v1/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, max_tokens: 128 }),
        });
        const data = await res.json() as any;
        const text = data.choices?.[0]?.text || data.choices?.[0]?.message?.content || '';
        results.push({ prompt, response: text, latencyMs: Date.now() - start });
      } catch (e: any) {
        results.push({ prompt, response: `[error: ${e.message}]`, latencyMs: Date.now() - start });
      }
    }
    return results;
  }

  listServers(): ServiceInfo[] {
    return Array.from(runningServers.values()).map(e => e.info);
  }

  private startVLLM(modelPath: string, host: string, port: number, params: ServerParams): ChildProcess {
    const args = ['--host', host, '--port', String(port), '--model', modelPath];
    if (params.gpuMemoryUtilization) args.push('--gpu-memory-utilization', String(params.gpuMemoryUtilization));
    if (params.maxModelLen) args.push('--max-model-len', String(params.maxModelLen));
    if (params.quantization) args.push('--quantization', params.quantization);
    if (params.tpSize) args.push('--tensor-parallel-size', String(params.tpSize));
    const proc = spawn('vllm', args, { detached: true, stdio: 'ignore' });
    proc.unref();
    return proc;
  }

  private startLlamaCpp(modelPath: string, host: string, port: number, params: ServerParams): ChildProcess {
    const args = ['-m', modelPath, '--host', host, '--port', String(port)];
    if (params.ctxSize) args.push('-c', String(params.ctxSize));
    if (params.threads) args.push('-t', String(params.threads));
    const proc = spawn('llama-server', args, { detached: true, stdio: 'ignore' });
    proc.unref();
    return proc;
  }

  private startOllama(modelPath: string, host: string, port: number, params: ServerParams): ChildProcess {
    const modelName = basename(modelPath);
    const proc = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore', env: { ...process.env, OLLAMA_HOST: `${host}:${port}` } });
    proc.unref();
    return proc;
  }

  private startTransformers(modelPath: string, host: string, port: number, params: ServerParams): ChildProcess {
    const proc = spawn('python', ['-m', 'transformers.server', '--model', modelPath, '--host', host, '--port', String(port)], { detached: true, stdio: 'ignore' });
    proc.unref();
    return proc;
  }

  private findFreePort(): number {
    // Simple heuristic: use a random port in range 8000-9000
    return 8000 + Math.floor(Math.random() * 1000);
  }
}

export class ModelManager {
  private modelDir: string;

  constructor(modelDir?: string) {
    this.modelDir = modelDir || join(os.homedir(), '.ai4s', 'models');
    mkdirSync(this.modelDir, { recursive: true });
  }

  async downloadModel(name: string, source: string): Promise<string> {
    const outputPath = join(this.modelDir, name);
    mkdirSync(outputPath, { recursive: true });

    if (source.startsWith('http')) {
      // Use huggingface-cli or git lfs
      try {
        await execFileAsync('huggingface-cli', ['download', source, '--local-dir', outputPath]);
      } catch {
        await execFileAsync('git', ['clone', source, outputPath]);
      }
    } else if (source.startsWith('modelscope://')) {
      await execFileAsync('pip', ['install', '-q', 'modelscope']);
      await execFileAsync('python', ['-c', `from modelscope import snapshot_download; snapshot_download('${source.replace('modelscope://', '')}', local_dir='${outputPath}')`]);
    } else {
      // Assume local path
      await execFileAsync('cp', ['-r', source, outputPath]);
    }
    return outputPath;
  }

  listLocalModels(): ModelInfo[] {
    if (!existsSync(this.modelDir)) return [];
    return readdirSync(this.modelDir).map(name => {
      const path = join(this.modelDir, name);
      try {
        const stats = statSync(path);
        if (!stats.isDirectory()) return null;
        return { name, path, sizeGB: Math.round(stats.size / (1024 ** 3) * 10) / 10, format: 'unknown' };
      } catch { return null; }
    }).filter((m): m is ModelInfo => m !== null);
  }

  async exportModel(modelPath: string, format: string): Promise<string> {
    const outputPath = join(this.modelDir, `${basename(modelPath)}_${format}`);
    mkdirSync(outputPath, { recursive: true });

    switch (format) {
      case 'gguf':
        await execFileAsync('python', ['-c', `
from transformers import AutoTokenizer, AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained("${modelPath}")
model.save_pretrained("${outputPath}")
`]);
        break;
      case 'onnx':
        await execFileAsync('python', ['-m', 'transformers.onnx', '--model', modelPath, outputPath]);
        break;
      default:
        await execFileAsync('cp', ['-r', modelPath, outputPath]);
    }
    return outputPath;
  }

  async modelInfo(modelPath: string): Promise<ModelInfo> {
    const stats = statSync(modelPath);
    return {
      name: basename(modelPath),
      path: modelPath,
      sizeGB: Math.round(stats.size / (1024 ** 3) * 10) / 10,
      format: 'unknown',
    };
  }
}
