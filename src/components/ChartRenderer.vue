<script setup>
import { computed, ref, watch, onMounted, reactive, nextTick } from 'vue'
import { store, chartData } from '../composables/useStore.js'
import { Download, RefreshCcw, BarChart3, Pencil } from '@lucide/vue'
import * as echarts from 'echarts/core'
import rough from 'roughjs'

const chartRef = ref(null)
const chartKey = ref(0)
const cardRef = ref(null)
const sketchSvgRef = ref(null)
const currentMapKey = ref('china')
const provinceMapCache = reactive(new Set())
const provinceMapOriginalNames = reactive({})
const mapLoadError = ref('')
let mapLoadingPromise = null

const provinceAdcodeMap = {
  '北京市': 110000, '天津市': 120000, '上海市': 310000, '重庆市': 500000,
  '河北省': 130000, '山西省': 140000, '辽宁省': 210000, '吉林省': 220000,
  '黑龙江省': 230000, '江苏省': 320000, '浙江省': 330000, '安徽省': 340000,
  '福建省': 350000, '江西省': 360000, '山东省': 370000, '河南省': 410000,
  '湖北省': 420000, '湖南省': 430000, '广东省': 440000, '海南省': 460000,
  '四川省': 510000, '贵州省': 520000, '云南省': 530000, '陕西省': 610000,
  '甘肃省': 620000, '青海省': 630000, '台湾省': 710000,
  '内蒙古自治区': 150000, '广西壮族自治区': 450000, '西藏自治区': 540000,
  '宁夏回族自治区': 640000, '新疆维吾尔自治区': 650000,
  '香港特别行政区': 810000, '澳门特别行政区': 820000,
}

const provincePinyinMap = {
  '北京市': 'beijing', '天津市': 'tianjin', '上海市': 'shanghai', '重庆市': 'chongqing',
  '河北省': 'hebei', '山西省': 'shanxi', '辽宁省': 'liaoning', '吉林省': 'jilin',
  '黑龙江省': 'heilongjiang', '江苏省': 'jiangsu', '浙江省': 'zhejiang', '安徽省': 'anhui',
  '福建省': 'fujian', '江西省': 'jiangxi', '山东省': 'shandong', '河南省': 'henan',
  '湖北省': 'hubei', '湖南省': 'hunan', '广东省': 'guangdong', '海南省': 'hainan',
  '四川省': 'sichuan', '贵州省': 'guizhou', '云南省': 'yunnan', '陕西省': 'shaanxi',
  '甘肃省': 'gansu', '青海省': 'qinghai', '台湾省': 'taiwan',
  '内蒙古自治区': 'neimenggu', '广西壮族自治区': 'guangxi', '西藏自治区': 'xizang',
  '宁夏回族自治区': 'ningxia', '新疆维吾尔自治区': 'xinjiang',
}

// 简写中文 -> 全称中文，用于将 GeoJSON 的 properties.name 映射到数据中的省名
const shortNameToFullName = {
  '北京': '北京市', '天津': '天津市', '上海': '上海市', '重庆': '重庆市',
  '河北': '河北省', '山西': '山西省', '辽宁': '辽宁省', '吉林': '吉林省',
  '黑龙江': '黑龙江省', '江苏': '江苏省', '浙江': '浙江省', '安徽': '安徽省',
  '福建': '福建省', '江西': '江西省', '山东': '山东省', '河南': '河南省',
  '湖北': '湖北省', '湖南': '湖南省', '广东': '广东省', '海南': '海南省',
  '四川': '四川省', '贵州': '贵州省', '云南': '云南省', '陕西': '陕西省',
  '甘肃': '甘肃省', '青海': '青海省', '台湾': '台湾省',
  '内蒙古': '内蒙古自治区', '广西': '广西壮族自治区', '西藏': '西藏自治区',
  '宁夏': '宁夏回族自治区', '新疆': '新疆维吾尔自治区',
  '香港': '香港特别行政区', '澳门': '澳门特别行政区',
}

