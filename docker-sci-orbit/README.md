# OpenClaw Sci-Orbit Docker 部署

> 完全独立的 OpenClaw + Sci-Orbit 科学计算环境

## 📖 简介

本项目提供了一个完整的 Docker 容器化解决方案，用于部署 OpenClaw 和 Sci-Orbit 科学计算环境。

### 主要特性

- ✅ **完全独立**: 容器内包含所有运行时依赖
- ✅ **即开即用**: 一键启动，自动配置
- ✅ **数据持久化**: Docker 卷管理，保证数据安全
- ✅ **HPC 集成**: 支持挂载本地 HPC 数据目录
- ✅ **飞书集成**: 开箱即用的飞书机器人
- ✅ **科学计算**: 预装 numpy, scipy, pandas, matplotlib, ase, pymatgen, rdkit, pyscf, openmm

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/xuefenghao5121/Sci-Orbit.git
cd Sci-Orbit/docker-sci-orbit
```

### 2. 配置环境变量

```bash
# 使用快速启动脚本
./quick-start.sh setup

# 或手动配置
cp .env.example .env
vim .env
```

### 3. 构建并启动

```bash
# 使用快速启动脚本
./quick-start.sh build
./quick-start.sh start

# 或使用 Docker Compose
docker compose up -d --build
```

### 4. 查看日志

```bash
./quick-start.sh logs
```

### 5. 进入容器

```bash
./quick-start.sh shell
```

## 📁 项目结构

```
docker-sci-orbit/
├── Dockerfile              # Docker 镜像定义
├── docker-compose.yml      # Docker Compose 配置
├── entrypoint.sh           # 容器启动脚本
├── .env.example            # 环境变量模板
├── quick-start.sh          # 快速启动脚本
├── CONTAINER_TEST_GUIDE.md # 完整部署指南
└── config/
    └── openclaw.json.template  # OpenClaw 配置模板
```

## 🔧 环境变量

必要的环境变量（在 `.env` 文件中配置）：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `OPENCLAW_GATEWAY_TOKEN` | Gateway 认证令牌 | `openssl rand -hex 20` |
| `OPENCLAW_FEISHU_APP_ID` | 飞书应用 ID | `cli_xxx` |
| `OPENCLAW_FEISHU_APP_SECRET` | 飞书应用密钥 | `xxx` |

可选的环境变量：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `OPENCLAW_ZAI_API_KEY` | 智谱 AI API Key | - |
| `OPENCLAW_BAILIAN_API_KEY` | 百炼 API Key | - |
| `OPENCLAW_MODEL_PRIMARY` | 默认主模型 | `zai/glm-5` |
| `HPC_DATA_PATH` | HPC 数据目录 | `./hpc-data` |

## 💾 持久化

容器使用 Docker 命名卷进行数据持久化：

| 卷名称 | 用途 |
|--------|------|
| `openclaw-workspace` | OpenClaw 工作区（项目代码） |
| `openclaw-logs` | OpenClaw 日志 |
| `openclaw-config` | OpenClaw 配置 |
| `openclaw-sessions` | Agent 会话状态 |

## 🖥️ HPC 使用

### 挂载 HPC 数据目录

在 `.env` 文件中配置：

```bash
HPC_DATA_PATH=/path/to/your/hpc/data
```

### 使用示例

```bash
# 进入容器
docker exec -it openclaw-sci-orbit bash

# 查看 HPC 数据
ls -laH /hpc-data

# 使用 Sci-Orbit 处理数据
cd /hpc-data
openclaw param-complete --tool=vasp --input-dir=.
```

## 📝 快速命令

```bash
# 启动
./quick-start.sh start

# 停止
./quick-start.sh stop

# 查看日志
./quick-start.sh logs

# 进入容器
./quick-start.sh shell

# 查看状态
./quick-start.sh status

# 清理
./quick-start.sh clean
```

## 📖 文档

- **完整部署指南**: [CONTAINER_TEST_GUIDE.md](CONTAINER_TEST_GUIDE.md)
- **环境变量说明**: [.env.example](.env.example)
- **主项目文档**: [Sci-Orbit README](../README.md)

## ❓ 常见问题

### 容器无法启动

检查环境变量配置：

```bash
./quick-start.sh setup
vim .env
```

### Gateway 无法访问

检查端口映射和防火墙：

```bash
# 检查容器状态
./quick-start.sh status

# 检查端口
curl http://localhost:18790/health
```

### 权限问题

修复卷权限：

```bash
docker run --rm \
  -v docker-sci-orbit_openclaw-workspace:/data \
  ubuntu:latest \
  chown -R 1000:1000 /data
```

## 📞 技术支持

- **GitHub Issues**: https://github.com/xuefenghao5121/Sci-Orbit/issues
- **OpenClaw 文档**: https://github.com/xuefenghao5121/OpenClaw

## 📄 许可证

MIT License

---

*最后更新: 2026-04-07*
