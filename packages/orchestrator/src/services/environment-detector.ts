import { execSync } from "node:child_process";
import * as os from "node:os";

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
  detect(): EnvironmentInfo {
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

    // CPU model
    try {
      const cpuInfo = execSync("cat /proc/cpuinfo 2>/dev/null | grep 'model name' | head -1", { encoding: "utf-8" });
      if (cpuInfo) info.cpu.model = cpuInfo.split(":")[1]?.trim() || "";
    } catch {}

    // GPU
    try {
      const gpuInfo = execSync("nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
      if (gpuInfo) {
        const parts = gpuInfo.trim().split(",");
        info.gpu = { model: parts[0]?.trim() || "", driver: parts[1]?.trim() || "", vram: parts[2]?.trim() || "" };
      }
    } catch {}

    // Python
    try {
      const pyVer = execSync("python3 --version 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
      const pyPath = execSync("which python3 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
      if (pyVer) info.python = { version: pyVer.trim(), path: pyPath.trim() };
    } catch {}

    // CUDA
    try {
      const nvcc = execSync("nvcc --version 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
      if (nvcc) {
        const match = nvcc.match(/release (\S+)/);
        info.cuda = { version: match?.[1] || "", available: true };
      }
    } catch {
      info.cuda = { version: "", available: false };
    }

    return info;
  }
}

export const environmentDetector = new EnvironmentDetectorService();
