/**
 * EvoSkills 自进化 - 置信度管理器
 * 根据用户反馈动态更新规则置信度
 */
import { ImplicitParamRuleWithConfidence } from './types.js';

/** 置信度更新结果 */
export interface ConfidenceUpdateResult {
  param: string;
  oldConfidence: number;
  newConfidence: number;
  changed: boolean;
}

export class ConfidenceManager {
  /** 拉普拉斯平滑参数 */
  private alpha: number = 1;

  constructor(alpha?: number) {
    if (alpha !== undefined) {
      this.alpha = alpha;
    }
  }

  /**
   * 计算当前置信度
   * 使用拉普拉斯平滑：(correct + alpha) / (total + 2*alpha)
   */
  calculateConfidence(correctCount: number, sampleCount: number): number {
    return (correctCount + this.alpha) / (sampleCount + 2 * this.alpha);
  }

  /**
   * 记录一次正确预测，更新置信度
   */
  recordCorrect(rule: ImplicitParamRuleWithConfidence): ConfidenceUpdateResult {
    const oldConfidence = rule.confidence;
    rule.sampleCount += 1;
    rule.correctCount += 1;
    const newConfidence = this.calculateConfidence(rule.correctCount, rule.sampleCount);
    rule.confidence = newConfidence;
    
    return {
      param: rule.description,
      oldConfidence,
      newConfidence,
      changed: Math.abs(oldConfidence - newConfidence) > 1e-6,
    };
  }

  /**
   * 记录一次错误预测，更新置信度
   */
  recordIncorrect(rule: ImplicitParamRuleWithConfidence): ConfidenceUpdateResult {
    const oldConfidence = rule.confidence;
    rule.sampleCount += 1;
    // correctCount 不变，相当于错误
    const newConfidence = this.calculateConfidence(rule.correctCount, rule.sampleCount);
    rule.confidence = newConfidence;
    
    return {
      param: rule.description,
      oldConfidence,
      newConfidence,
      changed: Math.abs(oldConfidence - newConfidence) > 1e-6,
    };
  }

  /**
   * 为新规则计算初始置信度
   * 内置规则：0.8 初始置信度
   * 学习规则：基于已有样本计算
   */
  initialConfidence(isBuiltin: boolean, correctCount?: number, sampleCount?: number): number {
    if (isBuiltin) {
      // 内置领域知识，初始置信度较高
      return 0.8;
    }
    
    if (correctCount !== undefined && sampleCount !== undefined && sampleCount > 0) {
      return this.calculateConfidence(correctCount, sampleCount);
    }
    
    // 全新学习规则，中性初始置信度
    return 0.5;
  }

  /**
   * 根据条件上下文获取条件置信度
   * 如果没有特定条件置信度，返回总体置信度
   */
  getConditionalConfidence(
    rule: ImplicitParamRuleWithConfidence,
    contextKey: string,
    contextValue: string
  ): number {
    if (!rule.conditionalConfidence) {
      return rule.confidence;
    }
    
    const key = `${contextKey}=${contextValue}`;
    return rule.conditionalConfidence[key] ?? rule.confidence;
  }

  /**
   * 更新条件置信度
   * 同时记录用户值，这样上下文匹配时可以直接使用学习到的值
   */
  updateConditionalConfidence(
    rule: ImplicitParamRuleWithConfidence,
    contextKey: string,
    contextValue: string,
    isCorrect: boolean,
    newValue?: any
  ): void {
    if (!rule.conditionalConfidence) {
      rule.conditionalConfidence = {};
    }
    if (!rule.conditionalValues) {
      rule.conditionalValues = {};
    }
    
    const key = `${contextKey}=${contextValue}`;
    // 简单的增量更新
    const current = rule.conditionalConfidence[key] ?? rule.confidence;
    
    // 指数移动平均更新
    const alpha = 0.3; // 学习率
    const update = isCorrect ? 1 : 0;
    rule.conditionalConfidence[key] = current * (1 - alpha) + update * alpha;
    
    // 如果提供了新值，存储它（用户修正值）
    if (newValue !== undefined) {
      rule.conditionalValues[key] = newValue;
    }
  }

  /**
   * 根据置信度分类获取提示级别
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * 是否需要提示用户确认
   */
  shouldPrompt(confidence: number, minThreshold: number = 0.5): boolean {
    return confidence < minThreshold;
  }

  /**
   * 合并多个置信度（用于多个证据支持同一个推断）
   * 使用 Dempster 组合规则简化版
   */
  combineConfidences(confidences: number[]): number {
    if (confidences.length === 0) return 0.5;
    if (confidences.length === 1) return confidences[0];
    
    // 简化的 Dempster 组合：乘积归一化
    // 假设各证据独立
    let product = 1;
    let productComp = 1;
    for (const c of confidences) {
      product *= c;
      productComp *= (1 - c);
    }
    
    const denominator = product + productComp;
    if (denominator === 0) return 0.5;
    
    return product / denominator;
  }
}
