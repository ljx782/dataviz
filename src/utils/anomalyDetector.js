/**
 * 数据异常侦探模式
 * 自动扫描数据中的异常值、逻辑矛盾和规律缺失
 */

function fmt(n) {
  if (n == null) return '-'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2)
}

export const ANOMALY_TYPES = [
  { key: 'outlier', label: '离群值', icon: '⚡', color: '#dc2626' },
  { key: 'logic', label: '逻辑矛盾', icon: '⚠', color: '#d97706' },
  { key: 'missing', label: '规律缺失', icon: '🔍', color: '#7c3aed' },
  { key: 'correlation', label: '强相关暗示', icon: '🔗', color: '#059669' },
  { key: 'duplicate', label: '重复异常', icon: '📋', color: '#0891b2' },
]

/**
 * 扫描数据异常
 */
export function detectAnomalies({ headers, rows, types }) {
  const anomalies = []

  // 1. 数值列离群值检测（Z-Score > 2.5）
  headers.forEach((h, i) => {
    if (types[h] !== 'number') return
    const vals = rows.map(r => Number(r[i])).filter(v => !isNaN(v))
    if (vals.length < 5) return

    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    const std = Math.sqrt(vals.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / vals.length)
    if (std === 0) return

    rows.forEach((r, idx) => {
      const v = Number(r[i])
      if (isNaN(v)) return
      const zscore = Math.abs(v - mean) / std
      if (zscore > 2.5) {
        anomalies.push({
          type: 'outlier',
          severity: zscore > 4 ? 'high' : 'medium',
          column: h,
          rowIndex: idx,
          value: v,
          message: `「${h}」第 ${idx + 1} 行数值 ${fmt(v)} 偏离平均值 ${fmt(mean)} 达 ${zscore.toFixed(1)} 个标准差`,
          detail: `该值${v > mean ? '远高于' : '远低于'}同类数据的正常波动范围，可能为录入错误或特殊事件导致。`
        })
      }
    })
  })

  // 2. 逻辑矛盾检测
  headers.forEach((h, i) => {
    if (types[h] !== 'number') return
    // 利润率 > 100%
    if (h.includes('利润') || h.includes('毛利') || h.includes('净利') || h.toLowerCase().includes('margin')) {
      rows.forEach((r, idx) => {
        const v = Number(r[i])
        if (!isNaN(v) && v > 100) {
          anomalies.push({
            type: 'logic',
            severity: 'high',
            column: h,
            rowIndex: idx,
            value: v,
            message: `「${h}」第 ${idx + 1} 行为 ${fmt(v)}%，超过 100% 可能存在逻辑错误`,
            detail: '利润率通常不应超过 100%，请检查是否为百分比小数格式（如 0.25 而非 25）。'
          })
        }
      })
    }
    // 负值检测（营收、销量等不应为负）
    const positiveOnlyKeywords = ['销售额', '销量', '营收', '收入', '数量', '金额', '人数', '订单']
    const shouldBePositive = positiveOnlyKeywords.some(k => h.includes(k))
    if (shouldBePositive) {
      rows.forEach((r, idx) => {
        const v = Number(r[i])
        if (!isNaN(v) && v < 0) {
          anomalies.push({
            type: 'logic',
            severity: 'medium',
            column: h,
            rowIndex: idx,
            value: v,
            message: `「${h}」第 ${idx + 1} 行为负数 ${fmt(v)}，与该字段含义矛盾`,
            detail: `${h}通常应为非负数值，负数可能表示退货或退款，需确认数据含义。`
          })
        }
      })
    }
  })

  // 3. 规律缺失检测
  headers.forEach((h, i) => {
    if (types[h] !== 'number') return
    const vals = rows.map(r => Number(r[i])).filter(v => !isNaN(v))
    if (vals.length < 3) return

    // 连续零值
    let zeroStreak = 0
    let maxZeroStreak = 0
    let zeroStart = -1
    rows.forEach((r, idx) => {
      const v = Number(r[i])
      if (!isNaN(v) && v === 0) {
        if (zeroStreak === 0) zeroStart = idx
        zeroStreak++
        maxZeroStreak = Math.max(maxZeroStreak, zeroStreak)
      } else {
        zeroStreak = 0
      }
    })
    if (maxZeroStreak >= 3) {
      anomalies.push({
        type: 'missing',
        severity: 'medium',
        column: h,
        message: `「${h}」存在连续 ${maxZeroStreak} 个零值记录`,
        detail: '连续多个零值可能意味着数据缺失、业务停滞或采集中断，建议核实数据来源。'
      })
    }

    // 全部相同值
    const uniqueVals = new Set(vals)
    if (uniqueVals.size === 1 && vals.length > 5) {
      anomalies.push({
        type: 'missing',
        severity: 'low',
        column: h,
        message: `「${h}」所有 ${vals.length} 条记录均为 ${fmt(vals[0])}，缺乏变化`,
        detail: '该字段数据完全没有波动，可能是常量填充或传感器故障导致。'
      })
    }
  })

  // 4. 强相关暗示
  const numCols = headers.filter(h => types[h] === 'number')
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const ci = headers.indexOf(numCols[i])
      const cj = headers.indexOf(numCols[j])
      const x = rows.map(r => Number(r[ci])).filter(v => !isNaN(v))
      const y = rows.map(r => Number(r[cj])).filter(v => !isNaN(v))
      if (x.length !== y.length || x.length < 5) continue
      const mx = x.reduce((a, b) => a + b, 0) / x.length
      const my = y.reduce((a, b) => a + b, 0) / y.length
      const num = x.reduce((s, xi, idx) => s + (xi - mx) * (y[idx] - my), 0)
      const den = Math.sqrt(x.reduce((s, xi) => s + Math.pow(xi - mx, 2), 0)) *
                  Math.sqrt(y.reduce((s, yi) => s + Math.pow(yi - my, 2), 0))
      const r = den > 0 ? num / den : 0
      if (Math.abs(r) > 0.85) {
        anomalies.push({
          type: 'correlation',
          severity: 'low',
          column: `${numCols[i]} / ${numCols[j]}`,
          message: `「${numCols[i]}」与「${numCols[j]}」高度${r > 0 ? '正' : '负'}相关（r=${r.toFixed(2)}）`,
          detail: r > 0
            ? '两列数据同向变化趋势非常明显，可能存在因果关联或共线性，建模时需注意。'
            : '两列数据反向变化趋势明显，一方增长时另一方倾向于下降，值得深入分析原因。'
        })
      }
    }
  }

  // 5. 重复行检测
  const seen = new Map()
  rows.forEach((r, idx) => {
    const key = JSON.stringify(r)
    if (seen.has(key)) {
      seen.get(key).push(idx)
    } else {
      seen.set(key, [idx])
    }
  })
  for (const [key, indices] of seen) {
    if (indices.length > 1) {
      anomalies.push({
        type: 'duplicate',
        severity: 'medium',
        message: `发现 ${indices.length} 条完全重复的记录（第 ${indices.map(i => i + 1).join('、')} 行）`,
        detail: '重复数据会导致统计结果失真，建议去重后重新分析。'
      })
    }
  }

  // 按严重程度和类型排序
  const severityOrder = { high: 3, medium: 2, low: 1 }
  anomalies.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])

  return anomalies
}

/**
 * 获取异常统计概览
 */
export function getAnomalySummary(anomalies) {
  const counts = {}
  ANOMALY_TYPES.forEach(t => { counts[t.key] = 0 })
  anomalies.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1 })

  const highCount = anomalies.filter(a => a.severity === 'high').length
  const total = anomalies.length

  return { counts, highCount, total }
}
