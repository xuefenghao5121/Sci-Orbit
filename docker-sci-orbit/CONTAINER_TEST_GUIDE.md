# Sci-Orbit Docker 完整部署指南

> OpenClaw + Sci-Orbit 科学计算环境的完整容器化部署方案

---

## 📋 目录

1. [快速开始](#快速开始)
2. [前置要求](#前置要求)
3. [环境变量配置](#环境变量配置)
4. [构建和运行](#构建和运行)
5. [持久化配置](#持久化配置)
6. [HPC 使用说明](#hpc-使用说明)
7. [常见问题](#常见问题)
8. [高级用法](#高级用法)

---

## 🚀 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/xuefenghao5121/Sci-Orbit.git
cd Sci-Orbit/docker-sci-orbit

# 2. 配置环境变量
cp .env.example .env
vim .env  # 填入实际值

# 3. 构建并启动
docker compose up -d

# 4. 查看日志
docker compose logs -f

# 5. 交互式进入容器
docker exec -it openclaw-sci-orbit bash
```

---

## ✅ 前置要求

### 系统要求

- **操作系统**: Linux / macOS / Windows (WSL2)
- **Docker**: 20.10+ 版本
- **Docker Compose**: 2.0+ 版本
- **内存**: 建议 8GB+
- **磁盘**: 建议 10GB+ 可用空间

### 检查 Docker 环境

```bash
# 检查 Docker 版本
docker --version
# 预期: Docker version 20.10.x 或更高

# 检查 Docker Compose
docker compose version
# 预期: Docker Compose version v2.x.x

# 检查 Docker 状态
docker info
# 如果报错，说明 Docker 服务未启动

# 检查可用资源
docker system df
```

### 安装 Docker（如果未安装）

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到 docker 组（避免每次使用 sudo）
sudo usermod -aG docker $USER
newgrp docker
```

**macOS:**
```bash
# 安装 Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Docker Desktop
brew install --cask docker

# 启动 Docker Desktop
open /Applications/Docker.app
```

**Windows (WSL2):**
```bash
# 下载并安装 Docker Desktop: https://www.docker.com/products/docker-desktop
# 确保 WSL2 后端已启用
```

---

## 🔑 环境变量配置

### 环境变量说明

在启动容器前，必须配置以下环境变量：

| 变量名 | 说明 | 是否必须 | 示例值 |
|--------|------|----------|--------|
| `OPENCLAW_GATEWAY_TOKEN` | Gateway 认证令牌 | ✅ 是 | `a1b2c3d4e5f6g7h8i9j0` |
| `OPENCLAW_FEISHU_APP_ID` | 飞书应用 ID | ✅ 是 | `cli_a1b2c3d4e5f6` |
| `OPENCLAW_FEISHU_APP_SECRET` | 飞书应用密钥 | ✅ 是 | `XyZ1234567890abcdef` |
| `OPENCLAW_ZAI_API_KEY` | 智谱 AI API Key | ❌ 否 | `sk-xxx` |
| `OPENCLAW_BAILIAN_API_KEY` | 百炼 API Key | ❌ 否 | `sk-xxx` |
| `OPENCLAW_MODEL_PRIMARY` | 默认主模型 | ❌ 否 | `zai/glm-5` |
| `FORCE_CONFIG_UPDATE` | 强制更新配置 | ❌ 否 | `false` |

### 配置方法

#### 方法 1：使用 .env 文件（推荐）

```bash
# 复制模板
cp .env.example .env

# 编辑 .env 文件
vim .env
```

`.env` 文件内容示例：

```bash
# ====================
# 必须配置的变量
# ====================

# Gateway 认证令牌（生成方法：openssl rand -hex 20）
OPENCLAW_GATEWAY_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8

# 飞书应用配置（从飞书开放平台获取）
OPENCLAW_FEISHU_APP_ID=cli_your_app_id_here
OPENCLAW_FEISHU_APP_SECRET=your_app_secret_here

# ====================
# 模型 API 配置
# ====================

# 智谱 AI (Z.ai) API Key
OPENCLAW_ZAI_API_KEY=sk-your-zai-api-key

# 百炼 API Key (阿里云)
OPENCLAW_BAILIAN_API_KEY=sk-your-bailian-api-key

# 默认使用的主模型
OPENCLAW_MODEL_PRIMARY=zai/glm-5

# ====================
# 可选配置
# ====================

# 是否强制更新配置文件（容器启动时）
FORCE_CONFIG_UPDATE=false

# Gateway 端口（默认 18789）
GATEWAY_PORT=18789
```

#### 方法 2：在 docker-compose.yml 中直接设置

```yaml
services:
  openclaw-sci-orbit:
    environment:
      - OPENCLAW_GATEWAY_TOKEN=your-token
      - OPENCLAW_FEISHU_APP_ID=cli_xxx
      - OPENCLAW_FEISHU_APP_SECRET=xxx
```

#### 方法 3：在命令行中传递

```bash
docker compose up -d \
  -e OPENCLAW_GATEWAY_TOKEN=your-token \
  -e OPENCLAW_FEISHU_APP_ID=cli_xxx \
  -e OPENCLAW_FEISHU_APP_SECRET=xxx
```

### 生成 Gateway Token

```bash
# 使用 OpenSSL 生成随机 token
openssl rand -hex 20

# 或使用 Python
python3 -c "import secrets; print(secrets.token_hex(20))"

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"
```

---

## 🏗️ 构建和运行

### 第一步：准备项目

```bash
# 进入 docker-sci-orbit 目录
cd /path/to/Sci-Orbit/docker-sci-orbit

# 确保存在必要的文件
ls -la
# 应该看到:
# - Dockerfile
# - docker-compose.yml
# - entrypoint.sh
# - .env.example
# - config/
```

### 第二步：配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env

# 填入实际值
vim .env
```

### 第三步：构建镜像

```bash
# 构建镜像
docker compose build

# 或使用多阶段构建优化
docker build --no-cache -t openclaw-sci-orbit:latest \
  -f Dockerfile \
  ../

# 查看镜像
docker images | grep openclaw
```

**预期输出：**
```
openclaw-sci-orbit   latest   abc123def456   2 minutes ago   1.2GB
```

### 第四步：启动容器

```bash
# 启动服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 查看容器详情
docker compose ps -a
```

**预期状态：**
```
NAME                  COMMAND             SERVICE             STATUS
openclaw-sci-orbit    "/entrypoint.sh…"   openclaw-sci-orbit  running (healthy)
```

### 第五步：验证部署

```bash
# 检查容器健康状态
docker inspect openclaw-sci-orbit | jq '.[0].State.Health'

# 检查 Gateway 是否响应
curl http://localhost:18790/health

# 交互式进入容器
docker exec -it openclaw-sci-orbit bash

# 在容器内执行命令
openclaw --version
python3 --version
node --version
```

### 停止和清理

```bash
# 停止服务
docker compose stop

# 启动服务
docker compose start

# 重启服务
docker compose restart

# 停止并删除容器
docker compose down

# 删除容器和卷
docker compose down -v

# 删除容器、卷和镜像
docker compose down -v --rmi all
```

---

## 💾 持久化配置

### 持久化卷说明

默认配置使用 Docker 命名卷进行持久化，保证数据安全：

| 卷名称 | 用途 | 内容 |
|--------|------|------|
| `openclaw-workspace` | 工作区 | 项目代码、实验文件 |
| `openclaw-logs` | 日志 | OpenClaw 运行日志 |
| `openclaw-config` | 配置 | OpenClaw 配置文件 |
| `openclaw-sessions` | 会话 | Agent 会话状态 |

### 查看持久化卷

```bash
# 列出所有卷
docker volume ls | grep openclaw

# 查看卷详情
docker volume inspect docker-sci-orbit_openclaw-workspace

# 查看卷内容（临时启动一个容器查看）
docker run --rm -it \
  -v docker-sci-orbit_openclaw-workspace:/data \
  ubuntu:latest \
  ls -la /data
```

### 备份持久化卷

```bash
# 备份工作区
docker run --rm -it \
  -v docker-sci-orbit_openclaw-workspace:/data \
  -v $(pwd)/backup:/backup \
  ubuntu:latest \
  tar czf /backup/workspace-$(date +%Y%m%d).tar.gz -C /data .

# 备份所有卷
for vol in $(docker volume ls -q | grep openclaw); do
  docker run --rm \
    -v $vol:/data \
    -v $(pwd)/backup:/backup \
    ubuntu:latest \
    tar czf /backup/$vol-$(date +%Y%m%d).tar.gz -C /data .
done
```

### 恢复持久化卷

```bash
# 恢复工作区
docker run --rm -it \
  -v docker-sci-orbit_openclaw-workspace:/data \
  -v $(pwd)/backup:/backup \
  ubuntu:latest \
  tar xzf /backup/workspace-20260407.tar.gz -C /data
```

### 自定义持久化路径

如果希望使用主机目录而不是命名卷，修改 `docker-compose.yml`：

```yaml
services:
  openclaw-sci-orbit:
    volumes:
      # 使用主机目录
      - /path/to/host/workspace:/root/.openclaw/workspace
      - /path/to/host/logs:/root/.openclaw/logs
      - /path/to/host/config:/root/.openclaw
```

---

## 🖥️ HPC 使用说明

### HPC 数据目录

容器支持挂载本地 HPC 数据目录，方便进行科学计算：

```yaml
volumes:
  - ${HPC_DATA_PATH:-./hpc-data}:/hpc-data:rw
```

### 配置 HPC 数据目录

#### 方法 1：在 .env 中设置

```bash
# .env 文件
HPC_DATA_PATH=/path/to/your/hpc/data
```

#### 方法 2：在 docker-compose.yml 中设置

```yaml
volumes:
  - /path/to/hpc/data:/hpc-data:rw
```

### 使用 HPC 数据目录

```bash
# 交互式进入容器
docker exec -it openclaw-sci-orbit bash

# 查看 HPC 数据目录
ls -laH /hpc-data

# 使用 Sci-Orbit 处理 HPC 数据
cd /hpc-data
openclaw --help
```

### 示例：VASP 计算

```bash
# 进入容器
docker exec -it openclaw-sci-orbit bash

# 准备 VASP 输入文件
cd /hpc-data/vasp_calculation
ls -la
# POSCAR
# INCAR
# KPOINTS
# POTCAR

# 使用 Sci-Orbit 补全参数
openclaw param-complete --tool=vasp --input-dir=.

# 生成 INCAR
openclaw param-generate-incar --params=vasp-params.json

# 分析输出
openclaw data-summarize --file=OUTCAR
```

### 示例：GROMACS 模拟

```bash
# 进入容器
docker exec -it openclaw-sci-orbit bash

# 准备 GROMACS 输入
cd /hpc-data/gromacs_simulation
ls -la
# topology.top
# conf.gro

# 使用 Sci-Orbit 生成 .mdp 文件
openclaw param-generate-mdp \
  --scenario=production-md \
  --output=grompp.mdp

# 分析输出
openclaw data-summarize --file=md.xvg
```

### Jupyter Notebook 集成

启动 Jupyter Notebook 服务进行数据分析：

```bash
# 启动 Jupyter
docker compose --profile jupyter up -d jupyter

# 查看日志获取访问 token
docker compose logs jupyter

# 访问 http://localhost:8888
```

---

## ❓ 常见问题

### 问题 1：容器启动失败 - 环境变量未设置

**症状：**
```
Error: OPENCLAW_GATEWAY_TOKEN 未设置
```

**解决方案：**
```bash
# 检查 .env 文件是否存在
ls -la .env

# 重新创建并编辑
cp .env.example .env
vim .env

# 确保所有必要变量已设置
grep OPENCLAW .env
```

---

### 问题 2：容器健康检查失败

**症状：**
```
Status: unhealthy
```

**解决方案：**
```bash
# 查看容器日志
docker compose logs

# 交互式进入容器调试
docker exec -it openclaw-sci-orbit bash

# 检查 Gateway 是否运行
curl http://localhost:18789/health

# 查看 OpenClaw 进程
ps aux | grep openclaw

# 查看配置
cat /root/.openclaw/openclaw.json
```

---

### 问题 3：权限问题 - 无法写入卷

**症状：**
```
EACCES: permission denied
```

**解决方案：**
```bash
# 方案 1：修复卷权限
docker run --rm \
  -v docker-sci-orbit_openclaw-workspace:/data \
  ubuntu:latest \
  chown -R 1000:1000 /data

# 方案 2：使用绝对路径挂载
volumes:
  - /tmp/openclaw-workspace:/root/.openclaw/workspace
```

---

### 问题 4：网络问题 - 无法访问外部 API

**症状：**
```
Error: fetch failed
```

**解决方案：**
```bash
# 检查容器网络
docker exec openclaw-sci-orbit ping -c 3 8.8.8.8

# 配置 Docker 网络代理
# 编辑 ~/.docker/config.json
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.example.com:3128",
      "httpsProxy": "http://proxy.example.com:3128"
    }
  }
}

# 重启 Docker
sudo systemctl restart docker
```

---

### 问题 5：内存不足

**症状：**
```
Error: killed (out of memory)
```

**解决方案：**
```bash
# 方案 1：限制容器内存
# 编辑 docker-compose.yml
services:
  openclaw-sci-orbit:
    deploy:
      resources:
        limits:
          memory: 4G

# 方案 2：增加 Docker 内存限制
# Docker Desktop -> Settings -> Resources -> Memory

# 方案 3：清理未使用的资源
docker system prune -a --volumes
```

---

### 问题 6：Sci-Orbit 插件未加载

**症状：**
```
[警告] Sci-Orbit 源码不存在，跳过插件安装
```

**解决方案：**
```bash
# 检查 Dockerfile 中的 COPY 指令
# 确保路径正确
COPY ai4s-cli/ /app/ai4s-cli/

# 重新构建
docker compose build --no-cache

# 交互式进入容器检查
docker exec -it openclaw-sci-orbit bash
ls -la /app/ai4s-cli/
```

---

## 🔧 高级用法

### 启用 Jupyter Notebook

```bash
# 启动 Jupyter 服务
docker compose --profile jupyter up -d jupyter

# 查看访问 token
docker compose logs jupyter | grep -i token

# 访问 http://localhost:8888
```

### 自定义 OpenClaw 配置

```bash
# 交互式进入容器
docker exec -it openclaw-sci-orbit bash

# 编辑配置文件
vim /root/.openclaw/openclaw.json

# 重启容器应用配置
docker compose restart
```

### 多实例部署

```bash
# 修改 docker-compose.yml
services:
  openclaw-sci-orbit-1:
    container_name: openclaw-sci-orbit-1
    ports:
      - "18791:18789"

  openclaw-sci-orbit-2:
    container_name: openclaw-sci-orbit-2
    ports:
      - "18792:18789"

# 启动多个实例
docker compose up -d
```

### 监控和日志

```bash
# 实时日志
docker compose logs -f

# 查看最后 100 行日志
docker compose logs --tail=100

# 导出日志
docker compose logs > openclaw.log

# 使用 Docker 日志驱动
logging:
  driver: "json-file"
  options:
    max-size: "100m"
    max-file: "5"
```

### 资源监控

```bash
# 查看容器资源使用
docker stats stats openclaw-sci-orbit

# 查看详细信息
docker inspect openclaw-sci-orbit | jq '.[0].Stats'
```

---

## 📝 总结

### 部署 Checklist

- [ ] Docker 已安装并运行
- [ ] Docker Compose 可用
- [ ] 环境变量已配置（`.env` 文件）
- [ ] 镜像构建成功
- [ ] 容器启动成功
- [ ] 健康检查通过
- [ ] Gateway 可访问
- [ ] Sci-Orbit 插件已加载
- [ ] 持久化卷已创建

### 快速命令参考

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 查看日志
docker compose logs -f

# 进入容器
docker exec -it openclaw-sci-orbit bash

# 重启
docker compose restart

# 查看状态
docker compose ps
```

---

## 📞 技术支持

- **项目仓库**: https://github.com/xuefenghao5121/Sci-Orbit
- **问题反馈**: [GitHub Issues](https://github.com/xuefenghao5121/Sci-Orbit/issues)
- **OpenClaw 文档**: [OpenClaw GitHub](https://github.com/xuefenghao5121/OpenClaw)

---

*最后更新: 2026-04-07*
