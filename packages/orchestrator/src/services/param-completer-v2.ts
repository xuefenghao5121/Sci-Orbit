/**
 * @file 参数补全服务 V2 - 分层推断独立实现 (子agent2)
 * @description 采用分层推断架构，分离环境上下文和任务上下文，独立验证
 */

// ============================================================================
// 类型定义 - 接口定义
// ============================================================================

/**
 * 环境上下文 - 从运行环境采集的信息
 */
export interface EnvironmentContext {
  hasGpu: boolean;
  gpuCount: number;
  hasMpi: boolean;
  cpuCores: number;
  cudaVersion?: string;
  totalMemoryGB?: number;
}

/**
 * 任务上下文 - 从用户任务描述提取的信息
 */
export interface TaskContext {
  calculationType: 'single-point' | 'relaxation' | 'md' | 'vibration';
  systemType: 'metal' | 'insulator' | 'semiconductor' | 'unknown';
  atomCount: number;
  spinPolarized?: boolean;
  isSurface?: boolean;
  forceField?: string;
}

/**
 * 补全请求
 */
export interface CompletionRequest {
  tool: string;
  params: Record<string, any>;
  taskContext?: Partial<TaskContext>;
}

/**
 * 单个推断结果
 */
export interface InferenceResult {
  paramName: string;
  value: any;
  confidence: number;
  source: 'default' | 'environment' | 'task' | 'inference';
  reasoning: string;
}

/**
 * 验证问题
 */
export interface ValidationIssue {
  param: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * 最终补全结果
 */
export interface CompletionResult {
  tool: string;
  explicit: Record<string, any>;
  inferred: InferenceResult[];
  allParams: Record<string, any>;
  confidence: Record<string, number>;
  sources: Record<string, string>;
  validation: ValidationResult;
}

/**
 * 参数元数据定义
 */
export interface ParamMetadata {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'integer';
  required: boolean;
  defaultValue?: any;
  defaultConfidence: number;
  range?: { min?: number; max?: number };
  allowedValues?: any[];
  description: string;
}

/**
 * 推断器接口
 */
interface Inferrer {
  name: string;
  canInfer: (
    paramName: string,
    request: CompletionRequest,
    current: CompletionResult,
    env: EnvironmentContext | undefined
  ) => boolean;
  infer: (
    paramName: string,
    request: CompletionRequest,
    current: CompletionResult,
    env: EnvironmentContext | undefined
  ) => InferenceResult | null;
}

/**
 * 验证器接口
 */
interface Validator {
  name: string;
  validate: (
    params: Record<string, any>,
    tool: string,
    metadata: Map<string, ParamMetadata>
  ) => ValidationIssue[];
}

/**
 * 工具定义
 */
interface ToolDefinition {
  name: string;
  displayName: string;
  params: ParamMetadata[];
  validators: Validator[];
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 支持的工具列表
 */
const SUPPORTED_TOOLS = ['vasp', 'lammps', 'abacus', 'gromacs'] as const;
type SupportedTool = typeof SUPPORTED_TOOLS extends Array<infer T> ? T : never;

// ============================================================================
// 默认环境上下文
// ============================================================================

const DEFAULT_ENVIRONMENT: EnvironmentContext = {
  hasGpu: false,
  gpuCount: 0,
  hasMpi: true,
  cpuCores: 1,
};

// ============================================================================
// 默认任务上下文
// ============================================================================

const DEFAULT_TASK_CONTEXT: TaskContext = {
  calculationType: 'single-point',
  systemType: 'unknown',
  atomCount: 100,
};

// ============================================================================
// 参数补全服务 V2 实现
// ============================================================================

export class ParamCompleterServiceV2 {
  private tools: Map<string, ToolDefinition> = new Map();
  private inferrers: Inferrer[] = [];
  private environment?: EnvironmentContext;

  constructor() {
    this.initializeToolDefinitions();
    this.initializeInferrers();
  }

  // ==========================================================================
  // 公共API
  // ==========================================================================

  /**
   * 设置环境上下文
   */
  setEnvironment(env: EnvironmentContext): void {
    this.environment = env;
  }

  /**
   * 获取当前环境
   */
  getEnvironment(): EnvironmentContext | undefined {
    return this.environment;
  }

