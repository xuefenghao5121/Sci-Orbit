/**
 * AI4S 参数智能补全服务
 * 根据环境信息和任务类型，自动推断和补全隐式参数
 */
import { EnvironmentDetectorService, type EnvironmentInfo } from './environment-detector.js';

/** 已知的科学计算工具参数模板 */
interface ToolParamTemplate {
  name: string;
  category: string;
  required_params: string[];
  optional_params: Record<string, ParamSpec>;
  implicit_params: Record<string, ImplicitParamRule>;
  defaults: Record<string, any>;
  constraints: ParamConstraint[];
}

interface ParamSpec {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object';
  description: string;
  enum_values?: string[];
  default?: any;
  unit?: string;
}

interface ImplicitParamRule {
  description: string;
  infer_from: string[];       // 从哪些环境信息推断
  rule: string;               // 推断规则描述
  default_value: any;
  risk_if_wrong: 'low' | 'medium' | 'high' | 'critical';
}

interface ParamConstraint {
  params: string[];            // 涉及的参数
  rule: string;                // 约束描述
  check: string;               // 检查逻辑描述
}

/** 用户提供的参数（可能不完整） */
interface UserParams {
  tool: string;                // 目标工具名
  params: Record<string, any>; // 用户显式指定的参数
}

/** 补全后的完整参数 */
interface CompletedParams {
  explicit: Record<string, any>;     // 用户显式参数（原值）
  implicit: Record<string, any>;     // 自动补全的隐式参数
  warnings: ParamWarning[];          // 补全警告
  confidence: Record<string, number>; // 每个补全参数的置信度 0-1
}

interface ParamWarning {
  param: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  suggested_value?: any;
}

