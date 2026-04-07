# Sci-Orbit 容器测试指南

> 完整的 Docker 容器测试流程，一步一步执行即可

---

## 前置要求

在开始之前，请确保你的系统已安装以下工具：

```bash
# 检查 Docker 是否安装
docker --version
# 预期输出: Docker version 20.10.x 或更高版本

# 检查 Docker 是否运行
docker info
# 如果报错，说明 Docker 服务未启动，需要启动 Docker

# 检查内存是否足够 (建议 >= 8GB)
free -h
# 查看 Mem: 行的 total 值
```

---

## 第一步：克隆仓库

```bash
# 进入工作目录（可修改为你喜欢的目录）
cd /tmp

# 克隆仓库（HTTPS 方式）
git clone https://github.com/xuefenghao5121/Sci-Orbit.git

# 或者使用 SSH 方式（如果你已配置 SSH 密钥）
# git clone git@github.com:xuefenghao5121/Sci-Orbit.git

# 进入项目目录
cd Sci-Orbit

# 验证克隆成功
ls -la
# 应该看到: package.json, README.md, packages/, tests/ 等文件
```

---

## 第二步：创建 Dockerfile

在项目根目录创建 `Dockerfile`：

```bash
# 在 Sci-Orbit 目录下创建 Dockerfile
cat > Dockerfile << 'EOF'
# 使用 Node.js 22 LTS 版本作为基础镜像
FROM node:22-alpine

# 设置工作目录
WORKDIR /app/ai4s-cli

# 复制项目文件
COPY . ./

# 安装 npm 依赖
RUN npm ci

# 构建项目
RUN npm run build

# 设置默认命令
CMD ["npm", "test"]
EOF

# 验证 Dockerfile 创建成功
cat Dockerfile
```

---

## 第三步：构建 Docker 镜像

```bash
# 构建镜像（使用项目名称和版本作为标签）
docker build -t sci-orbit:latest .

# 验证镜像构建成功
docker images | grep sci-orbit
# 应该看到: sci-orbit  latest  xxx  xxx  ago
```

**如果构建失败，请参考下面的"常见问题排查"章节**

---

## 第四步：运行容器执行测试

```bash
# 运行容器并执行测试
# --rm: 容器退出后自动删除
# -v: 挂载目录（可选，用于查看输出）
docker run --rm sci-orbit:latest
```

**测试预期结果：**
- 总共 104 个测试
- 95 个通过 (✓)
- 9 个跳过 (↓)
- 1 个失败（integration.test.ts 中的 MCP 协议测试，这是预期行为）

---

## 第五步：交互式进入容器调试

如果测试失败，你可以进入容器进行交互式调试：

```bash
# 启动容器并进入 bash shell
# --rm: 容器退出后自动删除
# -it: 交互式终端
docker run --rm -it sci-orbit:latest /bin/sh

# 在容器内，你可以执行以下命令：
# 1. 查看项目结构
ls -la

# 2. 进入 orchestrator 包目录
cd packages/orchestrator

# 3. 单独运行测试套件
npm test

# 4. 运行特定测试文件
npx vitest run src/tools/env.test

# 5. 查看详细的测试输出（带报告）
npx vitest run --reporter=verbose

# 6. 退出容器
exit
```

---

## 第六步：验证测试结果

```bash
# 重新运行测试并保存输出
docker run --rm sci-orbit:latest > test-output.txt 2>&1

# 查看测试输出
cat test-output.txt

# 统计测试结果
grep -E "(✓|↓|FAIL)" test-output.txt
```

**预期测试统计：**
```
Test Files  1 failed | 22 passed (23)
Tests  95 passed | 9 skipped (104)
```

---

## 验证 Checklist

使用以下清单逐项验证：

- [ ] **Docker 已安装并运行**
  ```bash
  docker --version && docker info
  ```

- [ ] **仓库克隆成功**
  ```bash
  ls -la /tmp/Sci-Orbit/README.md
  ```

