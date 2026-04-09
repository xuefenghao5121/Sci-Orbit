/**
 * AI4S 参数智能补全服务
 * 根据环境信息和任务类型，自动推断和补全隐式参数
 * v1.0.0: EvoSkills 升级 - 自进化 + 共同进化验证
 * 
 * Changes:
 * - 引入 EvoSkills Self-Evolving + Co-Evolutionary Verification 架构
 * - 动态参数模板库替代硬编码静态模板
 * - Generator + Verifier 双组件共同进化
 * - 从用户修正中自动学习更新参数置信度
 * - 环境感知适配，根据硬件调整并行参数
 * - 参数关联规则挖掘
 * - 完全向后兼容
 */
import { EnvironmentDetectorService, type EnvironmentInfo } from './environment-detector.js';
import { 
  DynamicTemplateLibrary,
  ParamGenerator,
  ParamVerifier,
  AssociationMiner,
  EnvironmentAdapter,
  EvolutionStorage,
  convertStaticToDynamic,
  type DynamicToolParamTemplate,
  type ImplicitParamRuleWithConfidence,
  type CompletionRequest,
  type ParamCandidate,
  type VerifierScoreResult,
  type ParamViolation,
  type EnvironmentInfoEx,
  type UserCorrectionRecord,
  type EvolutionConfig,
  DEFAULT_EVOLUTION_CONFIG,
} from './param-evolution/index.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/** 已知的科学计算工具参数模板（静态，作为种子） */
export interface ToolParamTemplate {
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
  {
    name: 'gpaw_dft',
    category: 'dft',
    required_params: ['structure'],
    optional_params: {
      mode: { type: 'enum', description: 'Calculation mode', enum_values: ['lcao', 'pw', 'fd', 'gpw'], default: 'pw' },
      xc: { type: 'string', description: 'Exchange-correlation functional', default: 'PBE' },
      encut: { type: 'number', description: 'Plane-wave cutoff', unit: 'eV', default: 340 },
      kpts: { type: 'object', description: 'K-point grid', default: [4, 4, 4] },
      convergence: { type: 'object', description: 'Convergence criteria', default: { energy: 0.0005 } },
      occupations: { type: 'number', description: 'Occupation method (0=Fermi, 1=Methfessel-Paxton)', default: 0 },
      txt: { type: 'string', description: 'Output file path', default: 'gpaw.txt' },
      parallel: { type: 'object', description: 'Parallel settings' },
    },
    implicit_params: {
      encut: { description: '根据赝势推荐值', infer_from: ['params.setup_name'], rule: 'PAW默认340eV, 可提高到450eV', default_value: 340, risk_if_wrong: 'high' },
      occupations: { description: '根据系统类型选择', infer_from: ['params.system'], rule: '金属用0(Fermi), 半导体/绝缘体用-1(fixed)', default_value: 0, risk_if_wrong: 'medium' },
      mode: { description: '根据系统大小选择', infer_from: ['params.system_size'], rule: '大体系用LCAO, 中小体系用PW, 精确用FD', default_value: 'pw', risk_if_wrong: 'high' },
    },
    defaults: { mode: 'pw', xc: 'PBE', encut: 340, kpts: [4, 4, 4], convergence: { energy: 0.0005 }, occupations: 0, txt: 'gpaw.txt' },
    constraints: [
      { params: ['encut'], rule: 'encut应>=250eV', check: 'encut >= 250' },
    ],
  },
  {
    name: 'cp2k_dft',
    category: 'dft',
    required_params: ['coord_file', 'basis_set'],
    optional_params: {
      project_name: { type: 'string', description: 'Project name', default: 'CP2K' },
      run_type: { type: 'enum', description: 'Calculation type', enum_values: ['ENERGY', 'ENERGY_FORCE', 'GEO_OPT', 'CELL_OPT', 'MD', 'BAND_STRUCTURE'], default: 'ENERGY_FORCE' },
      kind: { type: 'enum', description: 'Basis set kind', enum_values: ['BASIS_SET', 'BASIS_SET_POTENTIAL'], default: 'BASIS_SET' },
      potential_file: { type: 'string', description: 'GTH pseudopotential file' },
      charge: { type: 'number', description: 'Total charge', default: 0 },
      multiplicity: { type: 'number', description: 'Spin multiplicity', default: 1 },
      cutoff: { type: 'number', description: 'Plane-wave cutoff', unit: 'Ry', default: 400 },
      rel_cutoff: { type: 'number', description: 'Relative cutoff for aux basis', unit: 'Ry', default: 60 },
      eps_scf: { type: 'number', description: 'SCF convergence', default: 1e-6 },
      max_scf: { type: 'number', description: 'Max SCF iterations', default: 100 },
      xc_functional: { type: 'string', description: 'XC functional', default: 'PBE' },
      ukind: { type: 'enum', description: 'Spin treatment', enum_values: ['RESTRICTED', 'UNRESTRICTED', 'SPIN_ORBIT'], default: 'RESTRICTED' },
      mgrid: { type: 'object', description: 'Multigrid settings', default: { ngpts: 4, cutoff: 400 } },
    },
    implicit_params: {
      cutoff: { description: '根据基组类型调整', infer_from: ['params.basis_set'], rule: 'TZVP用400Ry, SZV-GTH用280Ry, DZVP-GTH用400Ry', default_value: 400, risk_if_wrong: 'high' },
      rel_cutoff: { description: '相对截止能', infer_from: ['params.cutoff'], rule: '通常为cutoff的15%', default_value: 60, risk_if_wrong: 'medium' },
      eps_scf: { description: '根据计算类型调整', infer_from: ['params.run_type'], rule: 'GEO_OPT用1e-6, MD用1e-5', default_value: 1e-6, risk_if_wrong: 'medium' },
      ukind: { description: '磁性系统推断', infer_from: ['params.system'], rule: '含Fe/Co/Ni用UNRESTRICTED', default_value: 'RESTRICTED', risk_if_wrong: 'high' },
    },
    defaults: { project_name: 'CP2K', run_type: 'ENERGY_FORCE', kind: 'BASIS_SET', charge: 0, multiplicity: 1, cutoff: 400, rel_cutoff: 60, eps_scf: 1e-6, max_scf: 100, xc_functional: 'PBE', ukind: 'RESTRICTED' },
    constraints: [
      { params: ['cutoff', 'rel_cutoff'], rule: 'cutoff应远大于rel_cutoff', check: 'cutoff > rel_cutoff * 3' },
      { params: ['eps_scf'], rule: 'eps_scf应合理', check: 'eps_scf > 0 && eps_scf < 1e-2' },
    ],
  },
  {
    name: 'qe_pw',
    category: 'dft',
    required_params: ['structure_file', 'pseudo_dir'],
    optional_params: {
      calculation: { type: 'enum', description: 'Calculation type', enum_values: ['scf', 'nscf', 'bands', 'relax', 'vc-relax', 'md', 'cp', 'vc-md'], default: 'scf' },
      pseudo: { type: 'string', description: 'Pseudopotential name pattern', default: 'UPF' },
      ecutwfc: { type: 'number', description: 'Kinetic energy cutoff for wavefunctions', unit: 'eV', default: 40 },
      ecutrho: { type: 'number', description: 'Charge density cutoff', unit: 'eV', default: 320 },
      kpoints: { type: 'object', description: 'K-point mesh', default: { type: 'automatic', grid: [4, 4, 4] } },
      conv_thr: { type: 'number', description: 'SCF convergence threshold', unit: 'eV', default: 1e-8 },
      electron_maxstep: { type: 'number', description: 'Max electron SCF steps', default: 100 },
      mixing_beta: { type: 'number', description: 'Mixing factor for SCF', default: 0.7 },
      smearing: { type: 'enum', description: 'Smearing type', enum_values: ['gaussian', 'fd', 'mp', 'mp2'], default: 'gaussian' },
      degauss: { type: 'number', description: 'Smearing width', unit: 'eV', default: 0.01 },
      occupations: { type: 'enum', description: 'Occupation method', enum_values: ['smearing', 'fixed', 'tetrahedra', 'tetrahedra_lin'], default: 'smearing' },
      tstress: { type: 'boolean', description: 'Calculate stress', default: false },
      tprnfor: { type: 'boolean', description: 'Calculate forces', default: false },
      outdir: { type: 'string', description: 'Output directory', default: './out' },
      prefix: { type: 'string', description: 'Output file prefix', default: 'pwscf' },
    },
    implicit_params: {
      ecutrho: { description: '根据ecutwfc推断', infer_from: ['params.ecutwfc'], rule: '通常为ecutwfc的8-12倍', default_value: 320, risk_if_wrong: 'high' },
      smearing: { description: '根据系统类型选择', infer_from: ['params.system'], rule: '金属用gaussian/fd, 半导体用tetrahedra', default_value: 'gaussian', risk_if_wrong: 'medium' },
      degauss: { description: '根据smearing类型调整', infer_from: ['params.smearing'], rule: 'gaussian用0.01-0.02, fd用0.01', default_value: 0.01, risk_if_wrong: 'low' },
      tprnfor: { description: '根据计算类型自动设置', infer_from: ['params.calculation'], rule: 'relax/vc-relax/md自动启用', default_value: false, risk_if_wrong: 'low' },
      tstress: { description: '根据计算类型自动设置', infer_from: ['params.calculation'], rule: 'vc-relax自动启用', default_value: false, risk_if_wrong: 'low' },
    },
    defaults: { calculation: 'scf', ecutwfc: 40, ecutrho: 320, conv_thr: 1e-8, electron_maxstep: 100, mixing_beta: 0.7, smearing: 'gaussian', degauss: 0.01, occupations: 'smearing', tstress: false, tprnfor: false, outdir: './out', prefix: 'pwscf' },
    constraints: [
      { params: ['ecutwfc', 'ecutrho'], rule: 'ecutrho应>=ecutwfc的4倍', check: 'ecutrho >= ecutwfc * 4' },
      { params: ['mixing_beta'], rule: 'mixing_beta应在合理范围', check: 'mixing_beta > 0 && mixing_beta < 1' },
    ],
  },
];

