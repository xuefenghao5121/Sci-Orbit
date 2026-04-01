/**
 * AI4S 环境快照服务
 * 自动采集完整环境信息，支持导出为多种可复现格式
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface GpuInfo {
  id: number;
  model: string;
  driver: string;
  cuda_version: string;
  memory_total_mb: number;
  memory_used_mb: number;
  utilization_percent: number;
}

export interface EnvSnapshot {
  timestamp: string;
  hostname: string;
  os: string;
  kernel: string;
  cpu: string;
  ram_total_gb: number;
  gpus: GpuInfo[];
  compiler: { gcc: string; gxx: string; gfortran: string };
  mpi: { type: string; version: string } | null;
  python: { version: string; path: string };
  cuda: { version: string; path: string } | null;
  conda_env: string | null;
  packages: Record<string, string>;  // name -> version
}

export class EnvSnapshotService {
  /** 采集完整环境快照 */
  async collect(): Promise<EnvSnapshot> {
    return {
      timestamp: new Date().toISOString(),
      hostname: this.exec('hostname'),
      os: this.exec('cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \\"'),
      kernel: this.exec('uname -r'),
      cpu: this.exec('lscpu | grep "Model name" | cut -d: -f2 | xargs'),
      ram_total_gb: Math.round(this.parseMemInfo()),
      gpus: this.detectGpus(),
      compiler: this.detectCompilers(),
      mpi: this.detectMpi(),
      python: this.detectPython(),
      cuda: this.detectCuda(),
      conda_env: this.detectConda(),
      packages: this.detectScientificPackages(),
    };
  }

  /** 导出为 Conda environment.yml */
  toCondaEnv(snapshot: EnvSnapshot): string {
    const deps = Object.entries(snapshot.packages)
      .map(([name, ver]) => `${name}=${ver}`)
      .join('\n    ');
    return `name: ai4s-env-${Date.now()}
channels:
  - conda-forge
  - defaults
dependencies:
  - python=${snapshot.python.version}
  - pip
  - pip:
    ${deps}`;
  }

  /** 导出为 Dockerfile */
  toDockerfile(snapshot: EnvSnapshot): string {
    const pkgList = Object.entries(snapshot.packages)
      .map(([name, ver]) => `${name}==${ver}`)
      .join(' \\\n    ');
    return `FROM nvidia/cuda:${snapshot.cuda?.version || '12.1.0'}-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y \\
    gcc=${snapshot.compiler.gcc} \\
    g++=${snapshot.compiler.gxx} \\
    gfortran=${snapshot.compiler.gfortran} \\
    ${snapshot.mpi ? `${snapshot.mpi.type}-${snapshot.mpi.version}` : ''}

ENV PYTHON_VERSION=${snapshot.python.version}
RUN pip install \\
    ${pkgList}

WORKDIR /workspace
CMD ["/bin/bash"]`;
  }

  /** 与之前的快照对比，找出差异 */
  diff(snapshotA: EnvSnapshot, snapshotB: EnvSnapshot): EnvDiff {
    const diffs: Array<{ key: string; a: string; b: string }> = [];
    // 对比所有字段
    if (snapshotA.os !== snapshotB.os) diffs.push({ key: 'os', a: snapshotA.os, b: snapshotB.os });
    if (snapshotA.kernel !== snapshotB.kernel) diffs.push({ key: 'kernel', a: snapshotA.kernel, b: snapshotB.kernel });
    if (snapshotA.cuda?.version !== snapshotB.cuda?.version) diffs.push({ key: 'cuda', a: snapshotA.cuda?.version || 'none', b: snapshotB.cuda?.version || 'none' });
    if (snapshotA.python.version !== snapshotB.python.version) diffs.push({ key: 'python', a: snapshotA.python.version, b: snapshotB.python.version });
    // 对比科学包
    for (const [pkg, ver] of Object.entries(snapshotB.packages)) {
      if (snapshotA.packages[pkg] && snapshotA.packages[pkg] !== ver) {
        diffs.push({ key: `pkg:${pkg}`, a: snapshotA.packages[pkg], b: ver });
      }
    }
    return { has_diff: diffs.length > 0, diffs, risk_level: this.assessRisk(diffs) };
  }

  /** 评估环境差异风险 */
  private assessRisk(diffs: Array<{ key: string }>): 'low' | 'medium' | 'high' | 'critical' {
    const criticalKeys = ['cuda', 'python', 'os'];
    for (const d of diffs) {
      if (criticalKeys.includes(d.key)) return 'critical';
      if (d.key.startsWith('pkg:')) return 'high';
    }
    return diffs.length > 3 ? 'medium' : 'low';
  }

  // --- 私有方法 ---
  private exec(cmd: string): string {
    try { return execSync(cmd, { timeout: 5000, encoding: 'utf8' }).trim(); }
    catch { return 'unknown'; }
  }

  private parseMemInfo(): number {
    try {
      const total = execSync('cat /proc/meminfo | grep MemTotal', { encoding: 'utf8' });
      return parseInt(total.match(/\d+/)?.[0] || '0') / (1024 * 1024);
    } catch { return 0; }
  }

  private detectGpus(): GpuInfo[] {
    try {
      const output = execSync('nvidia-smi --query-gpu=index,name,driver_version,memory.total,memory.used,utilization.gpu --format=csv,noheader,nounits', { encoding: 'utf8', timeout: 5000 });
      return output.trim().split('\n').filter(Boolean).map(line => {
        const [id, model, driver, memTotal, memUsed, util] = line.split(',').map(s => s.trim());
        return {
          id: parseInt(id), model, driver,
          cuda_version: this.exec('nvcc --version 2>/dev/null | grep release | grep -oP "\\d+\\.\\d+"') || 'unknown',
          memory_total_mb: parseInt(memTotal),
          memory_used_mb: parseInt(memUsed),
          utilization_percent: parseFloat(util),
        };
      });
    } catch { return []; }
  }

  private detectCompilers(): { gcc: string; gxx: string; gfortran: string } {
    return {
      gcc: this.exec('gcc --version 2>/dev/null | head -1 | grep -oP "\\d+\\.\\d+\\.\\d+"') || 'unknown',
      gxx: this.exec('g++ --version 2>/dev/null | head -1 | grep -oP "\\d+\\.\\d+\\.\\d+"') || 'unknown',
      gfortran: this.exec('gfortran --version 2>/dev/null | head -1 | grep -oP "\\d+\\.\\d+\\.\\d+"') || 'unknown',
    };
  }

  private detectMpi(): { type: string; version: string } | null {
    const mpich = this.exec('mpirun --version 2>/dev/null | head -1');
    const openmpi = this.exec('mpirun --version 2>/dev/null | head -1');
    if (mpich.includes('MPICH')) return { type: 'mpich', version: mpich.match(/\d+\.\d+/)?.[0] || 'unknown' };
    if (openmpi.includes('Open MPI')) return { type: 'openmpi', version: openmpi.match(/\d+\.\d+/)?.[0] || 'unknown' };
    return null;
  }

  private detectPython(): { version: string; path: string } {
    const ver = this.exec('python3 --version 2>&1')?.match(/(\d+\.\d+\.\d+)/)?.[1] || 'unknown';
    return {
      version: ver,
      path: this.exec('which python3') || 'unknown',
    };
  }

  private detectCuda(): { version: string; path: string } | null {
    const nvcc = this.exec('which nvcc 2>/dev/null');
    const version = this.exec('nvcc --version 2>/dev/null | grep release | grep -oP "\\d+\\.\\d+"');
    return nvcc !== 'unknown' && version !== 'unknown' ? { version, path: nvcc } : null;
  }

  private detectConda(): string | null {
    const env = process.env.CONDA_DEFAULT_ENV;
    return env || this.exec('conda info --envs 2>/dev/null | grep "*" | awk "{print \$1}"') || null;
  }

  private detectScientificPackages(): Record<string, string> {
    const pkgs: Record<string, string> = {};
    const checks: Array<[string, string]> = [
      ['numpy', 'python3 -c "import numpy; print(numpy.__version__)"'],
      ['pandas', 'python3 -c "import pandas; print(pandas.__version__)"'],
      ['torch', 'python3 -c "import torch; print(torch.__version__)"'],
      ['scipy', 'python3 -c "import scipy; print(scipy.__version__)"'],
      ['ase', 'python3 -c "import ase; print(ase.__version__)"'],
      ['rdkit', 'python3 -c "import rdkit; print(rdkit.__version__)"'],
      ['pyscf', 'python3 -c "import pyscf; print(pyscf.__version__)"'],
      ['openmm', 'python3 -c "import openmm; print(openmm.__version__)"'],
      ['jax', 'python3 -c "import jax; print(jax.__version__)"'],
      ['transformers', 'python3 -c "import transformers; print(transformers.__version__)"'],
    ];
    for (const [name, cmd] of checks) {
      const ver = this.exec(cmd);
      if (ver !== 'unknown') pkgs[name] = ver;
    }
    return pkgs;
  }
}

export interface EnvDiff {
  has_diff: boolean;
  diffs: Array<{ key: string; a: string; b: string }>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}
