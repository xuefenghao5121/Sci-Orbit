/**
 * EvoSkills 自进化 - 参数生成器
 * 基于动态模板和置信度，使用 beam search 生成 top-k 候选补全结果
 */
import {
  DynamicToolParamTemplate,
  ImplicitParamRuleWithConfidence,
  ParamCandidate,
  EnvironmentInfoEx,
  CompletionRequest,
  EvolutionConfig,
  DEFAULT_EVOLUTION_CONFIG,
} from './types.js';
import { DynamicTemplateLibrary } from './dynamic-template.js';
import { EnvironmentAdapter } from './environment-adapter.js';
import { ConfidenceManager } from './confidence-manager.js';

export class ParamGenerator {
  private templateLibrary: DynamicTemplateLibrary;
  private environmentAdapter: EnvironmentAdapter;
  private confidenceManager: ConfidenceManager;
  private config: EvolutionConfig;

  constructor(
    templateLibrary: DynamicTemplateLibrary,
    config?: Partial<EvolutionConfig>
  ) {
    this.templateLibrary = templateLibrary;
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
    this.confidenceManager = templateLibrary.getConfidenceManager();
    this.environmentAdapter = new EnvironmentAdapter();
  }

  /**
   * 生成 top-k 候选补全结果
   */
  generateCandidates(request: CompletionRequest): ParamCandidate[] {
    const { tool, userParams, environment, beamWidth } = request;
    const actualBeamWidth = beamWidth || this.config.beamWidth;
    
    const template = this.templateLibrary.getTemplate(tool);
    if (!template) {
      return [];
    }

    // 初始状态：只有用户提供的参数
    let beam: ParamCandidate[] = [{
      params: { ...userParams },
      confidence: 1.0,
      generatorScore: 1.0,
      verifierScore: 0,
      source: 'user-pref',
    }];

    // 按顺序处理每个缺失的隐式参数
    // 顺序很重要，因为后面的规则可能依赖前面推断出的值
    const missingImplicitParams = this.getMissingImplicitParams(template, userParams);
    
    for (const [paramName, rule] of missingImplicitParams) {
      const newBeam: ParamCandidate[] = [];
      
      for (const candidate of beam) {
        const expansions = this.expandCandidate(candidate, paramName, rule, environment);
        newBeam.push(...expansions);
      }
      
      // 按 generatorScore 排序，保留 top-k
      newBeam.sort((a, b) => b.generatorScore - a.generatorScore);
      beam = newBeam.slice(0, actualBeamWidth);
      
      if (beam.length === 0) break;
    }

    // 最后合并环境推荐参数
    if (environment) {
      beam = this.addEnvironmentParams(beam, environment, tool);
    }

    // 最终排序
    beam.sort((a, b) => b.generatorScore - a.generatorScore);
    return beam.slice(0, actualBeamWidth);
  }

  /**
   * 获取需要补全的缺失隐式参数
   */
  private getMissingImplicitParams(
    template: DynamicToolParamTemplate,
    userParams: Record<string, any>
  ): Array<[string, ImplicitParamRuleWithConfidence]> {
    const result: Array<[string, ImplicitParamRuleWithConfidence]> = [];
    
    for (const [key, rule] of Object.entries(template.implicit_params)) {
      if (!(key in userParams)) {
        result.push([key, rule]);
      }
    }
    
    return result;
  }

  /**
   * 扩展一个候选，为当前参数生成可能的值
   */
  private expandCandidate(
    candidate: ParamCandidate,
    paramName: string,
    rule: ImplicitParamRuleWithConfidence,
    environment?: EnvironmentInfoEx
  ): ParamCandidate[] {
    const currentParams = { ...candidate.params };
    const candidates: ParamCandidate[] = [];
    
    // 从规则得到候选值和对应置信度
    const valueConfidence = this.getCandidateValues(paramName, rule, currentParams, environment);
    
    for (const { value, confidence } of valueConfidence) {
      const newParams = { ...currentParams, [paramName]: value };
      const newConfidence = this.confidenceManager.combineConfidences([
        candidate.confidence,
        confidence,
      ]);
      
      candidates.push({
        params: newParams,
        confidence: newConfidence,
        generatorScore: newConfidence, // 暂时用置信度作为 generator score
        verifierScore: 0, // 留待 Verifier 打分
        source: rule.confidence >= 0.8 ? 'built-in' : 'learned',
      });
    }
    
    return candidates;
  }