/** 自适应偏好学习（旧格式，用于迁移）*/
interface UserCorrection {
  tool: string;
  param: string;
  auto_value: unknown;
  user_value: unknown;
  context: Record<string, unknown>;
  timestamp: string;
}

interface PreferenceProfile {
  corrections: UserCorrection[];
  patterns: PreferencePattern[];
}

interface PreferencePattern {
  tool: string;
  param: string;
  preferred_value: unknown;
  match_conditions: Record<string, string>;
  count: number;
}

export class ParamCompleterService {
  private envService: EnvironmentDetectorService;
  private dynamicTemplateLibrary: DynamicTemplateLibrary;
  private paramGenerator: ParamGenerator;
  private paramVerifier: ParamVerifier;
  private associationMiner: AssociationMiner;
  private environmentAdapter: EnvironmentAdapter;
  private evolutionConfig: EvolutionConfig;
  private initialized: boolean = false;
  private prefsPath: string; // 旧偏好文件路径，用于迁移

  constructor(prefsPathOrConfig?: string | Partial<EvolutionConfig>) {
    this.envService = new EnvironmentDetectorService();
    this.environmentAdapter = new EnvironmentAdapter();
    
    let config: Partial<EvolutionConfig> = {};
    if (typeof prefsPathOrConfig === 'string') {
      // 兼容旧构造函数签名
      this.prefsPath = prefsPathOrConfig;
      config.storagePath = join(prefsPathOrConfig, '..', 'evolution');
    } else {
      config = prefsPathOrConfig || {};
      this.prefsPath = join(homedir(), '.ai4s', 'preferences.json');
    }
    
    this.evolutionConfig = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
    this.dynamicTemplateLibrary = new DynamicTemplateLibrary(this.evolutionConfig);
    this.paramGenerator = new ParamGenerator(this.dynamicTemplateLibrary, this.evolutionConfig);
    this.paramVerifier = new ParamVerifier(this.dynamicTemplateLibrary, this.evolutionConfig);
    this.associationMiner = new AssociationMiner(
      this.dynamicTemplateLibrary.getStorage(),
      this.evolutionConfig
    );
    
    this.initializeBuiltinTemplates();
    this.migrateOldPreferences();
    this.initialized = true;
  }