/** 参数模板库 - 内置常用科学计算工具的参数知识 */
const TOOL_TEMPLATES: ToolParamTemplate[] = [
  {
    name: 'vasp_dft',
    category: 'dft',
    required_params: ['system', 'potcar_path', 'poscar_path'],
    optional_params: {
      encut: { type: 'number', description: 'Plane-wave cutoff energy', unit: 'eV', default: 400 },
      kpoints: { type: 'object', description: 'K-point mesh', default: { k: [4, 4, 4] } },
      ismear: { type: 'number', description: 'Smearing method', default: 0 },
      sigma: { type: 'number', description: 'Smearing width', unit: 'eV', default: 0.05 },
      prec: { type: 'string', description: 'Precision level', enum_values: ['low', 'medium', 'high', 'accurate'], default: 'accurate' },
      ediff: { type: 'number', description: 'SCF convergence criterion', unit: 'eV', default: 1e-6 },
      npar: { type: 'number', description: 'Parallelization over bands' },
      kpar: { type: 'number', description: 'Parallel K-point divisions' },
    },
    implicit_params: {
      prec: { description: '根据计算精度需求自动选择', infer_from: ['task.complexity'], rule: '生产计算用accurate，测试用medium', default_value: 'accurate', risk_if_wrong: 'high' },
      ismear: { description: '根据系统类型自动选择', infer_from: ['params.system'], rule: '金属用1+sigma=0.2，半导体/绝缘体用0', default_value: 0, risk_if_wrong: 'high' },
      sigma: { description: '根据ismear自动设置', infer_from: ['params.ismear'], rule: 'ismear=0时0.05, ismear=1时0.2', default_value: 0.05, risk_if_wrong: 'medium' },
      lreal: { description: '根据系统大小自动选择', infer_from: ['params.system_size'], rule: '原子数>50用.true.', default_value: false, risk_if_wrong: 'medium' },
      algo: { description: '根据是否需要DOS自动设置', infer_from: ['task.need_dos'], rule: '需要DOS用Normal或All', default_value: 'Normal', risk_if_wrong: 'low' },
    },
    defaults: { encut: 400, ismear: 0, sigma: 0.05, prec: 'accurate', ediff: 1e-6, npar: 1, kpar: 1, lreal: false, algo: 'Normal' },
    constraints: [
      { params: ['encut'], rule: 'POTCAR中的ENMAX * 1.3 >= encut', check: 'encut <= potcar_enmax * 1.3' },
      { params: ['ismear', 'sigma'], rule: 'ismear=0时sigma应<0.1', check: 'ismear == 0 ? sigma < 0.1 : true' },
      { params: ['kpar'], rule: 'kpar应整除K点总数', check: 'total_kpoints % kpar == 0' },
    ],
  },
  {
    name: 'lammps_md',
    category: 'md',
    required_params: ['structure_file', 'potential_file'],
    optional_params: {
      ensemble: { type: 'string', description: 'Thermodynamic ensemble', enum_values: ['nve', 'nvt', 'npt', 'nph'], default: 'nvt' },
      temperature: { type: 'number', description: 'Target temperature', unit: 'K', default: 300 },
      pressure: { type: 'number', description: 'Target pressure', unit: 'bar', default: 0 },
      timestep: { type: 'number', description: 'Integration timestep', unit: 'fs', default: 1.0 },
      total_steps: { type: 'number', description: 'Total MD steps', default: 100000 },
      dump_interval: { type: 'number', description: 'Dump interval in steps', default: 1000 },
    },
    implicit_params: {
      timestep: { description: '根据系统类型调整', infer_from: ['params.system_type'], rule: '水体系1fs，固体体系2fs', default_value: 1.0, risk_if_wrong: 'high' },
      total_steps: { description: '根据模拟时间和timestep计算', infer_from: ['params.simulation_time', 'params.timestep'], rule: 'total_steps = simulation_time_ps * 1000 / timestep', default_value: 100000, risk_if_wrong: 'medium' },
    },
    defaults: { ensemble: 'nvt', temperature: 300, pressure: 0, timestep: 1.0, total_steps: 100000, dump_interval: 1000 },
    constraints: [
      { params: ['timestep'], rule: 'timestep应小于最快振动周期的1/10', check: 'timestep < 5' },
      { params: ['temperature'], rule: '温度应合理', check: 'temperature > 0 && temperature < 10000' },
    ],
  },
  {
    name: 'abacus_dft',
    category: 'dft',
    required_params: ['stru_file', 'pseudo_dir', 'orbital_dir'],
    optional_params: {
      ecutwfc: { type: 'number', description: 'Kinetic energy cutoff', unit: 'Ry', default: 100 },
      scf_nmax: { type: 'number', description: 'Max SCF iterations', default: 100 },
      ediff: { type: 'number', description: 'SCF convergence', unit: 'eV', default: 1e-6 },
      smearing_sigma: { type: 'number', description: 'Smearing width', unit: 'eV', default: 0.02 },
      smearing_method: { type: 'string', description: 'Smearing method', enum_values: ['gaussian', 'fd', 'mp', 'mv'], default: 'gaussian' },
      basis_type: { type: 'string', description: 'Basis set type', enum_values: ['pw', 'lcao', 'lcao_in_pw'], default: 'lcao' },
      gamma_only: { type: 'boolean', description: 'Gamma-point only', default: false },
    },
    implicit_params: {
      ecutwfc: { description: '根据赝势推荐值设置', infer_from: ['params.pseudo_type'], rule: '参考赝势文件中的建议值', default_value: 100, risk_if_wrong: 'high' },
      basis_type: { description: '根据赝势类型推断', infer_from: ['params.has_orbital_files'], rule: '有数值原子轨道用lcao，否则用pw', default_value: 'lcao', risk_if_wrong: 'critical' },
      gamma_only: { description: '根据K点自动判断', infer_from: ['params.kpoints'], rule: 'Gamma点时自动启用', default_value: false, risk_if_wrong: 'medium' },
    },
    defaults: { ecutwfc: 100, scf_nmax: 100, ediff: 1e-6, smearing_sigma: 0.02, smearing_method: 'gaussian', basis_type: 'lcao', gamma_only: false },
    constraints: [],
  },
];

export class ParamCompleterService {
  private envService: EnvironmentDetectorService;

  constructor() {
    this.envService = new EnvironmentDetectorService();
  }

