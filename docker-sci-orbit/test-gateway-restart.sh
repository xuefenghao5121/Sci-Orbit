#!/bin/bash
# test-gateway-restart.sh - Gateway 重启稳定性测试
# 验证飞书连接在 Gateway 重启后保持稳定

set -e

GATEWAY_URL="http://localhost:18789"
TEST_DURATION=300  # 测试总时长（秒）
RESTART_INTERVAL=60  # 重启间隔（秒）

echo "============================================"
echo "  Gateway 重启稳定性测试"
echo "  测试时长: ${TEST_DURATION}s"
echo "  重启间隔: ${RESTART_INTERVAL}s"
echo "============================================"

# 测试结果记录
RESULTS_DIR="/tmp/gateway-test-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# 连接状态检查函数
check_feishu_connection() {
    # 检查飞书 WebSocket 连接状态
    if docker exec openclaw-sci-orbit curl -s http://localhost:18789/api/status 2>/dev/null | \
       grep -q '"feishu":.*"connected"'; then
        return 0
    else
        return 1
    fi
}

# 记录连接状态
log_status() {
    local status="$1"
    local timestamp=$(date +%Y-%m-%dT%H:%M:%S)
    echo "[$timestamp] $status" | tee -a "$RESULTS_DIR/status.log"
}

# 测试开始
log_status "测试开始"
log_status "初始状态检查..."

# 初始连接检查
if check_feishu_connection; then
    log_status "飞书初始连接: 成功"
else
    log_status "飞书初始连接: 失败 (这可能是正常的，等待连接建立)"
fi

# 测试计数器
iteration=0
total_restarts=0
successful_reconnects=0
failed_reconnects=0

# 主测试循环
end_time=$(($(date +%s) + TEST_DURATION))

while [ $(date +%s) -lt $end_time ]; do
    iteration=$((iteration + 1))
    
    log_status "========== 迭代 $iteration =========="
    
    # 记录重启前状态
    log_status "重启前状态检查..."
    before_status=$(docker exec openclaw-sci-orbit curl -s http://localhost:18789/api/status 2>/dev/null || echo "error")
    echo "$before_status" > "$RESULTS_DIR/before_restart_$iteration.json"
    
    # 执行 Gateway 重启
    log_status "执行 Gateway 重启..."
    docker exec openclaw-sci-orbit openclaw gateway restart 2>&1 | tee -a "$RESULTS_DIR/restart_$iteration.log" || true
    
    total_restarts=$((total_restarts + 1))
    
    # 等待 Gateway 恢复
    log_status "等待 Gateway 恢复 (10秒)..."
    sleep 10
    
    # 检查 Gateway 健康状态
    if curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/health" 2>/dev/null | grep -q "200"; then
        log_status "Gateway 健康检查: 通过"
    else
        log_status "Gateway 健康检查: 失败"
        failed_reconnects=$((failed_reconnects + 1))
        continue
    fi
    
    # 等待飞书重新连接
    log_status "等待飞书重新连接 (20秒)..."
    sleep 20
    
    # 检查飞书连接状态
    if check_feishu_connection; then
        log_status "飞书重连: 成功"
        successful_reconnects=$((successful_reconnects + 1))
    else
        log_status "飞书重连: 失败"
        failed_reconnects=$((failed_reconnects + 1))
    fi
    
    # 记录重启后状态
    after_status=$(docker exec openclaw-sci-orbit curl -s http://localhost:18789/api/status 2>/dev/null || echo "error")
    echo "$after_status" > "$RESULTS_DIR/after_restart_$iteration.json"
    
    # 等待下一次重启
    remaining_wait=$((RESTART_INTERVAL - 30))
    if [ $remaining_wait -gt 0 ]; then
        log_status "等待 ${remaining_wait}s 后进行下一次测试..."
        sleep $remaining_wait
    fi
done

# 生成测试报告
echo ""
echo "============================================"
echo "  测试报告"
echo "============================================"

REPORT_FILE="$RESULTS_DIR/test_report.md"

cat > "$REPORT_FILE" << EOF
# Gateway 重启稳定性测试报告

## 测试配置
- **测试时间**: $(date)
- **测试时长**: ${TEST_DURATION}s
- **重启间隔**: ${RESTART_INTERVAL}s

## 测试结果

| 指标 | 数值 |
|------|------|
| 总重启次数 | $total_restarts |
| 成功重连次数 | $successful_reconnects |
| 失败重连次数 | $failed_reconnects |
| 成功率 | $(echo "scale=2; $successful_reconnects * 100 / $total_restarts" | bc 2>/dev/null || echo "N/A")% |

## 结论

$(if [ $failed_reconnects -eq 0 ]; then
    echo "✅ **所有重启后飞书连接均恢复正常**"
    echo ""
    echo "Docker 方案成功解决了 Gateway 重启导致的飞书断连问题。"
elif [ $failed_reconnects -lt $total_restarts ]; then
    echo "⚠️ **部分重启后飞书连接恢复失败**"
    echo ""
    echo "需要进一步调查失败原因，检查日志文件。"
else
    echo "❌ **所有重启后飞书连接均失败**"
    echo ""
    echo "Docker 方案未能解决问题，需要检查配置。"
fi)

## 详细日志
- 状态日志: $RESULTS_DIR/status.log
- 重启日志: $RESULTS_DIR/restart_*.log
EOF

cat "$REPORT_FILE"

echo ""
echo "测试报告已保存到: $REPORT_FILE"
echo "详细日志目录: $RESULTS_DIR"
