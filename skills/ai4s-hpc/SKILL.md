# ai4s-hpc Skill

> 版本: 1.0.0 | 灵码团队 | Phase 3

## Description
HPC 高性能计算任务管理。提交、监控、取消 HPC 作业，适配 Slurm 和 K8s。
触发词：HPC、集群、提交任务、sbatch、kubectl、/hpc。

## 命令路由

| 命令 | 说明 |
|------|------|
| `/hpc submit` | 提交 HPC 任务 |
| `/hpc status` | 查看任务状态 |
| `/hpc cancel` | 取消任务 |
| `/hpc queue` | 查看队列 |

## 命令详解

### `/hpc submit` — 提交任务

```
用法: /hpc submit --script FILE [--name NAME] [--partition PART] [--nodes N] [--gpus N] [--time TIME] [--backend {slurm|k8s}]

选项:
  --script FILE      作业脚本
  --name NAME        作业名称
  --partition PART   分区 (默认: auto)
  --nodes N          节点数 (默认: 1)
  --gpus N           GPU 数 (默认: 0)
  --cpus N           CPU 核数 (默认: 4)
  --mem SIZE         内存 (默认: 16G)
  --time TIME        最长时间 (默认: 24:00:00)
  --array M-N        数组作业
  --depends JOBID    依赖作业
  --output DIR       输出目录
  --backend slurm    调度器 (默认: 自动检测)

示例:
  /hpc submit --script train.sh --name "finetune-qwen7b" --gpus 2 --time 48:00:00
  /hpc submit --script sim.sh --array 1-100 --partition gpu
```

**自动流程**:
1. 检测集群环境（Slurm/K8s）
2. 生成作业脚本（如未提供）
3. 资源估算（基于脚本分析）
4. 提交 + 返回 JOBID
5. 自动设置完成通知

### `/hpc status` — 任务状态

```
用法: /hpc status [JOBID]

输出:
  📋 作业: finetune-qwen7b (ID: 123456)
  📊 状态: RUNNING (运行 2h 15min / 预计 45h)
  🖥️  节点: node01, node02 (2 nodes, 4 GPUs)
  💾 存储: /scratch/job_123456 (12GB / 100GB)
  📝 输出: slurm-123456.out (最后 20 行)
  ⚠️  警告: GPU 利用率 45% (低于预期)
```

### `/hpc cancel` — 取消任务

```
用法: /hpc cancel JOBID [--force]

选项:
  --force    强制取消（包括运行中的任务）
```

### `/hpc queue` — 查看队列

```
用法: /hpc queue [--partition PART] [--user] [--all]

输出:
  ┌──────┬─────────────┬────────┬──────┬───────┬──────┐
  │ JOBID│ NAME        │ USER   │ STATE│ PART  │ TIME │
  ├──────┼─────────────┼────────┼──────┼───────┼──────┤
  │123456│ ft-qwen7b   │ me     │ RUN  │ gpu   │ 2:15 │
  │123457│ sim-ns      │ other  │ PEND │ gpu   │ 0:00 │
  └──────┴─────────────┴────────┴──────┴───────┴──────┘
  
  GPU 队列: 2 运行 / 5 等待 / 8 总计
  预计等待: ~3h
```

## Slurm 适配

### 自动生成的 Slurm 脚本模板
```bash
#!/bin/bash
#SBATCH --job-name=ai4s-job
#SBATCH --partition=gpu
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=8
#SBATCH --mem=64G
#SBATCH --gres=gpu:2
#SBATCH --time=24:00:00
#SBATCH --output=logs/%x-%j.out
#SBATCH --array=1-10

module load cuda/12.1
module load python/3.11
source activate ai4s

# 用户脚本
python $SCRIPT_PATH
```

### 常用 Slurm 命令映射
| AI4S 命令 | Slurm 命令 |
|-----------|-----------|
| `/hpc submit` | `sbatch` |
| `/hpc status` | `squeue -j JOBID` / `sacct` |
| `/hpc cancel` | `scancel JOBID` |
| `/hpc queue` | `squeue -p PARTITION` |

## K8s 适配

### 自动生成的 K8s Job 模板
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: ai4s-job
spec:
  template:
    spec:
      containers:
      - name: ai4s
        image: ai4s/runtime:latest
        command: ["python", "/workspace/script.py"]
        resources:
          limits:
            nvidia.com/gpu: 2
            memory: 64Gi
            cpu: "8"
      restartPolicy: Never
  backoffLimit: 0
```

### 常用 K8s 命令映射
| AI4S 命令 | K8s 命令 |
|-----------|---------|
| `/hpc submit` | `kubectl apply -f job.yaml` |
| `/hpc status` | `kubectl get job/pod ai4s-job` |
| `/hpc cancel` | `kubectl delete job ai4s-job` |
| `/hpc queue` | `kubectl get jobs --all-namespaces` |

## 与其他命令的串联

| 上游 | 串联方式 |
|------|----------|
| `/finetune start` | GPU 不足时自动建议 `/hpc submit` |
| `/science batch` | 大规模参数扫描自动提交数组作业 |
| `/exp run` | 重型实验自动提交 HPC |
