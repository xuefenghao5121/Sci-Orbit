import type { InferStartInput, InferStartOutput } from './schemas.js';

export async function inferStart(input: InferStartInput): Promise<InferStartOutput> {
  const { model_path, engine, params: rawParams } = input;
  const { gpu_memory, context_length = 4096, host = '0.0.0.0', port = 8000 } = rawParams || {};
  const url = `http://${host}:${port}`;

  let command: string;
  if (engine === 'vllm') {
    const gpuArg = gpu_memory ? ` --gpu-memory-utilization ${Math.min(gpu_memory / 100, 0.95)}` : '';
    command = `python -m vllm.entrypoints.openai.api_server --model ${model_path} --host ${host} --port ${port} --max-model-len ${context_length}${gpuArg}`;
  } else if (engine === 'ollama') {
    command = `ollama serve & sleep 2 && ollama run ${model_path}`;
  } else {
    command = `./llama-server -m ${model_path} -c ${context_length} --host ${host} --port ${port} -t 8`;
  }

  return {
    service_url: url,
    pid: 'run command to get PID',
    health_endpoint: `${url}/health`,
    command,
  };
}
