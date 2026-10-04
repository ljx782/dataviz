/**
 * AI 数据故事讲述者
 * 基于规则自动分析数据，生成中文洞察故事
 */

function fmt(n) {
  if (n == null) return '-'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2)
}

function pct(n) {
  return (n * 100).toFixed(1) + '%'
}

/**
 * 生成数据洞察故事
 * @param {Object} params
 * @param {string[]} params.headers
 * @param {Array[]} params.rows
 * @param {Object} params.types
 * @param {string} params.groupBy - 分组维度
 * @param {string[]} params.metrics - 指标列
 * @param {string} params.agg - 聚合方式
 * @param {string} params.chartType - 当前图表类型
 */
export function generateStory({ headers, rows, types, groupBy, metrics, agg, chartType }) {
  if (!rows.length || !metrics.length) return null

  const stories = []
  const metricIdxs = metrics.map(m => headers.indexOf(m)).filter(i => i !== -1)
  const groupIdx = groupBy ? headers.indexOf(groupBy) : -1

  for (const mIdx of metricIdxs) {
    const metricName = headers[mIdx]
    const vals = rows.map(r => Number(r[mIdx])).filter(v => !isNaN(v))
    if (vals.length === 0) continue

    const sum = vals.reduce((a, b) => a + b, 0)
    const avg = sum / vals.length
    const max = Math.max(...vals)
    const min = Math.min(...vals)
    const maxRow = rows.find(r => Number(r[mIdx]) === max)
    const minRow = rows.find(r => Number(r[mIdx]) === min)
    const maxDim = maxRow && groupIdx >= 0 ? maxRow[groupIdx] : null
    const minDim = minRow && groupIdx >= 0 ? minRow[groupIdx] : null

    // 1. 总体概况
    stories.push({
      type: 'overview',
      priority: 100,
      text: `在「${metricName}」指标上，${groupBy ? `按「${groupBy}」分析` : '整体'}共有 ${vals.length} 个数据点，${agg === 'sum' ? '累计' : agg === 'avg' ? '平均' : ''}达到 ${fmt(sum)}，平均值约为 ${fmt(avg)}。`
    })

    // 2. 极值发现
    if (maxDim && minDim) {
      const diffRatio = max > 0 ? (max - min) / max : 0
      if (diffRatio > 0.5) {
        stories.push({
          type: 'extreme',
          priority: 90,
          text: `「${maxDim}」以 ${fmt(max)} 遥遥领先，是「${minDim}」${fmt(min)} 的 ${(max / (min || 1)).toFixed(1)} 倍，差距相当显著。`
        })
      } else {
        stories.push({
          type: 'extreme',
          priority: 80,
          text: `「${maxDim}」表现最佳，达到 ${fmt(max)}；而「${minDim}」相对较低，为 ${fmt(min)}。`
        })
      }
    }

    // 3. 集中度分析（头部占比）
    const sorted = [...vals].sort((a, b) => b - a)
    const top3Sum = sorted.slice(0, 3).reduce((a, b) => a + b, 0)
    const topRatio = sum > 0 ? top3Sum / sum : 0
    if (topRatio > 0.6 && vals.length >= 5) {
      const top3Rows = rows
        .map(r => ({ dim: groupIdx >= 0 ? r[groupIdx] : '-', val: Number(r[mIdx]) }))
        .filter(r => !isNaN(r.val))
        .sort((a, b) => b.val - a.val)
        .slice(0, 3)
      stories.push({
        type: 'concentration',
        priority: 85,
        text: `前 3 名（${top3Rows.map(r => r.dim).join('、')}）合计贡献了 ${pct(topRatio)} 的${agg === 'sum' ? '总量' : '数值'}，集中度较高。`
      })
    }

    // 4. 趋势判断（如果数据有序）
    if (vals.length >= 4) {
      const firstHalf = vals.slice(0, Math.floor(vals.length / 2))
      const secondHalf = vals.slice(Math.floor(vals.length / 2))
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      if (firstAvg > 0) {
        const trendRatio = (secondAvg - firstAvg) / firstAvg
        if (Math.abs(trendRatio) > 0.15) {
          stories.push({
            type: 'trend',
            priority: 88,
            text: trendRatio > 0
              ? `后半段数据相比前半段增长了 ${pct(Math.abs(trendRatio))}，整体呈上升趋势。`
              : `后半段数据相比前半段下降了 ${pct(Math.abs(trendRatio))}，需要关注下滑原因。`
          })
        }
      }
    }

    // 5. 异常值提示
    const mean = avg
    const std = Math.sqrt(vals.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / vals.length)
    const outliers = rows.filter(r => {
      const v = Number(r[mIdx])
      if (isNaN(v)) return false
      return Math.abs(v - mean) > 2.5 * std
    })
    if (outliers.length > 0 && outliers.length <= Math.ceil(vals.length * 0.2)) {
      const outDims = outliers.slice(0, 3).map(r => groupIdx >= 0 ? r[groupIdx] : '-')
      stories.push({
        type: 'anomaly',
        priority: 70,
        text: `检测到 ${outliers.length} 个异常值，其中「${outDims.join('、')}」的数据偏离平均水平较远，建议单独排查。`
      })
    }
  }

  // 6. 多指标对比
  if (metricIdxs.length >= 2) {
    const corrStories = []
    for (let i = 0; i < metricIdxs.length; i++) {
      for (let j = i + 1; j < metricIdxs.length; j++) {
        const x = rows.map(r => Number(r[metricIdxs[i]])).filter(v => !isNaN(v))
        const y = rows.map(r => Number(r[metricIdxs[j]])).filter(v => !isNaN(v))
        if (x.length !== y.length || x.length < 3) continue
        const mx = x.reduce((a, b) => a + b, 0) / x.length
        const my = y.reduce((a, b) => a + b, 0) / y.length
        const num = x.reduce((s, xi, idx) => s + (xi - mx) * (y[idx] - my), 0)
        const den = Math.sqrt(x.reduce((s, xi) => s + Math.pow(xi - mx, 2), 0)) *
                    Math.sqrt(y.reduce((s, yi) => s + Math.pow(yi - my, 2), 0))
        const r = den > 0 ? num / den : 0
        if (Math.abs(r) > 0.7) {
          corrStories.push({
            type: 'correlation',
            priority: 92,
            text: `「${headers[metricIdxs[i]]}」与「${headers[metricIdxs[j]]}」呈现强${r > 0 ? '正' : '负'}相关（r=${r.toFixed(2)}），${r > 0 ? '两者同涨同跌' : '一方上升时另一方倾向于下降'}。`
          })
        }
      }
    }
    stories.push(...corrStories)
  }

  // 按优先级排序，取前 5 条
  stories.sort((a, b) => b.priority - a.priority)
  return stories.slice(0, 5)
}

/**
 * 生成一句话摘要
 */
export function generateSummary({ headers, rows, types, groupBy, metrics, agg }) {
  if (!rows.length || !metrics.length) return '暂无数据可分析'
  const mIdx = headers.indexOf(metrics[0])
  const vals = rows.map(r => Number(r[mIdx])).filter(v => !isNaN(v))
  if (!vals.length) return '数据格式异常，无法生成摘要'

  const sum = vals.reduce((a, b) => a + b, 0)
  const max = Math.max(...vals)
  const groupIdx = groupBy ? headers.indexOf(groupBy) : -1
  const maxRow = rows.find(r => Number(r[mIdx]) === max)
  const maxDim = maxRow && groupIdx >= 0 ? maxRow[groupIdx] : null

  let summary = `共分析 ${rows.length} 条数据`
  if (groupBy) summary += `，按「${groupBy}」分组`
  summary += `。「${metrics[0]}」${agg === 'sum' ? '合计' : agg === 'avg' ? '平均' : ''} ${fmt(sum)}`
  if (maxDim) summary += `，「${maxDim}」以 ${fmt(max)} 领跑`
  summary += '。'
  return summary
}
