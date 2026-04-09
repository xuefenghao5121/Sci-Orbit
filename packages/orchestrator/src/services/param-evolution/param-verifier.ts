/**
 * EvoSkills 自进化 - 参数验证器
 * 进行约束检查、关联规则验证、环境适配检查，生成可操作反馈
 * 与 Generator 共同进化
 */
import {
  DynamicToolParamTemplate,
  ParamCandidate,
  VerifierScoreResult,
  ParamViolation,
  ParamAssociationRule,
  EnvironmentInfoEx,
  EvolutionConfig,
  DEFAULT_EVOLUTION_CONFIG,
} from './types.js';
import { DynamicTemplateLibrary } from './dynamic-template.js';

export class ParamVerifier {
  private templateLibrary: DynamicTemplateLibrary;
  private config: EvolutionConfig;
  private weights = {
    constraint: 0.5,
    association: 0.3,
    environment: 0.2,
  };

  constructor(
    templateLibrary: DynamicTemplateLibrary,
    config?: Partial<EvolutionConfig>,
    weights?: {constraint: number; association: number; environment: number}
  ) {
    this.templateLibrary = templateLibrary;
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
    if (weights) {
      this.weights = weights;
    }
  }

  /**
   * 对单个候选进行打分
   */
  scoreCandidate(
    candidate: ParamCandidate,
    template: DynamicToolParamTemplate,
    environment?: EnvironmentInfoEx
  ): VerifierScoreResult {
    const violations: ParamViolation[] = [];
    
    // 1. 约束检查打分
    const constraintResult = this.checkConstraints(candidate, template);
    violations.push(...constraintResult.violations);
    
    // 2. 关联规则检查打分
    const associationResult = this.checkAssociations(candidate, template);
    violations.push(...associationResult.violations);
    
    // 3. 环境适配检查打分
    const environmentResult = this.checkEnvironment(candidate, environment);
    violations.push(...environmentResult.violations);
    
    // 计算总体分数
    const overallScore = 
      this.weights.constraint * constraintResult.score +
      this.weights.association * associationResult.score +
      this.weights.environment * environmentResult.score;
    
    return {
      overallScore,
      constraintScore: constraintResult.score,
      associationScore: associationResult.score,
      environmentScore: environmentResult.score,
      violations,
    };
  }

  /**
   * 对所有候选打分，并更新候选的 verifierScore
   */
  scoreCandidates(
    candidates: ParamCandidate[],
    template: DynamicToolParamTemplate,
    environment?: EnvironmentInfoEx
  ): ParamCandidate[] {
    return candidates.map(candidate => {
      const scoreResult = this.scoreCandidate(candidate, template, environment);
      return {
        ...candidate,
        verifierScore: scoreResult.overallScore,
      };
    });
  }

  /**
   * 检查参数约束
   */
  private checkConstraints(
    candidate: ParamCandidate,
    template: DynamicToolParamTemplate
  ): {score: number; violations: ParamViolation[]} {
    const violations: ParamViolation[] = [];
    const allParams = candidate.params;
    let totalConstraints = template.constraints.length;
    let passedConstraints = 0;
    
    for (const constraint of template.constraints) {
      const violation = this.checkSingleConstraint(constraint, allParams);
      if (violation) {
        violations.push({
          params: constraint.params,
          rule: constraint.rule,
          message: violation,
          severity: 'warning',
          suggestedFix: this.generateSuggestedFix(constraint, allParams),
        });
      } else {
        passedConstraints++;
      }
    }
    
    // 如果没有约束，得满分
    const score = totalConstraints === 0 ? 1 : passedConstraints / totalConstraints;
    return { score, violations };
  }