// 全称 -> 简写（数据名称 -> GeoJSON 名称）
const fullNameToShortName = Object.fromEntries(
  Object.entries(shortNameToFullName).map(([k, v]) => [v, k])
)

async function loadMap() {
  const province = store.mapProvince
  const mapName = province ? `province-${provinceAdcodeMap[province]}` : 'china'

  if (provinceMapCache.has(mapName)) {
    if (currentMapKey.value !== mapName) {
      currentMapKey.value = mapName
      chartKey.value++
    }
    mapLoadError.value = ''
    return
  }

  if (mapLoadingPromise) {
    await mapLoadingPromise
    return
  }

  mapLoadError.value = ''
  const loadTask = (async () => {
    const pinyin = provincePinyinMap[province]
    const sources = province
      ? [
          `https://geo.datav.aliyun.com/areas_v3/bound/${provinceAdcodeMap[province]}_full.json`,
          pinyin ? `https://cdn.jsdelivr.net/npm/echarts/map/json/province/${pinyin}.json` : null,
        ].filter(Boolean)
      : [
          'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
          'https://cdn.jsdelivr.net/npm/echarts/map/json/china.json',
          'https://raw.githubusercontent.com/yezongyang/china-geojson/master/china.json',
          'https://gitee.com/yezongyang/china-geojson/raw/master/china.json',
        ]

    for (const url of sources) {
      try {
        const res = await fetch(url, { timeout: 10000 })
        if (!res.ok) continue
        const geoJson = await res.json()
        if (!geoJson || !geoJson.features) continue

        // 规范化 properties.name：把简写中文（如"北京"）映射为全称（如"北京市"），方便和用户数据匹配
        let normalized = false
        geoJson.features.forEach(f => {
          const n = f.properties?.name
          if (n && shortNameToFullName[n]) {
            f.properties.name = shortNameToFullName[n]
            normalized = true
          }
        })
        // 把规范化后的 GeoJSON 存到地图缓存项中，下游匹配时使用
        if (normalized) {
          provinceMapOriginalNames[mapName] = 'short'
          console.log(`[地图] ${url} 简写名称已标准化为全称`)
        } else {
          provinceMapOriginalNames[mapName] = 'full'
        }

        echarts.registerMap(mapName, geoJson)
        provinceMapCache.add(mapName)
        const currentProvince = store.mapProvince
        const currentMapName = currentProvince ? `province-${provinceAdcodeMap[currentProvince]}` : 'china'
        if (currentMapName === mapName) {
          currentMapKey.value = mapName
          chartKey.value++
        }
        mapLoadError.value = ''
        return
      } catch (e) {
        console.warn(`地图源 ${url} 加载失败:`, e.message)
      }
    }

    mapLoadError.value = '地图数据加载失败，请尝试其他图表类型'
    console.error('所有地图数据源均加载失败')
  })()

  mapLoadingPromise = loadTask
  await loadTask
  mapLoadingPromise = null
}

onMounted(() => {
  if (store.chartType === 'projectionMap') loadMap()
})

watch(() => store.chartType, (type) => {
  if (type === 'projectionMap') loadMap()
})

watch(() => store.mapProvince, () => {
  if (store.chartType === 'projectionMap') loadMap()
})

// Flourish-inspired modern palette - lower saturation, higher quality
const palettes = {
  default: [
    '#4f46e5','#059669','#d97706','#dc2626','#7c3aed',
    '#db2777','#0891b2','#65a30d','#ea580c','#0d9488'
  ],
  warm: [
    '#be185d','#c2410c','#b45309','#ca8a04','#65a30d',
    '#15803d','#0f766e','#0369a1','#4338ca','#7e22ce'
  ],
  cool: [
    '#1e40af','#0369a1','#0f766e','#15803d','#4338ca',
    '#7e22ce','#be185d','#9f1239','#1e3a5f','#134e4a'
  ],
  pastel: [
    '#818cf8','#34d399','#fbbf24','#f87171','#a78bfa',
    '#f472b6','#22d3ee','#a3e635','#fb923c','#2dd4bf'
  ],
  sketch: [
    '#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6'
  ]
}

