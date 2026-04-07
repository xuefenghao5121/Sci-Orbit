#!/bin/bash
# test-container.sh - 在 Docker 容器内运行测试
# 专注于容器环境和科学计算包检查

set -e

echo "============================================"
echo "  Sci-Orbit 容器测试"
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
test_case "Pandas" "python3 -c 'import pandas; print(pandas.__version__)'" ""
test_case "ASE" "python3 -c 'import ase; print(ase.__version__)'" ""
test_case "RDKit" "python3 -c 'from rdkit import Chem; print(Chem.__version__)'" ""
test_case "PySCF" "python3 -c 'import pyscf; print(pyscf.__version__)'" ""
test_case "OpenMM" "python3 -c 'import openmm; print(openmm.__version__)'" ""

# 4. 配置文件检查
echo ""
echo "=== 4. 配置文件检查 ==="
test_case "OpenClaw 配置文件" "ls -la /root/.openclaw/openclaw.json" ""
test_case "Feishu 配置" "cat /root/.openclaw/openclaw.json | grep feishu" "feishu"

# 5. Gateway 进程检查
echo ""
echo "=== 5. Gateway 进程检查 ==="
if ps aux | grep -v grep | grep gateway > /dev/null; then
    echo "[测试] Gateway 进程 ... 通过"
    ((PASS++))
else
    echo "[测试] Gateway 进程 ... 失败"
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
