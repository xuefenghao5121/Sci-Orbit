/**
 * 环境检测服务 — 轻量级环境信息采集
 * 注意：与 EnvSnapshotService 不同，这里提供 EnvironmentInfo 结构供 param-completer 等模块使用
 */
import { execFile } from "node:child_process";
import * as os from "node:os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function execCmd(cmd: string, timeout = 5000): Promise<string> {
  return execFileAsync('sh', ['-c', cmd], { timeout, encoding: 'utf-8' })
    .then(r => r.stdout.trim())
    .catch(() => '');
}

export interface EnvironmentInfo {
  os: { platform: string; arch: string; release: string };
  cpu: { model: string; cores: number };
  gpu?: { model: string; driver: string; vram?: string };
  memory: { totalGb: number; freeGb: number };
  python?: { version: string; path: string };
  cuda?: { version: string; available: boolean };
  node: { version: string };
}

export class EnvironmentDetectorService {
  async detect(): Promise<EnvironmentInfo> {
    const info: EnvironmentInfo = {
      os: { platform: process.platform, arch: process.arch, release: os.release() },
      cpu: { model: "", cores: 0 },
      memory: { totalGb: 0, freeGb: 0 },
      node: { version: process.version },
    };

    try {
      info.cpu.cores = os.cpus().length;
      info.memory.totalGb = Math.round(os.totalmem() / 1024 / 1024 / 1024);
      info.memory.freeGb = Math.round(os.freemem() / 1024 / 1024 / 1024);
    } catch {}

    const [cpuInfo, gpuInfo, pyVer, pyPath, nvcc] = await Promise.all([
      execCmd("cat /proc/cpuinfo 2>/dev/null | grep 'model name' | head -1"),
      execCmd("nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>/dev/null"),
      execCmd("python3 --version 2>/dev/null"),
      execCmd("which python3 2>/dev/null"),
      execCmd("nvcc --version 2>/dev/null"),
    ]);

    if (cpuInfo) info.cpu.model = cpuInfo.split(":")[1]?.trim() || "";

    if (gpuInfo) {
      const parts = gpuInfo.trim().split(",");
      info.gpu = { model: parts[0]?.trim() || "", driver: parts[1]?.trim() || "", vram: parts[2]?.trim() || "" };
    }

    if (pyVer) info.python = { version: pyVer.trim(), path: pyPath.trim() };

    if (nvcc) {
      const match = nvcc.match(/release (\S+)/);
      info.cuda = { version: match?.[1] || "", available: true };
    } else {
      info.cuda = { version: "", available: false };
    }

    return info;
  }
}

export const environmentDetector = new EnvironmentDetectorService();
