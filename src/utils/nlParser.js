/**
 * 自然语言图表生成器
 * 将用户输入的自然语言解析为图表配置指令
 */

const CHART_TYPE_MAP = {
  '柱状图': 'bar', '柱形图': 'bar', '条形图': 'bar', '柱': 'bar',
  '折线图': 'line', '趋势图': 'line', '线': 'line',
  '面积图': 'area', '区域图': 'area',
  '饼图': 'pie', '饼': 'pie',
  '环形图': 'donut', '甜甜圈': 'donut',
  '散点图': 'scatter', '散点': 'scatter',
  '雷达图': 'radar', '雷达': 'radar',
  '漏斗图': 'funnel', '漏斗': 'funnel',
  '热力图': 'heatmap', '热力': 'heatmap',
  '地图': 'projectionMap', '中国地图': 'projectionMap',
}

const AGG_MAP = {
  '求和': 'sum', '总和': 'sum', '合计': 'sum', '累计': 'sum',
  '平均': 'avg', '均值': 'avg', '平均值': 'avg',
  '计数': 'count', '个数': 'count', '数量': 'count',
  '最大': 'max', '最大值': 'max', '最高': 'max',
  '最小': 'min', '最小值': 'min', '最低': 'min',
}

const COLOR_MAP = {
  '红': '#dc2626', '红色': '#dc2626',
  '蓝': '#4f46e5', '蓝色': '#4f46e5',
  '绿': '#059669', '绿色': '#059669',
  '橙': '#d97706', '橙色': '#d97706', '暖色': '#d97706',
  '紫': '#7c3aed', '紫色': '#7c3aed',
  '粉': '#db2777', '粉色': '#db2777',
  '青': '#0891b2', '青色': '#0891b2',
  '黄': '#ca8a04', '黄色': '#ca8a04',
  '黑': '#1e293b', '黑色': '#1e293b',
}

const STYLE_MAP = {
  '堆叠': 'stack',
  '平滑': 'smooth',
  '曲线': 'smooth',
  '显示数值': 'showDataLabels',
  '显示标签': 'showDataLabels',
  '隐藏图例': 'hideLegend',
  '显示图例': 'showLegend',
}

/**
 * 解析自然语言指令
 * @param {string} text - 用户输入
 * @param {Object} context - 当前数据上下文 { headers, types, numericColumns, stringColumns }
 * @returns {Object|null} - 解析结果 { chartType, xColumn, yColumns, aggFunction, themeColor, ... } 或 null
 */
export function parseNaturalLanguage(text, context) {
  if (!text || !text.trim()) return null
  const input = text.trim()
  const lower = input.toLowerCase()
  const result = {}

  const { headers, types, numericColumns, stringColumns } = context
  if (!headers || !headers.length) return null

  // 1. 识别图表类型
  for (const [keyword, type] of Object.entries(CHART_TYPE_MAP)) {
    if (input.includes(keyword)) {
      result.chartType = type
      break
    }
  }

  // 2. 识别指标列（数值列）
  const matchedMetrics = []
  for (const col of numericColumns) {
    if (input.includes(col)) {
      matchedMetrics.push(col)
    }
  }
  if (matchedMetrics.length > 0) {
    result.yColumns = matchedMetrics
  }

  // 3. 识别维度列（字符串/类别列）
  const matchedDims = []
  for (const col of stringColumns) {
    if (input.includes(col)) {
      matchedDims.push(col)
    }
  }
  if (matchedDims.length > 0) {
    result.xColumn = matchedDims[0]
  }

  // 4. 识别聚合方式
  for (const [keyword, agg] of Object.entries(AGG_MAP)) {
    if (input.includes(keyword)) {
      result.aggFunction = agg
      result.useAggregation = true
      break
    }
  }

  // 5. 识别颜色
  for (const [keyword, color] of Object.entries(COLOR_MAP)) {
    if (input.includes(keyword)) {
      result.themeColor = color
      break
    }
  }

  // 6. 识别样式开关
  for (const [keyword, styleKey] of Object.entries(STYLE_MAP)) {
    if (input.includes(keyword)) {
      result[styleKey] = true
    }
  }

  // 7. 按/按...分组/汇总 的识别
  const groupMatch = input.match(/按[\s]*(.+?)[\s]*分组/) ||
                     input.match(/按[\s]*(.+?)[\s]*汇总/) ||
                     input.match(/按[\s]*(.+?)[\s]*聚合/) ||
                     input.match(/以[\s]*(.+?)[\s]*为维度/)
  if (groupMatch) {
    const dim = groupMatch[1].trim()
    if (headers.includes(dim)) {
      result.groupBy = dim
      result.useAggregation = true
    }
  }

  // 8. 标题识别
  const titleMatch = input.match(/标题[叫是为]?[\s]*["']?(.+?)["']?[\s]*$/) ||
                     input.match(/叫[\s]*["']?(.+?)["']?[\s]*$/)
  if (titleMatch) {
    result.title = titleMatch[1].trim()
  }

  // 9. 如果没匹配到任何有效配置，返回 null
  const hasAnyConfig = Object.keys(result).length > 0
  if (!hasAnyConfig) return null

  // 10. 如果没有指定维度/指标，用智能默认
  if (!result.yColumns && numericColumns.length > 0) {
    result.yColumns = [numericColumns[0]]
  }
  if (!result.xColumn && stringColumns.length > 0) {
    result.xColumn = stringColumns[0]
  }
  if (!result.chartType) {
    result.chartType = 'bar'
  }

  return result
}

/**
 * 生成示例命令列表
 */
export function getExampleCommands() {
  return [
    '把销售额按月份做成折线图，用蓝色',
    '柱状图显示各区域销量，按区域分组求和',
    '饼图展示品类占比，标题叫销售分布',
    '散点图看广告费和销售额的关系',
    '面积图展示趋势，要平滑曲线',
    '雷达图对比各渠道指标',
  ]
}
