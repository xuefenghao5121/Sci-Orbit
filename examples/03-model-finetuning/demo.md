# 模型微调演示

## Step 1: 创建知识库

```
> /kb create --name "fluid-dynamics" --domain "流体力学"
```

`kb_create` → kb_id: fd-001

## Step 2: 积累知识

```
> /kb add --id fd-001 --title "N-S方程推导" --content "..." --tags "方程,推导"
> /kb add --id fd-001 --title "湍流模型综述" --content "..." --tags "湍流,RANS,LES"
> /kb add --id fd-001 --title "CFD数值方法" --content "..." --tags "数值方法,FDM,FVM"
```

## Step 3: 导出微调数据

```
> /kb export --id fd-001 --format alpaca
```

`kb_export` → 生成 500+ 条 alpaca 格式训练样本

## Step 4: 准备微调

```
> /finetune prepare --source kb:fd-001 --format alpaca --output ./data
```

`finetune_prepare` → 数据清洗、格式转换、划分 train/val

## Step 5: 启动训练

```
> /finetune start --model qwen-7b --method qlora --dataset ./data/alpaca_train.jsonl
```

`finetune_start` → 生成 LoRA 配置，显存需求 ~16GB

## Step 6: 监控与评估

```
> /finetune monitor
> /finetune evaluate --model ./output/merged --metrics accuracy,fluency
```

## Step 7: 部署推理

```
> /infer start --backend vllm --model ./output/merged --gpu-id 0
> /infer test --endpoint http://localhost:8000 --test_prompts "解释雷诺数的物理意义"
```