  /**
   * 从规则获取可能的候选值和置信度
   * 在简单情况下只返回一个值，如果置信度分散可能返回多个
   */
  private getCandidateValues(
    paramName: string,
    rule: ImplicitParamRuleWithConfidence,
    currentParams: Record<string, any>,
    environment?: EnvironmentInfoEx
  ): Array<{value: any; confidence: number}> {
    const result: Array<{value: any; confidence: number}> = [];
    
    // 检查是否有条件置信度
    let effectiveConfidence = rule.confidence;
    let currentDefault = rule.default_value;
    
    // 如果有上下文条件置信度和值，使用匹配上下文的值
    if (rule.conditionalConfidence && rule.conditionalValues && currentParams) {
      // 如果当前上下文匹配一个学习过的条件且置信度足够高，使用学习到的值
      for (const [ctxKey, ctxValue] of Object.entries(currentParams)) {
        if (ctxValue !== undefined && (typeof ctxValue === 'string' || typeof ctxValue === 'number' || typeof ctxValue === 'boolean')) {
          const key = `${ctxKey}=${String(ctxValue)}`;
          if (rule.conditionalConfidence[key] !== undefined && rule.conditionalValues[key] !== undefined) {
            const condConfidence = rule.conditionalConfidence[key];
            // 如果条件置信度高于 0，说明我们已经学习过这个上下文，使用学习到的值
            // 因为我们只在满足修正次数要求后才存储，所以置信度一定足够
            if (condConfidence > 0) {
              currentDefault = rule.conditionalValues[key];
            }
            effectiveConfidence = this.confidenceManager.combineConfidences([
              effectiveConfidence,
              condConfidence,
            ]);
          }
        }
      }
    }
    
    // 应用推断逻辑（这里简化处理，保留原有硬编码推断逻辑）
    const inferred = this.inferFromRule(paramName, rule, currentParams, environment);
    
    if (inferred !== null) {
      // 如果推断成功，使用推断值
      // 如果推断置信度低于阈值，也保留默认值作为备选
      result.push({
        value: inferred.value,
        confidence: this.confidenceManager.combineConfidences([effectiveConfidence, inferred.confidence]),
      });
      
      // 如果置信度较低，保留默认值作为备选
      if (inferred.confidence < 0.7 && inferred.value !== currentDefault) {
        result.push({
          value: currentDefault,
          confidence: effectiveConfidence * 0.8,
        });
      }
    } else {
      // 直接使用默认值
      result.push({
        value: currentDefault,
        confidence: effectiveConfidence,
      });
    }
    
    return result;
  }

  /**
   * 根据规则进行推断（复用原有逻辑，扩展环境感知）
   */
  private inferFromRule(
    paramName: string,
    rule: ImplicitParamRuleWithConfidence,
    userParams: Record<string, any>,
    environment?: EnvironmentInfoEx
  ): {value: any; confidence: number} | null {
    // VASP 特殊推断：金属/半导体 smearing
    if (rule.rule.includes('金属用1')) {
      const metals = ['Cu', 'Ag', 'Au', 'Al', 'Fe', 'Ni', 'Co', 'Li', 'Na', 'K'];
      const system = (userParams.system || '').toString();
      if (metals.some(m => system.toLowerCase().includes(m.toLowerCase()))) {
        return { value: 1, confidence: 0.7 };
      }
      return { value: 0, confidence: 0.5 };
    }

    if (rule.rule.includes('ismear=') && userParams.ismear === 0) {
      return { value: 0.05, confidence: 0.9 };
    }
    if (rule.rule.includes('ismear=') && userParams.ismear === 1) {
      return { value: 0.2, confidence: 0.9 };
    }

    // LAMMPS 特殊推断：timestep
    if (rule.rule.includes('水体系1fs')) {
      const systemType = (userParams.system_type || '').toLowerCase();
      if (systemType.includes('water') || systemType.includes('liquid')) {
        return { value: 1.0, confidence: 0.75 };
      }
      if (systemType.includes('solid') || systemType.includes('crystal')) {
        return { value: 2.0, confidence: 0.75 };
      }
      return null;
    }

    // 基于 GPU 调整并行参数
    if (paramName === 'npar' && environment?.gpuCount !== undefined) {
      if (environment.gpuCount > 0) {
        return { value: 1, confidence: 0.7 };
      }
    }
    
    // 基于环境推荐的并行参数
    if (environment?.recommendedParallel) {
      if (paramName === 'npar' && environment.recommendedParallel.npar !== undefined) {
        return { value: environment.recommendedParallel.npar, confidence: 0.75 };
      }
      if (paramName === 'kpar' && environment.recommendedParallel.kpar !== undefined) {
        return { value: environment.recommendedParallel.kpar, confidence: 0.75 };
      }
    }

    // 基于系统大小推断
    if (rule.rule.includes('原子数>') && userParams.system_size !== undefined) {
      const match = rule.rule.match(/原子Size>(\d+)/);
      if (match) {
        const threshold = parseInt(match[1], 10);
        if (userParams.system_size > threshold) {
          return { value: true, confidence: 0.8 };
        }
        return { value: false, confidence: 0.8 };
      }
    }

    return null;
  }

  /**
   * 添加环境推荐的参数（如果缺失）
   */
  private addEnvironmentParams(
    beam: ParamCandidate[],
    environment: EnvironmentInfoEx,
    tool: string
  ): ParamCandidate[] {
    let envParams: Record<string, any> = {};
    
    if (tool === 'vasp_dft') {
      envParams = this.environmentAdapter.inferVASPParams(environment);
    } else if (tool === 'lammps_md') {
      envParams = this.environmentAdapter.inferLAMMPSParams(environment);
    }
    
    if (Object.keys(envParams).length === 0) {
      return beam;
    }
    
    // 只添加缺失的参数
    return beam.map(candidate => {
      const newParams = { ...candidate.params };
      let addedConfidence = candidate.confidence;
      
      for (const [key, value] of Object.entries(envParams)) {
        if (!(key in newParams)) {
          newParams[key] = value;
          // 环境推荐置信度中等
          addedConfidence = this.confidenceManager.combineConfidences([
            addedConfidence,
            0.7,
          ]);
        }
      }
      
      return {
        ...candidate,
        params: newParams,
        confidence: addedConfidence,
        generatorScore: addedConfidence,
      };
    });
  }

  /**
   * 选择最高分候选
   */
  selectBestCandidate(candidates: ParamCandidate[]): ParamCandidate | null {
    if (candidates.length === 0) return null;
    
    // 如果 Verifier 已经打分，用 verifierScore，否则用 generatorScore
    const hasVerifierScores = candidates.some(c => c.verifierScore > 0);
    
    if (hasVerifierScores) {
      candidates.sort((a, b) => b.verifierScore - a.verifierScore);
    } else {
      candidates.sort((a, b) => b.generatorScore - a.generatorScore);
    }
    
    return candidates[0];
  }
}
