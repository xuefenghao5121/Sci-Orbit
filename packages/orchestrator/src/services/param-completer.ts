/**
 * @file 参数补全服务 - 独立实现 (子agent1)
 * @description 根据环境信息和用户提供的不完整参数，自动补全科学计算工具的隐式参数
 */

import type { EnvSnapshot } from './env-snapshot.js';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 用户输入的不完整参数
 */
export interface UserParams {
  tool: string;                // 目标工具名
  params: Record<string, any>; // 用户显式指定的参数
}

/**
 * 补全警告
 */
export interface ParamWarning {
  param: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  suggested_value?: any;
}

/**
 * 补全完成的结果
 */
export interface CompletedParams {
  explicit: Record<string, any>;     // 用户显式参数（原值）
  implicit: Record<string, any>;     // 自动补全的隐式参数
  warnings: ParamWarning[];          // 补全警告
  confidence: Record<string, number>; // 每个补全参数的置信度 0-1
}

/**
 * 参数推断规则
 */
interface InferenceRule {
  name: string;
  condition: (userParams: UserParams, completed: CompletedParams, env?: EnvSnapshot) => boolean;
  infer: (userParams: UserParams, completed: CompletedParams, env?: EnvSnapshot) => { value: any; confidence: number; warning?: Omit<ParamWarning, 'param'> };
}

/**
 * 工具参数模板
 */
interface ToolTemplate {
  name: string;
  defaultParams: Record<string, any>;
  defaultConfidence: Record<string, number>;
  requiredParams: string[];
  rules: InferenceRule[];
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 支持的工具列表
 */
const SUPPORTED_TOOLS = ['vasp', 'lammps', 'abacus'] as const;

type SupportedTool = typeof SUPPORTED_TOOLS extends Array<infer T> ? T : never;

// ============================================================================
// 参数补全服务实现
// ============================================================================

export class ParamCompleterService {
  private templates: Map<string, ToolTemplate> = new Map();
  private envSnapshot?: EnvSnapshot;

  constructor() {
    this.initializeTemplates();
  }

  /**
   * 设置环境快照，用于环境相关的参数推断
   */
  setEnvSnapshot(env: EnvSnapshot): void {
    this.envSnapshot = env;
  }

