/**
 * EvoSkills 自进化 - 参数关联规则挖掘
 * 从用户修正和历史补全记录中挖掘参数关联规则
 * 支持 Apriori 算法挖掘频繁项集
 */
import {
  UserCorrectionRecord,
  ParamAssociationRule,
  EvolutionConfig,
  DEFAULT_EVOLUTION_CONFIG,
} from './types.js';
import { EvolutionStorage } from './storage.js';

/** 项集支持度统计 */
interface ItemsetSupport {
  itemset: Array<{param: string; value: any}>;
  support: number;
  supportCount: number;
}

export class AssociationMiner {
  private storage: EvolutionStorage;
  private config: EvolutionConfig;

  constructor(storage: EvolutionStorage, config?: Partial<EvolutionConfig>) {
    this.storage = storage;
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
  }

  /**
   * 从所有修正记录中挖掘关联规则
   */
  mineRules(toolFilter?: string): ParamAssociationRule[] {
    let corrections = this.storage.getCorrections();
    
    if (toolFilter) {
      corrections = corrections.filter(c => c.tool === toolFilter);
    }
    
    if (corrections.length < 10) {
      // 数据太少，不挖掘
      return [];
    }

    // 构建事务：每个修正记录是一个事务，包含 context + 最终参数
    const transactions = this.buildTransactions(corrections);
    
    // 挖掘频繁项集
    const frequentItemsets = this.mineFrequentItemsets(
      transactions,
      this.config.minSupportForAssociation
    );
    
    // 从频繁项集生成关联规则
    const rules = this.generateRules(
      frequentItemsets,
      transactions.length,
      this.config.minConfidenceForAssociation
    );
    
    // 为规则分配 ID
    let ruleIdCounter = 0;
    const now = new Date().toISOString();
    const result: ParamAssociationRule[] = rules.map(r => ({
      ...r,
      ruleId: `${toolFilter || 'all'}:${Date.now()}:${ruleIdCounter++}`,
      createdAt: now,
      updatedAt: now,
    }));
    
    // 按提升度排序，保留高质量规则
    result.sort((a, b) => b.lift - a.lift);
    
    // 只保留提升度 >= 1 的有用规则
    // lift == 1 仍然有用，表示确定规则（比如 100% 的概率结论成立）
    return result.filter(r => r.lift >= 1.0 - 1e-6);
  }

  /**
   * 构建事务数据集
   */
  private buildTransactions(corrections: UserCorrectionRecord[]): Array<Array<{param: string; value: any}>> {
    const transactions: Array<Array<{param: string; value: any}>> = [];
    
    for (const corr of corrections) {
      const transaction: Array<{param: string; value: any}> = [];
      
      // 添加 context 中的参数（都是字符串/数字/布尔）
      for (const [key, value] of Object.entries(corr.context)) {
        if (this.isSimpleValue(value)) {
          transaction.push({ param: key, value: this.normalizeValue(value) });
        }
      }
      
      // 添加最终用户值作为 item
      if (this.isSimpleValue(corr.user_value)) {
        transaction.push({ 
          param: corr.param, 
          value: this.normalizeValue(corr.user_value) 
        });
      }
      
      if (transaction.length >= 2) { // 至少需要两个项才能有规则
        transactions.push(transaction);
      }
    }
    
    return transactions;
  }

  /**
   * Apriori 算法挖掘频繁项集
   */
  mineFrequentItemsets(
    transactions: Array<Array<{param: string; value: any}>>,
    minSupport: number
  ): ItemsetSupport[] {
    const nTransactions = transactions.length;
    const minCount = Math.ceil(minSupport * nTransactions);
    
    // 生成 1-项集
    let frequentItemsets: ItemsetSupport[] = [];
    let currentItemsets = this.generateOneItemsets(transactions, minCount);
    frequentItemsets.push(...currentItemsets);
    
    // 迭代生成 k-项集
    let k = 2;
    while (currentItemsets.length > 0) {
      const candidates = this.generateCandidates(currentItemsets);
      const newFrequent = this.filterCandidates(candidates, transactions, minCount);
      currentItemsets = newFrequent;
      frequentItemsets.push(...currentItemsets);
      k++;
    }
    
    return frequentItemsets;
  }

