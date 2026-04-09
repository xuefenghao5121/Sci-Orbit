/**
 * EvoSkills 自进化 - 持久化存储
 * 负责动态模板、修正记录、关联规则的持久化
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import {
  DynamicToolParamTemplate,
  UserCorrectionRecord,
  ParamAssociationRule,
  EvolutionConfig,
  DEFAULT_EVOLUTION_CONFIG,
} from './types.js';

/** 存储数据结构 */
interface EvolutionStorageData {
  templates: DynamicToolParamTemplate[];
  corrections: UserCorrectionRecord[];
  associations: ParamAssociationRule[];
  lastMiningTimestamp: number; // 上次规则挖掘时间戳
  version: number;
}

/** 默认空存储 */
const EMPTY_STORAGE: EvolutionStorageData = {
  templates: [],
  corrections: [],
  associations: [],
  lastMiningTimestamp: 0,
  version: 1,
};

export class EvolutionStorage {
  private config: EvolutionConfig;
  private storagePath: string;
  private data: EvolutionStorageData;
  private loaded: boolean = false;

  constructor(config?: Partial<EvolutionConfig>) {
    this.config = { ...DEFAULT_EVOLUTION_CONFIG, ...config };
    
    // 解析存储路径
    let storagePath = this.config.storagePath;
    if (storagePath.startsWith('~/')) {
      storagePath = join(homedir(), storagePath.slice(2));
    }
    this.storagePath = storagePath;
    this.data = { ...EMPTY_STORAGE };
  }

  /** 确保存储目录存在 */
  private ensureDirectory(): void {
    const dir = this.storagePath;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /** 获取数据文件路径 */
  private getDataPath(): string {
    return join(this.storagePath, 'evolution-data.json');
  }

  /** 加载存储数据 */
  load(): boolean {
    this.ensureDirectory();
    const dataPath = this.getDataPath();
    
    if (!existsSync(dataPath)) {
      this.data = { ...EMPTY_STORAGE };
      this.loaded = true;
      return false;
    }

    try {
      const content = readFileSync(dataPath, 'utf8');
      this.data = JSON.parse(content);
      this.loaded = true;
      return true;
    } catch (error) {
      console.warn('Failed to load evolution storage, starting fresh:', error);
      this.data = { ...EMPTY_STORAGE };
      this.loaded = true;
      return false;
    }
  }

  /** 保存存储数据 */
  save(): void {
    this.ensureDirectory();
    const dataPath = this.getDataPath();
    writeFileSync(dataPath, JSON.stringify(this.data, null, 2));
  }

  /** 获取所有模板 */
  getTemplates(): DynamicToolParamTemplate[] {
    if (!this.loaded) this.load();
    return this.data.templates;
  }

  /** 根据名称获取模板 */
  getTemplateByName(name: string): DynamicToolParamTemplate | undefined {
    if (!this.loaded) this.load();
    return this.data.templates.find(t => t.name === name);
  }

  /** 添加或更新模板 */
  upsertTemplate(template: DynamicToolParamTemplate): void {
    if (!this.loaded) this.load();
    
    const existingIndex = this.data.templates.findIndex(
      t => t.templateId === template.templateId || t.name === template.name
    );
    
    if (existingIndex >= 0) {
      // 更新，版本递增
      template.version = this.data.templates[existingIndex].version + 1;
      template.updatedAt = new Date().toISOString();
      this.data.templates[existingIndex] = template;
    } else {
      // 新增
      this.data.templates.push(template);
    }
    
    this.save();
  }

  /** 删除模板（仅学习的模板可删除） */
  deleteTemplate(templateId: string): boolean {
    if (!this.loaded) this.load();
    const initialLength = this.data.templates.length;
    this.data.templates = this.data.templates.filter(t => t.templateId !== templateId || !t.isLearned);
    if (this.data.templates.length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  /** 获取所有修正记录 */
  getCorrections(): UserCorrectionRecord[] {
    if (!this.loaded) this.load();
    return this.data.corrections;
  }

  /** 获取特定工具的修正记录 */
  getCorrectionsForTool(tool: string): UserCorrectionRecord[] {
    if (!this.loaded) this.load();
    return this.data.corrections.filter(c => c.tool === tool);
  }

  /** 添加修正记录 */
  addCorrection(correction: UserCorrectionRecord): void {
    if (!this.loaded) this.load();
    this.data.corrections.push(correction);
    this.save();
  }

  /** 清空修正记录（挖掘后可清理旧数据） */
  clearCorrections(): void {
    if (!this.loaded) this.load();
    this.data.corrections = [];
    this.data.lastMiningTimestamp = Date.now();
    this.save();
  }

  /** 获取关联规则 */
  getAssociationRules(): ParamAssociationRule[] {
    if (!this.loaded) this.load();
    return this.data.associations;
  }

  /** 获取特定工具的关联规则 */
  getAssociationRulesForTool(tool: string): ParamAssociationRule[] {
    if (!this.loaded) this.load();
    // 规则ID格式为 {tool}:{hash}
    return this.data.associations.filter(r => r.ruleId.startsWith(`${tool}:`));
  }

  /** 更新关联规则 */
  setAssociationRules(rules: ParamAssociationRule[]): void {
    if (!this.loaded) this.load();
    this.data.associations = rules;
    this.save();
  }

  /** 获取上次挖掘时间戳 */
  getLastMiningTimestamp(): number {
    if (!this.loaded) this.load();
    return this.data.lastMiningTimestamp;
  }

  /** 获取存储统计信息 */
  getStats(): {
    templateCount: number;
    builtinCount: number;
    learnedCount: number;
    correctionCount: number;
    associationCount: number;
  } {
    if (!this.loaded) this.load();
    const builtinCount = this.data.templates.filter(t => !t.isLearned).length;
    const learnedCount = this.data.templates.filter(t => t.isLearned).length;
    
    return {
      templateCount: this.data.templates.length,
      builtinCount,
      learnedCount,
      correctionCount: this.data.corrections.length,
      associationCount: this.data.associations.length,
    };
  }

  /** 迁移旧版偏好数据 */
  migrateOldPreferences(oldPrefsPath: string): boolean {
    if (!existsSync(oldPrefsPath)) return false;
    
    try {
      const content = readFileSync(oldPrefsPath, 'utf8');
      const oldPrefs = JSON.parse(content);
      
      // 旧格式: { corrections: UserCorrection[], patterns: PreferencePattern[] }
      if (Array.isArray(oldPrefs.corrections)) {
        for (const corr of oldPrefs.corrections) {
          // 转换为新格式
          const newCorr: UserCorrectionRecord = {
            id: `${corr.tool}-${corr.param}-${Date.now()}`,
            tool: corr.tool,
            param: corr.param,
            auto_value: corr.auto_value,
            user_value: corr.user_value,
            context: corr.context || {},
            timestamp: corr.timestamp || new Date().toISOString(),
            templateVersion: 1,
          };
          this.addCorrection(newCorr);
        }
        this.save();
        console.log(`Migrated ${oldPrefs.corrections.length} corrections from old preferences`);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to migrate old preferences:', error);
      return false;
    }
  }
}
