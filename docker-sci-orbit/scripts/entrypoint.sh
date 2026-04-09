#!/bin/bash
# entrypoint.sh - OpenClaw Docker 容器入口点
# 负责配置初始化、插件安装和 Gateway 启动

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo -e "${BLUE} OpenClaw Sci-Orbit 容器启动"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}时间:${NC} $(date)"
echo -e "${GREEN}版本:${NC} OpenClaw $(openclaw --version 2>/dev/null || echo 'unknown')"
echo -e "${GREEN}工作区:${NC} ${OPENCLAW_WORKSPACE:-/root/.openclaw/workspace}"
echo ""

# 检查必要的环境变量
echo -e "${BLUE}[检查] 验证环境变量...${NC}"

MISSING_VARS=()

if [ -z "${OPENCLAW_GATEWAY_TOKEN:-}" ]; then
    MISSING_VARS+=("OPENCLAW_GATEWAY_TOKEN")
fi

if [ -z "${OPENCLAW_FEISHU_APP_ID:-}" ]; then
    MISSING_VARS+=("OPENCLAW_FEISHU_APP_ID")
fi

if [ -z "${OPENCLAW_FEISHU_APP_SECRET:-}" ]; then
    MISSING_VARS+=("OPENCLAW_FEISHU_APP_SECRET")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}[警告] 缺少以下环境变量:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "  - $var"
    done
    echo ""
    echo -e "${YELLOW}提示: 请在 docker-compose.yml 中设置这些变量${NC}"
    echo -e "${YELLOW}或创建 .env 文件并填入实际值${NC}"
    echo ""
    # 继续运行，使用默认值
fi

# 生成配置文件
CONFIG_FILE="${OPENCLAW_HOME:-/root/.openclaw}/openclaw.json"
CONFIG_TEMPLATE="${OPENCLAW_HOME:-/root/.openclaw}/openclaw.json.template"

if [ ! -f "$CONFIG_FILE" ] || [ "${FORCE_CONFIG_UPDATE:-false}" = "true" ]; then
    echo -e "${BLUE}[配置] 生成 OpenClaw 配置文件...${NC}"

    if [ -f "$CONFIG_TEMPLATE" ]; then
        # 复制模板
        cp "$CONFIG_TEMPLATE" "$CONFIG_FILE"
        echo -e "${GREEN}[配置] 已从模板复制配置${NC}"
    else
        echo -e "${YELLOW}[警告] 配置模板不存在，使用默认配置${NC}"
        # 创建基本配置
        cat > "$CONFIG_FILE" << 'CONFIGEOF'
{
  "meta": {
    "lastTouchedVersion": "2026.4.7",
    "lastTouchedAt": "TIMESTAMP_PLACEHOLDER"
  },
  "browser": {
    "enabled": false,
    "headless": true,
    "noSandbox": true
  },
  "auth": {
    "profiles": {
      "volcengine-plan:default": {
        "provider": "volcengine-plan",
        "mode": "api_key"
      }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "volcengine-plan": {
        "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
        "apiKey": "VOLCENGINE_API_KEY_PLACEHOLDER",
        "api": "openai-completions",
        "models": [
          {
            "id": "glm-4.7",
            "name": "GLM-4.7",
            "contextWindow": 204800,
            "maxTokens": 131072
          },
          {
            "id": "doubao-seed-code",
            "name": "Doubao Seed Code",
            "contextWindow": 128000,
            "maxTokens": 65536
          },
          {
            "id": "deepseek-v3.2",
            "name": "DeepSeek V3.2",
            "contextWindow": 128000,
            "maxTokens": 65536
          }
        ]
      }
    }
  },
  "tools": {
    "profile": "full"
  },
  "gateway": {
    "port": ${GATEWAY_PORT:-18792},
    "mode": "local",
    "bind": "0.0.0.0",
    "auth": {
      "mode": "token",
      "token": "GATEWAY_TOKEN_PLACEHOLDER"
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "MODEL_PRIMARY_PLACEHOLDER",
        "fallbacks": ["volcengine-plan/doubao-seed-code", "volcengine-plan/deepseek-v3.2"]
      },
      "workspace": "/root/.openclaw/workspace"
    }
  }
}
CONFIGEOF
    fi

    # 替换占位符
    sed -i "s|TIMESTAMP_PLACEHOLDER|$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)|g" "$CONFIG_FILE"
    sed -i "s|GATEWAY_TOKEN_PLACEHOLDER|${OPENCLAW_GATEWAY_TOKEN:-default-token}|g" "$CONFIG_FILE"
    sed -i "s|FEISHU_APP_ID_PLACEHOLDER|${OPENCLAW_FEISHU_APP_ID:-cli_xxx}|g" "$CONFIG_FILE"
    sed -i "s|FEISHU_APP_SECRET_PLACEHOLDER|${OPENCLAW_FEISHU_APP_SECRET:-xxx}|g" "$CONFIG_FILE"
    sed -i "s|VOLCENGINE_API_KEY_PLACEHOLDER|${OPENCLAW_VOLCENGINE_API_KEY:-your-volcengine-key}|g" "$CONFIG_FILE"
    sed -i "s|MODEL_PRIMARY_PLACEHOLDER|${OPENCLAW_MODEL_PRIMARY:-volcengine-plan/glm-4.7}|g" "$CONFIG_FILE"

    echo -e "${GREEN}[配置] 配置文件已生成: $CONFIG_FILE${NC}"
