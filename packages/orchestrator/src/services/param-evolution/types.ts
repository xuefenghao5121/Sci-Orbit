/**
 * EvoSkills 自进化参数补全 - 类型定义
 * Based on: EvoSkills: Self-Evolving Agent Skills via Co-Evolutionary Verification
 */

/** 扩展的隐式参数规则，带置信度 */
export interface ImplicitParamRuleWithConfidence {
  description: string;
  infer_from: string[];       // 从哪些环境信息推断
  rule: string;               // 推断规则描述
  default_value: any;
  risk_if_wrong: 'low' | 'medium' | 'high' | 'critical';
  
  // EvoSkills 扩展：置信度管理
  confidence: number;         // 当前置信度 0-1
  sampleCount: number;        // 总样本数
  correctCount: number;       // 正确预测数
  conditionalConfidence?: Record<string, number>; // 条件置信度 key: context-value → confidence
  conditionalValues?: Record<string, any>;        // 学习到的条件值 key: context-value → learned value
}

/** 动态参数模板，支持版本控制和学习 */
export interface DynamicToolParamTemplate {
  templateId: string;         // 唯一模板ID
  name: string;               // 工具名称
  category: string;           // 工具类别
  version: number;            // 版本号，每次更新递增
  required_params: string[];
  optional_params: Record<string, ParamSpec>;
  implicit_params: Record<string, ImplicitParamRuleWithConfidence>;
  defaults: Record<string, any>;
  constraints: ParamConstraint[];
  
  // EvoSkills 扩展
  createdAt: string;          // 创建时间
  updatedAt: string;          // 最后更新时间
  isLearned: boolean;         // 是否是学习得到的（不是内置）
  usageCount: number;         // 使用次数
  correctCount: number;       // 总体正确次数
  
  // 参数关联规则（由 Verifier 维护）
  associationRules?: ParamAssociationRule[];
}

/** 参数规格定义 */
export interface ParamSpec {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'object';
  description: string;
  enum_values?: string[];
  default?: any;
  unit?: string;
}

/** 参数约束 */
export interface ParamConstraint {
  params: string[];            // 涉及的参数
  rule: string;                // 约束描述
  check: string;               // 检查逻辑描述
}

/** 参数关联规则（挖掘得到） */
export interface ParamAssociationRule {
  ruleId: string;              // 规则ID
  antecedent: Array<{param: string; value: any}>;  // 前提条件
  consequent: {param: string; value: any};         // 结论
  support: number;            // 支持度 0-1（多少数据满足前提）
  confidence: number;         // 规则置信度 0-1（满足前提下结论成立概率）
  lift: number;                // 提升度：confidence / prior(consequent)，>1表示有用
  occurrences: number;        // 发生次数
  createdAt: string;           // 创建时间
  updatedAt: string;           // 更新时间
}

/** 用户修正记录 */
export interface UserCorrectionRecord {
  id: string;                  // 唯一ID
  tool: string;
  param: string;
  auto_value: unknown;
  user_value: unknown;
  context: Record<string, unknown>;
  timestamp: string;
  templateVersion: number;    // 当时的模板版本
}

/** 参数候选（用于 beam search） */
export interface ParamCandidate {
  params: Record<string, any>;
  confidence: number;         // 整体置信度
  generatorScore: number;     // Generator 打分
  verifierScore: number;      // Verifier 打分（最终排序用）
  source: 'built-in' | 'learned' | 'user-pref';
}

/** Verifier 打分结果 */
export interface VerifierScoreResult {
  overallScore: number;       // 总体打分 0-1
  constraintScore: number;    // 约束满足分
  associationScore: number;   // 关联规则分
  environmentScore: number;   // 环境适配分
  violations: ParamViolation[];
}

/** 参数违反信息 */
export interface ParamViolation {
  params: string[];
  rule: string;
  message: string;
  suggestedFix?: {param: string; value: any};
  severity: 'warning' | 'error';
}

/** 补全请求 */
export interface CompletionRequest {
  tool: string;
  userParams: Record<string, any>;
  environment?: EnvironmentInfoEx;
  beamWidth?: number;         // 默认 3
}

/** 扩展环境信息 */
export interface EnvironmentInfoEx {
  os: { platform: string; arch: string; release: string };
  cpu: { model: string; cores: number };
  gpu?: { model: string; driver: string; vram?: string };
  memory: { totalGb: number; freeGb: number };
  python?: { version: string; path: string };
  cuda?: { version: string; available: boolean };
  node: { version: string };
  
  // EvoSkills 扩展
  gpuCount: number;           // GPU 数量
  gpuVramGB: number;          // 总显存 GB
  cpuCores: number;           // CPU 核心数
  mpiAvailable: boolean;
  mpiVersion?: string;
  
  // 推荐并行配置
  recommendedParallel?: {
    npar?: number;
    kpar?: number;
    nnodes?: number;
    cpusPerNode?: number;
  };
}

/** 配置选项 */
export interface EvolutionConfig {
  storagePath: string;         // 存储路径
  beamWidth: number;          // beam search 宽度
  minConfidenceThreshold: number; // 最低置信度阈值，低于此需要确认
  highConfidenceThreshold: number; // 高置信度阈值，不提示
  minSupportForAssociation: number; // 关联规则最小支持度
  minConfidenceForAssociation: number; // 关联规则最小置信度
  enableAutoLearning: boolean; // 是否启用自动学习
  enableCoEvolution: boolean; // 是否启用共同进化
}

/** 默认配置 */
export const DEFAULT_EVOLUTION_CONFIG: EvolutionConfig = {
  storagePath: '~/.ai4s/sci-orbit/evolution',
  beamWidth: 3,
  minConfidenceThreshold: 0.5,
  highConfidenceThreshold: 0.8,
  minSupportForAssociation: 0.05,
  minConfidenceForAssociation: 0.7,
  enableAutoLearning: true,
  enableCoEvolution: true,
};