function getColors(count, baseColor, sketch = false) {
  const palette = sketch ? palettes.sketch : palettes.default
  const colors = []
  const baseIdx = palette.indexOf(baseColor)
  for (let i = 0; i < count; i++) {
    if (i === 0 && !sketch) {
      colors.push(baseColor)
    } else {
      const idx = (baseIdx + i) % palette.length
      colors.push(palette[idx])
    }
  }
  return colors
}

// ---- Sketch Mode: Rough.js border ----
function drawSketchBorder() {
  if (!cardRef.value || !store.sketchMode) return
  clearSketchBorder()
  nextTick(() => {
    const el = cardRef.value
    const rect = el.getBoundingClientRect()
    const w = el.offsetWidth
    const h = el.offsetHeight
    if (!w || !h) return

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', w)
    svg.setAttribute('height', h)
    svg.style.position = 'absolute'
    svg.style.top = '0'
    svg.style.left = '0'
    svg.style.pointerEvents = 'none'
    svg.style.zIndex = '5'
    svg.classList.add('sketch-border-svg')

    const rc = rough.svg(svg)
    // outer sketch border
    const node = rc.rectangle(4, 4, w - 8, h - 8, {
      roughness: 1.8,
      stroke: store.themeColor,
      strokeWidth: 2.5,
      fill: 'none',
      bowing: 1.5,
    })
    svg.appendChild(node)

    // inner tape decorations at corners
    const tapeSize = 28
    const tapeOffset = 10
    ;[
      { x: tapeOffset, y: tapeOffset },
      { x: w - tapeOffset - tapeSize, y: tapeOffset },
      { x: tapeOffset, y: h - tapeOffset - tapeSize },
      { x: w - tapeOffset - tapeSize, y: h - tapeOffset - tapeSize },
    ].forEach((pos, i) => {
      const rotation = [15, -15, -10, 10][i]
      const tape = rc.rectangle(pos.x, pos.y, tapeSize, tapeSize / 2.5, {
        roughness: 0.8,
        stroke: 'rgba(0,0,0,0.08)',
        strokeWidth: 1,
        fill: 'rgba(255,255,255,0.5)',
        fillStyle: 'solid',
      })
      tape.setAttribute('transform', `rotate(${rotation} ${pos.x + tapeSize/2} ${pos.y + tapeSize/5})`)
      svg.appendChild(tape)
    })

    el.style.position = 'relative'
    el.appendChild(svg)
    sketchSvgRef.value = svg
  })
}

function clearSketchBorder() {
  if (sketchSvgRef.value) {
    sketchSvgRef.value.remove()
    sketchSvgRef.value = null
  }
  const old = cardRef.value?.querySelector('.sketch-border-svg')
  if (old) old.remove()
}

watch(() => store.sketchMode, (val) => {
  if (val) drawSketchBorder()
  else clearSketchBorder()
})

watch(() => store.themeColor, () => {
  if (store.sketchMode) drawSketchBorder()
})

// Redraw sketch border on resize
let resizeObserver = null
onMounted(() => {
  if (store.sketchMode) drawSketchBorder()
  if (cardRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (store.sketchMode) drawSketchBorder()
    })
    resizeObserver.observe(cardRef.value)
  }
})