  /**
   * 初始化所有工具的参数模板和推断规则
   */
  private initializeTemplates(): void {
    // VASP 模板
    this.templates.set('vasp', {
      name: 'VASP',
      defaultParams: {
        // 通用控制
        INCAR: {},
        // 默认精度设置
        PREC: 'Normal',
        LWAVE: '.TRUE.',
        LCHARG: '.TRUE.',
        LAECHG: '.FALSE.',
        LVTOT: '.FALSE.',
        // 电子步
        NELM: 60,
        NELMIN: 2,
        NELMDL: -5,
        EDIFF: 1e-4,
        // 离子步
        NSW: 0,
        IBRION: -1,
        EDIFFG: -0.01,
        ISIF: 2,
        // 平行化
        NPAR: 2,
        KPAR: 1,
        // 对称性
        ISYM: 2,
      },
      defaultConfidence: {
        PREC: 0.9,
        LWAVE: 0.8,
        LCHARG: 0.8,
        LAECHG: 0.7,
        LVTOT: 0.7,
        NELM: 0.9,
        NELMIN: 0.9,
        NELMDL: 0.8,
        EDIFF: 0.8,
        NSW: 0.9,
        IBRION: 0.9,
        EDIFFG: 0.8,
        ISIF: 0.7,
        NPAR: 0.5,
        KPAR: 0.8,
        ISYM: 0.9,
      },
      requiredParams: ['ENCUT', 'KPOINTS'],
      rules: [
        // 规则1: 金属体系 -> ISMEAR=1, SIGMA=0.2
        {
          name: 'metal-smearing',
          condition: (p) => {
            // 如果用户没有指定 ISMEAR，且体系推测是金属（这里简化处理：如果没有ISPIN=2且磁性不明确）
            return !('ISMEAR' in p.params);
          },
          infer: (p, c, env) => {
            // 如果能判断是绝缘体/半导体用高斯涂抹，金属用四面体涂抹
            // 这里做简化：不确定时默认 ISMEAR=1 (Methfessel-Paxton)
            return {
              value: 1,
              confidence: 0.6,
              warning: {
                level: 'info',
                message: '未指定ISMEAR，默认使用Methfessel-Paxton涂抹(ISMEAR=1)，适合金属体系。对于绝缘体建议使用ISMEAR=0。',
              },
            };
          },
        },
        // 规则2: ISMEAR=0 意味着高斯涂抹，要求 SIGMA 更小
        {
          name: 'sigma-for-gaussian',
          condition: (p, c) => {
            const ismer = p.params.ISMEAR ?? c.implicit.ISMEAR;
            return ismer === 0 && !('SIGMA' in p.params);
          },
          infer: () => {
            return {
              value: 0.05,
              confidence: 0.8,
              warning: {
                level: 'info',
                message: '使用高斯涂抹(ISMEAR=0)，设置较小的SIGMA=0.05以保证精度。',
              },
            };
          },
        },
        // 规则3: ISMEAR!=0 需要更大的 SIGMA
        {
          name: 'sigma-for-smearing',
          condition: (p, c) => {
            const ismer = p.params.ISMEAR ?? c.implicit.ISMEAR;
            return ismer !== 0 && ismer !== undefined && !('SIGMA' in p.params);
          },
          infer: () => {
            return {
              value: 0.2,
              confidence: 0.85,
            };
          },
        },
        // 规则4: GPU环境 -> NPAR=1
        {
          name: 'gpu-npar',
          condition: (p, c, env) => {
            return !('NPAR' in p.params) && env?.gpus && env.gpus.length > 0;
          },
          infer: () => {
            return {
              value: 1,
              confidence: 0.9,
              warning: {
                level: 'info',
                message: '检测到GPU环境，设置NPAR=1以获得最佳性能。',
              },
            };
          },
        },
        // 规则5: 弛豫计算 -> 设置合理的默认 NSW
        {
          name: 'relax-nsw',
          condition: (p) => {
            const ibrion = p.params.IBRION;
            return ibrion !== undefined && ibrion !== -1 && !('NSW' in p.params);
          },
          infer: () => {
            return {
              value: 50,
              confidence: 0.7,
              warning: {
                level: 'info',
                message: '离子弛豫计算未指定NSW，默认设置为50步。',
              },
            };
          },
        },
        // 规则6: 自旋极化设置
        {
          name: 'spin-default',
          condition: (p) => {
            return !('ISPIN' in p.params);
          },
          infer: () => {
            return {
              value: 1,
              confidence: 0.8,
              warning: {
                level: 'info',
                message: '未指定自旋，默认关闭自旋极化(ISPIN=1)。如果体系有磁性，请设置ISPIN=2并指定MAGMOM。',
              },
            };
          },
        },
      ],
    });

    // ABACUS 模板
    this.templates.set('abacus', {
      name: 'ABACUS',
      defaultParams: {
        // 基本控制
        calculation: 'scf',
        basis_type: 'pw',
        // 电子步
        scf_nmax: 50,
        scf_thr: 1e-9,
        // 离子步
        relax_nmax: 50,
        relax_thr: 1e-5,
        // 平行化
        nproc: 1,
        // 输出控制
        out_level: 1,
        // smearing
        smear_type: 'gaussian',
        sigma: 0.01,
      },
      defaultConfidence: {
        calculation: 0.9,
        basis_type: 0.9,
        scf_nmax: 0.9,
        scf_thr: 0.8,
        relax_nmax: 0.7,
        relax_thr: 0.8,
        nproc: 0.6,
        out_level: 0.9,
        smear_type: 0.6,
        sigma: 0.7,
      },
      requiredParams: ['ecutwfc', 'kpoints'],
      rules: [
        // 规则1: 金属 -> 调整sigma
        {
          name: 'metal-sigma',
          condition: (p) => !('sigma' in p.params),
          infer: (p, c) => {
            // 如果用户指定了smear但没sigma，根据类型给默认值
            const smearType = p.params.smear_type ?? c.implicit.smear_type;
            if (smearType === 'gaussian' || smearType === 'fermi') {
              return {
                value: 0.02,
                confidence: 0.7,
              };
            }
            return {
              value: 0.01,
              confidence: 0.7,
            };
          },
        },
        // 规则2: GPU检测
        {
          name: 'gpu-parallel',
          condition: (p, c, env) => !('device' in p.params) && env?.gpus && env.gpus.length > 0,
          infer: () => {
            return {
              value: 'gpu',
              confidence: 0.9,
              warning: {
                level: 'info',
                message: '检测到GPU环境，默认使用device=gpu。',
              },
            };
          },
        },
        // 规则3: md计算
        {
          name: 'md-defaults',
          condition: (p) => p.params.calculation === 'md' && !('md_nstep' in p.params),
          infer: () => {
            return {
              value: 1000,
              confidence: 0.5,
              warning: {
                level: 'info',
                message: '分子动力学计算未指定md_nstep，默认设置为1000步。',
              },
            };
          },
        },
      ],
    });

    // LAMMPS 模板
    this.templates.set('lammps', {
      name: 'LAMMPS',
      defaultParams: {
        // 平行化
        processors: null, // 由环境推断
        // 输出控制
        thermo: 100,
        // 邻居列表
        neighbor: '0.3 10 bin',
        neigh_modify: 'delay 0 every 1 check yes',
        // 时间步长
        timestep: 1.0,
      },
      defaultConfidence: {
        thermo: 0.8,
        neighbor: 0.8,
        neigh_modify: 0.8,
        timestep: 0.6,
      },
      requiredParams: ['atom_style', 'pair_style'],
      rules: [
        // 规则1: GPU包
        {
          name: 'lammps-gpu',
          condition: (p, c, env) => !('gpu' in p.params) && env?.gpus && env.gpus.length > 0,
          infer: () => {
            return {
              value: 'on',
              confidence: 0.8,
              warning: {
                level: 'info',
                message: '检测到GPU环境，建议开启GPU加速。',
              },
            };
          },
        },
        // 规则2: 单位制推断
        {
          name: 'units-default',
          condition: (p) => !('units' in p.params),
          infer: () => {
            return {
              value: 'real',
              confidence: 0.5,
              warning: {
                level: 'warning',
                message: '未指定单位制，默认使用real单位。请确认是否符合您的模型要求。',
              },
            };
          },
        },
        // 规则3: 边界条件默认p p p
        {
          name: 'boundary-default',
          condition: (p) => !('boundary' in p.params),
          infer: () => {
            return {
              value: 'p p p',
              confidence: 0.7,
              warning: {
                level: 'info',
                message: '未指定边界条件，默认使用周期性边界p p p。',
              },
            };
          },
        },
      ],
    });
  }

