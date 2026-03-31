import { execSync } from 'child_process';
import type { EnvDetectOutput } from './schemas.js';
import { envDetectOutput } from './schemas.js';

export function envDetect(): EnvDetectOutput {
  const os = process.platform;
  let cpu = 'unknown';
  let ramGb = 0;
  let python: string | undefined;
  let condaEnv: string | undefined;
  let cuda: string | undefined;
  const installedPackages: string[] = [];
  const gpu: { name: string; memory_mb?: number }[] = [];

  try { cpu = execSync('cat /proc/cpuinfo | grep "model name" | head -1').toString().split(':')[1]?.trim() || 'unknown'; } catch {}
  try { ramGb = Math.round(parseInt(execSync('cat /proc/meminfo | grep MemTotal').toString().split(':')[1]) / 1024 / 1024); } catch {}
  try { python = execSync('python3 --version 2>&1').toString().trim(); } catch {}
  try { condaEnv = execSync('conda info --envs 2>/dev/null | grep "*"').toString().trim().split(/\s+/).pop(); } catch {}
  try { cuda = execSync('nvcc --version 2>&1 | grep release').toString().trim(); } catch {}
  try {
    const nvidia = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null').toString().trim();
    for (const line of nvidia.split('\n').filter(Boolean)) {
      const [name, mem] = line.split(',').map(s => s.trim());
      gpu.push({ name, memory_mb: mem ? parseInt(mem) : undefined });
    }
  } catch {}
  try {
    const pkgs = execSync('pip list --format=columns 2>/dev/null | tail -n +3').toString().trim();
    installedPackages.push(...pkgs.split('\n').filter(l => l.trim()).map(l => l.split(/\s+/)[0]).filter(Boolean).slice(0, 50));
  } catch {}

  return envDetectOutput.parse({ os, cpu, gpu, ram_gb: ramGb, python, conda_env: condaEnv, cuda, installed_packages: installedPackages });
}