  /**
   * 生成 1-项集
   */
  private generateOneItemsets(
    transactions: Array<Array<{param: string; value: any}>>,
    minCount: number
  ): ItemsetSupport[] {
    const countMap = new Map<string, number>();
    
    for (const transaction of transactions) {
      for (const item of transaction) {
        const key = this.itemKey(item);
        countMap.set(key, (countMap.get(key) || 0) + 1);
      }
    }
    
    const result: ItemsetSupport[] = [];
    const nTransactions = transactions.length;
    
    for (const [key, count] of countMap.entries()) {
      if (count >= minCount) {
        const { param, value } = this.parseKey(key);
        result.push({
          itemset: [{ param, value }],
          support: count / nTransactions,
          supportCount: count,
        });
      }
    }
    
    return result;
  }

  /**
   * 从频繁项集生成候选 k-项集
   */
  private generateCandidates(prevFrequent: ItemsetSupport[]): Array<ItemsetSupport['itemset']> {
    const candidates: Array<ItemsetSupport['itemset']> = [];
    const n = prevFrequent.length;
    
    // 连接步骤：连接两个长度为 k-1 的频繁项集，如果前 k-2 项相同
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = prevFrequent[i].itemset;
        const b = prevFrequent[j].itemset;
        // 假设已经按参数名排序
        const aSorted = a.sort((x, y) => x.param.localeCompare(y.param));
        const bSorted = b.sort((x, y) => x.param.localeCompare(y.param));
        
        // 检查是否可以连接
        let canJoin = true;
        for (let k = 0; k < aSorted.length - 1; k++) {
          if (aSorted[k].param !== bSorted[k].param) {
            canJoin = false;
            break;
          }
          if (!this.valueEqual(aSorted[k].value, bSorted[k].value)) {
            canJoin = false;
            break;
          }
        }
        
        if (canJoin) {
          const lastA = aSorted[aSorted.length - 1];
          const lastB = bSorted[bSorted.length - 1];
          
          if (lastA.param.localeCompare(lastB.param) < 0) {
            const candidate = [...aSorted, lastB];
            candidates.push(candidate);
          }
        }
      }
    }
    
    return candidates;
  }

  /**
   * 过滤候选，只保留频繁的
   */
  private filterCandidates(
    candidates: Array<ItemsetSupport['itemset']>,
    transactions: Array<Array<{param: string; value: any}>>,
    minCount: number
  ): ItemsetSupport[] {
    const result: ItemsetSupport[] = [];
    const nTransactions = transactions.length;
    
    for (const candidate of candidates) {
      let count = 0;
      for (const transaction of transactions) {
        if (this.transactionContains(transaction, candidate)) {
          count++;
        }
      }
      
      if (count >= minCount) {
        result.push({
          itemset: candidate,
          support: count / nTransactions,
          supportCount: count,
        });
      }
    }
    
    return result;
  }

  /**
   * 从频繁项集生成关联规则
   */
  private generateRules(
    frequentItemsets: ItemsetSupport[],
    totalTransactions: number,
    minConfidence: number
  ): Array<Omit<ParamAssociationRule, 'ruleId' | 'createdAt' | 'updatedAt'>> {
    const rules: Array<Omit<ParamAssociationRule, 'ruleId' | 'createdAt' | 'updatedAt'>> = [];
    
    // 对每个长度 >= 2 的频繁项集，生成规则
    for (const itemset of frequentItemsets) {
      if (itemset.itemset.length < 2) continue;
      
      // 分割为所有可能的前提 → 结论
      const items = itemset.itemset;
      
      for (let i = 0; i < items.length; i++) {
        // 结论是一个项，前提是其他项
        const consequent = items[i];
        const antecedent = items.filter((_, idx) => idx !== i);
        
        // 计算置信度
        const antecedentSupport = this.getSupport(antecedent, frequentItemsets);
        const confidence = itemset.support / antecedentSupport;
        
        if (confidence >= minConfidence) {
          // 计算 lift: confidence / p(consequent)
          const consequentSupport = this.getSupport([consequent], frequentItemsets);
          const lift = confidence / consequentSupport;
          
          rules.push({
            antecedent: [...antecedent],
            consequent: { param: consequent.param, value: consequent.value },
            support: itemset.support,
            confidence,
            lift,
            occurrences: itemset.supportCount,
          });
        }
      }
    }
    
    return rules;
  }

  /**
   * 获取项集支持度
   */
  private getSupport(itemset: ItemsetSupport['itemset'], frequentItemsets: ItemsetSupport[]): number {
    for (const fi of frequentItemsets) {
      if (this.itemsetsEqual(fi.itemset, itemset)) {
        return fi.support;
      }
    }
    return 0;
  }

  /**
   * 检查两个项集是否相等
   */
  private itemsetsEqual(
    a: ItemsetSupport['itemset'],
    b: ItemsetSupport['itemset']
  ): boolean {
    if (a.length !== b.length) return false;
    
    // 排序后比较
    const aSorted = a.sort((x, y) => x.param.localeCompare(y.param));
    const bSorted = b.sort((x, y) => x.param.localeCompare(y.param));
    
    for (let i = 0; i < a.length; i++) {
      if (aSorted[i].param !== bSorted[i].param) return false;
      if (!this.valueEqual(aSorted[i].value, bSorted[i].value)) return false;
    }
    
    return true;
  }

  /**
   * 检查事务是否包含候选项集
   */
  private transactionContains(
    transaction: Array<{param: string; value: any}>,
    candidate: Array<{param: string; value: any}>
  ): boolean {
    for (const item of candidate) {
      const found = transaction.some(
        tItem => tItem.param === item.param && this.valueEqual(tItem.value, item.value)
      );
      if (!found) return false;
    }
    return true;
  }

  /**
   * 比较值是否相等
   */
  private valueEqual(a: any, b: any): boolean {
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.abs(a - b) < 1e-6;
    }
    return String(a) === String(b);
  }

  /**
   * 生成项的唯一键
   */
  private itemKey(item: {param: string; value: any}): string {
    return `${item.param}:${String(item.value)}`;
  }

  /**
   * 从键解析回 param 和 value
   */
  private parseKey(key: string): {param: string; value: any} {
    const colonIndex = key.indexOf(':');
    const param = key.slice(0, colonIndex);
    const valueStr = key.slice(colonIndex + 1);
    // 尝试解析为数字如果可能
    const num = Number(valueStr);
    const value = !isNaN(num) ? num : valueStr;
    return { param, value };
  }

  /**
   * 检查是否是简单值（适合挖掘
   */
  private isSimpleValue(value: any): boolean {
    const type = typeof value;
    return type === 'string' || type === 'number' || type === 'boolean';
  }

  /**
   * 归一化值（数字保留类型
   */
  private normalizeValue(value: any): any {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value;
    return String(value);
  }

  /**
   * 检查是否应该触发挖掘（积累足够修正后）
   */
  shouldMine(currentCorrections: number): boolean {
    // 每积累 10 条新修正，触发一次挖掘
    if (currentCorrections < 10) return false;
    const lastMining = this.storage.getLastMiningTimestamp();
    const current = Date.now();
    // 如果是第一次挖掘，或者至少间隔一小时，允许挖掘
    return lastMining === 0 || (current - lastMining) > 3600 * 1000;
  }

  /**
   * 挖掘后清理
   */
  afterMining(): void {
    this.storage.clearCorrections();
  }
}