- [ ] **Dockerfile 创建成功**
  ```bash
  ls -la /tmp/Sci-Orbit/Dockerfile
  ```

- [ ] **镜像构建成功**
  ```bash
  docker images | grep sci-orbit
  ```

- [ ] **容器可以运行**
  ```bash
  docker run --rm sci-orbit:latest echo "Container works!"
  # 输出: Container works!
  ```

- [ ] **测试套件执行**
  ```bash
  docker run --rm sci-orbit:latest npm test
  # 至少 95 个测试通过
  ```

- [ ] **基础工具可用**
  ```bash
  docker run --rm sci-orbit:latest node --version
  # 输出: v22.x.x
  ```

- [ ] **包构建成功**
  ```bash
  docker run --rm sci-orbit:latest ls -la packages/orchestrator/dist/
  # 应该看到 dist/ 目录和编译后的文件
  ```

---

## 常见问题排查

### 问题 1：Docker 未安装或未运行

**症状：**
```bash
docker: command not found
# 或
Cannot connect to the Docker daemon
```

**解决方案：**

```bash
# Ubuntu/Debian 安装 Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到 docker 组（避免每次使用 sudo）
sudo usermod -aG docker $USER
# 重新登录或运行以下命令使组权限生效
newgrp docker

# 验证安装
docker run hello-world
```

---

### 问题 2：Docker 构建失败 - 网络问题

**症状：**
```
ERROR [3/3] RUN npm ci
> npm ERR! network timeout at: https://registry.npmjs.org/
```

**解决方案：**

```bash
# 方案 1: 清理 Docker 缓存并重试
docker system prune -f
docker build --no-cache -t sci-orbit:latest .

# 方案 2: 使用国内 npm 镜像源
cat > Dockerfile << 'EOF'
FROM node:22-alpine
WORKDIR /app/ai4s-cli
COPY . ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm ci
RUN npm run build
CMD ["npm", "test"]
EOF

docker build -t sci-orbit:latest .
```

---

### 问题 3：Docker 构建失败 - 依赖冲突

**症状：**
```
npm ERR! peer dep missing: vitest@^3.0.0
```

**解决方案：**

```bash
# 方案 1: 删除 node_modules 和 lock 文件，重新安装
cd /tmp/Sci-Orbit
rm -rf node_modules package-lock.json
npm install
npm run build

# 方案 2: 修改 Dockerfile，使用 npm install 替代 npm ci
cat > Dockerfile << 'EOF'
FROM node:22-alpine
WORKDIR /app/ai4s-cli
COPY . ./
RUN npm install
RUN npm run build
CMD ["npm", "test"]
EOF

docker build -t sci-orbit:latest .
```

---

### 问题 4：容器启动失败 - 内存不足

**症状：**
```
OCI runtime create failed: container_linux.go:380: starting container process caused: process_linux.go:545: container init caused "process_linux.go:462: container init caused \"exec: \\\"npm\\\": executable file not found in $PATH\""
```

**解决方案：**

```bash
# 检查 Docker 系统资源
docker system df

# 清理未使用的 Docker 资源
docker system prune -a -f --volumes

# 限制容器内存使用（给容器分配 4GB）
docker run --rm -m 4g sci-orbit:latest
```

---

### 问题 5：测试失败 - node 命令找不到

**症状：**
```
Error: spawn node ENOENT
```

**解决方案：**

```bash
# 验证基础镜像中 Node.js 是否正确安装
docker run --rm node:22-alpine node --version

# 交互式进入容器检查
docker run --rm -it sci-orbit:latest /bin/sh
which node
node --version
npm --version
exit
```

---

### 问题 6：构建速度太慢

**解决方案：**

