# Sci-Orbit

> 🔬 Scientific Computing Enhancement Toolkit for AI Coding Agents — bridging Claude Code, OpenClaw, and beyond

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.6.0-orange.svg)]()
[![Tests](https://img.shields.io/badge/tests-87%2F87-brightgreen.svg)]()

## What is Sci-Orbit?

Sci-Orbit is an **AI4S (AI for Scientific Computing) enhancement toolkit** that fills the gap between general-purpose AI coding agents and the specialized needs of scientific computing workflows.

**The problem**: Claude Code, OpenClaw, and similar agents excel at software engineering, but struggle with scientific computing — where implicit environment dependencies, complex physical parameters, and opaque binary data formats cause silent failures and wasted GPU hours.

**Our solution**: A plugin-based toolkit that gives AI coding agents **domain intelligence** for scientific computing — environment awareness, parameter reasoning, and scientific data understanding.

## Why Sci-Orbit?

| Challenge | Without Sci-Orbit | With Sci-Orbit |
|-----------|------------------|----------------|
| Environment setup | 40%+ failures from env issues | Auto-detect GPU/CUDA/compilers/MPI |
| Parameter errors | Implicit params missed → wrong results | Infer hidden params with confidence scores |
| Scientific data | Claude can't read POSCAR/HDF5 | Auto-summarize into LLM-readable text |
| Reproducibility | <1/3 of AI research reproducible | Environment snapshots + diff tracking |

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              Platform Adaptation Layer                │
│  ┌─────────────────┐    ┌────────────────────────┐   │
│  │  Claude Code    │    │  OpenClaw              │   │
│  │  MCP Server +   │    │  Skill + SubAgent +    │   │
│  │  Slash Commands │    │  Cron + Memory         │   │
│  └────────┬────────┘    └──────────┬─────────────┘   │
├───────────┴────────────────────────┴─────────────────┤
│              Agent Orchestration Layer                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐     │
│  │ Plan-    │ │ Debate   │ │ Finetune         │     │
│  │ First    │ │ Engine   │ │ Engine           │     │
│  │ Engine   │ │          │ │                  │     │
│  └──────────┘ └──────────┘ └──────────────────┘     │
├──────────────────────────────────────────────────────┤
│              MCP Tools Layer (38+ tools)              │
│  Environment │ Parameters │ Data │ Papers │ Experiments │
└──────────────────────────────────────────────────────┘
```

## Core Capabilities

### 🌍 Environment Intelligence

Automatically detects and snapshots the full computing environment:

- **Hardware**: GPU model, driver, CUDA version, VRAM, utilization
- **Software**: Compilers (GCC/G++/GFortran), MPI, Python version
- **Packages**: NumPy, PyTorch, ASE, RDKit, PySCF, OpenMM, JAX...
- **Export**: Generate `environment.yml` (Conda) or `Dockerfile` for one-click reproducibility
- **Diff**: Compare two environments and assess risk level (low/medium/high/critical)

```bash
# MCP tool call
env_snapshot(format="conda")     # → environment.yml
env_diff(snapshot_a, snapshot_b) # → risk assessment
```

### 🔧 Parameter Intelligence

Infer implicit parameters that scientific tools require but AI agents don't know about:

- **Templates**: VASP, LAMMPS, ABACUS, GPAW, CP2K, Quantum ESPRESSO parameter knowledge bases
- **Inference**: Auto-detect metal vs. semiconductor → set correct smearing
- **Confidence**: Every inferred parameter has a confidence score (0-1)
- **Validation**: Check constraints (e.g., `ismear=0` requires `sigma < 0.1`)
- **Adaptive Learning**: Learns from user corrections, applies preferences on future completions
- **Generation**: Auto-generate INCAR / INPUT / pw.x / CP2K input files from completed parameters

```bash
param_complete(tool="vasp_dft", params={system: "Cu", encut: 500})
# → adds implicit: ismear=1, sigma=0.2, prec=accurate (metal detected!)
# → warning: "Cu appears metallic, using ismear=1 (confidence: 70%)"

param_generate_incar(params, output_path="INCAR")
```

### 📊 Scientific Data Understanding

Translate opaque scientific file formats into text that LLMs can actually understand:

| Format | What we extract |
|--------|----------------|
| **POSCAR/CONTCAR** | Crystal system, lattice constant, atom count, coordinate type |
| **CIF** | Chemical formula, space group, cell parameters |
| **VASP OUTCAR** | Total energy, convergence status, max force |
| **ABACUS log** | Final energy, Fermi level, SCF convergence |
| **XYZ** | Molecular formula, atom count |
| **JSON/YAML** | Schema summary |

```bash
data_summarize(file_path="OUTCAR")
# → "Cu system, E₀=-5.43 eV, max force=0.005 eV/Å, ✅ converged"
```

## Supported Platforms

### Claude Code

```bash
# Install as MCP server
claude mcp add sci-orbit -- npx @sci-orbit/orchestrator

# Use naturally
claude> 帮我跑一个硅的 DFT 计算
# Claude automatically: env_snapshot → param_complete → prepare_input → submit
```

### OpenClaw

```bash
# Install as Skill
openclaw skill install sci-orbit

# Auto-activates Plan-First workflow + Cron monitoring
```

## Tool Reference (38+ MCP Tools)

### Environment (5 tools)
| Tool | Description |
|------|-------------|
| `env_detect` | Detect runtime environment |
| `env_setup` | Generate environment configuration |
| `env_snapshot` | Collect full reproducibility snapshot |
| `env_diff` | Compare two environments (supports text/CI mode) |
| `env_check` | CI-friendly environment consistency check (exit codes: 0/1/2) |

### Parameters (9 tools)
| Tool | Description |
|------|-------------|
| `param_complete` | Auto-complete implicit parameters (6 tools supported) |
| `param_validate` | Validate parameters without completion |
| `param_list_templates` | List supported tool templates |
| `param_generate_incar` | Generate VASP INCAR file |
| `param_generate_abacus_input` | Generate ABACUS INPUT file |
| `param_generate_qe_input` | Generate Quantum ESPRESSO pw.x input |
| `param_generate_cp2k_input` | Generate CP2K input file |
| `param_record_correction` | Record user correction for adaptive learning |
| `param_generate_ci_workflow` | Generate GitHub Actions CI workflow template |

### Data Summary (3 tools)
| Tool | Description |
|------|-------------|
| `data_summarize` | Summarize scientific data file |
| `data_summarize_dir` | Batch summarize directory |
| `data_supported_formats` | List supported formats |

### Plan-First (4 tools)
`classify_task` · `generate_plan` · `validate_plan` · `review_plan`

### Debate (3 tools)
`debate_submit` · `debate_round` · `debate_resolve`

### Papers (3 tools)
`paper_parse` · `paper_compare` · `paper_implement`

### Experiments (4 tools)
`exp_plan` · `exp_run` · `exp_monitor` · `exp_compare`

### Knowledge Base (5 tools)
`kb_create` · `kb_add` · `kb_search` · `kb_update` · `kb_export`

### Finetune (6 tools)
`finetune_prepare` · `finetune_start` · `finetune_monitor` · `finetune_resume` · `finetune_merge` · `finetune_evaluate`

### Science (4 tools)
`science_pyscf` · `science_rdkit` · `science_openmm` · `science_jupyter`

### Inference (3 tools)
`infer_start` · `infer_test` · `infer_stop`

### Constraints (4 tools)
`check_dimension` · `check_conservation` · `check_range` · `check_code`

## Quick Start

```bash
# Clone
git clone git@github.com:xuefenghao5121/Sci-Orbit.git
cd Sci-Orbit

# Install dependencies
npm install

# Build
npm run build

# Test
npm test  # 104/104 passing

# Use with Claude Code
claude mcp add sci-orbit -- node dist/server.js
```

## Development Roadmap

### Phase 1 — Tool Intelligence ✅
- [x] Environment snapshot & diff
- [x] Parameter auto-completion (VASP, LAMMPS, ABACUS)
- [x] Scientific data format summarizer
- [x] 38 MCP tools, 104/104 tests passing

### Phase 2 — Extended Intelligence ✅
- [x] New parameter templates: GPAW (DFT), CP2K (AIMD/hybrid), QE (surface science)
- [x] Adaptive parameter inference (learn from user corrections, pattern matching)
- [x] CI integration: env_check tool, text diff reports, GitHub Actions workflow template
- [x] 44 MCP tools, 87/87 tests passing

### Phase 3 — Platform Integration
- [ ] OpenClaw Skill (SKILL.md + subAgent + Cron)
- [ ] Claude Code Extension (slash commands)
- [ ] Multi-platform benchmark suite

### Phase 4 — Advanced Features
- [ ] More tool templates (GPAW, CP2K, Quantum ESPRESSO)
- [ ] Adaptive parameter inference (learn from user corrections)
- [ ] GPU resource scheduling
- [ ] Collaborative knowledge sharing

## Research Foundation

Built on insights from:

- **Agent4S** (arXiv:2506.23692) — Five-level AI4S agent classification
- **DSWizard** — Plan-First mechanism: accuracy 13% → 55%
- **Deploy-Master** — Dual-model debate: deployment success 50% → 95%
- **CORE-Bench** — AI4S evaluation benchmark

## Team

Sci-Orbit is developed by the **灵码团队 (Lingma Team)**:

| Member | Role | Focus |
|--------|------|-------|
| 灵枢 (Lingshu) | Architect | System design & orchestration |
| 灵匠 (Lingjiang) | Engineer | Core implementation |
| 灵令 (Lingling) | Planner | Workflow & pipeline design |
| 灵影 (Lingying) | Researcher | Paper analysis & knowledge |
| 灵脉 (Lingmai) | Operator | HPC & deployment |

## License

[MIT License](LICENSE)

---

*Sci-Orbit: Making AI coding agents scientifically literate.*
