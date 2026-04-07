# Sci-Orbit 容器测试指南

## 环境要求
- Docker
- 内存 >= 8GB

## 构建步骤
1. 构建 Docker 镜像
2. 运行测试容器
3. 执行测试命令

## 验证 Checklist
- [ ] 镜像构建成功
- [ ] 基础工具可用 (param_complete, param_validate 等)
- [ ] 测试套件通过

## 常见问题排查

### 1. 镜像构建失败
**问题**: Docker build 过程中出现错误
**原因**: 
- 依赖包下载失败
- 网络连接问题
- 基础镜像不存在

**解决方案**:
```bash
# 清理 Docker 缓存重新构建
docker system prune -f
docker build --no-cache -t sci-orbit:latest .

# 检查网络连接
ping -c 3 github.com

# 使用国内镜像加速（如需要）
```

### 2. 容器启动失败
**问题**: 容器启动后立即退出或无法启动
**原因**:
- 内存不足
- 权限问题
- 端口冲突

**解决方案**:
```bash
# 查看容器日志
docker logs <container_id>

# 检查内存使用
docker stats

# 以调试模式启动
docker run --rm -it sci-orbit:latest /bin/bash
```

### 3. 基础工具不可用
**问题**: param_complete、param_validate 等命令找不到
**原因**:
- 环境变量未正确设置
- PATH 配置问题
- 依赖未安装

**解决方案**:
```bash
# 进入容器检查
docker run --rm -it sci-orbit:latest /bin/bash

# 检查环境变量
echo $PATH
which param_complete

# 重新安装依赖
npm install
npm run build
```

### 4. 测试套件失败
**问题**: 执行测试时出现错误
**原因**:
- 测试环境配置不正确
- 测试数据缺失
- 测试用例与代码版本不匹配

**解决方案**:
```bash
# 查看详细测试输出
npm test -- --verbose

# 运行特定测试套件
npm test -- --grep "param-completer"

# 检查测试覆盖率
npm run coverage
```

### 5. 性能问题
**问题**: 容器运行缓慢
**原因**:
- 资源限制过紧
- 日志级别过高
- 数据量过大

**解决方案**:
```bash
# 增加资源限制
docker run --rm -m 8g --cpus=4 sci-orbit:latest

# 调整日志级别
export LOG_LEVEL=warn

# 使用 Docker Compose 配置资源
docker-compose up --scale worker=3
```

## 快速测试命令

```bash
# 完整测试流程
docker build -t sci-orbit:latest . && \
docker run --rm sci-orbit:latest npm test

# 仅测试 param-completer 功能
docker run --rm sci-orbit:latest npm test -- --grep "param-completer"

# 交互式调试
docker run --rm -it sci-orbit:latest /bin/bash
```

## 联系支持
- 项目仓库: https://github.com/xuefenghao5121/Sci-Orbit
- 问题反馈: GitHub Issues
- 文档: README.md