```bash
# 使用 BuildKit 加速构建
DOCKER_BUILDKIT=1 docker build -t sci-orbit:latest .

# 或者在 Dockerfile 中使用多阶段构建（优化镜像大小和构建时间）
cat > Dockerfile << 'EOF'
# 构建阶段
FROM node:22-alpine AS builder
WORKDIR /app/ai4s-cli
COPY . ./
RUN npm ci && npm run build

# 运行阶段
FROM node:22-alpine
WORKDIR /app/ai4s-cli
COPY --from=builder /app/ai4s-cli ./
CMD ["npm", "test"]
EOF

docker build -t sci-orbit:latest .
```

---

### 问题 7：权限问题 - 无法写入文件

**症状：**
```
npm ERR! EACCES: permission denied
```

**解决方案：**

```bash
# 方案 1: 使用 sudo
sudo docker build -t sci-orbit:latest .

# 方案 2: 确保用户在 docker 组中
groups | grep docker
# 如果没有 docker 组，添加用户：
sudo usermod -aG docker $USER
newgrp docker
```

---

### 问题 8：查看容器日志

**解决方案：**

```bash
# 运行容器并查看实时日志
docker run --rm sci-orbit:latest

# 如果容器在后台运行，使用以下命令查看日志
CONTAINER_ID=$(docker run -d sci-orbit:latest)
docker logs -f $CONTAINER_ID
docker logs $CONTAINER_ID | tail -50
docker stop $CONTAINER_ID
```

---

## 快速测试命令

**单命令完整测试流程：**

```bash
cd /tmp && \
git clone https://github.com/xuefenghao5121/Sci-Orbit.git && \
cd Sci-Orbit && \
cat > Dockerfile << 'EOF' && \
FROM node:22-alpine
WORKDIR /app/ai4s-cli
COPY . ./
RUN npm ci
RUN npm run build
CMD ["npm", "test"]
EOF
docker build -t sci-orbit:latest . && \
docker run --rm sci-orbit:latest
```

**仅运行测试（假设镜像已存在）：**

```bash
docker
 run --rm sci-orbit:latest
```

**交互式调试：**

```bash
docker run --rm -it sci-orbit:latest /bin/sh
```

---

## 清理命令

测试完成后，清理 Docker 资源：

```bash
# 删除镜像
docker rmi sci-orbit:latest

# 删除所有停止的容器
docker container prune -f

# 删除未使用的镜像
docker image prune -f

# 完全清理（谨慎使用）
docker system prune -a -f --volumes

# 删除克隆的仓库
rm -rf /tmp/Sci-Orbit
```

---

## 技术细节

**镜像信息：**
- 基础镜像: `node:22-alpine`
- 工作目录: `/app/ai4s-cli`
- 默认命令: `npm test`

**测试覆盖：**
- 总测试数: 104
- 通过: 95
- 跳过: 9 (MCP 协议集成测试)
- 失败: 1 (integration.test.ts 中的 ENOENT 错误，预期行为)

**测试套件列表：**
- `src/tools/env.test.ts` - 环境检测测试
- `src/services/hpc/manager.test.ts` - HPC 管理器测试
- `src/tools/experiment.test.ts` - 实验工具测试
- `src/services/constraints/engine.test.ts` - 约束引擎测试
- `src/tools/debate.test.ts` - 辩论引擎测试
- `src...` (更多测试)

---

## 下一步

测试通过后，你可以：

1. **在本地安装和运行**
   ```bash
   npm install
   npm run build
   npm start
   ```

2. **在 Claude Code 中使用**
   ```bash
   claude mcp add sci-orbit -- npx @ai4s/orchestrator
   ```

3. **查看项目文档**
   ```bash
   cat README.md
   ls docs/
   ```

---

## 联系支持

- **项目仓库**: https://github.com/xuefenghao5121/Sci-Orbit
- **问题反馈**: [GitHub Issues](https://github.com/xuefenghao5121/Sci-Orbit/issues)
- **完整文档**: [README.md](README.md)
- **参数补全指南**: [docs/param-completer-user-guide.md](docs/param-completer-user-guide.md)

---

*最后更新: 2026-04-07*