else
    echo -e "${GREEN}[配置] 配置文件已存在，跳过生成${NC}"
fi

# 初始化 Sci-Orbit 插件
echo -e "${BLUE}[插件] 初始化 Sci-Orbit...${NC}"
SCI_ORBIT_SOURCE="/app/ai4s-cli/packages/openclaw-plugin"
SCI_ORBIT_INSTALL="/root/.openclaw/extensions/sci-orbit"

if [ -d "$SCI_ORBIT_SOURCE" ]; then
    mkdir -p "$SCI_ORBIT_INSTALL"
    cp -r "$SCI_ORBIT_SOURCE"/* "$SCI_ORBIT_INSTALL/" 2>/dev/null || true
    echo -e "${GREEN}[插件] Sci-Orbit 插件已安装${NC}"
else
    echo -e "${YELLOW}[警告] Sci-Orbit 源码不存在，跳过插件安装${NC}"
fi

# 初始化 MCP 服务器配置
echo -e "${BLUE}[MCP] 检查 Sci-Orbit MCP 服务器...${NC}"
if [ -f "/app/ai4s-cli/packages/orchestrator/dist/index.js" ]; then
    echo -e "${GREEN}[MCP] Sci-Orbit MCP 服务器就绪${NC}"
else
    echo -e "${YELLOW}[警告] Sci-Orbit MCP 服务器未构建${NC}"
fi

# 检查 Python 环境
echo -e "${BLUE}[环境] 检查 Python 科学计算包...${NC}"
python3 -c "import numpy, scipy, pandas, matplotlib" 2>/dev/null && echo -e "${GREEN}[环境] 核心科学包就绪${NC}" || echo -e "${YELLOW}[警告] 部分科学包未安装${NC}"

# 输出欢迎信息
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     OpenClaw Sci-Orbit 环境已就绪              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}• OpenClaw 版本:${NC} $(openclaw --version 2>/dev/null || echo 'unknown')"
echo -e "${BLUE}• Node.js 版本:${NC} $(node --version)"
echo -e "${BLUE}• Python 版本:${NC} $(python3 --version)"
echo -e "${BLUE}• 工作区:${NC} ${OPENCLAW_WORKSPACE:-/root/.openclaw/workspace}"
echo -e "${BLUE}• Gateway 端口:${NC} ${OPENCLAW_GATEWAY_PORT:-18789}"
echo ""
echo -e "${BLUE}已启用的功能:${NC}"
echo -e "${GREEN}  ✓ OpenClaw 核心${NC}"
echo -e "${GREEN}  ✓ 飞书集成${NC}"
echo -e "${GREEN}  ✓ Sci-Orbit 科学计算${NC}"
echo -e "${GREEN}  ✓ MCP 服务器${NC}"
echo ""
echo -e "${YELLOW}提示:${NC}"
echo -e "  • 使用 'openclaw --help' 查看可用命令"
echo -e "  • 使用 Ctrl+C 停止 Gateway"
echo -e "  • 日志文件保存在 ${OPENCLAW_HOME:-/root/.openclaw}/logs/"
echo ""

# 执行传入的命令
echo -e "${BLUE}[启动] 执行命令: ${GREEN}$@${NC}"
echo ""

# 在 Docker 容器中，gateway 需要前台运行
if [ "$1" = "gateway" ] || [ $# -eq 0 ]; then
    echo -e "${BLUE}[Gateway] 启动 OpenClaw Gateway (前台模式)...${NC}"
    exec openclaw gateway
else
    echo -e "${BLUE}[启动] 执行自定义命令...${NC}"
    exec openclaw "$@"
fi
