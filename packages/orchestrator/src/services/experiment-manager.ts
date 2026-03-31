import { storageService, StorageRecord } from "./storage.js";
import { logger } from "../utils/logger.js";

export type ExperimentStatus = "created" | "running" | "completed" | "failed" | "cancelled";

export interface ExperimentConfig {
  name: string;
  description?: string;
  params: Record<string, unknown>;
  tags?: string[];
}

export interface ExperimentResult extends StorageRecord {
  id: string;
  name: string;
  description?: string;
  status: ExperimentStatus;
  config: ExperimentConfig;
  results?: Record<string, unknown>;
  logs: string[];
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metrics?: Record<string, number>;
}

export class ExperimentManagerService {
  create(config: ExperimentConfig): ExperimentResult {
    const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const experiment: ExperimentResult = {
      id,
      name: config.name,
      description: config.description,
      status: "created",
      config,
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storageService.put("experiments", experiment);
    logger.info(`Experiment created: ${id}`);
    return experiment;
  }

  start(id: string): ExperimentResult | null {
    const exp = storageService.get<ExperimentResult>("experiments", id);
    if (!exp) return null;
    exp.status = "running";
    exp.startedAt = new Date().toISOString();
    exp.logs.push(`[${exp.startedAt}] Experiment started`);
    storageService.put("experiments", exp);
    return exp;
  }

  complete(id: string, results: Record<string, unknown>, metrics?: Record<string, number>): ExperimentResult | null {
    const exp = storageService.get<ExperimentResult>("experiments", id);
    if (!exp) return null;
    exp.status = "completed";
    exp.completedAt = new Date().toISOString();
    exp.results = results;
    exp.metrics = metrics;
    exp.logs.push(`[${exp.completedAt}] Experiment completed`);
    storageService.put("experiments", exp);
    logger.info(`Experiment completed: ${id}`);
    return exp;
  }

  fail(id: string, error: string): ExperimentResult | null {
    const exp = storageService.get<ExperimentResult>("experiments", id);
    if (!exp) return null;
    exp.status = "failed";
    exp.completedAt = new Date().toISOString();
    exp.error = error;
    exp.logs.push(`[${exp.completedAt}] Experiment failed: ${error}`);
    storageService.put("experiments", exp);
    return exp;
  }

  appendLog(id: string, message: string): void {
    const exp = storageService.get<ExperimentResult>("experiments", id);
    if (!exp) return;
    exp.logs.push(`[${new Date().toISOString()}] ${message}`);
    storageService.put("experiments", exp);
  }

  get(id: string): ExperimentResult | null {
    return storageService.get<ExperimentResult>("experiments", id);
  }

  list(): string[] {
    return storageService.list("experiments");
  }

  compare(ids: string[]): Record<string, unknown>[] {
    return ids.map((id) => storageService.get<ExperimentResult>("experiments", id)).filter(Boolean) as Record<string, unknown>[];
  }
}

export const experimentManager = new ExperimentManagerService();
