# 🚀 快速开始指南

## 前置要求

| 依赖 | 最低版本 | 说明 |
|------|----------|------|
| **Node.js** | >= 18.0 | 运行时环境 |
| **Claude Code** | 最新版 | Anthropic 的 CLI 编码助手 |
| **Python** | >= 3.9 | 科学计算环境（可选，按需安装） |
| **Git** | >= 2.30 | 版本管理 |

### 检查环境

```bash
node --version    # >= 18.0
claude --version  # Claude Code CLI
python3 --version # >= 3.9 (可选)
```

## 安装

### 一键初始化

```bash
npx @ai4s/cli init
```

初始化过程会：
1. 检测当前环境（OS、CPU、GPU、RAM、Python、CUDA）
2. 在 Claude Code 项目中注册 AI4S MCP Server
3. 安装 16 个 Skill（计划、论文、实验、微调等）
4. 配置 5 个 Agent（Planner、Executor、Reviewer、Scientist、Deployer）
5. 创建工作目录结构

### 验证安装

```bash
# 在 Claude Code 中执行
/ai4s-status
```

如果看到环境信息和工具列表，说明安装成功。

## 第一个科学任务

以"论文复现"为例，体验 Plan-First 工作流：

```bash
# 1. 进入 Claude Code
claude

# 2. 描述你的科学任务
> 帮我复现论文 "Attention Is All You Need" 中的 Transformer 模型，在 WMT 数据集上验证

# Claude Code 会自动调用 AI4S 工具链：
# → classify_task  → 生成任务分类
# → generate_plan  → 生成分析计划
# → validate_plan  → 验证计划完整性
# → review_plan    → 科学性审查
# → paper_parse    → 解析论文内容
# → exp_plan       → 生成实验计划
# → exp_run        → 生成运行脚本
```

## 卸载

```bash
npx @ai4s/cli uninstall
```

卸载会移除所有 AI4S 相关配置、Skill 和 Agent，但保留实验数据和知识库。

## 常见问题

### Q: 安装失败，提示 Claude Code 未找到？

确保 Claude Code 已安装并添加到 PATH：
```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

### Q: GPU 检测不到？

检查 CUDA 安装：
```bash
nvidia-smi
python3 -c "import torch; print(torch.cuda.is_available())"
```

### Q: 如何指定 LLM API？

设置环境变量：
```bash
export AI4S_LLM_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export AI4S_LLM_API_KEY="your-api-key"
export AI4S_LLM_MODEL="qwen-plus"
```

### Q: 如何切换 HPC 后端？

编辑 `~/.ai4s/config.json`：
```json
{
  "hpc": {
    "backend": "slurm",
    "slurm": {
      "partition": "gpu",
      "account": "your-account"
    }
  }
}
```

### Q: 支持哪些科学计算框架？

- **量子化学**: PySCF
- **分子动力学**: OpenMM
- **化学信息学**: RDKit
- **通用计算**: Jupyter Notebook

需要时通过 `/ai4s-env` 自动安装依赖。