const option = computed(() => {
  const { headers, rows } = chartData.value
  const { chartType, xColumn, yColumns, title, subtitle, themeColor, showLegend, showTooltip, showDataLabels, stack, smooth, sortByValue, sketchMode } = store

  if (!headers.length || !yColumns.length) return {}

  const xIdx = headers.indexOf(xColumn)
  const yIdxs = yColumns.map(y => headers.indexOf(y)).filter(i => i !== -1)
  if (yIdxs.length === 0) return {}

  let data = rows.map(r => ({
    name: xIdx >= 0 ? String(r[xIdx]) : '',
    values: yIdxs.map(i => Number(r[i]) || 0)
  }))

  if (sortByValue && data.length) {
    const xType = store.types?.[xColumn]
    const isTimeSeries = xType === 'date' || 
      /月份|日期|时间|季度|年份|周/.test(xColumn) ||
      data.every(d => /^\d+月?$/.test(d.name))
    if (!isTimeSeries) {
      data.sort((a, b) => b.values[0] - a.values[0])
    }
  }

  const colors = getColors(yIdxs.length, themeColor, sketchMode)
  const isManyCategories = data.length > 15
  const sketch = sketchMode

  const baseOption = {
    backgroundColor: 'transparent',
    title: {
      text: title,
      subtext: subtitle,
      left: '2%',
      top: 12,
      textStyle: { color: '#0f172a', fontSize: sketch ? 22 : 20, fontWeight: 700, fontFamily: 'system-ui, -apple-system, sans-serif' },
      subtextStyle: { color: '#64748b', fontSize: 13, fontFamily: 'system-ui, -apple-system, sans-serif' }
    },
    tooltip: {
      show: showTooltip,
      trigger: ['pie','donut','funnel','scatter'].includes(chartType) ? 'item' : 'axis',
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderColor: sketch ? '#cbd5e1' : '#e2e8f0',
      borderWidth: sketch ? 2 : 1,
      padding: [12, 16],
      textStyle: { color: '#1e293b', fontSize: 13, fontFamily: 'system-ui, sans-serif' },
      extraCssText: sketch
        ? 'box-shadow: 4px 4px 0 rgba(0,0,0,0.08); border-radius: 4px;'
        : 'box-shadow: 0 10px 30px -5px rgba(0,0,0,0.1); border-radius: 12px;',
      formatter: undefined
    },
    legend: {
      show: showLegend && !['funnel','projectionMap'].includes(chartType),
      bottom: 4,
      icon: sketch ? 'roundRect' : 'circle',
      itemWidth: sketch ? 14 : 10,
      itemHeight: sketch ? 10 : 10,
      itemGap: 20,
      textStyle: { color: '#475569', fontSize: sketch ? 13 : 12, fontFamily: 'system-ui, sans-serif' }
    },
    grid: {
      left: isManyCategories ? '12%' : '3%',
      right: '4%',
      bottom: showLegend ? '14%' : '8%',
      top: '22%',
      containLabel: true
    },
    color: colors,
    animationDuration: sketch ? 1200 : 800,
    animationEasing: sketch ? 'elasticOut' : 'cubicOut',
  }

  // BAR / LINE / AREA
  if (chartType === 'bar' || chartType === 'line' || chartType === 'area') {
    const series = yColumns.map((y, i) => ({
      name: y,
      type: chartType === 'area' ? 'line' : chartType,
      data: data.map(d => d.values[i]),
      smooth: sketch ? true : smooth,
      stack: stack ? 'total' : undefined,
      areaStyle: chartType === 'area' ? { opacity: sketch ? 0.2 : 0.12 } : undefined,
      itemStyle: sketch
        ? {
            color: colors[i],
            borderRadius: chartType === 'bar' ? [2, 2, 0, 0] : 0,
            borderWidth: chartType === 'bar' ? 1.5 : 2.5,
            borderColor: colors[i],
            opacity: 0.9,
          }
        : {
            color: colors[i],
            borderRadius: chartType === 'bar' ? [6, 6, 0, 0] : 0,
            borderWidth: chartType === 'bar' ? 0 : 2,
            borderColor: chartType === 'bar' ? 'transparent' : colors[i]
          },
      barMaxWidth: sketch ? 36 : 48,
      barGap: '20%',
      lineStyle: sketch ? { width: 3.5, cap: 'round', join: 'round' } : undefined,
      label: {
        show: showDataLabels && !isManyCategories,
        position: 'top',
        color: sketch ? '#334155' : '#64748b',
        fontSize: sketch ? 12 : 11,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: sketch ? 600 : 400,
        formatter: (p) => {
          const v = p.value
          if (v >= 1e8) return (v / 1e8).toFixed(1) + '亿'
          if (v >= 1e4) return (v / 1e4).toFixed(1) + '万'
          return v
        }
      },
      emphasis: {
        focus: 'series',
        itemStyle: sketch
          ? { borderWidth: 3, opacity: 1 }
          : { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.12)' }
      },
      ...(chartType === 'bar' && !sketch ? {
        itemStyle: {
          color: colors[i],
          borderRadius: [6, 6, 0, 0],
          shadowColor: 'rgba(0,0,0,0.06)',
          shadowBlur: 8,
          shadowOffsetY: 4
        }
      } : {})
    }))

    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 12,
          fontFamily: 'system-ui, sans-serif',
          rotate: isManyCategories ? 35 : 0,
          interval: isManyCategories ? 0 : (data.length > 30 ? 'auto' : 0),
          formatter: (v) => {
            if (String(v).length > 8) return String(v).slice(0, 6) + '...'
            return v
          }
        }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: {
          color: '#94a3b8',
          fontFamily: 'system-ui, sans-serif',
          formatter: (v) => {
            if (v >= 1e8) return (v / 1e8).toFixed(0) + '亿'
            if (v >= 1e4) return (v / 1e4).toFixed(0) + '万'
            return v
          }
        }
      },
      series
    }
  }

  // PIE / DONUT
  if (chartType === 'pie' || chartType === 'donut') {
    const pieData = data.map(d => ({ name: d.name, value: d.values[0] }))
    const total = pieData.reduce((a, b) => a + b.value, 0)
    const pieColors = getColors(pieData.length, themeColor, sketch)
    return {
      ...baseOption,
      color: pieColors,
      title: {
        ...baseOption.title,
        text: title,
        subtext: subtitle,
      },
      tooltip: {
        ...baseOption.tooltip,
        trigger: 'item',
        formatter: (p) => {
          const pct = total ? ((p.value / total) * 100).toFixed(1) : 0
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                  <div style="color:#64748b">数值: <b style="color:#1e293b">${p.value}</b></div>
                  <div style="color:#64748b">占比: <b style="color:#1e293b">${pct}%</b></div>`
        }
      },
      series: [{
        type: 'pie',
        radius: chartType === 'donut' ? ['44%', '74%'] : '64%',
        center: ['50%', '54%'],
        data: pieData,
        itemStyle: {
          borderRadius: sketch ? 2 : 8,
          borderColor: '#fff',
          borderWidth: sketch ? 4 : 3
        },
        label: {
          show: showDataLabels,
          formatter: (p) => {
            const pct = total ? ((p.value / total) * 100).toFixed(1) : 0
            return `{name|${p.name}}\n{val|${pct}%}`
          },
          rich: {
            name: { color: '#475569', fontSize: sketch ? 13 : 12, lineHeight: 18, fontFamily: 'system-ui, sans-serif' },
            val: { color: '#1e293b', fontSize: sketch ? 15 : 14, fontWeight: 700, lineHeight: 20, fontFamily: 'system-ui, sans-serif' }
          }
        },
        emphasis: {
          itemStyle: sketch
            ? { borderWidth: 5, opacity: 1 }
            : { shadowBlur: 24, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.12)' },
          scale: true,
          scaleSize: sketch ? 12 : 8
        }
      }]
    }
  }

  // SCATTER
  if (chartType === 'scatter') {
    const isXNum = store.types[xColumn] === 'number'
    const scatterData = rows.map((r, idx) => [
      isXNum ? (Number(r[xIdx]) || idx) : idx,
      Number(r[yIdxs[0]]) || 0,
      r[xIdx]
    ])
    return {
      ...baseOption,
      xAxis: {
        type: isXNum ? 'value' : 'category',
        name: xColumn,
        nameTextStyle: { color: '#94a3b8', fontFamily: 'system-ui, sans-serif' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }
      },
      yAxis: {
        type: 'value',
        name: yColumns[0],
        nameTextStyle: { color: '#94a3b8', fontFamily: 'system-ui, sans-serif' },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontFamily: 'system-ui, sans-serif' }
      },
      series: [{
        type: 'scatter',
        data: scatterData,
        itemStyle: {
          color: themeColor,
          shadowBlur: 12,
          shadowColor: 'rgba(79,70,229,0.25)'
        },
        symbolSize: (d) => Math.max(10, Math.min(32, Math.sqrt(Math.abs(d[1])) / 3 + 8)),
        label: { show: showDataLabels, formatter: (p) => p.data[2], position: 'top', color: '#64748b', fontSize: 10 }
      }]
    }
  }

  // RADAR
  if (chartType === 'radar') {
    const limit = Math.min(8, data.length)
    const indicators = data.slice(0, limit).map(d => ({
      name: String(d.name),
      max: Math.max(...d.values) * 1.2 || 100
    }))
    const seriesData = yColumns.map((y, i) => ({
      name: y,
      value: data.slice(0, limit).map(d => d.values[i]),
      itemStyle: { color: colors[i] },
      areaStyle: { opacity: 0.12 },
      lineStyle: { width: 2.5 }
    }))
    return {
      ...baseOption,
      radar: {
        indicator: indicators,
        radius: '58%',
        center: ['50%', '54%'],
        axisName: { color: '#64748b', fontFamily: 'system-ui, sans-serif' },
        splitArea: { areaStyle: { color: ['#f8fafc', '#ffffff'] } },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      series: [{ type: 'radar', data: seriesData, label: { show: showDataLabels, color: '#64748b' } }]
    }
  }

  // FUNNEL
  if (chartType === 'funnel') {
    const funnelData = data.map(d => ({ name: d.name, value: d.values[0] })).sort((a, b) => b.value - a.value)
    return {
      ...baseOption,
      series: [{
        type: 'funnel',
        data: funnelData,
        sort: 'descending',
        gap: 2,
        label: { show: showDataLabels, formatter: '{b}: {c}', color: '#475569', fontFamily: 'system-ui, sans-serif' },
        itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 4 },
        emphasis: { label: { fontSize: 14, fontWeight: 600 } }
      }]
    }
  }

  // HEATMAP
  if (chartType === 'heatmap') {
    const yLabelCol = store.headers.find(c => c !== xColumn && store.types[c] !== 'number') || null
    const yLabelIdx = yLabelCol ? headers.indexOf(yLabelCol) : -1
    const xVals = [...new Set(rows.map(r => r[xIdx]))]
    const yVals = yLabelIdx >= 0 ? [...new Set(rows.map(r => r[yLabelIdx]))] : ['数值']
    const hmData = rows.map(r => [
      xVals.indexOf(r[xIdx]),
      yLabelIdx >= 0 ? yVals.indexOf(r[yLabelIdx]) : 0,
      Number(r[yIdxs[0]]) || 0
    ])
    const vals = hmData.map(d => d[2])
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    return {
      ...baseOption,
      xAxis: {
        type: 'category',
        data: xVals,
        splitArea: { show: true },
        axisLabel: { color: '#64748b', fontFamily: 'system-ui, sans-serif', rotate: xVals.length > 8 ? 45 : 0 }
      },
      yAxis: {
        type: 'category',
        data: yVals,
        splitArea: { show: true },
        axisLabel: { color: '#64748b', fontFamily: 'system-ui, sans-serif' }
      },
      visualMap: {
        min, max, calculable: true, orient: 'horizontal', left: 'center', bottom: 0,
        inRange: { color: ['#f0f9ff', '#7dd3fc', themeColor] },
        textStyle: { color: '#64748b', fontFamily: 'system-ui, sans-serif' }
      },
      series: [{
        type: 'heatmap',
        data: hmData,
        label: { show: showDataLabels, color: '#334155', fontSize: 11, fontFamily: 'system-ui, sans-serif' },
        emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.15)' } },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }
      }]
    }
  }

  // PROJECTION MAP
  if (chartType === 'projectionMap') {
    if (!provinceMapCache.has(currentMapKey.value)) {
      loadMap()
      return {
        ...baseOption,
        title: { ...baseOption.title, text: title, subtext: mapLoadError.value || '正在加载地图数据...' },
        series: []
      }
    }
    mapLoadError.value = ''

    const isProvinceView = !!store.mapProvince

    // 省级名称映射（简称 -> GeoJSON 全称）
    const provinceNameMap = {
      '北京':'北京市','北京市':'北京市',
      '天津':'天津市','天津市':'天津市',
      '上海':'上海市','上海市':'上海市',
      '重庆':'重庆市','重庆市':'重庆市',
      '河北':'河北省','河北省':'河北省',
      '山西':'山西省','山西省':'山西省',
      '辽宁':'辽宁省','辽宁省':'辽宁省',
      '吉林':'吉林省','吉林省':'吉林省',
      '黑龙江':'黑龙江省','黑龙江省':'黑龙江省',
      '江苏':'江苏省','江苏省':'江苏省',
      '浙江':'浙江省','浙江省':'浙江省',
      '安徽':'安徽省','安徽省':'安徽省',
      '福建':'福建省','福建省':'福建省',
      '江西':'江西省','江西省':'江西省',
      '山东':'山东省','山东省':'山东省',
      '河南':'河南省','河南省':'河南省',
      '湖北':'湖北省','湖北省':'湖北省',
      '湖南':'湖南省','湖南省':'湖南省',
      '广东':'广东省','广东省':'广东省',
      '海南':'海南省','海南省':'海南省',
      '四川':'四川省','四川省':'四川省',
      '贵州':'贵州省','贵州省':'贵州省',
      '云南':'云南省','云南省':'云南省',
      '陕西':'陕西省','陕西省':'陕西省',
      '甘肃':'甘肃省','甘肃省':'甘肃省',
      '青海':'青海省','青海省':'青海省',
      '台湾':'台湾省','台湾省':'台湾省',
      '内蒙古':'内蒙古自治区','内蒙古自治区':'内蒙古自治区',
      '广西':'广西壮族自治区','广西壮族自治区':'广西壮族自治区',
      '西藏':'西藏自治区','西藏自治区':'西藏自治区',
      '宁夏':'宁夏回族自治区','宁夏回族自治区':'宁夏回族自治区',
      '新疆':'新疆维吾尔自治区','新疆维吾尔自治区':'新疆维吾尔自治区',
      '香港':'香港特别行政区','香港特别行政区':'香港特别行政区',
      '澳门':'澳门特别行政区','澳门特别行政区':'澳门特别行政区',
    }

    // 市级名称映射：尝试原名称、加"市"、加"区"、加"州"、加"盟"、加"县"
    function normalizeCityName(raw) {
      const s = String(raw || '').trim()
      if (!s) return s
      // 如果已经带后缀，直接返回
      if (/[市区州县盟]$/.test(s)) return s
      // 优先尝试加"市"
      return s + '市'
    }

    const mapData = rows.map(r => {
      const rawName = String(r[xIdx] || '')
      const val = Number(r[yIdxs[0]]) || 0
      let name
      if (isProvinceView) {
        name = normalizeCityName(rawName)
      } else {
        const fullName = provinceNameMap[rawName] || rawName
        // 标准化后的 GeoJSON 一律使用全称
        name = fullName
      }
      const adcode = provinceAdcodeMap[name] || provinceAdcodeMap[rawName] || null
      return { name, value: val, adcode }
    })

    const vals = mapData.map(d => d.value)
    const min = Math.min(...vals, 0)
    const max = Math.max(...vals, 1)

    return {
      ...baseOption,
      tooltip: {
        show: showTooltip,
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: '#1e293b', fontSize: 13, fontFamily: 'system-ui, sans-serif' },
        extraCssText: 'box-shadow: 0 10px 30px -5px rgba(0,0,0,0.1); border-radius: 12px;',
        formatter: (p) => {
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                  <div style="color:#64748b">数值: <b style="color:#1e293b">${p.value}</b></div>`
        }
      },
      visualMap: {
        min, max,
        left: '4%',
        bottom: '4%',
        text: ['高', '低'],
        calculable: true,
        inRange: {
          color: ['#e0f2fe', '#7dd3fc', themeColor]
        },
        textStyle: { color: '#64748b', fontFamily: 'system-ui, sans-serif' }
      },
      series: [{
        name: yColumns[0] || '',
        type: 'map',
        map: currentMapKey.value,
        roam: true,
        zoom: isProvinceView ? 1.0 : 1.2,
        label: { show: showDataLabels, color: '#1e293b', fontSize: 10 },
        emphasis: {
          label: { show: true, color: '#1e293b' },
          itemStyle: { areaColor: '#fbbf24' }
        },
        itemStyle: {
          areaColor: '#f1f5f9',
          borderColor: '#cbd5e1',
          borderWidth: 1
        },
        data: mapData
      }]
    }
  }

  return {}
})