  /**
   * 检查单个约束，返回违规消息，如果通过返回 null
   */
  private checkSingleConstraint(
    constraint: {params: string[]; rule: string; check: string},
    params: Record<string, any>
  ): string | null {
    const { rule, check } = constraint;
    const ps = constraint.params;
    
    // 检查涉及参数是否都存在
    for (const p of ps) {
      if (!(p in params)) {
        return `Missing required parameter: ${p}`;
      }
    }
    
    // 常见约束模式匹配检查
    if (rule.includes('ismear=0时sigma应<0.1')) {
      if (params.ismear === 0 && params.sigma >= 0.1) {
        return `ismear=0 requires sigma < 0.1, got ${params.sigma}`;
      }
    }
    
    if (rule.includes('timestep应小于') && params.timestep !== undefined) {
      if (params.timestep >= 5) {
        return `timestep ${params.timestep} fs may be too large (recommended < 5 fs)`;
      }
    }
    
    if (rule.includes('温度应合理') && params.temperature !== undefined) {
      if (params.temperature <= 0 || params.temperature >= 10000) {
        return `Unreasonable temperature: ${params.temperature} K`;
      }
    }
    
    if (rule.includes('ecutrho应>=ecutwfc的4倍') && 
        params.ecutwfc !== undefined && params.ecutrho !== undefined) {
      if (params.ecutrho < params.ecutwfc * 4) {
        return `ecutrho (${params.ecutrho}) should be at least 4x ecutwfc (${params.ecutwfc})`;
      }
    }
    
    if (rule.includes('cutoff应远大于rel_cutoff') &&
        params.cutoff !== undefined && params.rel_cutoff !== undefined) {
      if (!(params.cutoff > params.rel_cutoff * 3)) {
        return `cutoff (${params.cutoff}) should be much larger than rel_cutoff (${params.rel_cutoff})`;
      }
    }
    
    if (rule.includes('mixing_beta应在合理范围') && params.mixing_beta !== undefined) {
      if (!(params.mixing_beta > 0 && params.mixing_beta < 1)) {
        return `mixing_beta ${params.mixing_beta} out of range (should be 0 < beta < 1)`;
      }
    }
    
    if (rule.includes('encut应>=250eV') && params.encut !== undefined) {
      if (params.encut < 250) {
        return `encut ${params.encut} eV is too low (recommended >= 250 eV)`;
      }
    }
    
    if (rule.includes('eps_scf应合理') && params.eps_scf !== undefined) {
      if (!(params.eps_scf > 0 && params.eps_scf < 1e-2)) {
        return `eps_scf ${params.eps_scf} is out of reasonable range`;
      }
    }
    
    // 没有违规
    return null;
  }

  /**
   * 检查关联规则
   */
  private checkAssociations(
    candidate: ParamCandidate,
    template: DynamicToolParamTemplate
  ): {score: number; violations: ParamViolation[]} {
    const violations: ParamViolation[] = [];
    const rules = this.templateLibrary.getAssociationRules(template.name);
    const params = candidate.params;
    
    if (rules.length === 0) {
      return { score: 1, violations: [] };
    }
    
    let totalScore = 0;
    let applicableRules = 0;
    
    for (const rule of rules) {
      // 检查前提是否满足
      const antecedentSatisfied = this.antecedentMatches(rule.antecedent, params);
      
      if (antecedentSatisfied) {
        applicableRules++;
        const { param, value } = rule.consequent;
        
        // 如果结论参数存在，检查是否匹配
        if (param in params && this.valueMatches(params[param], value)) {
          // 匹配，加分
          totalScore += rule.confidence;
        } else {
          // 不匹配，违规，但是不严重，只是提示
          violations.push({
            params: [param],
            rule: `Association rule: if ${rule.antecedent.map(a => `${a.param}=${a.value}`).join(', ')} then ${param}=${value}`,
            message: `Based on parameter associations, ${param} is expected to be ${JSON.stringify(value)}, got ${JSON.stringify(params[param])}`,
            severity: 'warning',
            suggestedFix: { param, value },
          });
          // 扣分，但不完全扣
          totalScore += (1 - rule.confidence) * 0.5;
        }
      }
    }
    
    const score = applicableRules === 0 ? 1 : totalScore / applicableRules;
    return { score, violations };
  }