  /**
   * 主入口：补全用户参数
   */
  completeParams(userInput: UserParams): CompletedParams {
    const result: CompletedParams = {
      explicit: { ...userInput.params },
      implicit: {},
      warnings: [],
      confidence: {},
    };

    const toolName = userInput.tool.toLowerCase() as SupportedTool;

    // 检查工具是否支持
    if (!this.templates.has(toolName)) {
      result.warnings.push({
        param: 'tool',
        level: 'error',
        message: `不支持的工具 "${userInput.tool}"，当前仅支持: ${SUPPORTED_TOOLS.join(', ')}`,
      });
      return result;
    }

    const template = this.templates.get(toolName)!;

    // 第一步：应用默认参数（用户未指定的才补）
    for (const [key, defaultValue] of Object.entries(template.defaultParams)) {
      if (!(key in userInput.params)) {
        result.implicit[key] = defaultValue;
        result.confidence[key] = template.defaultConfidence[key] ?? 0.5;
      }
    }

    // 第二步：按顺序应用推断规则
    // 规则累积推断：后面的规则可以依赖前面推断出的结果
    for (const rule of template.rules) {
      try {
        if (rule.condition(userInput, result, this.envSnapshot)) {
          const inference = rule.infer(userInput, result, this.envSnapshot);
          const paramName = this.extractParamNameFromRule(rule, template);
          if (!(paramName in userInput.params)) {
            result.implicit[paramName] = inference.value;
            result.confidence[paramName] = inference.confidence;
            if (inference.warning) {
              result.warnings.push({
                param: paramName,
                ...inference.warning,
              });
            }
          }
        }
      } catch (e) {
        // 捕获单条规则错误，不影响整体补全
        result.warnings.push({
          param: rule.name,
          level: 'warning',
          message: `推断规则 "${rule.name}" 执行出错: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    // 第三步：检查必填参数
    for (const required of template.requiredParams) {
      if (!(required in userInput.params) && !(required in result.implicit)) {
        result.warnings.push({
          param: required,
          level: 'error',
          message: `缺少必填参数 "${required}"，无法进行有效计算。`,
        });
      }
    }

    // 第四步：低置信度补全添加警告
    for (const [key, conf] of Object.entries(result.confidence)) {
      if (conf < 0.5 && !result.warnings.some(w => w.param === key)) {
        result.warnings.push({
          param: key,
          level: 'warning',
          message: `参数 "${key}" 的推断置信度较低 (${(conf * 100).toFixed(0)}%)，建议手动检查。`,
        });
      }
    }

    return result;
  }

  /**
   * 从规则中推断参数名（简化实现）
   */
  private extractParamNameFromRule(rule: InferenceRule, template: ToolTemplate): string {
    // 规则命名通常是 param-xxx，提取最后一个部分作为参数名
    const parts = rule.name.split('-');
    const candidate = parts[parts.length - 1];
    if (candidate in template.defaultParams) {
      return candidate;
    }
    // 回退：检查规则名是否包含参数名
    for (const param of Object.keys(template.defaultParams)) {
      if (rule.name.includes(param.toLowerCase())) {
        return param;
      }
    }
    // 极端情况返回规则名
    return rule.name;
  }

  /**
   * 生成 VASP INCAR 文件内容
   */
  generateVaspIncarlike(completed: CompletedParams): string {
    const allParams = { ...completed.explicit, ...completed.implicit };
    let content = '';

    // INCAR 格式：参数 = 值
    for (const [key, value] of Object.entries(allParams)) {
      // 跳过一些非INCAR参数
      if (['KPOINTS', 'POSCAR', 'POTCAR'].includes(key)) continue;
      content += `${key} = ${String(value)}\n`;
    }

    // 添加警告注释
    if (completed.warnings.length > 0) {
      content = '# 自动生成的 INCAR - 存在以下警告:\n';
      for (const warn of completed.warnings) {
        content += `# [${warn.level}] ${warn.param}: ${warn.message}\n`;
      }
      content += '\n';
      content += this.formatIncarlike(allParams);
    }

    return content;
  }

  /**
   * 格式化INCAR
   */
  private formatIncarlike(params: Record<string, any>): string {
    let content = '';
    for (const [key, value] of Object.entries(params)) {
      if (['KPOINTS', 'POSCAR', 'POTCAR'].includes(key)) continue;
      content += `${key} = ${String(value)}\n`;
    }
    return content;
  }

  /**
   * 生成 ABACUS INPUT 文件内容
   */
  generateAbacusInput(completed: CompletedParams): string {
    const allParams = { ...completed.explicit, ...completed.implicit };
    let content = '';

    // ABACUS INPUT 格式：参数 value
    for (const [key, value] of Object.entries(allParams)) {
      content += `${key} ${String(value)}\n`;
    }

    // 添加警告注释
    if (completed.warnings.length > 0) {
      content = '# 自动生成的 INPUT - 存在以下警告:\n';
      for (const warn of completed.warnings) {
        content += `# [${warn.level}] ${warn.param}: ${warn.message}\n`;
      }
      content += '\n';
      const all = { ...completed.explicit, ...completed.implicit };
      for (const [key, value] of Object.entries(all)) {
        content += `${key} ${String(value)}\n`;
      }
    }

    return content;
  }

  /**
   * 获取支持的工具列表
   */
  getSupportedTools(): string[] {
    return [...SUPPORTED_TOOLS];
  }

  /**
   * 记录用户修正（用于未来自适应学习）
   */
  recordCorrection(tool: string, paramName: string, correctValue: any, inferredValue: any, confidence: number): void {
    // 这里只保留接口，实际存储由上层 feedback 服务处理
    // 当前实现不需要持久化，只是空占位
  }
}

// ============================================================================
// 导出单例
// ============================================================================

export const paramCompleterService = new ParamCompleterService();
