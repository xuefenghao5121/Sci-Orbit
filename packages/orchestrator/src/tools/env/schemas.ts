import { z } from 'zod';

export const envDetectOutput = z.object({
  os: z.string(),
  cpu: z.string(),
  gpu: z.array(z.object({ name: z.string(), memory_mb: z.number().optional() })),
  ram_gb: z.number(),
  python: z.string().optional(),
  conda_env: z.string().optional(),
  cuda: z.string().optional(),
  installed_packages: z.array(z.string()),
});
export type EnvDetectOutput = z.infer<typeof envDetectOutput>;

export const envSetupInput = z.object({
  requirements: z.array(z.string()),
  target: z.enum(['conda', 'docker']),
  name: z.string().optional().describe('Environment or image name'),
});
export const envSetupOutput = z.object({
  setup_script: z.string(),
  environment_file: z.string(),
});
export type EnvSetupInput = z.infer<typeof envSetupInput>;
export type EnvSetupOutput = z.infer<typeof envSetupOutput>;
