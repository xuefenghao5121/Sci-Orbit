/**
 * EvoSkills 自进化 - 环境感知适配
 * 根据检测到的硬件环境，推荐合适的并行参数
 */
import { EnvironmentInfo } from '../environment-detector.js';
import { EnvironmentInfoEx } from './types.js';

export class EnvironmentAdapter {
  /**
   * 扩展基础环境信息，添加更多硬件细节
   */
  extendEnvironmentInfo(baseInfo: EnvironmentInfo): EnvironmentInfoEx {
    const extended: EnvironmentInfoEx = {
      ...(baseInfo as any),
      cpuCores: baseInfo.cpu.cores || 0,
      gpuCount: this.countGPUs(baseInfo),
      gpuVramGB: this.getTotalVRAM(baseInfo),
      mpiAvailable: false, // 后续可扩展检测
    };
    
    // 计算推荐并行配置
    extended.recommendedParallel = this.recommendParallel(extended);
    
    return extended;
  }

  /**
   * 计算 GPU 数量
   */
  private countGPUs(env: EnvironmentInfo): number {
    if (!env.gpu) return 0;
    // nvidia-smi 每行一个 GPU
    const lines = env.gpu.model.split('\n');
    return Math.max(lines.length, 1);
  }

  /**
   * 获取总显存 GB
   */
  private getTotalVRAM(env: EnvironmentInfo): number {
    if (!env.gpu || !env.gpu.vram) return 0;
    // 解析 "10240 MiB" → 10 GB
    const match = env.gpu.vram.match(/(\d+)/);
    if (match) {
      const mib = parseInt(match[1], 10);
      return Math.round(mib / 1024);
    }
    return 0;
  }

  /**
   * 根据硬件推荐并行配置
   */
  recommendParallel(env: EnvironmentInfoEx): EnvironmentInfoEx['recommendedParallel'] {
    const result: EnvironmentInfoEx['recommendedParallel'] = {};
    
    // VASP 并行推荐:
    // - npar:  bands 并行，GPU 版本推荐 npar=1
    // - kpar: K-point 并行，kpar * npar ≤ CPU 核心数
    
    if (env.gpuCount > 0) {
      // 有 GPU，band 并行设为 1
      result.npar = 1;
    } else {
      // CPU -only，npar ≈ sqrt(cores)
      const cores = env.cpuCores || 1;
      result.npar = Math.max(1, Math.floor(Math.sqrt(cores)));
    }
    
    // kpar 推荐：剩下的核心给 K-point
    const cores = env.cpuCores || 1;
    const npar = result.npar || 1;
    result.kpar = Math.max(1, Math.floor(cores / npar));
    
    // 节点数推荐（如果是多节点）
    if (env.mpiAvailable) {
      result.nnodes = Math.max(1, Math.floor(cores / 16));
      result.cpusPerNode = Math.floor(cores / (result.nnodes || 1));
    } else {
      result.nnodes = 1;
      result.cpusPerNode = cores;
    }
    
    return result;
  }

  /**
   * 根据环境推断 VASP 参数
   * - npar, kpar 并行设置
   * - 影响 NBANDS 等
   */
  inferVASPParams(env: EnvironmentInfoEx): Record<string, number> {
    const params: Record<string, number> = {};
    const rec = env.recommendedParallel;
    
    if (rec?.npar !== undefined) {
      params.npar = rec.npar;
    }
    if (rec?.kpar !== undefined) {
      params.kpar = rec.kpar;
    }
    
    return params;
  }

  /**
   * 根据环境推断 LAMMPS 参数
   * - 开启 GPU 包
   * - 邻居列表参数调整
   */
  inferLAMMPSParams(env: EnvironmentInfoEx): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (env.gpuCount > 0) {
      params.gpu_enabled = true;
      params.gpu_package = true;
      // GPU 推荐使用 bin 邻居列表
      params.neighbor_style = 'bin';
    }
    
    return params;
  }

  /**
   * 根据体系大小推断参数
   */
  inferBySystemSize(systemSize: number, tool: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (tool === 'vasp_dft') {
      // 大体系推荐 real space 投影
      if (systemSize > 50) {
        params.lreal = true;
      } else {
        params.lreal = false;
      }
    }
    
    if (tool === 'gpaw_dft') {
      // 大体系推荐 LCAO 模式
      if (systemSize > 100) {
        params.mode = 'lcao';
      }
    }
    
    return params;
  }

  /**
   * 判断是否推荐使用 GPU
   */
  shouldUseGPU(env: EnvironmentInfoEx): boolean {
    return env.gpuCount > 0 && (env.cuda?.available ?? false);
  }

  /**
   * 估算可用内存 GB
   */
  getAvailableMemoryGB(env: EnvironmentInfoEx): number {
    return env.memory.freeGb || 0;
  }
}
