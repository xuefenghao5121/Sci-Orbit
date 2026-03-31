# AI4S CLI - Compatibility Matrix

## Runtime Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| Node.js | 18.0.0 | 20.x LTS | ESM modules required |
| npm | 9.0.0 | 10.x | Workspaces support |
| Python | 3.9 | 3.11+ | For science tools (PySCF, OpenMM) |
| Git | 2.30 | 2.40+ | For paper workflow |

## Claude Code Compatibility

| Claude Code Version | Status | Notes |
|---------------------|--------|-------|
| ≥ 1.0.0 | ✅ Full support | MCP stdio transport |
| 0.x (beta) | ⚠️ Partial | May require manual config |

## Operating System Support

| OS | Status | Notes |
|----|--------|-------|
| Ubuntu 20.04+ | ✅ Full | Primary target |
| Ubuntu 22.04+ | ✅ Full | Recommended |
| macOS 13+ (Apple Silicon) | ✅ Full | Native ARM support |
| macOS 13+ (Intel) | ✅ Full | |
| CentOS 7/8 | ⚠️ Partial | May need Node 18 build |
| Windows 10+ (WSL2) | ✅ Full | WSL2 required |
| Windows native | ❌ Not supported | Use WSL2 |

## Optional Dependencies

| Feature | Dependency | Required? |
|---------|-----------|-----------|
| GPU training | NVIDIA CUDA 11.8+ | Optional |
| HPC (SLURM) | SLURM workload manager | Optional |
| HPC (K8s) | kubectl + cluster access | Optional |
| Vector search | ChromaDB | Optional (keyword fallback) |
| Paper parsing | GROBID service | Optional |
| LLM inference | vLLM / Ollama | Optional |

## MCP Protocol

| Feature | Version |
|---------|---------|
| MCP Protocol | 2024-11-05 |
| Transport | stdio |
| Schema validation | JSON Schema Draft 2020-12 |

## Package Versions

| Package | Version | Status |
|---------|---------|--------|
| @ai4s/orchestrator | 0.4.0 | Stable |
| @ai4s/cli | 0.4.0 | Stable |
| @modelcontextprotocol/sdk | ^1.12.1 | Peer dep |
| commander | ^13.0.0 | CLI dep |
