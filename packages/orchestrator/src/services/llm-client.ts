import { configService } from "./config.js";
import { logger } from "../utils/logger.js";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number; // ms
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

export class LLMClientService {
  private getConfig() {
    const cfg = configService.get("llm");
    return {
      provider: cfg.provider,
      model: cfg.model || (cfg.provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o"),
      apiKey: cfg.apiKey || process.env[`${cfg.provider.toUpperCase()}_API_KEY`] || "",
      baseUrl: cfg.baseUrl || this.defaultBaseUrl(cfg.provider),
      maxTokens: cfg.maxTokens || 4096,
      temperature: cfg.temperature ?? 0.7,
    };
  }

  private defaultBaseUrl(provider: string): string {
    switch (provider) {
      case "anthropic": return "https://api.anthropic.com/v1";
      case "openai": return "https://api.openai.com/v1";
      default: return "";
    }
  }

  async complete(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const cfg = this.getConfig();
    const model = options.model || cfg.model;
    const maxTokens = options.maxTokens || cfg.maxTokens;
    const timeout = options.timeout || DEFAULT_TIMEOUT;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await this.sleep(RETRY_BASE_MS * Math.pow(2, attempt));
        }
        return await this.doRequest(cfg, model, messages, maxTokens, timeout);
      } catch (err: any) {
        lastError = err;
        if (err?.status === 400 || err?.status === 401 || err?.status === 403) break;
        logger.debug(`LLM request attempt ${attempt + 1} failed:`, err?.message);
      }
    }

    throw lastError || new Error("LLM request failed after retries");
  }

  private async doRequest(
    cfg: ReturnType<typeof this.getConfig>,
    model: string,
    messages: LLMMessage[],
    maxTokens: number,
    timeout: number
  ): Promise<LLMResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      let response: Response;

      if (cfg.provider === "anthropic") {
        response = await fetch(`${cfg.baseUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": cfg.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            messages: messages.filter((m) => m.role !== "system"),
            system: messages.find((m) => m.role === "system")?.content || undefined,
          }),
          signal: controller.signal,
        });
      } else {
        // OpenAI-compatible
        response = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.apiKey}`,
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
          signal: controller.signal,
        });
      }

      if (!response.ok) {
        const body = await response.text();
        const err: any = new Error(`LLM API error ${response.status}: ${body}`);
        err.status = response.status;
        throw err;
      }

      const data = await response.json();

      if (cfg.provider === "anthropic") {
        return {
          content: data.content?.[0]?.text || "",
          model: data.model,
          usage: data.usage ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens } : undefined,
        };
      } else {
        return {
          content: data.choices?.[0]?.message?.content || "",
          model: data.model,
          usage: data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } : undefined,
        };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

export const llmClient = new LLMClientService();
