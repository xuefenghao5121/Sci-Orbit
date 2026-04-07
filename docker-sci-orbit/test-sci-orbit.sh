#!/bin/bash
# test-sci-orbit.sh - Sci-Orbit 功能测试脚本
# 在 Docker 容器内执行

set -e

echo "============================================"
echo "  Sci-Orbit 功能测试"
echo "  时间: $(date)"
echo "============================================"

# 测试结果统计
PASS=0
FAIL=0

# 测试函数
test_case() {
    local name="$1"
    local cmd="$2"
    local expected="$3"
    
    echo -n "[测试] $name ... "
    
    if output=$(eval "$cmd" 2>&1); then
        if [ -n "$expected" ] && ! echo "$output" | grep -q "$expected"; then
            echo "失败 (输出不匹配)"
            echo "  期望包含: $expected"
            echo "  实际输出: $output"
            ((FAIL++))
        else
            echo "通过"
            ((PASS++))
        fi
    else
        echo "失败 (命令执行失败)"
        echo "  错误: $output"
        ((FAIL++))
    fi
}

# 1. 环境检查
echo ""
echo "=== 1. 环境检查 ==="
test_case "Node.js 版本" "node --version" "v"
test_case "npm 版本" "npm --version" ""
test_case "Python 版本" "python3 --version" "Python"
test_case "OpenClaw CLI" "openclaw --version" "OpenClaw"

# 2. Sci-Orbit MCP 服务检查
echo ""
echo "=== 2. Sci-Orbit MCP 检查 ==="
test_case "Sci-Orbit 入口文件" "ls -la /app/ai4s-cli/packages/orchestrator/dist/index.js" ""

# 3. 科学计算包检查
echo ""
echo "=== 3. 科学计算包检查 ==="
test_case "NumPy" "python3 -c 'import numpy; print(numpy.__version__)'" ""
test_case "SciPy" "python3 -c 'import scipy; print(scipy.__version__)'" ""
test_case "ASE" "python3 -c 'import ase; print(ase.__version__)'" ""
test_case "RDKit" "python3 -c 'from rdkit import Chem; print(Chem.__version__)'" ""
test_case "PySCF" "python3 -c 'import pyscf; print(pyscf.__version__)'" ""

# 4. Gateway 健康检查
echo ""
echo "=== 4. Gateway 健康检查 ==="
if curl -s -o /dev/null -w "%{http_code}" http://localhost:18789/health 2>/dev/null | grep -q "200"; then
    echo "[测试] Gateway 健康检查 ... 通过"
    ((PASS++))
else
    echo "[测试] Gateway 健康检查 ... 失败 (服务未响应)"
    ((FAIL++))
fi

# 5. Sci-Orbit 工具调用测试
echo ""
echo "=== 5. Sci-Orbit MCP 工具测试 ==="

# 通过 Gateway API 测试 MCP 工具
GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-test-token}"

# 测试 env_snapshot
if curl -s -X POST "http://localhost:18789/api/mcp/call" \
    -H "Authorization: Bearer $GATEWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"tool": "env_snapshot", "args": {}}' 2>/dev/null | grep -q "status"; then
    echo "[测试] env_snapshot 工具调用 ... 通过"
    ((PASS++))
else
    echo "[测试] env_snapshot 工具调用 ... 失败"
    ((FAIL++))
fi

# 测试 data_supported_formats
if curl -s -X POST "http://localhost:18789/api/mcp/call" \
    -H "Authorization: Bearer $GATEWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"tool": "data_supported_formats", "args": {}}' 2>/dev/null | grep -q "POSCAR\|CIF"; then
    echo "[测试] data_supported_formats 工具调用 ... 通过"
    ((PASS++))
else
    echo "[测试] data_supported_formats 工具调用 ... 失败"
    ((FAIL++))
fi

# 测试 param_list_templates
if curl -s -X POST "http://localhost:18789/api/mcp/call" \
    -H "Authorization: Bearer $GATEWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"tool": "param_list_templates", "args": {}}' 2>/dev/null | grep -q "vasp\|lammps"; then
    echo "[测试] param_list_templates 工具调用 ... 通过"
    ((PASS++))
else
    echo "[测试] param_list_templates 工具调用 ... 失败"
    ((FAIL++))
fi

# 输出结果
echo ""
echo "============================================"
echo "  测试结果: $PASS 通过, $FAIL 失败"
echo "============================================"

if [ $FAIL -eq 0 ]; then
    echo "所有测试通过！"
    exit 0
else
    echo "部分测试失败，请检查日志"
    exit 1
fi
