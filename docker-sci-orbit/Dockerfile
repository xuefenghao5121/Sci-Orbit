# Dockerfile for OpenClaw with Sci-Orbit Plugin
# 完全独立的 OpenClaw 环境，可直接基于本地 HPC 应用使用
#
# 构建命令: docker build -t openclaw-sci-orbit:latest .
# 运行命令: docker compose up -d

FROM node:22-bookworm-slim

LABEL maintainer="灵码团队"
LABEL description="OpenClaw with Sci-Orbit scientific computing plugin - Complete isolated environment"
LABEL version="2026.4.7"

# 设置环境变量
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV OPENCLAW_HOME=/root/.openclaw
ENV OPENCLAW_WORKSPACE=/root/.openclaw/workspace
ENV OPENCLAW_INSTALL_DIR=/root/.nvm/versions/node/v22.14.1/lib/node_modules/openclaw

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    # 基础工具
    curl \
    wget \
    ca-certificates \
    git \
    vim \
    nano \
    # Python 环境
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    # 构建工具
    build-essential \
    cmake \
    # 科学计算依赖
    libblas-dev \
    liblapack-dev \
    libfftw3-dev \
    # 网络
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# 升级 pip
RUN pip3 install --upgrade pip setuptools wheel

# 安装科学计算 Python 包（Sci-Orbit 依赖）
RUN pip3 install --no-cache-dir --break-system-packages \
    # 数值计算
    numpy \
    scipy \
    pandas \
    # 可视化
    matplotlib \
    # 材料科学
    ase \
    pymatgen \
    # 分子模拟
    rdkit \
    # 量子化学
    pyscf \
    # 分子动力学
    openmm \
    # Jupyter 环境
    jupyter \
    notebook \
    # 数据处理
    pyyaml \
    tomli

# 创建 OpenClaw 目录结构
RUN mkdir -p ${OPENCLAW_HOME}/workspace \
    && mkdir -p ${OPENCLAW_HOME}/extensions \
    && mkdir -p ${OPENCLAW_HOME}/logs \
    && mkdir -p ${OPENCLAW_HOME}/sessions

# 设置工作目录
WORKDIR /app

# 复制 Sci-Orbit 源码（假设已经构建完成）
COPY ai4s-cli/ /app/ai4s-cli/

# 安装 Sci-Orbit 依赖
WORKDIR /app/ai4s-cli
RUN npm install --production --ignore-scripts

# 安装 OpenClaw CLI（全局安装）
RUN npm install -g openclaw@latest --force

# 复制 OpenClaw 配置模板
COPY docker-sci-orbit/config/openclaw.json.template ${OPENCLAW_HOME}/openclaw.json.template

# 复制启动脚本
COPY docker-sci-orbit/scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 创建工作目录和初始化脚本
RUN mkdir -p ${OPENCLAW_WORKSPACE} \
    && mkdir -p ${OPENCLAW_WORKSPACE}/memory \
    && mkdir -p ${OPENCLAW_WORKSPACE}/skills

# 初始化 Git 仓库（用于版本控制）
WORKDIR ${OPENCLAW_WORKSPACE}
RUN git init && \
    git config user.email "openclaw@docker" && \
    git config user.name "OpenClaw Docker"

# 添加欢迎信息
RUN echo "# OpenClaw Workspace" > README.md && \
    echo "This is the OpenClaw workspace directory." >> README.md && \
    echo "All your files and projects will be stored here." >> README.md

# 创建工作目录
WORKDIR ${OPENCLAW_WORKSPACE}

# 暴露 Gateway 端口
EXPOSE 18789

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:18789/health || exit 1

# 入口点
ENTRYPOINT ["/entrypoint.sh"]

# 默认命令：启动 Gateway
CMD ["gateway"]
