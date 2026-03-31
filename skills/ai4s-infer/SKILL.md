# ai4s-infer Skill

> 版本: 1.0.0 | 灵码团队 | Phase 3

## Description
模型推理服务管理。启动、测试、停止推理服务，支持多模型切换。
触发词：推理、inference、推理服务、模型部署、/infer。

## 命令路由

| 命令 | 说明 |
|------|------|
| `/infer start` | 启动推理服务 |
| `/infer test` | 测试推理质量 |
| `/infer stop` | 停止推理服务 |
| `/infer switch` | 切换模型 |

## 命令详解

### `/infer start` — 启动服务

```
用法: /infer start --model MODEL [--backend {vllm|ollama|transformers}] [--port PORT]

选项:
  --model MODEL     模型路径或 HuggingFace ID
  --backend vllm    推理后端 (默认: vllm)
  --port PORT       服务端口 (默认: 8000)
  --gpu DEVICE      GPU 设备号 (默认: 0)
  --max-batch N     最大批量 (默认: 32)
  --quant int4|int8 离线量化

示例:
  /infer start --model ./finetune-output/merged --backend vllm --port 8000
  /infer start --model Qwen/Qwen2.5-7B --backend ollama
```

**自动流程**:
1. 检查模型文件完整性
2. 检测 GPU 显存是否足够
3. 选择最优参数（tensor-parallel、quantization）
4. 启动服务 + 健康检查
5. 输出访问地址和 API 格式

**健康检查**: 启动后自动发送测试请求，确认服务可用。

### `/infer test` — 质量测试

```
用法: /infer test [--prompt PROMPT] [--benchmark {latency|throughput|quality|all}]

基准测试:
  latency     -- 单次推理延迟 (P50/P95/P99)
  throughput  -- 吞吐量 (tokens/s)
  quality     -- 生成质量 (BLEU/ROUGE/人工评估)
  all         -- 全量测试 (默认)
```

**输出示例**:
```
📊 推理服务测试报告
━━━━━━━━━━━━━━━━━━━━
⏱️  延迟: P50=45ms | P95=120ms | P99=230ms
🚀 吞吐: 128 tokens/s (batch=32)
💾 显存: 18GB/40GB (45%)
🎯 质量: BLEU=0.42 | ROUGE-L=0.58
✅ 状态: 健康
```

### `/infer stop` — 停止服务

```
用法: /infer stop [--force]

优雅停止: 等待当前请求完成后关闭
强制停止: --force 立即终止
```

### `/infer switch` — 切换模型

```
用法: /infer switch --model MODEL

流程:
  1. 加载新模型到备用槽位
  2. 健康检查
  3. 热切换（无中断）
  4. 卸载旧模型释放显存
```

## 支持的推理后端

| 后端 | 适用场景 | 特性 |
|------|----------|------|
| vLLM | 生产服务 | PagedAttention, 连续批处理, 高吞吐 |
| Ollama | 本地开发 | 简单易用, GGUF 格式, CPU/GPU |
| Transformers | 调试测试 | 灵活, 支持 PEFT adapter |
| TGI | 企业级 | 多模型, 量化, 安全 |

## API 格式

```bash
# vLLM / OpenAI 兼容
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "my-model", "messages": [{"role": "user", "content": "解释纳维-斯托克斯方程"}]}'

# Ollama
curl http://localhost:11434/api/generate \
  -d '{"model": "my-model", "prompt": "解释纳维-斯托克斯方程"}'
```

## 资源需求

| 模型规模 | vLLM 最低显存 | Ollama 最低显存 | 建议并发 |
|----------|--------------|-----------------|----------|
| 7B | 16GB | 8GB | 16 |
| 13B | 24GB | 12GB | 8 |
| 72B | 80GB×2 | 40GB | 4 |
