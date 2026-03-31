# ⚙️ 配置参考

## config.json

配置文件位置：`~/.ai4s/config.json`

```json
{
  "llm": {
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "api_key": "your-api-key",
    "model": "qwen-plus",
    "max_tokens": 4096,
    "temperature": 0.3
  },
  "hpc": {
    "backend": "local",
    "local": {
      "gpu_devices": [0],
      "max_parallel_jobs": 1
    },
    "slurm": {
      "partition": "gpu",
      "account": "",
      "default_time": "24:00:00",
      "default_gpus": 1,
      "sbatch_template": ""
    },
    "k8s": {
      "namespace": "default",
      "image": "ai4s-worker:latest",
      "gpu_resource": "nvidia.com/gpu"
    }
  },
  "storage": {
    "experiments_dir": "~/.ai4s/experiments",
    "knowledge_dir": "~/.ai4s/knowledge",
    "models_dir": "~/.ai4s/models"
  },
  "constraints": {
    "enabled": true,
    "rules": ["physics", "chemistry", "numerical", "code"]
  },
  "feedback": {
    "enabled": true,
    "collector_url": ""
  }
}
```

### 配置项说明

| 路径 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `llm.base_url` | string | - | LLM API 基础 URL |
| `llm.api_key` | string | - | API 密钥 |
| `llm.model` | string | `qwen-plus` | 默认模型 |
| `llm.max_tokens` | number | 4096 | 最大生成 Token 数 |
| `llm.temperature` | number | 0.3 | 生成温度 |
| `hpc.backend` | string | `local` | HPC 后端类型 |
| `hpc.local.gpu_devices` | number[] | `[0]` | 可用 GPU 设备列表 |
| `storage.experiments_dir` | string | `~/.ai4s/experiments` | 实验数据目录 |
| `storage.knowledge_dir` | string | `~/.ai4s/knowledge` | 知识库目录 |
| `storage.models_dir` | string | `~/.ai4s/models` | 模型存储目录 |
| `constraints.enabled` | boolean | true | 是否启用约束检查 |
| `feedback.enabled` | boolean | true | 是否启用反馈收集 |

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `AI4S_LLM_BASE_URL` | LLM API 地址 | `https://api.openai.com/v1` |
| `AI4S_LLM_API_KEY` | API 密钥 | `sk-xxx` |
| `AI4S_LLM_MODEL` | 默认模型 | `qwen-plus` |
| `AI4S_HOME` | AI4S 主目录 | `~/.ai4s` |
| `DASHSCOPE_BASE_URL` | 阿里云 DashScope（兼容） | 同上 |
| `DASHSCOPE_API_KEY` | DashScope API Key（兼容） | 同上 |

## MCP 配置

AI4S 作为 MCP Server 注册到 Claude Code，安装后自动配置：

```json
{
  "mcpServers": {
    "ai4s": {
      "command": "node",
      "args": ["/path/to/ai4s/packages/orchestrator/dist/server.js"],
      "env": {
        "AI4S_LLM_BASE_URL": "...",
        "AI4S_LLM_API_KEY": "..."
      }
    }
  }
}
```

### MCP Resources

| URI | 说明 |
|-----|------|
| `ai4s://status` | 系统状态（环境、工具、Agent） |
| `ai4s://experiments/{id}` | 实验结果详情 |
| `ai4s://experiments/{id}/logs` | 实验日志 |
| `ai4s://inference/status` | 推理服务状态 |
| `ai4s://knowledge/{id}` | 知识库内容 |
| `ai4s://papers/{id}` | 论文笔记 |

## Hook 配置

配置文件：`~/.ai4s/hooks.json`（或安装时生成的模板）

```json
{
  "hooks": {
    "experiment_start": [
      {
        "type": "log",
        "message": "实验 {{experiment_id}} 已启动"
      }
    ],
    "experiment_complete": [
      {
        "type": "notify",
        "channel": "feishu",
        "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
      }
    ],
    "finetune_checkpoint": [
      {
        "type": "backup",
        "target": "~/.ai4s/checkpoints"
      }
    ]
  }
}
```

### Hook 事件

| 事件 | 触发时机 |
|------|----------|
| `experiment_start` | 实验开始 |
| `experiment_complete` | 实验完成 |
| `experiment_failed` | 实验失败 |
| `finetune_start` | 微调开始 |
| `finetune_checkpoint` | 微调保存检查点 |
| `finetune_complete` | 微调完成 |
| `inference_start` | 推理服务启动 |
| `inference_stop` | 推理服务停止 |
