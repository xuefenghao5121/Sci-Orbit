# AI4S Status Skill

> 触发命令: `/ai4s-status` | 版本: 0.1.0 | 灵码团队

## 描述

AI4S 扩展状态查询技能，显示当前 AI4S 系统的完整状态信息。

## 触发条件

- 用户说 `/ai4s-status`
- 用户询问"AI4S 状态"、"扩展状态"、"环境配置"等

## 输出格式

```
═══════════════════════════════════════
  🧬 AI4S 科学计算扩展 — 状态面板
═══════════════════════════════════════

📦 扩展版本: {version}
📂 安装路径: {install_path}
🕐 最后更新: {last_update}

── 已安装模块 ──────────────────────────
  ✅ ai4s-plan       (Plan-First 规划)
  ✅ ai4s-status     (状态查询)
  ⬜ ai4s-review     (方案审查)  [未安装]
  ⬜ ai4s-compute    (计算调度)  [未安装]

── MCP Server ──────────────────────────
  状态: {running|stopped|not_found}
  端口: {port}
  已注册工具: {tools_count}
  可用工具: {tool_list}

── 计算环境 ────────────────────────────
  Python: {python_version}
  Conda:  {conda_env} {conda_active}
  CUDA:   {cuda_version} {cuda_available}
  GPU:    {gpu_info}

── 记忆系统 ────────────────────────────
  计划缓存: {plans_count} 条
  实验记录: {experiments_count} 条
  论文笔记: {papers_count} 条

── Hooks ───────────────────────────────
  PreToolUse:  {enabled|disabled} — conda 环境注入
  PostToolUse: {enabled|disabled} — 数值合理性检查

═══════════════════════════════════════
```

## 检测逻辑

按以下顺序检测各组件状态：

### 1. 扩展安装检查
```bash
# 检查 .ai4s 目录是否存在
test -d .ai4s && echo "installed" || echo "not_found"

# 检查各模块
for module in plan status review compute; do
  test -f .ai4s/skills/ai4s-$module/SKILL.md && echo "✅" || echo "⬜"
done
```

### 2. MCP Server 检查
```bash
# 检查进程
pgrep -f "ai4s-mcp-server" > /dev/null 2>&1

# 检查端口（默认 8765）
ss -tlnp | grep 8765
```

### 3. 计算环境检测
```bash
python3 --version
conda info --envs 2>/dev/null
nvcc --version 2>/dev/null
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null
```

### 4. 记忆系统统计
```bash
# 统计 .ai4s 下的各类记录
find .ai4s/plans -name "meta.json" 2>/dev/null | wc -l
find .ai4s/experiments -name "meta.json" 2>/dev/null | wc -l
find .ai4s/papers -name "meta.json" 2>/dev/null | wc -l
```

### 5. Hooks 状态
- 读取 `.claude/settings.json` 中的 hooks 配置
- 检查 `PreToolUse` 和 `PostToolUse` 是否存在