function exportImage() {
  const inst = chartRef.value?.chart
  if (inst) {
    const url = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.title || 'chart'}.png`
    a.click()
  }
}

function refresh() {
  // 强制销毁并重建图表组件，清除旧配置残留
  chartKey.value++
}
</script>

<template>
  <div class="space-y-4 animate-fade-in">
    <!-- Toolbar -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <BarChart3 class="w-4 h-4" />
        </div>
        <div class="text-sm" style="font-family: 'STKaiti', 'KaiTi', serif;">
          <span class="text-text-2">当前图表</span>
          <span class="font-semibold text-text ml-1">{{ store.chartType.toUpperCase() }}</span>
          <span class="mx-2 text-text-3">·</span>
          <span class="text-text-2">{{ store.yColumns.join(', ') }}</span>
          <span v-if="store.useAggregation && store.groupBy" class="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            按 {{ store.groupBy }} 汇总
          </span>
          <span v-if="store.sketchMode" class="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium inline-flex items-center gap-1">
            <Pencil class="w-3 h-3" /> 手绘
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="refresh"
          class="p-2 rounded-lg border border-border hover:bg-surface-3 text-text-2 transition-colors"
          title="刷新"
        >
          <RefreshCcw class="w-4 h-4" />
        </button>
        <button
          @click="exportImage"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark transition-colors shadow-sm shadow-primary/20"
        >
          <Download class="w-4 h-4" />
          导出图片
        </button>
      </div>
    </div>

    <!-- Chart Card -->
    <div
      ref="cardRef"
      class="chart-card"
      :class="{ 'sketch-card': store.sketchMode }"
      style="min-height: 520px;"
    >
      <v-chart
        :key="chartKey"
        ref="chartRef"
        :option="option"
        :init-options="{ renderer: store.sketchMode ? 'svg' : 'canvas' }"
        autoresize
        style="width: 100%; height: 520px; display: block;"
      />
    </div>
  </div>
</template>

<style scoped>
.chart-card {
  background: #fffef9;
  border-radius: 8px;
  border: 1px solid #e0d8cc;
  padding: 8px;
  transition: all 0.3s ease;
}
.sketch-card {
  border-radius: 4px;
  border: none;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.06);
  background: #fffef9;
}
</style>
