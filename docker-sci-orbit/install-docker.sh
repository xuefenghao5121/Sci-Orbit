#!/bin/bash
# install-docker.sh - 安装 Docker 和 docker-compose
# 使用方法: sudo bash install-docker.sh

set -e

echo "=== 开始安装 Docker ==="

# 1. 更新包索引
echo "[1/6] 更新包索引..."
apt-get update

# 2. 安装依赖
echo "[2/6] 安装依赖包..."
apt-get install -y ca-certificates curl gnupg lsb-release

# 3. 添加 Docker 官方 GPG 密钥
echo "[3/6] 添加 Docker GPG 密钥..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# 4. 添加 Docker 软件源
echo "[4/6] 添加 Docker 软件源..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. 安装 Docker
echo "[5/6] 安装 Docker..."
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 6. 配置 Docker（可选：将当前用户添加到 docker 组）
echo "[6/6] 配置 Docker..."
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
    echo "已将用户 $SUDO_USER 添加到 docker 组"
    echo "请注销并重新登录以生效"
fi

# 启动 Docker 服务
systemctl enable docker
systemctl start docker

echo ""
echo "=== Docker 安装完成 ==="
docker --version
docker compose version