  /**
   * 主入口：补全参数
   */
  complete(request: CompletionRequest): CompletionResult {
    const toolName = request.tool.toLowerCase() as SupportedTool;

    // 初始化结果结构
    const result: CompletionResult = {
      tool: toolName,
      explicit: { ...request.params },
      inferred: [],
      allParams: { ...request.params },
      confidence: this.initializeConfidence(request.params),
      sources: this.initializeSources(request.params),
      validation: { valid: true, issues: [] },
    };

    // 检查工具是否支持
    if (!this.tools.has(toolName)) {
      result.validation.issues.push({
        param: 'tool',
        severity: 'error',
        message: `不支持的工具 "${request.tool}"，当前支持: ${SUPPORTED_TOOLS.join(', ')}`,
      });
      result.validation.valid = false;
      return result;
    }

    const toolDef = this.tools.get(toolName)!;
    const metadataMap = this.getMetadataMap(toolDef);

    // 第一阶段：默认值推断（所有未指定参数用默认值填充）
    this.inferDefaultValues(toolDef, request, result);

    // 第二阶段：按顺序运行所有推断器
    for (const inferrer of this.inferrers) {
      for (const paramName of Array.from(metadataMap.keys())) {
        // 如果用户已经指定了，跳过推断
        if (paramName in request.params) continue;

        try {
          if (inferrer.canInfer(paramName, request, result, this.environment)) {
            const inference = inferrer.infer(paramName, request, result, this.environment);
            if (inference) {
              this.applyInference(result, inference);
            }
          }
        } catch (e) {
          result.validation.issues.push({
            param: paramName,
            severity: 'warning',
            message: `推断器 ${inferrer.name} 出错: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }
    }

    // 第三阶段：冲突解决
    this.resolveConflicts(result);

    // 第四阶段：参数验证
    result.validation = this.validate(result.allParams, toolName);

    return result;
  }

  /**
   * 独立验证参数
   */
  validate(params: Record<string, any>, tool: string): ValidationResult {
    const toolName = tool.toLowerCase() as SupportedTool;
    const result: ValidationResult = { valid: true, issues: [] };

    if (!this.tools.has(toolName)) {
      result.issues.push({
        param: 'tool',
        severity: 'error',
        message: `不支持的工具 "${tool}"`,
      });
      result.valid = false;
      return result;
    }

    const toolDef = this.tools.get(toolName)!;
    const metadataMap = this.getMetadataMap(toolDef);

    // 检查必填参数
    for (const name of Array.from(metadataMap.keys())) {
      const meta = metadataMap.get(name)!;
      if (meta.required && !(name in params)) {
        result.issues.push({
          param: name,
          severity: 'error',
          message: `缺少必填参数: ${name} (${meta.description})`,
        });
        result.valid = false;
      }
    }

    // 检查数值范围
    for (const [name, value] of Object.entries(params)) {
      const meta = metadataMap.get(name);
      if (!meta) continue;

      if (meta.type === 'number' || meta.type === 'integer') {
        const numValue = Number(value);
        if (meta.range?.min !== undefined && numValue < meta.range.min) {
          result.issues.push({
            param: name,
            severity: 'error',
            message: `${name} = ${numValue} 小于最小值 ${meta.range.min}`,
          });
          result.valid = false;
        }
        if (meta.range?.max !== undefined && numValue > meta.range.max) {
          result.issues.push({
            param: name,
            severity: 'error',
            message: `${name} = ${numValue} 大于最大值 ${meta.range.max}`,
          });
          result.valid = false;
        }
      }

      if (meta.allowedValues && !meta.allowedValues.includes(value)) {
        result.issues.push({
          param: name,
          severity: 'error',
          message: `${name} = ${value} 不是允许的值，允许值: ${meta.allowedValues.join(', ')}`,
        });
        result.valid = false;
      }
    }

    // 运行工具特定验证器
    for (const validator of toolDef.validators) {
      const issues = validator.validate(params, toolName, metadataMap);
      result.issues.push(...issues);
    }

    // 检查是否有error级别的问题
    if (result.issues.some(i => i.severity === 'error')) {
      result.valid = false;
    }

    return result;
  }

  /**
   * 获取支持的工具列表
   */
  getSupportedTools(): string[] {
    return [...SUPPORTED_TOOLS];
  }

  /**
   * 生成 VASP INCAR 格式
   */
  generateVaspIncarlike(result: CompletionResult): string {
    let output = '';

    // 添加验证信息注释
    if (result.validation.issues.length > 0) {
      output += '# 自动生成的 INCAR\n';
      output += '# 检测到以下问题:\n';
      for (const issue of result.validation.issues) {
        output += `# [${issue.severity}] ${issue.param}: ${issue.message}\n`;
      }
      output += '\n';
    }

    // 输出参数
    for (const [key, value] of Object.entries(result.allParams)) {
      if (['kpoints', 'poscar', 'potcar', 'kpoINTS'].includes(key.toLowerCase())) continue;
      output += `${key.toUpperCase()} = ${String(value)}\n`;
    }

    return output;
  }

  /**
   * 生成 ABACUS INPUT 格式
   */
  generateAbacusInput(result: CompletionResult): string {
    let output = '';

    if (result.validation.issues.length > 0) {
      output += '# 自动生成的 INPUT\n';
      for (const issue of result.validation.issues) {
        output += `# [${issue.severity}] ${issue.param}: ${issue.message}\n`;
      }
      output += '\n';
    }

    for (const [key, value] of Object.entries(result.allParams) ) {
      output += `${key.toLowerCase()} ${String(value)}\n`;
    }

    return output;
  }

  /**
   * 生成 GROMACS .mdp 格式
   */
  generateGromacsMdp(result: CompletionResult): string {
    let output = '; 自动生成的 mdp 文件\n\n';

    if (result.validation.issues.length > 0) {
      for (const issue of result.validation.issues) {
        output += `; [${issue.severity}] ${issue.param}: ${issue.message}\n`;
      }
      output += '\n';
    }

    for (const [key, value] of Object.entries(result.allParams)) {
      output += `${key} = ${String(value)}\n`;
    }

    return output;
  }

  // ==========================================================================
  // 初始化方法
  // ==========================================================================

  /**
   * 初始化所有工具定义
   */
  private initializeToolDefinitions(): void {
    this.initializeVaspDefinition();
    this.initializeAbacusDefinition();
    this.initializeLammpsDefinition();
    this.initializeGromacsDefinition();
  }

  /**
   * 初始化VASP参数定义
   */
  private initializeVaspDefinition(): void {
    const params: ParamMetadata[] = [
      // 核心参数
      { name: 'ENCUT', type: 'number', required: true, description: '截断能', defaultConfidence: 0 },
      { name: 'KPOINTS', type: 'string', required: true, description: 'k点网格', defaultConfidence: 0 },

      // 精度控制
      { name: 'PREC', type: 'string', required: false, defaultValue: 'Normal', defaultConfidence: 0.9,
        allowedValues: ['Low', 'Normal', 'Accurate', 'High'], description: '精度级别' },
      { name: 'EDIFF', type: 'number', required: false, defaultValue: 1e-4, defaultConfidence: 0.8,
        range: { min: 1e-8, max: 1e-1 }, description: '电子步收敛阈值' },
      { name: 'EDIFFG', type: 'number', required: false, defaultValue: -0.01, defaultConfidence: 0.8,
        description: '离子步收敛阈值' },

      // 电子步
      { name: 'NELM', type: 'integer', required: false, defaultValue: 60, defaultConfidence: 0.9,
        range: { min: 1, max: 1000 }, description: '最大电子步数目' },
      { name: 'NELMIN', type: 'integer', required: false, defaultValue: 2, defaultConfidence: 0.9,
        range: { min: 0, max: 10 }, description: '最小电子步数目' },
      { name: 'NELMDL', type: 'integer', required: false, defaultValue: -5, defaultConfidence: 0.8,
        description: '初始电荷延拓步数' },

      // 离子步 / 弛豫
      { name: 'NSW', type: 'integer', required: false, defaultValue: 0, defaultConfidence: 0.9,
        range: { min: 0, max: 500 }, description: '最大离子步数目' },
      { name: 'IBRION', type: 'integer', required: false, defaultValue: -1, defaultConfidence: 0.9,
        allowedValues: [-1, 0, 1, 2, 3, 5, 6], description: '离子优化算法' },
      { name: 'ISIF', type: 'integer', required: false, defaultValue: 2, defaultConfidence: 0.7,
        allowedValues: [0, 1, 2, 3, 4, 5, 6, 7], description: '应力计算级别' },

      // Smearing
      { name: 'ISMEAR', type: 'integer', required: false, defaultValue: 1, defaultConfidence: 0.6,
        allowedValues: [-5, -3, -1, 0, 1, 2, 3, 4, 5], description: '涂抹方法' },
      { name: 'SIGMA', type: 'number', required: false, defaultValue: 0.2, defaultConfidence: 0.7,
        range: { min: 0.01, max: 1.0 }, description: '涂抹宽度' },

      // 自旋
      { name: 'ISPIN', type: 'integer', required: false, defaultValue: 1, defaultConfidence: 0.8,
        allowedValues: [1, 2], description: '自旋极化开关' },
      { name: 'MAGMOM', type: 'string', required: false, description: '初始磁矩', defaultConfidence: 0.5 },

      // 输出控制
      { name: 'LWAVE', type: 'boolean', required: false, defaultValue: true, defaultConfidence: 0.8,
        description: '输出波函数' },
      { name: 'LCHARG', type: 'boolean', required: false, defaultValue: true, defaultConfidence: 0.8,
        description: '输出电荷密度' },
      { name: 'LAECHG', type: 'boolean', required: false, defaultValue: false, defaultConfidence: 0.7,
        description: '输出电荷差分' },
      { name: 'LVTOT', type: 'boolean', required: false, defaultValue: false, defaultConfidence: 0.7,
        description: '输出局域势' },

      // 对称性
      { name: 'ISYM', type: 'integer', required: false, defaultValue: 2, defaultConfidence: 0.9,
        range: { min: -1, max: 3 }, description: '对称性开关' },

      // 并行化
      { name: 'NPAR', type: 'integer', required: false, defaultValue: 2, defaultConfidence: 0.5,
        description: '能带并行分组' },
      { name: 'KPAR', type: 'integer', required: false, defaultValue: 1, defaultConfidence: 0.8,
        description: 'k点并行分组' },

      // 范德华修正
      { name: 'IVDW', type: 'integer', required: false, defaultValue: 0, defaultConfidence: 0.6,
        description: '范德华修正类型' },
    ];

    this.tools.set('vasp', {
      name: 'vasp',
      displayName: 'VASP',
      params,
      validators: [this.createConsistencyValidator()],
    });
  }

  /**
   * 初始化ABACUS参数定义
   */
  private initializeAbacusDefinition(): void {
    const params: ParamMetadata[] = [
      { name: 'ecutwfc', type: 'number', required: true, description: '平面波截断能', defaultConfidence: 0 },
      { name: 'kpoints', type: 'string', required: true, description: 'k点设置', defaultConfidence: 0 },
      { name: 'calculation', type: 'string', required: false, defaultValue: 'scf', defaultConfidence: 0.9,
        allowedValues: ['scf', 'relax', 'cell-relax', 'md', 'nscf'], description: '计算类型' },
      { name: 'basis_type', type: 'string', required: false, defaultValue: 'pw', defaultConfidence: 0.9,
        allowedValues: ['pw', 'lcao', 'gaussian'], description: '基组类型' },
      { name: 'scf_nmax', type: 'integer', required: false, defaultValue: 50, defaultConfidence: 0.9,
        range: { min: 1, max: 500 }, description: '最大SCF迭代步数' },
      { name: 'scf_thr', type: 'number', required: false, defaultValue: 1e-9, defaultConfidence: 0.8,
        range: { min: 1e-12, max: 1e-3 }, description: 'SCF收敛阈值' },
      { name: 'relax_nmax', type: 'integer', required: false, defaultValue: 50, defaultConfidence: 0.7,
        range: { min: 1, max: 500 }, description: '最大弛豫步数' },
      { name: 'relax_thr', type: 'number', required: false, defaultValue: 1e-5, defaultConfidence: 0.8,
        range: { min: 1e-8, max: 1e-2 }, description: '弛豫力收敛阈值' },
      { name: 'smear_type', type: 'string', required: false, defaultValue: 'gaussian', defaultConfidence: 0.6,
        allowedValues: ['gaussian', 'fermi', 'methfessel', 'tetrahedron'], description: '涂抹类型' },
      { name: 'sigma', type: 'number', required: false, defaultValue: 0.01, defaultConfidence: 0.7,
        range: { min: 0.001, max: 0.5 }, description: '涂抹宽度' },
      { name: 'device', type: 'string', required: false, defaultValue: 'cpu', defaultConfidence: 0.6,
        allowedValues: ['cpu', 'gpu'], description: '计算设备' },
      { name: 'out_level', type: 'integer', required: false, defaultValue: 1, defaultConfidence: 0.9,
        range: { min: 0, max: 3 }, description: '输出级别' },
    ];

    this.tools.set('abacus', {
      name: 'abacus',
      displayName: 'ABACUS',
      params,
      validators: [],
    });
  }

  /**
   * 初始化LAMMPS参数定义
   */
  private initializeLammpsDefinition(): void {
    const params: ParamMetadata[] = [
      { name: 'atom_style', type: 'string', required: true, description: '原子样式', defaultConfidence: 0 },
      { name: 'pair_style', type: 'string', required: true, description: '对势样式', defaultConfidence: 0 },
      { name: 'units', type: 'string', required: false, defaultValue: 'real', defaultConfidence: 0.5,
        allowedValues: ['real', 'metal', 'si', 'cgs', 'lj'], description: '单位制' },
      { name: 'boundary', type: 'string', required: false, defaultValue: 'p p p', defaultConfidence: 0.7,
        description: '边界条件' },
      { name: 'timestep', type: 'number', required: false, defaultValue: 1.0, defaultConfidence: 0.6,
        range: { min: 0.001, max: 10.0 }, description: '时间步长' },
      { name: 'thermo', type: 'integer', required: false, defaultValue: 100, defaultConfidence: 0.8,
        range: { min: 1, max: 10000 }, description: 'thermo输出频率' },
      { name: 'neighbor', type: 'string', required: false, defaultValue: '0.3 10 bin', defaultConfidence: 0.8,
        description: '邻居列表参数' },
      { name: 'neigh_modify', type: 'string', required: false, defaultValue: 'delay 0 every 1 check yes',
        defaultConfidence: 0.8, description: '邻居列表修改参数' },
      { name: 'gpu', type: 'string', required: false, defaultValue: 'off', defaultConfidence: 0.6,
        allowedValues: ['on', 'off'], description: 'GPU加速开关' },
      { name: 'processors', type: 'string', required: false, description: '进程网格', defaultConfidence: 0.5 },
    ];

    this.tools.set('lammps', {
      name: 'lammps',
      displayName: 'LAMMPS',
      params,
      validators: [],
    });
  }

  /**
   * 初始化GROMACS参数定义
   */
  private initializeGromacsDefinition(): void {
    const params: ParamMetadata[] = [
      { name: 'integrator', type: 'string', required: false, defaultValue: 'md', defaultConfidence: 0.9,
        allowedValues: ['md', 'steep', 'cg', 'l-bfgs', 'mn', 'sd'], description: '积分器类型' },
      { name: 'nsteps', type: 'integer', required: false, defaultValue: 1000, defaultConfidence: 0.7,
        range: { min: 1, max: 10000000 }, description: '模拟步数' },
      { name: 'dt', type: 'number', required: false, defaultValue: 0.001, defaultConfidence: 0.8,
        range: { min: 0.0001, max: 0.01 }, description: '时间步长 (ps)' },
      { name: 'cutoff-scheme', type: 'string', required: false, defaultValue: 'Verlet', defaultConfidence: 0.9,
        allowedValues: ['Verlet', 'group'], description: '截断方案' },
      { name: 'rlist', type: 'number', required: false, defaultValue: 1.0, defaultConfidence: 0.8,
        range: { min: 0.5, max: 2.0 }, description: '近邻列表截断' },
      { name: 'rcoulomb', type: 'number', required: false, defaultValue: 1.0, defaultConfidence: 0.8,
        range: { min: 0.5, max: 2.0 }, description: '库仑截断' },
      { name: 'rvdw', type: 'number', required: false, defaultValue: 1.0, defaultConfidence: 0.8,
        range: { min: 0.5, max: 2.0 }, description: '范德华截断' },
      { name: 'tcoupl', type: 'string', required: false, defaultValue: 'no', defaultConfidence: 0.7,
        allowedValues: ['no', 'berendsen', 'nose-hoover', 'andersen', 'parrinello-bussi'],
        description: '温度耦合' },
      { name: 'pcoupl', type: 'string', required: false, defaultValue: 'no', defaultConfidence: 0.7,
        allowedValues: ['no', 'berendsen', 'parrinello-rahman', 'mttk'], description: '压力耦合' },
      { name: 'gen-vel', type: 'string', required: false, defaultValue: 'no', defaultConfidence: 0.8,
        allowedValues: ['yes', 'no'], description: '生成初始速度' },
      { name: 'gen-temp', type: 'number', required: false, defaultValue: 300, defaultConfidence: 0.8,
        range: { min: 0, max: 2000 }, description: '初始温度' },
    ];

    this.tools.set('gromacs', {
      name: 'gromacs',
      displayName: 'GROMACS',
      params,
      validators: [],
    });
  }

  /**
   * 创建一致性验证器
   */
  private createConsistencyValidator(): Validator {
    return {
      name: 'consistency',
      validate: (params) => {
        const issues: ValidationIssue[] = [];

        // 检查弛豫计算: IBRION 设置正确
        if (params.IBRION !== undefined && params.IBRION !== -1 && params.NSW === 0) {
          issues.push({
            param: 'NSW',
            severity: 'warning',
            message: 'IBRION已设置但NSW=0，不会进行离子弛豫',
          });
        }

        // 检查 SIGMA 和 ISMEAR 的一致性
        if (params.ISMEAR === 0 && params.SIGMA !== undefined && params.SIGMA > 0.1) {
          issues.push({
            param: 'SIGMA',
            severity: 'warning',
            message: '高斯涂抹(ISMEAR=0)通常使用较小的SIGMA(<0.1)',
          });
        }

        // 检查自旋极化
        if (params.ISPIN === 2 && params.MAGMOM === undefined) {
          issues.push({
            param: 'MAGMOM',
            severity: 'warning',
            message: 'ISPIN=2(自旋极化)但未指定MAGMOM初始磁矩',
          });
        }

        return issues;
      },
    };
  }

  /**
   * 初始化推断器链
   */
  private initializeInferrers(): void {
    // 环境推断器 - 从环境推断GPU/并行参数
    this.inferrers.push({
      name: 'EnvironmentInferrer',
      canInfer: (paramName, request, current, env) => {
        if (!env) return false;

        const environmentRelatedParams = [
          'NPAR', 'KPAR', 'device', 'gpu', 'nproc', 'processors',
        ];
        return environmentRelatedParams.includes(paramName) &&
               !(paramName in request.params);
      },
      infer: (paramName, request, current, env) => {
        // VASP: GPU环境推荐NPAR=1
        if (paramName === 'NPAR' && env.hasGpu) {
          return {
            paramName,
            value: 1,
            confidence: 0.9,
            source: 'environment',
            reasoning: '检测到GPU环境，VASP推荐设置NPAR=1获得最佳性能',
          };
        }

        // VASP: 大体系推荐更大的KPAR
        if (paramName === 'KPAR' && request.tool === 'vasp') {
          const taskCtx = this.mergeTaskContext(request.taskContext);
          if (taskCtx.atomCount > 200 && env.cpuCores >= 4) {
            return {
              paramName,
              value: Math.min(env.cpuCores, 8),
              confidence: 0.7,
              source: 'environment',
              reasoning: `大体系(${taskCtx.atomCount}原子)多CPU核心(${env.cpuCores})，推荐增大KPAR提高并行效率`,
            };
          }
        }

        // ABACUS: GPU检测
        if (paramName === 'device' && env.hasGpu) {
          return {
            paramName,
            value: 'gpu',
            confidence: 0.95,
            source: 'environment',
            reasoning: '检测到GPU可用，默认使用GPU计算',
          };
        }

        // LAMMPS: GPU检测
        if (paramName === 'gpu' && env.hasGpu) {
          return {
            paramName,
            value: 'on',
            confidence: 0.8,
            source: 'environment',
            reasoning: '检测到GPU可用，建议开启GPU加速',
          };
        }

        // LAMMPS: processors推断
        if (paramName === 'processors' && env.hasMpi) {
          // 尝试分解为接近立方体的网格
          const cores = env.cpuCores;
          return {
            paramName,
            value: this.estimateProcessorGrid(cores),
            confidence: 0.6,
            source: 'environment',
            reasoning: `根据${cores}个CPU核心推断进程网格`,
          };
        }

        return null;
      },
    });

    // 任务推断器 - 从任务上下文推断计算参数
    this.inferrers.push({
      name: 'TaskInferrer',
      canInfer: (paramName, request, current) => {
        if (!request.taskContext) return false;
        return !(paramName in request.params);
      },
      infer: (paramName, request, current, env) => {
        const taskCtx = this.mergeTaskContext(request.taskContext);

        // VASP Smearing 推断
        if (request.tool === 'vasp' && (paramName === 'ISMEAR' || paramName === 'SIGMA')) {
          if (taskCtx.systemType === 'metal') {
            if (paramName === 'ISMEAR') {
              return {
                paramName,
                value: 1,
                confidence: 0.85,
                source: 'task',
                reasoning: '金属体系推荐使用Methfessel-Paxton涂抹(ISMEAR=1)',
              };
            }
            if (paramName === 'SIGMA') {
              const ismea = current.allParams.ISMEAR;
              if (ismea === 0) {
                return {
                  paramName,
                  value: 0.05,
                  confidence: 0.8,
                  source: 'task',
                  reasoning: '高斯涂抹用于绝缘体，推荐SIGMA=0.05',
                };
              }
              return {
                paramName,
                value: 0.2,
                confidence: 0.85,
                source: 'task',
                reasoning: 'Methfessel-Paxton涂抹用于金属，推荐SIGMA=0.2',
              };
            }
          }

          if (taskCtx.systemType === 'insulator' || taskCtx.systemType === 'semiconductor') {
            if (paramName === 'ISMEAR') {
              return {
                paramName,
                value: 0,
                confidence: 0.8,
                source: 'task',
                reasoning: '绝缘体推荐使用高斯涂抹(ISMEAR=0)',
              };
            }
            if (paramName === 'SIGMA') {
              return {
                paramName,
                value: 0.05,
                confidence: 0.8,
                source: 'task',
                reasoning: '绝缘体高斯涂抹推荐SIGMA=0.05',
              };
            }
          }
        }

        // VASP 弛豫参数推断
        if (request.tool === 'vasp') {
          if (taskCtx.calculationType === 'relaxation') {
            if (paramName === 'NSW' && !(paramName in current.allParams)) {
              return {
                paramName,
                value: 100,
                confidence: 0.7,
                source: 'task',
                reasoning: '弛豫计算未指定NSW，默认设置100步',
              };
            }
            if (paramName === 'IBRION' && !(paramName in current.allParams)) {
              return {
                paramName,
                value: 2,
                confidence: 0.7,
                source: 'task',
                reasoning: '弛豫计算推荐使用准牛顿算法(IBRION=2)',
              };
            }
          }
        }

        // ABACUS 计算类型推断
        if (request.tool === 'abacus' && paramName === 'calculation') {
          const mapping: Record<string, string> = {
            'single-point': 'scf',
            'relaxation': 'relax',
            'md': 'md',
          };
          if (mapping[taskCtx.calculationType]) {
            return {
              paramName,
              value: mapping[taskCtx.calculationType],
              confidence: 0.9,
              source: 'task',
              reasoning: `根据计算类型${taskCtx.calculationType}设置calculation=${mapping[taskCtx.calculationType]}`,
            };
          }
        }

        // ABACUS 步数推断
        if (request.tool === 'abacus' && request.taskContext?.calculationType === 'relaxation') {
          if (paramName === 'relax_nmax') {
            return {
              paramName,
              value: 100,
              confidence: 0.7,
              source: 'task',
              reasoning: '弛豫计算默认100步',
            };
          }
        }

        // GROMACS 积分器和步数推断
        if (request.tool === 'gromacs') {
          if (paramName === 'integrator') {
            const mapping: Record<string, string> = {
              'single-point': 'steep',
              'relaxation': 'steep',
              'md': 'md',
              'vibration': 'md',
            };
            return {
              paramName,
              value: mapping[taskCtx.calculationType] || 'md',
              confidence: 0.8,
              source: 'task',
              reasoning: `根据计算类型${taskCtx.calculationType}选择积分器`,
            };
          }

          if (paramName === 'nsteps' && taskCtx.calculationType === 'md') {
            return {
              paramName,
              value: 50000,
              confidence: 0.5,
              source: 'task',
              reasoning: 'MD模拟默认50000步(50ps，dt=0.001ps)',
            };
          }

          if (paramName === 'gen-vel' && taskCtx.calculationType === 'md') {
            return {
              paramName,
              value: 'yes',
              confidence: 0.8,
              source: 'task',
              reasoning: 'MD模拟通常需要生成初始速度',
            };
          }

          if (paramName === 'tcoupl' && taskCtx.calculationType === 'md') {
            return {
              paramName,
              value: 'nose-hoover',
              confidence: 0.7,
              source: 'task',
              reasoning: 'MD模拟推荐使用Nosé-Hoover温度耦合',
            };
          }
        }

        // 自旋极化推断
        if (paramName === 'ISPIN' && request.tool === 'vasp') {
          if (taskCtx.spinPolarized === true) {
            return {
              paramName,
              value: 2,
              confidence: 0.95,
              source: 'task',
              reasoning: '任务指定自旋极化，设置ISPIN=2',
            };
          }
          if (taskCtx.spinPolarized === false) {
            return {
              paramName,
              value: 1,
              confidence: 0.9,
              source: 'task',
              reasoning: '任务指定不使用自旋极化，设置ISPIN=1',
            };
          }
        }

        // EDIFF 根据计算类型调整
        if (paramName === 'EDIFF' && request.tool === 'vasp') {
          if (taskCtx.calculationType === 'relaxation') {
            return {
              paramName,
              value: 1e-5,
              confidence: 0.75,
              source: 'task',
              reasoning: '弛豫计算要求电子步更精确，使用更严格的EDIFF=1e-5',
            };
          }
        }

        return null;
      },
    });

    // 精度推断器 - 根据体系大小推断精度
    this.inferrers.push({
      name: 'PrecisionInferrer',
      canInfer: (paramName, request, current) => {
        if (!request.taskContext) return false;
        return paramName === 'PREC' && !(paramName in request.params);
      },
      infer: (paramName, request, current, env) => {
        const taskCtx = this.mergeTaskContext(request.taskContext);

        if (taskCtx.atomCount > 500) {
          return {
            paramName,
            value: 'Low',
            confidence: 0.7,
            source: 'task',
            reasoning: `大体系(${taskCtx.atomCount}原子)推荐使用较低精度节省计算时间`,
          };
        }
        if (taskCtx.atomCount < 50) {
          return {
            paramName,
            value: 'Accurate',
            confidence: 0.7,
            source: 'task',
            reasoning: `小体系(${taskCtx.atomCount}原子)推荐使用高精度获得更准确结果`,
          };
        }
        return {
          paramName,
          value: 'Normal',
          confidence: 0.9,
          source: 'default',
          reasoning: '中等体系使用Normal精度',
        };
      },
    });
  }

  // ==========================================================================
  // 内部辅助方法
  // ==========================================================================

  /**
   * 初始化置信度记录
   */
  private initializeConfidence(params: Record<string, any>): Record<string, number> {
    const confidence: Record<string, number> = {};
    for (const key of Object.keys(params)) {
      confidence[key] = 1.0; // 用户显式参数置信度总是1.0
    }
    return confidence;
  }

  /**
   * 初始化来源记录
   */
  private initializeSources(params: Record<string, any>): Record<string, string> {
    const sources: Record<string, string> = {};
    for (const key of Object.keys(params)) {
      sources[key] = 'user';
    }
    return sources;
  }

  /**
   * 获取参数元数据映射
   */
  private getMetadataMap(toolDef: ToolDefinition): Map<string, ParamMetadata> {
    const map = new Map<string, ParamMetadata>();
    for (const param of toolDef.params) {
      map.set(param.name, param);
    }
    return map;
  }

  /**
   * 默认值推断
   */
  private inferDefaultValues(
    toolDef: ToolDefinition,
    request: CompletionRequest,
    result: CompletionResult
  ): void {
    for (const param of toolDef.params) {
      if (param.name in request.params) continue;
      if (param.defaultValue === undefined) continue;

      const inference: InferenceResult = {
        paramName: param.name,
        value: param.defaultValue,
        confidence: param.defaultConfidence,
        source: 'default',
        reasoning: `使用工具默认值: ${param.defaultValue}`,
      };

      this.applyInference(result, inference);
    }
  }

  /**
   * 应用推断结果
   */
  private applyInference(result: CompletionResult, inference: InferenceResult): void {
    // 检查是否已经有推断
    const existingIndex = result.inferred.findIndex(i => i.paramName === inference.paramName);

    if (existingIndex >= 0) {
      // 如果已有推断，比较置信度，保留置信度高的
      const existing = result.inferred[existingIndex];
      if (inference.confidence > existing.confidence) {
        result.inferred[existingIndex] = inference;
        result.allParams[inference.paramName] = inference.value;
        result.confidence[inference.paramName] = inference.confidence;
        result.sources[inference.paramName] = inference.source;
      } else if (Math.abs(inference.confidence - existing.confidence) < 0.1) {
        // 置信度相近，发生冲突，降低置信度
        existing.confidence *= 0.7;
        result.confidence[existing.paramName] = existing.confidence;
      }
    } else {
      // 新增推断
      result.inferred.push(inference);
      result.allParams[inference.paramName] = inference.value;
      result.confidence[inference.paramName] = inference.confidence;
      result.sources[inference.paramName] = inference.source;
    }
  }

  /**
   * 冲突解决 - 后处理调整置信度
   */
  private resolveConflicts(result: CompletionResult): void {
    // 对低置信度参数添加验证警告
    for (const [param, conf] of Object.entries(result.confidence)) {
      if (conf < 0.5 && !result.validation.issues.some(i => i.param === param)) {
        result.validation.issues.push({
          param,
          severity: 'warning',
          message: `参数${param}推断置信度较低(${Math.round(conf * 100)}%)，建议手动检查`,
        });
      }
    }
  }

  /**
   * 合并任务上下文
   */
  private mergeTaskContext(partial?: Partial<TaskContext>): TaskContext {
    return { ...DEFAULT_TASK_CONTEXT, ...partial };
  }

  /**
   * 估计进程网格
   */
  private estimateProcessorGrid(cores: number): string {
    // 尝试找到最接近立方体的分解
    let bestX = 1;
    let bestY = 1;
    let bestZ = 1;
    let minDiff = Infinity;

    for (let x = 1; x <= cores; x++) {
      for (let y = 1; y <= cores / x; y++) {
        const z = cores / (x * y);
        if (Number.isInteger(z)) {
          const zi = Math.floor(z);
          const maxDim = Math.max(x, y, zi);
          const minDim = Math.min(x, y, zi);
          const diff = maxDim - minDim;
          if (diff < minDiff) {
            minDiff = diff;
            bestX = x;
            bestY = y;
            bestZ = zi;
          }
        }
      }
    }

    return `${bestX} ${bestY} ${bestZ}`;
  }
}

// ============================================================================
// 导出单例
// ============================================================================

export const paramCompleterServiceV2 = new ParamCompleterServiceV2();

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例
 *
 * @example
 * ```typescript
 * import { ParamCompleterServiceV2 } from './param-completer-v2.js';
 *
 * // 创建服务实例
 * const completer = new ParamCompleterServiceV2();
 *
 * // 设置环境上下文（通常从 env_snapshot 获取）
 * completer.setEnvironment({
 *   hasGpu: true,
 *   gpuCount: 1,
 *   hasMpi: true,
 *   cpuCores: 8,
 * });
 *
 * // 发起补全请求
 * const result = completer.complete({
 *   tool: 'vasp',
 *   params: {
 *     ENCUT: 500,
 *   },
 *   taskContext: {
 *     calculationType: 'relaxation',
 *     systemType: 'metal',
 *     atomCount: 100,
 *   },
 * });
 *
 * console.log('补全结果:');
 * console.log('所有参数:', result.allParams);
 * console.log('置信度:', result.confidence);
 * console.log('验证结果:', result.validation);
 *
 * // 生成INCAR文件
 * const incar = completer.generateVaspIncarlike(result);
 * console.log('INCAR:\n', incar);
 *
 * // 独立验证
 * const validation = completer.validate(result.allParams, 'vasp');
 * console.log('验证:', validation);
 * ```
 */
