#!/bin/bash
# quick-start.sh - OpenClaw Sci-Orbit 容器快速启动脚本
# 使用方法: ./quick-start.sh [command]
#
# 可用命令:
#   setup   - 初始化环境（首次使用）
#   build   - 构建 Docker 镜像
#   start   - 启动容器
#   stop    - 停止容器
#   restart - 重启容器
#   logs    - 查看日志
#   shell   - 进入容器 shell
#   status  - 查看容器状态
#   clean   - 清理容器和卷
#   help    - 显示帮助信息

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"
IMAGE_NAME="openclaw-sci-orbit"
CONTAINER_NAME="openclaw-sci-orbit"

# 函数：打印彩色消息
print_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 函数：检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker 服务未运行，请先启动 Docker"
        exit 1
    fi

    print_success "Docker 已安装并运行"
}

# 函数：检查 Docker Compose
check_compose() {
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    print_success "Docker Compose 已安装"
}

# 函数：检查 .env 文件
check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        print_warning ".env 文件不存在"
        
        if [ -f "$ENV_EXAMPLE" ]; then
            print_info "从 .env.example 创建 .env 文件..."
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            print_warning "请编辑 .env 文件并填入实际值"
            print_info "运行: vim $ENV_FILE"
            return 1
        else
            print_error ".env.example 文件不存在"
            exit 1
        fi
    fi

    # 检查必要的环境变量
    source "$ENV_FILE"
    
    if [ -z "${OPENCLAW_GATEWAY_TOKEN:-}" ] || [ "$OPENCLAW_GATEWAY_TOKEN" = "your-gateway-token-here" ]; then
        print_warning "OPENCLAW_GATEWAY_TOKEN 未设置"
        return 1
    fi

    if [ -z "${OPENCLAW_FEISHU_APP_ID:-}" ] || [ "$OPENCLAW_FEISHU_APP_ID" = "cli_your_app_id" ]; then
        print_warning "OPENCLAW_FEISHU_APP_ID 未设置"
        return 1
    fi

    if [ -z "${OPENCLAW_FEISHU_APP_SECRET:-}" ] || [ "$OPENCLAW_FEISHU_APP_SECRET" = "your_app_secret" ]; then
        print_warning "OPENCLAW_FEISHU_APP_SECRET 未设置"
        return 1
    fi

    print_success "环境变量配置正确"
    return 0
}

# 函数：初始化环境
setup_env() {
    print_info "初始化环境..."
    
    check_docker
    check_compose
    
    if ! check_env; then
        print_warning "请先配置环境变量"
        print_info "运行: vim $ENV_FILE"
        exit 1
    fi
    
    print_success "环境初始化完成"
}

# 函数：构建镜像
build_image() {
    print_info "构建 Docker 镜像..."
    
    if ! check_env; then
        print_error "请先配置环境变量"
        exit 1
    fi
    
    docker compose build
    
    print_success "镜像构建完成"
}

# 函数：启动容器
start_container() {
    print_info "启动容器..."
    
    if ! check_env; then
        print_error "请先配置环境变量"
        exit 1
    fi
    
    docker compose up -d
    
    print_success "容器已启动"
    print_info "查看日志: $0 logs"
    print_info "进入容器: $0 shell"
}

# 函数：停止容器
stop_container() {
    print_info "停止容器..."
    
    docker compose stop
    
    print_success "容器已停止"
}

# 函数：重启容器
restart_container() {
    print_info "重启容器..."
    
    docker compose restart
    
    print_success "容器已重启"
}

# 函数：查看日志
view_logs() {
    print_info "查看容器日志（按 Ctrl+C 退出）..."
    
    docker compose logs -f
}

# 函数：进入容器
enter_shell() {
    print_info "进入容器 shell（输入 exit 退出）..."
    
    docker exec -it "$CONTAINER_NAME" bash
}

# 函数：查看状态
view_status() {
    print_info "容器状态:"
    
    docker compose ps
    
    echo ""
    print_info "镜像信息:"
    docker images | grep "$IMAGE_NAME" || print_warning "镜像未构建"
    
    echo ""
    print_info "卷信息:"
    docker volume ls | grep openclaw || print_warning "卷未创建"
}

# 函数：清理资源
clean_resources() {
    print_warning "清理容器和卷..."
    
    read -p "确认删除所有容器和卷？(yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        docker compose down -v
        print_success "清理完成"
    else
        print_info "取消清理"
    fi
}

# 函数：显示帮助
show_help() {
    cat << EOF
OpenClaw Sci-Orbit 容器快速启动脚本

使用方法:
  $0 [command]

可用命令:
  setup   - 初始化环境（首次使用）
  build   - 构建 Docker 镜像
  start   - 启动容器
  stop    - 停止容器
  restart - 重启容器
  logs    - 查看日志
  shell   - 进入容器 shell
  status  - 查看容器状态
  clean   - 清理容器和卷
  help    - 显示帮助信息

快速开始:
  1. 首次使用: $0 setup
  2. 配置环境: vim .env
  3. 构建镜像: $0 build
  4. 启动容器: $0 start
  5. 查看日志: $0 logs

文档:
  完整使用指南: cat CONTAINER_TEST_GUIDE.md
  环境变量说明: cat .env.example

联系方式:
  GitHub: https://github.com/xuefenghao5121/Sci-Orbit
  Issues: https://github.com/xuefenghao5121/Sci-Orbit/issues
EOF
}

# 主函数
main() {
    local command="${1:-help}"
    
    case "$command" in
        setup)
            setup_env
            ;;
        build)
            setup_env
            build_image
            ;;
        start)
            setup_env
            start_container
            ;;
        stop)
            stop_container
            ;;
        restart)
            restart_container
            ;;
        logs)
            view_logs
            ;;
        shell)
            enter_shell
            ;;
        status)
            view_status
            ;;
        clean)
            clean_resources
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