  /** 初始化内置模板 */
  private initializeBuiltinTemplates(): void {
    this.dynamicTemplateLibrary.initialize(TOOL_TEMPLATES);
  }

  /** 迁移旧偏好数据到新存储 */
  private migrateOldPreferences(): void {
    if (existsSync(this.prefsPath)) {
      const migrated = this.dynamicTemplateLibrary.migrateOldPreferences(this.prefsPath);
      if (migrated) {
        console.log('[ParamCompleter] Migrated old preferences to EvoSkills storage');
      }
    }
  }

  /** 查找匹配的参数模板（兼容接口）*/
  findTemplate(toolName: string): ToolParamTemplate | undefined {
    // 对于兼容接口，我们只返回静态模板
    return TOOL_TEMPLATES.find(t => t.name === toolName || t.category === toolName);
  }

  /** 列出所有支持的模板（使用动态库）*/
  listTemplates(): Array<{ name: string; category: string; param_count: number }> {
    const dynamicTemplates = this.dynamicTemplateLibrary.listTemplates();
    return dynamicTemplates.map(t => ({
      name: t.name,
      category: t.category,
      param_count: t.paramCount,
    }));
  }

  /** 智能补全参数 - EvoSkills 架构实现 */
  async complete(userParams: UserParams): Promise<CompletedParams> {
    if (!this.initialized) {
      this.initializeBuiltinTemplates();
    }

    const template = this.dynamicTemplateLibrary.getTemplate(userParams.tool);
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

    // 尝试采集环境信息（优雅降级），并扩展
    let envExt: EnvironmentInfoEx | null = null;
    try {
      const env = await this.envService.detect();
      envExt = this.environmentAdapter.extendEnvironmentInfo(env);
    } catch (error) {
      warnings.push({
        param: '_env',
        level: 'info',
        message: `Environment detection failed, using defaults: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // 检查必填参数
    for (const req of template.required_params) {
      if (!(req in userParams.params)) {
        warnings.push({ param: req, level: 'error', message: `Required parameter missing: ${req}` });
      }
    }

    // EvoSkills: 使用 Generator + Verifier 架构
    const request: CompletionRequest = {
      tool: userParams.tool,
      userParams: { ...userParams.params },
      environment: envExt || undefined,
      beamWidth: this.evolutionConfig.beamWidth,
    };

    // 1. Generator 生成多个候选
    const candidates = this.paramGenerator.generateCandidates(request);
    
    if (candidates.length === 0) {
      // 没有生成候选，使用传统方式回退
      return this.fallbackComplete(template, userParams, envExt, warnings, implicit, confidence);
    }

    // 2. Verifier 对候选打分
    const scoredCandidates = this.paramVerifier.scoreCandidates(candidates, template, envExt || undefined);
    
    // 3. 选择最高分候选
    const bestCandidate = this.paramGenerator.selectBestCandidate(scoredCandidates);
    if (!bestCandidate) {
      return this.fallbackComplete(template, userParams, envExt, warnings, implicit, confidence);
    }

    // 4. 提取结果，分离显式和隐式
    const allParams = bestCandidate.params;
    for (const [key, value] of Object.entries(allParams)) {
      if (!(key in userParams.params)) {
        implicit[key] = value;
        // 获取参数规则的置信度
        const rule = template.implicit_params[key];
        confidence[key] = rule ? rule.confidence : bestCandidate.verifierScore;
      }
    }
    
    // 也将 optional_params 的默认值添加到 implicit 中（用于向后兼容测试）
    // 如果已经在 implicit_params 中有学习的规则，使用学习的默认值
    // 否则使用 optional_params 的原始默认值
    for (const [key, spec] of Object.entries(template.optional_params)) {
      if (!(key in userParams.params) && !(key in implicit) && spec.default !== undefined) {
        // 检查是否已经有学习的隐式规则
        const implicitRule = template.implicit_params[key];
        implicit[key] = implicitRule ? implicitRule.default_value : spec.default;
        confidence[key] = implicitRule ? implicitRule.confidence : 0.95;
      }
    }

    // 5. 从 Verifier 结果生成警告
    const scoreResult = this.paramVerifier.scoreCandidate(bestCandidate, template, envExt || undefined);
    for (const violation of scoreResult.violations) {
      warnings.push({
        param: violation.params.join(','),
        level: violation.severity,
        message: violation.message,
        suggested_value: violation.suggestedFix?.value,
      });
    }

    // 6. 对低置信度参数增加警告
    const minThreshold = this.evolutionConfig.minConfidenceThreshold;
    for (const [key, conf] of Object.entries(confidence)) {
      if (conf < minThreshold) {
        const rule = template.implicit_params[key];
        warnings.push({
          param: key,
          level: rule?.risk_if_wrong === 'critical' ? 'error' : 'warning',
          message: `Auto-completed "${key}" = ${JSON.stringify(implicit[key])} (confidence: ${(conf * 100).toFixed(0)}%). Low confidence, please verify.`,
          suggested_value: implicit[key],
        });
      }
    }

    // 增加使用统计
    template.usageCount += 1;
    if (warnings.filter(w => w.level === 'error').length === 0) {
      template.correctCount += 1;
    }
    // 保存使用统计
    this.dynamicTemplateLibrary.getStorage().upsertTemplate(template);

    return {
      explicit: userParams.params,
      implicit,
      warnings,
      confidence,
    };
  }

  /** 回退到传统补全方式，兼容处理 */
  private fallbackComplete(
    template: DynamicToolParamTemplate,
    userParams: UserParams,
    env: EnvironmentInfoEx | null,
    warnings: ParamWarning[],
    implicit: Record<string, any>,
    confidence: Record<string, number>
  ): CompletedParams {
    const accumulatedParams = { ...userParams.params };
    const confidenceManager = this.dynamicTemplateLibrary.getConfidenceManager();

    for (const [key, rule] of Object.entries(template.implicit_params)) {
      if (key in accumulatedParams) {
        confidence[key] = 1.0;
        continue;
      }

      // 使用原有推断逻辑
      const inferred = this.inferParam(key, rule, accumulatedParams, env);
      implicit[key] = inferred.value;
      confidence[key] = this.combineConfidences(rule.confidence, inferred.confidence);
      accumulatedParams[key] = inferred.value;

      if (confidence[key] < this.evolutionConfig.minConfidenceThreshold) {
        warnings.push({
          param: key,
          level: rule.risk_if_wrong === 'critical' ? 'error' : 'warning',
          message: `Auto-completed "${key}" = ${JSON.stringify(inferred.value)} (confidence: ${(confidence[key] * 100).toFixed(0)}%). Reason: ${inferred.reason}`,
          suggested_value: inferred.value,
        });
      }
    }

    // 填充默认值
    for (const [key, spec] of Object.entries(template.optional_params)) {
      if (!(key in userParams.params) && !(key in implicit)) {
        if (spec.default !== undefined) {
          implicit[key] = spec.default;
          confidence[key] = 0.95;
        }
      }
    }

    return {
      explicit: userParams.params,
      implicit,
      warnings,
      confidence,
    };
  }

  /** 组合置信度 */
  private combineConfidences(ruleConfidence: number, inferredConfidence: number): number {
    // 简单平均
    return (ruleConfidence + inferredConfidence) / 2;
  }

  /** 验证已有参数（不补全，只检查）- 使用 EvoSkills Verifier */
  validate(userParams: UserParams): ParamWarning[] {
    const template = this.dynamicTemplateLibrary.getTemplate(userParams.tool);
    if (!template) return [{ param: '*', level: 'warning', message: `Unknown tool: ${userParams.tool}` }];

    const warnings: ParamWarning[] = [];

    // 检查必填
    for (const req of template.required_params) {
      if (!(req in userParams.params)) {
        warnings.push({ param: req, level: 'error', message: `Required parameter missing: ${req}` });
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

    // 使用 Verifier 进行完整检查
    const candidate: ParamCandidate = {
      params: { ...userParams.params },
      confidence: 1.0,
      generatorScore: 1.0,
      verifierScore: 0,
      source: 'user-pref',
    };

    const scoreResult = this.paramVerifier.scoreCandidate(candidate, template);
    for (const violation of scoreResult.violations) {
      warnings.push({
        param: violation.params.join(','),
        level: violation.severity,
        message: violation.message,
        suggested_value: violation.suggestedFix?.value,
      });
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

  /** 生成 Quantum ESPRESSO pw.x 输入文件内容 */
  generateQeInput(params: Record<string, any>): string {
    const lines = ['&CONTROL', `  calculation = '${params.calculation || 'scf'}'`, `  prefix = '${params.prefix || 'pwscf'}'`, `  outdir = '${params.outdir || './out'}'`, `  tstress = ${params.tstress ? '.true.' : '.false.'}`, `  tprnfor = ${params.tprnfor ? '.true.' : '.false.'}`, '/'];
    lines.push('', '&SYSTEM');
    if (params.ibrav !== undefined) lines.push(`  ibrav = ${params.ibrav}`);
    if (params.nat !== undefined) lines.push(`  nat = ${params.nat}`);
    if (params.ntyp !== undefined) lines.push(`  ntyp = ${params.ntyp}`);
    lines.push(`  ecutwfc = ${params.ecutwfc || 40}`, `  ecutrho = ${params.ecutrho || 320}`, '/');
    lines.push('', '&ELECTRONS', `  conv_thr = ${params.conv_thr || '1.0e-8'}`, `  mixing_beta = ${params.mixing_beta || 0.7}`, `  electron_maxstep = ${params.electron_maxstep || 100}`, '/');
    if (params.occupations === 'smearing') {
      lines.push('', '&IONS', '/', '', 'ATOMIC_SPECIES');
    }
    return lines.join('\n');
  }

  /** 生成 CP2K 输入文件内容 */
  generateCp2kInput(params: Record<string, any>): string {
    const lines = [`&FORCE_EVAL`, `  METHOD QUICKSTEP`, `  &SUBSYS`];
    if (params.coord_file) lines.push(`    &COORD`);
    lines.push(`      @INCLUDE ${params.coord_file || 'coords.xyz'}`);
    lines.push(`    &END`, `    &KIND`);
    lines.push(`      BASIS_SET ${params.basis_set || 'DZVP-GTH'}`);
    if (params.potential_file) lines.push(`      POTENTIAL ${params.potential_file}`);
    lines.push(`    &END`, `  &END`, `  &DFT`);
    lines.push(`    ${params.xc_functional ? '&XC' : ''}`);
    if (params.xc_functional) {
      lines.push(`      FUNCTIONAL ${params.xc_functional}`);
      lines.push(`    &END`);
    }
    lines.push(`    &MGRID`, `      CUTOFF ${params.cutoff || 400}`, `      REL_CUTOFF ${params.rel_cutoff || 60}`, `    &END`);
    lines.push(`    &SCF`, `      EPS_SCF ${params.eps_scf || '1.0E-6'}`, `      MAX_SCF ${params.max_scf || 100}`, `    &END`);
    lines.push(`  &END`, `&END`);
    return lines.join('\n');
  }

  // --- EvoSkills 自进化学习闭环 ---

  /** 记录用户纠正，并触发学习（EvoSkills）*/
  recordCorrection(tool: string, param: string, autoValue: any, userValue: any, context: Record<string, any> = {}): void {
    const template = this.dynamicTemplateLibrary.getTemplate(tool);
    if (!template) {
      // 无法学习，工具不存在
      return;
    }

    // 1. 记录修正到存储（新 EvoSkills 存储 + 旧格式向后兼容）
    const correction: UserCorrectionRecord = {
      id: `${tool}-${param}-${Date.now()}`,
      tool,
      param,
      auto_value: autoValue,
      user_value: userValue,
      context,
      timestamp: new Date().toISOString(),
      templateVersion: template.version,
    };
    
    const storage = this.dynamicTemplateLibrary.getStorage();
    storage.addCorrection(correction);

    // 向后兼容：仍然写入旧偏好文件
    if (this.prefsPath) {
      let existing: PreferenceProfile = { corrections: [], patterns: [] };
      if (existsSync(this.prefsPath)) {
        try {
          existing = JSON.parse(readFileSync(this.prefsPath, 'utf8'));
        } catch (e) {
          // ignore
        }
      }
      // 转换为旧格式
      existing.corrections.push({
        tool,
        param,
        auto_value: autoValue,
        user_value: userValue,
        context,
        timestamp: correction.timestamp,
      });
      // 确保目录存在
      const dir = require('path').dirname(this.prefsPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.prefsPath, JSON.stringify(existing, null, 2));
    }

    // 2. 更新模板中该参数规则的置信度
    // 原来的自动值错了，用户给了新值
    this.dynamicTemplateLibrary.updateTemplateFromCorrection(
      tool,
      param,
      autoValue,
      userValue,
      false, // was not correct
      context
    );

    // 3. 检查是否需要触发关联规则挖掘
    const corrections = storage.getCorrectionsForTool(tool);
    if (this.associationMiner.shouldMine(corrections.length)) {
      // 挖掘关联规则
      const rules = this.associationMiner.mineRules(tool);
      this.dynamicTemplateLibrary.updateAssociationRules(rules);
      this.associationMiner.afterMining();
      console.log(`[EvoSkills] Mined ${rules.length} association rules for ${tool}`);
    }

    // 共同进化：Generator 和 Verifier 都从中学习
    // Generator 已经通过置信度更新学习了
    // Verifier 通过关联规则更新学习了
  }

  /** 查找匹配的偏好（兼容旧代码，委托给动态模板库）*/
  private findPreference(tool: string, param: string, context: Record<string, any>): any | null {
    // 在新架构中，这个功能已经整合到动态模板和置信度中
    // 这里保留用于兼容回退
    const template = this.dynamicTemplateLibrary.getTemplate(tool);
    if (!template) return null;
    
    const rule = template.implicit_params[param];
    if (!rule) return null;
    
    // 如果规则置信度很低，可能有用户偏好
    if (rule.conditionalConfidence) {
      // 查找条件匹配
      for (const [key, conf] of Object.entries(rule.conditionalConfidence)) {
        // 简化处理，直接返回默认值已经包含学习
      }
    }
    
    // 如果是学习过的规则，直接返回更新后的默认值
    if (template.isLearned) {
      return rule.default_value;
    }
    
    return null;
  }

  /** 导出 GitHub Actions workflow 模板（CI集成） */
  generateCIWorkflow(snapshotBaselinePath: string, outputPath?: string): string {
    const workflow = `name: AI4S Environment Check
on: [push, pull_request]

jobs:
  env-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install ai4s-cli
        run: npm install -g @ai4s/orchestrator
      - name: Check environment consistency
        run: |
          ai4s env-check --baseline ${snapshotBaselinePath} --format text --ci
        # Exit codes: 0=consistent, 1=differences found, 2=error
`;
    if (outputPath) {
      const dir = join(outputPath, '..');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(outputPath, workflow);
    }
    return workflow;
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
