# Sci-Orbit AI4S Benchmark

评测 Sci-Orbit 工具调用能力的基准测试。

## 运行

```bash
# 先构建项目
cd ../.. && npm run build

# 运行全部评测
cd tests/benchmark && npm install && npm test

# 运行单个用例
npm run test:case -- TC001

# 运行某类用例
npm run test:category -- env_snapshot
```

## 评测用例 (10 个)

| ID | 名称 | 类别 | 难度 | 考察点 |
|----|------|------|------|--------|
| TC001 | 基础环境采集 | env_snapshot | Easy | 关键字段完整性 |
| TC002 | GPU 检测 | env_snapshot | Medium | GPU 信息结构 |
| TC003 | 科学包检测 | env_snapshot | Easy | 包版本检测 |
| TC004 | 环境差异对比 | env_snapshot | Medium | 自对比无差异 |
| TC005 | VASP 金属参数推断 | param_complete | Medium | 隐式参数 ismear |
| TC006 | LAMMPS 参数补全 | param_complete | Easy | 默认参数填充 |
| TC007 | 参数约束检查 | param_complete | Medium | 矛盾参数检测 |
| TC008 | POSCAR 解析 | data_summarize | Easy | 晶体信息提取 |
| TC009 | CIF 解析 | data_summarize | Easy | 空间群提取 |
| TC010 | 未知格式处理 | data_summarize | Easy | 优雅降级 |

## 评分标准

- 每个用例 100 分满分（各项加权）
- **60 分及格**
- **80 分优秀**
- 总体通过率要求 ≥ 80%

## 测试用例说明

### 环境快照能力 (4 cases)

#### TC001: 基础环境采集
- **目标**: 验证环境快照工具能正确采集系统信息
- **关键检查点**:
  - 必需字段: hostname, os, kernel, cpu, ram_total_gb, python.version, python.path
  - 字段非空验证
  - 数据类型验证

#### TC002: GPU 检测
- **目标**: 验证 GPU 信息采集的完整性
- **关键检查点**:
  - GPU 存在时返回完整信息 (id, model, memory_total_mb)
  - GPU 不存在时优雅降级（返回空数组）
  - 字段类型正确

#### TC003: 科学包检测
- **目标**: 验证科学计算包检测功能
- **关键检查点**:
  - packages 字段为非空对象
  - 已安装包的版本号格式正确
  - 未安装的包不出现在结果中

#### TC004: 环境差异对比
- **目标**: 验证环境对比功能
- **关键检查点**:
  - 相同快照对比返回 has_diff=false
  - diffs 数组为空
  - risk_level 为 low

### 参数智能补全 (3 cases)

#### TC005: VASP 金属系统参数推断
- **目标**: 验证参数推断功能（金属系统）
- **关键检查点**:
  - 推断出 ismear=1（金属 smearing）
  - 推断出 sigma=0.2
  - 推断出 prec=accurate
  - 生成金属相关的警告

#### TC006: LAMMPS 参数补全
- **目标**: 验证默认参数补全
- **关键检查点**:
  - 补全 temperature=300
  - 补全 timestep=1.0
  - 补全 total_steps=100000
  - 补全 dump_interval=1000

#### TC007: 参数约束检查
- **目标**: 验证参数验证功能
- **关键检查点**:
  - 检测到 ismear/sigma 矛盾
  - 警告中包含 sigma 和 0.1 的相关信息

### 科学数据摘要 (3 cases)

#### TC008: POSCAR 解析
- **目标**: 验证 POSCAR 文件解析
- **关键检查点**:
  - format 为 POSCAR
  - 识别出 2 个原子
  - 摘要包含 'Si'
  - 识别出坐标类型 Direct

#### TC009: CIF 文件解析
- **目标**: 验证 CIF 文件解析
- **关键检查点**:
  - format 为 CIF
  - 提取出空间群 Fd-3m
  - 提取出晶格常数 5.43

#### TC010: 未知格式处理
- **目标**: 验证优雅降级
- **关键检查点**:
  - 不崩溃，返回有效响应
  - 提示格式信息（识别为 JSON 或提示不支持）

## 输出示例

```
🚀 Sci-Orbit Benchmark
   10 test case(s) to run

  Running TC001 基础环境采集... ✅ (245ms)
  Running TC002 GPU 检测（有 GPU 环境）... ✅ (312ms)
  ...

════════════════════════════════════════════════════════════════════
  Sci-Orbit AI4S 工具调用能力评测报告
  2026-04-01T11:32:45.678Z
════════════════════════════════════════════════════════════════════

  总体: 850/1000 分 | 通过率: 90% | 用例: 10

  分类汇总:
    env_snapshot: 340/400 (85%) - 4 cases
    param_complete: 280/300 (93%) - 3 cases
    data_summarize: 230/300 (77%) - 3 cases

  分用例详情:
  ✅ TC001 基础环境采集 - 90/100 (90%) [245ms]
       ✓ [60pts] 所有 required_fields 都存在于返回结果中
       ✓ [30pts] must_not_be_empty 字段不为空字符串或 'unknown'
       ✓ [10pts] type_checks 类型正确
  ...

════════════════════════════════════════════════════════════════════

  报告已保存: tests/benchmark/report-1711971165678.json
```

## 注意事项

1. **构建依赖**: 运行评测前需要先构建项目 (`npm run build`)
2. **服务可用性**: 如果某些服务未构建，相关测试会跳过但不会失败
3. **环境依赖**: GPU 测试需要实际 GPU 环境，无 GPU 时测试通过（优雅降级）
4. **数据文件**: 测试使用 `packages/orchestrator/test-fixtures/` 目录下的测试文件

## 扩展指南

添加新测试用例：

1. 在 `test_cases.yaml` 中添加新用例定义
2. 在 `runner.ts` 中实现对应的测试逻辑
3. 运行 `npm test` 验证

---

**维护者**: AI4S Team  
**最后更新**: 2026-04-01
