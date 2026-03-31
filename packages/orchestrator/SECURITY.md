# Security Policy — @ai4s/orchestrator

## Overview

@ai4s/orchestrator is an MCP (Model Context Protocol) server that provides scientific computing tools to AI agents. This document outlines security considerations, known risks, and mitigations.

## Security Architecture

### Input Sanitization

- **HTML Sanitization**: `src/security/sanitizer.ts` provides `sanitizeString()` and `sanitizeId()` for escaping user inputs
- **Schema Validation**: All tool inputs are validated via Zod schemas before processing
- **Path Sanitization**: File IDs and names are sanitized to prevent path traversal

### Command Execution Risks

The server executes system commands in the following modules:

| Module | Commands | Risk Level | Mitigation |
|--------|----------|-----------|------------|
| `env/env-detect.ts` | `execSync` (cpuinfo, meminfo, python3, nvcc, nvidia-smi, pip) | **Low** | Read-only, no user input in commands |
| `env/env-setup.ts` | Generates scripts (does NOT execute) | **None** | Output only |
| `services/environment-detector.ts` | `execSync` (system info) | **Low** | Read-only, hardcoded commands |
| `tools/deploy/*` | Generates commands (does NOT execute) | **None** | Output only |
| `tools/finetune/start.ts` | Generates config + command (does NOT execute) | **None** | Output only |
| `tools/science/*` | Generates scripts (does NOT execute) | **None** | Output only |

**Key principle**: The orchestrator **generates** commands/scripts but does **NOT execute** them. Execution is delegated to the AI agent (Claude Code) which has its own sandbox and user approval mechanism.

### File System Operations

| Operation | Location | Risk | Mitigation |
|-----------|----------|------|------------|
| Read config | `~/.claude/ai4s/config.json` | Low | Fixed path, user-owned |
| Read/write knowledge base | `~/.claude/ai4s/kb/` | Medium | Sanitized IDs, fixed base path |
| Write finetune config | User-specified output_dir | **Medium** | User controls path |
| Read experiment files | User-specified paths | Low | Read-only |

### Path Traversal Prevention

Current state:
- `sanitizeId()` removes special characters from IDs
- Knowledge base operations use sanitized IDs
- **Gaps**: `finetunePrepare`, `finetuneStart`, `paperParse` accept user-provided file paths without traversal checks

**Recommendation**: Add `path.resolve()` + `startsWith(baseDir)` validation for all file path inputs.

## Known Risks

### 1. LLM API Key Exposure
- Keys are passed via environment variables (`AI4S_LLM_API_KEY`, `DASHSCOPE_API_KEY`)
- **Mitigation**: Keys are not logged or included in tool outputs

### 2. Generated Script Injection
- Tools generate bash/python scripts from user descriptions
- If an AI agent blindly executes generated scripts, there's risk
- **Mitigation**: Claude Code requires user approval for bash commands

### 3. No Rate Limiting (Server-Level)
- The MCP server has no built-in rate limiting
- **Mitigation**: Claude Code handles rate limiting client-side

### 4. `any` Type Usage
- 9 instances of `any` type in source code
- **Risk**: Runtime type errors, potential security bypasses
- **Locations**: See code quality report

## Prohibited Patterns

The constraint engine (`src/services/constraints/`) actively checks user code for:
- `eval()` usage → Error
- `exec()` usage → Error
- Missing type annotations → Warning
- Missing error handling → Warning

## Recommendations

1. **Path validation**: Add `isPathSafe(baseDir, userInput)` utility
2. **Input length limits**: Add max length constraints to Zod schemas
3. **Replace `any` types**: Use proper TypeScript types (9 instances)
4. **Audit logging**: Log all tool invocations for security review
5. **Dependency audit**: Run `npm audit` regularly

## Vulnerability Reporting

To report security vulnerabilities, please open a GitHub issue with the `[SECURITY]` prefix.
