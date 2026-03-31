/**
 * AI4S Unified Error Codes & MCP Error Response
 */

export enum AI4SErrorCode {
  // User errors (4xx)
  CONFIG_INVALID = "CONFIG_INVALID",
  CONFIG_MISSING = "CONFIG_MISSING",
  PARAM_INVALID = "PARAM_INVALID",
  PARAM_MISSING = "PARAM_MISSING",
  PAPER_NOT_FOUND = "PAPER_NOT_FOUND",
  EXPERIMENT_NOT_FOUND = "EXPERIMENT_NOT_FOUND",
  MODEL_NOT_FOUND = "MODEL_NOT_FOUND",
  KNOWLEDGE_NOT_FOUND = "KNOWLEDGE_NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  CONFLICT = "CONFLICT",
  VALIDATION_FAILED = "VALIDATION_FAILED",

  // System errors (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  STORAGE_ERROR = "STORAGE_ERROR",
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  INITIALIZATION_FAILED = "INITIALIZATION_FAILED",
  RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED",

  // External dependency errors (6xx)
  LLM_CALL_FAILED = "LLM_CALL_FAILED",
  LLM_TIMEOUT = "LLM_TIMEOUT",
  LLM_RATE_LIMITED = "LLM_RATE_LIMITED",
  GPU_UNAVAILABLE = "GPU_UNAVAILABLE",
  TRAINING_FAILED = "TRAINING_FAILED",
  INFERENCE_FAILED = "INFERENCE_FAILED",
  HPC_SUBMIT_FAILED = "HPC_SUBMIT_FAILED",
  VECTOR_SEARCH_FAILED = "VECTOR_SEARCH_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR",
}

export enum ErrorCategory {
  USER = "user",
  SYSTEM = "system",
  EXTERNAL = "external",
}

const CODE_CATEGORY: Record<string, ErrorCategory> = {
  [AI4SErrorCode.CONFIG_INVALID]: ErrorCategory.USER,
  [AI4SErrorCode.CONFIG_MISSING]: ErrorCategory.USER,
  [AI4SErrorCode.PARAM_INVALID]: ErrorCategory.USER,
  [AI4SErrorCode.PARAM_MISSING]: ErrorCategory.USER,
  [AI4SErrorCode.PAPER_NOT_FOUND]: ErrorCategory.USER,
  [AI4SErrorCode.EXPERIMENT_NOT_FOUND]: ErrorCategory.USER,
  [AI4SErrorCode.MODEL_NOT_FOUND]: ErrorCategory.USER,
  [AI4SErrorCode.KNOWLEDGE_NOT_FOUND]: ErrorCategory.USER,
  [AI4SErrorCode.PERMISSION_DENIED]: ErrorCategory.USER,
  [AI4SErrorCode.CONFLICT]: ErrorCategory.USER,
  [AI4SErrorCode.VALIDATION_FAILED]: ErrorCategory.USER,
  [AI4SErrorCode.INTERNAL_ERROR]: ErrorCategory.SYSTEM,
  [AI4SErrorCode.STORAGE_ERROR]: ErrorCategory.SYSTEM,
  [AI4SErrorCode.FILE_SYSTEM_ERROR]: ErrorCategory.SYSTEM,
  [AI4SErrorCode.INITIALIZATION_FAILED]: ErrorCategory.SYSTEM,
  [AI4SErrorCode.RESOURCE_EXHAUSTED]: ErrorCategory.SYSTEM,
  [AI4SErrorCode.LLM_CALL_FAILED]: ErrorCategory.EXTERNAL,
  [AI4SErrorCode.LLM_TIMEOUT]: ErrorCategory.EXTERNAL,
  [AI4SErrorCode.LLM_RATE_LIMITED]: ErrorCategory.EXTERNAL,
  [AI4SErrorCode.GPU_UNAVAILABLE]: ErrorCategory.EXTERNAL,
  [AI4SErrorCode.TRAINING_FAILED]: ErrorCategory.EXTERNAL,
  [AI4SErrorCode.INFERENCE_FAILED]: ErrorCategory.EXTERNAL,
  [AI4SErrorCode.HPC_SUBMIT_FAILED]: ErrorCategory.EXTERNAL,
  [AI4SErrorCode.VECTOR_SEARCH_FAILED]: ErrorCategory.EXTERNAL,
  [AI4SErrorCode.NETWORK_ERROR]: ErrorCategory.EXTERNAL,
  [AI4SErrorCode.EXTERNAL_API_ERROR]: ErrorCategory.EXTERNAL,
};

export class AI4SError extends Error {
  readonly code: AI4SErrorCode;
  readonly category: ErrorCategory;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;

  constructor(
    code: AI4SErrorCode,
    message: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, { cause });
    this.name = "AI4SError";
    this.code = code;
    this.category = CODE_CATEGORY[code] ?? ErrorCategory.SYSTEM;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  /** Convert to MCP-compliant error response */
  toMcpResponse(): { content: Array<{ type: "text"; text: string }>; isError: boolean } {
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: true,
          code: this.code,
          category: this.category,
          message: this.message,
          details: this.details,
          timestamp: this.timestamp,
        }, null, 2),
      }],
      isError: true,
    };
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      category: this.category,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/** Wrap unknown errors into AI4SError */
export function wrapError(err: unknown, fallbackCode = AI4SErrorCode.INTERNAL_ERROR): AI4SError {
  if (err instanceof AI4SError) return err;
  const message = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error ? err : undefined;
  return new AI4SError(fallbackCode, message, undefined, cause);
}

/** Helper to create user errors */
export function userError(code: AI4SErrorCode, message: string, details?: Record<string, unknown>): AI4SError {
  return new AI4SError(code, message, details);
}

/** Helper to create system errors */
export function systemError(code: AI4SErrorCode, message: string, details?: Record<string, unknown>): AI4SError {
  return new AI4SError(code, message, details);
}

/** Helper to create external dependency errors */
export function externalError(code: AI4SErrorCode, message: string, details?: Record<string, unknown>): AI4SError {
  return new AI4SError(code, message, details);
}
