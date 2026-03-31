import { z } from 'zod';

export const inferStartInput = z.object({
  model_path: z.string(),
  engine: z.enum(['vllm', 'ollama', 'llama_cpp']).default('vllm'),
  params: z.object({
    gpu_memory: z.number().optional(),
    context_length: z.number().default(4096),
    host: z.string().default('0.0.0.0'),
    port: z.number().default(8000),
  }).default(() => ({ context_length: 4096, host: '0.0.0.0', port: 8000 })),
});
export const inferStartOutput = z.object({
  service_url: z.string(),
  pid: z.string().describe('PID placeholder - use bash to start'),
  health_endpoint: z.string(),
  command: z.string(),
});
export type InferStartInput = z.infer<typeof inferStartInput>;
export type InferStartOutput = z.infer<typeof inferStartOutput>;

export const inferTestInput = z.object({
  service_url: z.string(),
  test_cases: z.array(z.object({
    prompt: z.string(),
    expected: z.string().optional(),
    max_tokens: z.number().default(256),
  })),
});
export const inferTestOutput = z.object({
  responses: z.array(z.object({
    prompt: z.string(),
    response: z.string(),
    latency_ms: z.number(),
  })),
  scores: z.object({
    avg_latency_ms: z.number(),
    total_tests: z.number(),
    pass_rate: z.number().optional(),
  }),
  test_script: z.string(),
});
export type InferTestInput = z.infer<typeof inferTestInput>;
export type InferTestOutput = z.infer<typeof inferTestOutput>;

export const inferStopInput = z.object({
  service_url: z.string().optional(),
  pid: z.string().optional(),
});
export const inferStopOutput = z.object({
  stopped: z.boolean(),
  command: z.string(),
});
export type InferStopInput = z.infer<typeof inferStopInput>;
export type InferStopOutput = z.infer<typeof inferStopOutput>;
