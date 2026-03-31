# HPC 部署演示

## Step 1: 环境检测

```
> /env detect
```

`env_detect` → 检测到 SLURM 集群，8×A100 GPU

## Step 2: 生成 SLURM 脚本

```
> /exp plan 运行 100 万原子的 MD 模拟，100ns
> /exp run --target slurm --gpus 4 --time 48:00:00
```

`exp_run` 生成 SLURM sbatch 脚本：
```bash
#!/bin/bash
#SBATCH --job-name=md-simulation
#SBATCH --partition=gpu
#SBATCH --gres=gpu:4
#SBATCH --time=48:00:00
#SBATCH --output=logs/%j.out

module load openmpi openmm
python run_simulation.py --atoms 1000000 --steps 500000000
```

## Step 3: 提交作业

```
> /hpc submit --script slurm_job.sh --gpus 4 --memory 128G --time 48h
```

输出: Job ID 12345 submitted ✅

## Step 4: 监控作业

```
> /hpc status --job-id 12345
> /exp monitor exp-md-001 --log logs/12345.out
```

## Step 5: 收集结果

```
> /hpc collect --job-id 12345 --output results/
```

自动下载轨迹文件、能量日志、摘要报告。