  /**
   * 检查环境适配
   */
  private checkEnvironment(
    candidate: ParamCandidate,
    environment?: EnvironmentInfoEx
  ): {score: number; violations: ParamViolation[]} {
    const violations: ParamViolation[] = [];
    
    if (!environment) {
      return { score: 1, violations: [] };
    }
    
    const params = candidate.params;
    
    // 检查并行参数是否适合当前硬件
    if ('npar' in params && 'kpar' in params && environment.cpuCores) {
      const npar = params.npar as number;
      const kpar = params.kpar as number;
      if (npar * kpar > environment.cpuCores * 1.2) {
        // 超过可用核心数，提示
        violations.push({
          params: ['npar', 'kpar'],
          rule: 'Parallelization fits within available CPU cores',
          message: `npar*kpar = ${npar*kpar} exceeds available cores (${environment.cpuCores})`,
          severity: 'warning',
          suggestedFix: environment.recommendedParallel ? 
            { param: 'npar', value: environment.recommendedParallel.npar } :
            undefined,
        });
      }
    }
    
    // 检查 GPU 是否可用
    if (('gpu' in params || 'device' in params) && params.device === 'gpu' && !environment.gpuCount) {
      violations.push({
        params: ['device'],
        rule: 'GPU is available when requested',
        message: 'Requested GPU but no GPU detected in environment',
        severity: 'error',
        suggestedFix: { param: 'device', value: 'cpu' },
      });
    }
    
    // 计算分数：每个违规扣一定分数
    let score = 1;
    const penaltyPerViolation = 0.1;
    score = Math.max(0, score - violations.length * penaltyPerViolation);
    
    return { score, violations };
  }

  /**
   * 检查前提是否匹配
   */
  private antecedentMatches(
    antecedent: Array<{param: string; value: any}>,
    params: Record<string, any>
  ): boolean {
    for (const {param, value} of antecedent) {
      if (!(param in params)) return false;
      if (!this.valueMatches(params[param], value)) return false;
    }
    return true;
  }

  /**
   * 比较值是否匹配（支持宽松比较）
   */
  private valueMatches(a: any, b: any): boolean {
    // 简单比较，数字容忍小误差
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < 1e-6;
    }
    // 字符串不区分大小写
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase() === b.toLowerCase();
    }
    // 直接比较
    return a === b;
  }

  /**
   * 生成建议修正
   */
  private generateSuggestedFix(
    constraint: {params: string[]; rule: string},
    params: Record<string, any>
  ): {param: string; value: any} | undefined {
    // 针对常见约束生成具体建议
    if (constraint.rule.includes('ismear=0时sigma应<0.1')) {
      return { param: 'sigma', value: 0.05 };
    }
    
    if (constraint.rule.includes('timestep应小于')) {
      return { param: 'timestep', value: 1.0 };
    }
    
    if (constraint.rule.includes('ecutrho应>=ecutwfc的4倍') && params.ecutwfc) {
      const recommended = params.ecutwfc * 8; // 通常是 8x
      return { param: 'ecutrho', value: recommended };
    }
    
    if (constraint.rule.includes('cutoff应远大于rel_cutoff') && params.cutoff) {
      const recommended = Math.round(params.cutoff / 5);
      return { param: 'rel_cutoff', value: recommended };
    }
    
    // 没有特定建议
    return undefined;
  }

  /**
   * 共同进化：更新关联规则置信度基于验证结果
   */
  updateAssociationConfidence(
    rule: ParamAssociationRule,
    wasCorrect: boolean
  ): void {
    // 简单的移动平均更新
    const alpha = 0.1; // 学习率
    if (wasCorrect) {
      rule.confidence = rule.confidence * (1 - alpha) + alpha * 1;
    } else {
      rule.confidence = rule.confidence * (1 - alpha);
    }
    rule.occurrences += wasCorrect ? 1 : 0;
    rule.updatedAt = new Date().toISOString();
    
    // 保存更新
    const rules = this.templateLibrary.getAssociationRules(
      rule.ruleId.split(':')[0]
    );
    this.templateLibrary.updateAssociationRules(rules);
  }
}
