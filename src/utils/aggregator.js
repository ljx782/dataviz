/**
 * 数据聚合工具 - 将明细数据按维度汇总，生成适合可视化的数据
 */

export const AGG_FUNCTIONS = [
  { key: 'sum', label: '求和' },
  { key: 'avg', label: '平均' },
  { key: 'count', label: '计数' },
  { key: 'max', label: '最大' },
  { key: 'min', label: '最小' },
]

/**
 * 检测一列是否适合作为分组维度
 * - 字符串或日期类型
 * - 唯一值数量适中（2~50），避免 ID 列被误选
 */
export function isGoodDimension(headers, rows, types, colIndex) {
  const col = rows.map(r => r[colIndex])
  const nonEmpty = col.filter(v => v !== '' && v != null)
  if (nonEmpty.length === 0) return false
  const uniques = new Set(nonEmpty.map(String)).size
  // 适合作为维度的：唯一值在 2~50 之间，或者日期类型
  const type = types[headers[colIndex]]
  if (type === 'date') return uniques >= 2 && uniques <= 100
  return uniques >= 2 && uniques <= 50
}

/**
 * 自动推荐最佳分组维度
 */
export function recommendDimensions(headers, rows, types) {
  const candidates = headers
    .map((h, i) => ({ name: h, index: i, type: types[h] }))
    .filter(c => isGoodDimension(headers, rows, types, c.index))
    .sort((a, b) => {
      // 优先推荐类别/地区/渠道这类明显维度名称
      const score = (name) => {
        const n = name.toLowerCase()
        if (n.includes('类别') || n.includes('类型') || n.includes('分类')) return 100
        if (n.includes('地区') || n.includes('区域') || n.includes('城市')) return 90
        if (n.includes('渠道') || n.includes('平台')) return 80
        if (n.includes('品牌')) return 70
        if (n.includes('日期') || n.includes('时间') || n.includes('月份')) return 60
        if (n.includes('客户') || n.includes('用户')) return 50
        return 0
      }
      return score(b.name) - score(a.name)
    })
  return candidates.map(c => c.name)
}

/**
 * 按维度分组聚合
 * @param {Object} params
 * @param {string[]} params.headers
 * @param {Array[]} params.rows
 * @param {Object} params.types
 * @param {string} params.groupBy - 分组维度列名
 * @param {string[]} params.metrics - 要聚合的数值列名
 * @param {string} params.agg - 聚合方式 sum|avg|count|max|min
 */
export function aggregate({ headers, rows, types, groupBy, metrics, agg = 'sum' }) {
  const groupIdx = headers.indexOf(groupBy)
  const metricIdxs = metrics.map(m => headers.indexOf(m)).filter(i => i !== -1)
  if (groupIdx === -1 || metricIdxs.length === 0) return null

  const map = new Map()
  for (const row of rows) {
    const key = row[groupIdx] == null ? '' : String(row[groupIdx])
    if (!map.has(key)) {
      map.set(key, { _count: 0 })
      metricIdxs.forEach(i => { map.get(key)[i] = [] })
    }
    const g = map.get(key)
    g._count++
    metricIdxs.forEach(i => {
      const v = Number(row[i])
      g[i].push(!isNaN(v) ? v : 0)
    })
  }

  const aggRows = []
  for (const [key, g] of map) {
    const newRow = new Array(headers.length).fill('')
    newRow[groupIdx] = key
    metricIdxs.forEach(i => {
      const vals = g[i]
      let val = 0
      switch (agg) {
        case 'sum':
          val = vals.reduce((a, b) => a + b, 0)
          break
        case 'avg':
          val = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
          break
        case 'count':
          val = g._count
          break
        case 'max':
          val = vals.length ? Math.max(...vals) : 0
          break
        case 'min':
          val = vals.length ? Math.min(...vals) : 0
          break
      }
      newRow[i] = Number.isFinite(val) ? Math.round(val * 100) / 100 : 0
    })
    aggRows.push(newRow)
  }

  // 按第一个指标降序排列
  const firstMetricIdx = metricIdxs[0]
  aggRows.sort((a, b) => (b[firstMetricIdx] || 0) - (a[firstMetricIdx] || 0))

  return {
    headers,
    rows: aggRows,
    types,
    groupBy,
    metrics,
    agg,
    rowCount: aggRows.length,
  }
}

/**
 * 生成 KPI 洞察数据
 */
export function generateKPIs({ headers, rows, types, groupBy, metrics, agg }) {
  const metricIdxs = metrics.map(m => headers.indexOf(m)).filter(i => i !== -1)
  const kpis = []

  metricIdxs.forEach(idx => {
    const colName = headers[idx]
    const vals = rows.map(r => Number(r[idx])).filter(v => !isNaN(v))
    if (vals.length === 0) return

    const sum = vals.reduce((a, b) => a + b, 0)
    const avg = sum / vals.length
    const max = Math.max(...vals)
    const min = Math.min(...vals)

    // 找出最大/最小对应的维度值
    const maxRow = rows.find(r => Number(r[idx]) === max)
    const minRow = rows.find(r => Number(r[idx]) === min)
    const maxDim = maxRow ? maxRow[headers.indexOf(groupBy)] : '-'
    const minDim = minRow ? minRow[headers.indexOf(groupBy)] : '-'

    kpis.push({
      metric: colName,
      total: sum,
      avg,
      max,
      min,
      maxDim: String(maxDim),
      minDim: String(minDim),
      count: vals.length,
    })
  })

  return kpis
}

function fmt(n) {
  if (n == null) return '-'
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿'
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(2) + '万'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2)
}

export { fmt }
