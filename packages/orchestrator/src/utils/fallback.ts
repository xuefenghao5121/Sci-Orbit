/**
 * Fallback / degradation strategies
 */

import { AI4SError, AI4SErrorCode } from "./errors.js";

// --- LLM fallback ---

export interface LLMCallOptions {
  model?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  name: string;
  call(opts: LLMCallOptions): Promise<string>;
}

let llmProviders: LLMProvider[] = [];
let ruleBasedHandler: ((prompt: string) => string) | null = null;

export function registerLLMProviders(providers: LLMProvider[]): void {
  llmProviders = providers;
}

export function registerRuleBasedFallback(handler: (prompt: string) => string): void {
  ruleBasedHandler = handler;
}

export async function callLLMWithFallback(opts: LLMCallOptions): Promise<string> {
  for (const provider of llmProviders) {
    try {
      return await provider.call(opts);
    } catch (err) {
      console.warn(`[fallback] LLM provider "${provider.name}" failed: ${(err as Error).message}`);
    }
  }

  if (ruleBasedHandler) {
    console.warn("[fallback] All LLM providers failed, using rule-based fallback");
    return ruleBasedHandler(opts.prompt);
  }

  throw new AI4SError(
    AI4SErrorCode.LLM_CALL_FAILED,
    "All LLM providers failed and no rule-based fallback available"
  );
}

// --- GPU fallback ---

export type ComputeBackend = "gpu" | "cpu";

export interface ComputeTask<T> {
  run(backend: ComputeBackend): Promise<T>;
}

export async function runWithComputeFallback<T>(task: ComputeTask<T>): Promise<{ result: T; backend: ComputeBackend }> {
  try {
    const result = await task.run("gpu");
    return { result, backend: "gpu" };
  } catch (err) {
    console.warn(`[fallback] GPU execution failed: ${(err as Error).message}, falling back to CPU`);
    const result = await task.run("cpu");
    return { result, backend: "cpu" };
  }
}

// --- Search fallback ---

export interface SearchProvider {
  name: string;
  search(query: string, limit?: number): Promise<Array<{ id: string; score: number; data: unknown }>>;
}

let searchProviders: SearchProvider[] = [];

export function registerSearchProviders(providers: SearchProvider[]): void {
  searchProviders = providers;
}

export async function searchWithFallback(
  query: string,
  limit = 10
): Promise<Array<{ id: string; score: number; data: unknown }>> {
  for (const provider of searchProviders) {
    try {
      const results = await provider.search(query, limit);
      if (results.length > 0) return results;
    } catch (err) {
      console.warn(`[fallback] Search provider "${provider.name}" failed: ${(err as Error).message}`);
    }
  }

  return [];
}
