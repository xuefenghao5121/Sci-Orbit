# 知识积累演示

## Step 1: 批量解析论文

```
> /paper read papers/turbulence-1.pdf
> /paper read papers/turbulence-2.pdf
> /paper read papers/turbulence-3.pdf
```

`paper_parse` 为每篇论文提取结构化信息。

## Step 2: 对比分析

```
> /paper compare paper-1 paper-2 paper-3
```

`paper_compare` 输出：
- 相似点：都基于 N-S 方程，都使用 LES 方法
- 差异点：SGS 模型选择不同（Smagorinsky vs Dynamic vs WALE）
- 洞察：Dynamic 模型在过渡流中表现更优

## Step 3: 创建知识库

```
> /kb create --name "turbulence-kb" --domain "湍流模拟"
```

## Step 4: 系统化录入

```
> /kb add --id turbulence-kb --title "LES 基本理论" --content "..." --tags "LES,理论" --source "paper-1"
> /kb add --id turbulence-kb --title "Smagorinsky 模型" --content "..." --tags "SGS,Smagorinsky" --source "paper-1"
> /kb add --id turbulence-kb --title "Dynamic 模型" --content "..." --tags "SGS,Dynamic" --source "paper-2"
> /kb add --id turbulence-kb --title "WALE 模型" --content "..." --tags "SGS,WALE" --source "paper-3"
> /kb add --id turbulence-kb --title "网格收敛性分析" --content "..." --tags "网格,收敛" --source "paper-2"
```

## Step 5: 知识检索

```
> /kb search --id turbulence-kb --query "哪种 SGS 模型适合过渡流"
```

返回: Dynamic 模型（Germano et al.），相关度 0.95

## Step 6: 导出训练数据

```
> /kb export --id turbulence-kb --format finetune
```

生成 200+ 条 QA 训练样本，可直接用于微调。
