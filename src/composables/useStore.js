import { reactive, computed } from 'vue'
import { getNumericColumns, getStringColumns } from '../utils/dataParser.js'
import { recommendDimensions, aggregate, generateKPIs } from '../utils/aggregator.js'

export const store = reactive({
  // Raw data
  headers: [],
  rows: [],
  types: {},

  // UI state
  activeTab: 'import',

  // Chart config
  chartType: 'bar',
  xColumn: '',
  yColumns: [],
  title: '数据可视化',
  subtitle: '',
  themeColor: '#6366f1',
  showLegend: true,
  showTooltip: true,
  showDataLabels: false,
  stack: false,
  area: false,
  smooth: false,
  sortByValue: true, // 默认开启按值排序

  // Aggregation
  useAggregation: false,
  groupBy: '',
  aggFunction: 'sum',
  recommendedDims: [],
  kpis: [],

  // Map drill-down
  mapProvince: '',

  // Sketch mode (手绘风格)
  sketchMode: false,

  // Time animation
  timeAnimating: false,
  timeCurrentIndex: 0,
  timeColumn: '',
})

export const numericColumns = computed(() => getNumericColumns(store.headers, store.rows, store.types))
export const stringColumns = computed(() => getStringColumns(store.headers, store.rows, store.types))

// 当前实际用于图表的数据（原始或聚合后，支持时间动画过滤）
export const chartData = computed(() => {
  let rows = store.rows
  // 时间动画过滤
  if (store.timeAnimating && store.timeCurrentIndex > 0 && store.timeCurrentIndex < rows.length) {
    rows = rows.slice(0, store.timeCurrentIndex)
  }
  if (store.useAggregation && store.groupBy) {
    const result = aggregate({
      headers: store.headers,
      rows,
      types: store.types,
      groupBy: store.groupBy,
      metrics: store.yColumns,
      agg: store.aggFunction,
    })
    if (result) {
      return { headers: result.headers, rows: result.rows, types: result.types }
    }
  }
  return { headers: store.headers, rows, types: store.types }
})

// 独立的 KPI computed（无副作用）
export const currentKPIs = computed(() => {
  const { headers, rows } = chartData.value
  if (!store.useAggregation || !store.groupBy) return []
  return generateKPIs({
    headers,
    rows,
    types: store.types,
    groupBy: store.groupBy,
    metrics: store.yColumns,
    agg: store.aggFunction,
  })
})

export function setData({ headers, rows, types }) {
  store.headers = headers
  store.rows = rows
  store.types = types

  const nums = numericColumns.value
  const strs = stringColumns.value

  // 自动推荐维度
  const recs = recommendDimensions(headers, rows, types)
  store.recommendedDims = recs

  // 默认不自动聚合，让用户自己选择；只保留推荐维度供手动开启
  store.useAggregation = false
  store.groupBy = recs.length > 0 ? recs[0] : (strs[0] || headers[0] || '')

  // 默认 X 轴优先使用推荐的好维度（如商品类别），而不是第一个字符串列（如商品ID）
  const xDefault = recs.length > 0 ? recs[0] : (strs[0] || headers[0] || '')

  if (['pie', 'donut', 'funnel'].includes(store.chartType)) {
    store.xColumn = xDefault
    store.yColumns = nums.length > 0 ? [nums[0]] : (headers.length > 1 ? [headers[1]] : [])
  } else if (store.chartType === 'scatter') {
    store.xColumn = nums[0] || headers[0] || ''
    store.yColumns = nums.length > 1 ? [nums[1]] : (headers.length > 1 ? [headers[1]] : [])
  } else if (store.chartType === 'heatmap') {
    store.xColumn = xDefault
    store.yColumns = nums.length > 0 ? [nums[0]] : (headers.length > 1 ? [headers[1]] : [])
  } else {
    store.xColumn = xDefault
    store.yColumns = nums.length > 0 ? [nums[0]] : (headers.length > 1 ? [headers[1]] : [])
  }

  store.title = '数据可视化分析'
  store.subtitle = `共 ${rows.length} 行数据${store.useAggregation ? ` · 按「${store.groupBy}」汇总` : ''}`
  store.activeTab = 'chart'
}

export function clearData() {
  store.headers = []
  store.rows = []
  store.types = {}
  store.xColumn = ''
  store.yColumns = []
  store.title = '数据可视化'
  store.subtitle = ''
  store.useAggregation = false
  store.groupBy = ''
  store.aggFunction = 'sum'
  store.recommendedDims = []
  store.kpis = []
  store.mapProvince = ''
  store.sketchMode = false
  store.timeAnimating = false
  store.timeCurrentIndex = 0
  store.timeColumn = ''
  store.activeTab = 'import'
}
