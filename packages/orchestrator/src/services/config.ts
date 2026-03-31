import fs from "node:fs";
import path from "node:path";

const HOME = process.env.HOME!;
const AI4S_DIR = path.join(HOME, ".claude", "ai4s");
const CONFIG_PATH = path.join(AI4S_DIR, "config.json");

export interface AI4SConfig {
  version: string;
  llm: {
    provider: "anthropic" | "openai" | "custom";
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
  };
  storage: {
    basePath: string;
  };
  experiment: {
    autoSaveInterval: number; // seconds
    maxParallelExperiments: number;
  };
  knowledge: {
    defaultExportFormat: "alpaca" | "sharegpt";
  };
}

export const DEFAULT_CONFIG: AI4SConfig = {
  version: "0.2.0",
  llm: {
    provider: "anthropic",
    maxTokens: 4096,
    temperature: 0.7,
  },
  storage: {
    basePath: AI4S_DIR,
  },
  experiment: {
    autoSaveInterval: 60,
    maxParallelExperiments: 3,
  },
  knowledge: {
    defaultExportFormat: "alpaca",
  },
};

export class ConfigService {
  private config: AI4SConfig;

  constructor() {
    this.config = this.load();
  }

  private load(): AI4SConfig {
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        return this.mergeDefaults(raw);
      } catch (err) {
        console.error("[ConfigService] Failed to load config, using defaults:", err);
      }
    }
    return { ...DEFAULT_CONFIG };
  }

  private mergeDefaults(partial: Partial<AI4SConfig>): AI4SConfig {
    return {
      ...DEFAULT_CONFIG,
      ...partial,
      llm: { ...DEFAULT_CONFIG.llm, ...partial.llm },
      storage: { ...DEFAULT_CONFIG.storage, ...partial.storage },
      experiment: { ...DEFAULT_CONFIG.experiment, ...partial.experiment },
      knowledge: { ...DEFAULT_CONFIG.knowledge, ...partial.knowledge },
    };
  }

  getAll(): AI4SConfig {
    return this.config;
  }

  get<K extends keyof AI4SConfig>(key: K): AI4SConfig[K] {
    return this.config[key] as AI4SConfig[K];
  }

  update(partial: Partial<AI4SConfig>): void {
    this.config = this.mergeDefaults(partial);
    this.save();
  }

  private save(): void {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2) + "\n", "utf-8");
  }

  validate(): string[] {
    const errors: string[] = [];
    if (this.config.llm.provider === "custom" && !this.config.llm.baseUrl) {
      errors.push("custom provider requires baseUrl");
    }
    if (this.config.experiment.maxParallelExperiments < 1) {
      errors.push("maxParallelExperiments must be >= 1");
    }
    return errors;
  }
}

export const configService = new ConfigService();