  /** 查找匹配的参数模板 */
  findTemplate(toolName: string): ToolParamTemplate | undefined {
    return TOOL_TEMPLATES.find(t => t.name === toolName || t.category === toolName);
  }

  /** 列出所有支持的模板 */
  listTemplates(): Array<{ name: string; category: string; param_count: number }> {
    return TOOL_TEMPLATES.map(t => ({
      name: t.name,
      category: t.category,
      param_count: Object.keys(t.optional_params).length + Object.keys(t.implicit_params).length,
    }));
  }

  /** 智能补全参数 */
  async complete(userParams: UserParams): Promise<CompletedParams> {
    const template = this.findTemplate(userParams.tool);
    if (!template) {
      return {
        explicit: userParams.params,
        implicit: {},
        warnings: [{ param: '*', level: 'warning', message: `Unknown tool: ${userParams.tool}. No parameter completion available.` }],
        confidence: {},
      };
    }

    const warnings: ParamWarning[] = [];
    const implicit: Record<string, any> = {};
    const confidence: Record<string, number> = {};

    // 尝试采集环境信息（优雅降级）
    let env: EnvironmentInfo | null = null;
    try {
      env = this.envService.detect();
    } catch (error) {
      // 环境采集失败，继续使用默认值
      warnings.push({
        param: '_env',
        level: 'info',
        message: `Environment detection failed, using defaults: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // 1. 检查必填参数
    for (const req of template.required_params) {
      if (!(req in userParams.params)) {
        warnings.push({ param: req, level: 'error', message: `Required parameter missing: ${req}` });
      }
    }

    // 2. 补全隐式参数（按模板定义的顺序，支持依赖）
    const accumulatedParams = { ...userParams.params };
    for (const [key, rule] of Object.entries(template.implicit_params)) {
      // 如果用户已显式指定或前面已推断出，跳过
      if (key in accumulatedParams) {
        confidence[key] = 1.0;
        continue;
      }

      // 尝试推断（使用累积的参数，包含已推断出的值）
      const inferred = this.inferParam(key, rule, accumulatedParams, env);
      implicit[key] = inferred.value;
      confidence[key] = inferred.confidence;
      accumulatedParams[key] = inferred.value; // 累积到后续推断

      if (inferred.confidence < 0.7) {
        warnings.push({
          param: key,
          level: rule.risk_if_wrong === 'critical' ? 'error' : 'warning',
          message: `Auto-completed "${key}" = ${JSON.stringify(inferred.value)} (confidence: ${(inferred.confidence * 100).toFixed(0)}%). Reason: ${inferred.reason}`,
          suggested_value: inferred.value,
        });
      }
    }

    // 3. 填充缺失的 optional 参数默认值
    for (const [key, spec] of Object.entries(template.optional_params)) {
      if (!(key in userParams.params) && !(key in implicit) && spec.default !== undefined) {
        implicit[key] = spec.default;
        confidence[key] = 0.95;
      }
    }

    // 4. 参数约束检查
    const allParams = { ...userParams.params, ...implicit };
    for (const constraint of template.constraints) {
      const violation = this.checkConstraint(constraint, allParams);
      if (violation) {
        warnings.push({ param: constraint.params.join(','), level: 'warning', message: violation });
      }
    }

    return {
      explicit: userParams.params,
      implicit,
      warnings,
      confidence,
    };
  }

  /** 验证已有参数（不补全，只检查） */
  validate(userParams: UserParams): ParamWarning[] {
    const template = this.findTemplate(userParams.tool);
    if (!template) return [{ param: '*', level: 'warning', message: `Unknown tool: ${userParams.tool}` }];

    const warnings: ParamWarning[] = [];

    // 检查必填
    for (const req of template.required_params) {
      if (!(req in userParams.params)) {
        warnings.push({ param: req, level: 'error', message: `Required: ${req}` });
      }
    }

    // 检查枚举值
    for (const [key, spec] of Object.entries(template.optional_params)) {
      if (key in userParams.params && spec.enum_values) {
        if (!spec.enum_values.includes(userParams.params[key])) {
          warnings.push({ param: key, level: 'error', message: `Invalid value "${userParams.params[key]}". Expected: ${spec.enum_values.join(', ')}` });
        }
      }
    }

    // 约束检查
    for (const constraint of template.constraints) {
      const violation = this.checkConstraint(constraint, userParams.params);
      if (violation) warnings.push({ param: constraint.params.join(','), level: 'warning', message: violation });
    }

    return warnings;
  }

  /** 生成 INCAR 文件内容（VASP 专用） */
  generateIncar(params: Record<string, any>): string {
    const lines = ['! AI4S auto-generated INCAR', `! Generated: ${new Date().toISOString()}`, ''];
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'boolean') lines.push(`${key.toUpperCase()} = ${value ? '.TRUE.' : '.FALSE.'}`);
      else lines.push(`${key.toUpperCase()} = ${value}`);
    }
    return lines.join('\n');
  }

  /** 生成 ABACUS 输入文件内容 */
  generateAbacusInput(params: Record<string, any>): string {
    const lines = ['INPUT_PARAMETERS', ''];
    for (const [key, value] of Object.entries(params)) {
      lines.push(`${key} ${value}`);
    }
    return lines.join('\n');
  }

  // --- 私有方法 ---
  private inferParam(key: string, rule: ImplicitParamRule, userParams: Record<string, any>, env: EnvironmentInfo | null): { value: any; confidence: number; reason: string } {
    // VASP 特殊推断
    if (rule.rule.includes('金属用1')) {
      const metals = ['Cu', 'Ag', 'Au', 'Al', 'Fe', 'Ni', 'Co', 'Li', 'Na', 'K'];
      const system = (userParams.system || '').toString();
      if (metals.some(m => system.toLowerCase().includes(m.toLowerCase()))) {
        return { value: 1, confidence: 0.7, reason: `System "${system}" appears metallic` };
      }
      return { value: rule.default_value, confidence: 0.5, reason: 'Assuming semiconductor/insulator' };
    }

    if (rule.rule.includes('sigma应<0.1') && userParams.ismear === 0) {
      return { value: 0.05, confidence: 0.9, reason: 'ismear=0 requires small sigma' };
    }
    if (rule.rule.includes('ismear=') && userParams.ismear === 1) {
      return { value: 0.2, confidence: 0.9, reason: 'ismear=1 (metal) uses larger sigma' };
    }

    // LAMMPS 特殊推断
    if (rule.rule.includes('水体系1fs')) {
      const systemType = userParams.system_type || '';
      if (systemType.toLowerCase().includes('water') || systemType.toLowerCase().includes('liquid')) {
        return { value: 1.0, confidence: 0.75, reason: 'Water/liquid system detected' };
      }
      if (systemType.toLowerCase().includes('solid') || systemType.toLowerCase().includes('crystal')) {
        return { value: 2.0, confidence: 0.75, reason: 'Solid/crystal system detected' };
      }
      return { value: rule.default_value, confidence: 0.6, reason: 'Unknown system type, using default timestep' };
    }

    // 基于GPU信息调整并行参数
    if (key === 'npar' && env?.gpu) {
      return { value: 1, confidence: 0.7, reason: 'GPU detected, npar=1 recommended' };
    }

    // 默认推断
    return { value: rule.default_value, confidence: 0.6, reason: `Default for ${key}` };
  }

  private checkConstraint(constraint: ParamConstraint, params: Record<string, any>): string | null {
    // 简单的约束检查
    if (constraint.rule.includes('ismear=0时sigma应<0.1')) {
      if (params.ismear === 0 && params.sigma >= 0.1) return `ismear=0 requires sigma < 0.1, got ${params.sigma}`;
    }
    if (constraint.rule.includes('温度应合理')) {
      if (params.temperature <= 0 || params.temperature >= 10000) return `Unreasonable temperature: ${params.temperature}K`;
    }
    if (constraint.rule.includes('timestep应小于')) {
      if (params.timestep && params.timestep >= 5) return `timestep ${params.timestep} may be too large (recommended < 5fs)`;
    }
    return null;
  }
}
