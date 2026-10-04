<script setup>
import { computed } from 'vue'
import { store, chartData, numericColumns, stringColumns } from '../composables/useStore.js'
import { AGG_FUNCTIONS } from '../utils/aggregator.js'

const chartTypes = [
  { key: 'bar', label: '柱状图', icon: '▭' },
  { key: 'line', label: '折线图', icon: '〰' },
  { key: 'area', label: '面积图', icon: '◩' },
  { key: 'pie', label: '饼图', icon: '◐' },
  { key: 'donut', label: '环形图', icon: '◯' },
  { key: 'scatter', label: '散点图', icon: '·' },
  { key: 'radar', label: '雷达图', icon: '◈' },
  { key: 'funnel', label: '漏斗图', icon: '▼' },
  { key: 'heatmap', label: '热力图', icon: '▦' },
  { key: 'projectionMap', label: '投影地图', icon: '◎' },

]

const needsX = computed(() =>
  ['bar','line','area','pie','donut','funnel','heatmap','projectionMap'].includes(store.chartType)
)

const xOptions = computed(() => {
  if (store.chartType === 'scatter') return store.headers
  if (['pie','donut','funnel'].includes(store.chartType)) return stringColumns.value.length ? stringColumns.value : store.headers
  return store.headers
})

const yOptions = computed(() => {
  if (store.chartType === 'scatter') return numericColumns.value.length ? numericColumns.value : store.headers
  if (store.chartType === 'heatmap') return numericColumns.value.length ? numericColumns.value : store.headers
  return numericColumns.value.length ? numericColumns.value : store.headers
})

const dimOptions = computed(() => {
  return store.recommendedDims.length ? store.recommendedDims : stringColumns.value
})

const provinceList = [
  '全国',
  '北京市','天津市','上海市','重庆市',
  '河北省','山西省','辽宁省','吉林省','黑龙江省',
  '江苏省','浙江省','安徽省','福建省','江西省','山东省',
  '河南省','湖北省','湖南省','广东省','海南省',
  '四川省','贵州省','云南省','陕西省','甘肃省','青海省','台湾省',
  '内蒙古自治区','广西壮族自治区','西藏自治区','宁夏回族自治区','新疆维吾尔自治区',
  '香港特别行政区','澳门特别行政区'
]

function toggleY(col) {
  if (store.yColumns.includes(col)) {
    store.yColumns = store.yColumns.filter(c => c !== col)
  } else {
    if (['pie','donut','funnel','projectionMap'].includes(store.chartType)) {
      store.yColumns = [col]
    } else {
      store.yColumns = [...store.yColumns, col]
    }
  }
}

function selectType(t) {
  store.chartType = t
  const nums = numericColumns.value
  const strs = stringColumns.value
  if (['pie','donut','funnel'].includes(t)) {
    store.xColumn = strs[0] || store.headers[0] || ''
    store.yColumns = nums.length > 0 ? [nums[0]] : (store.headers.length > 1 ? [store.headers[1]] : [])
  } else if (t === 'scatter') {
    store.xColumn = nums[0] || store.headers[0] || ''
    store.yColumns = nums.length > 1 ? [nums[1]] : (store.headers.length > 1 ? [store.headers[1]] : [])
  } else if (t === 'heatmap') {
    store.xColumn = strs[0] || store.headers[0] || ''
    store.yColumns = nums.length > 0 ? [nums[0]] : (store.headers.length > 1 ? [store.headers[1]] : [])
  } else if (t === 'projectionMap') {
    store.xColumn = strs[0] || store.headers[0] || ''
    store.yColumns = nums.length > 0 ? [nums[0]] : (store.headers.length > 1 ? [store.headers[1]] : [])
  } else {
    store.xColumn = strs[0] || store.headers[0] || ''
    store.yColumns = nums.length > 0 ? [nums[0]] : (store.headers.length > 1 ? [store.headers[1]] : [])
  }
}

const presetColors = [
  '#4f46e5', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#0891b2', '#65a30d',
  '#ea580c', '#0d9488'
]

const aggregatedCount = computed(() => {
  if (!store.useAggregation || !store.groupBy) return 0
  return chartData.value.rows.length
})
</script>

<template>
  <div class="space-y-5 animate-fade-in">
    <!-- Aggregation Control (prominent when applicable) -->
    <div v-if="store.recommendedDims.length && store.rows.length > 20" class="bg-primary/5 rounded-lg border border-primary/20 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span class="text-sm font-semibold text-text" style="font-family: 'STKaiti', 'KaiTi', serif;">数据聚合</span>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="store.useAggregation" class="sr-only peer">
          <div class="w-9 h-5 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      <div v-if="store.useAggregation" class="space-y-3 pt-1">
        <div>
          <label class="block text-xs font-medium text-text-2 mb-1.5">聚合维度</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="d in dimOptions"
              :key="d"
              @click="store.groupBy = d"
              class="px-2.5 py-1 rounded-md text-xs border transition-all"
              :class="store.groupBy === d ? 'bg-primary text-white border-primary' : 'bg-white text-text-2 border-border hover:border-primary/40'"
            >
              {{ d }}
            </button>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-text-2 mb-1.5">聚合方式</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="agg in AGG_FUNCTIONS"
              :key="agg.key"
              @click="store.aggFunction = agg.key"
              class="px-2.5 py-1 rounded-md text-xs border transition-all"
              :class="store.aggFunction === agg.key ? 'bg-primary text-white border-primary' : 'bg-white text-text-2 border-border hover:border-primary/40'"
            >
              {{ agg.label }}
            </button>
          </div>
        </div>
        <div class="text-xs text-primary/80 font-medium">
          聚合后 {{ aggregatedCount }} 组数据
        </div>
      </div>
      <div v-else class="text-xs text-text-3 leading-relaxed">
        当前有 {{ store.rows.length }} 行明细数据，建议开启聚合后按维度汇总展示，图表更清晰易读。
      </div>
    </div>

    <!-- Chart Type -->
    <div>
      <label class="block text-sm font-semibold text-text mb-2.5" style="font-family: 'STKaiti', 'KaiTi', serif;">图表类型</label>
      <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <button
          v-for="t in chartTypes"
          :key="t.key"
          @click="selectType(t.key)"
          class="flex flex-col items-center gap-1 p-2.5 rounded-lg border text-sm transition-all duration-200"
          :class="store.chartType === t.key ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text-2 hover:border-primary/40 hover:bg-surface-3'"
        >
          <span class="text-lg leading-none">{{ t.icon }}</span>
          <span class="text-xs font-medium">{{ t.label }}</span>
        </button>
      </div>
    </div>

    <!-- Axis Config -->
    <div class="space-y-3 bg-surface rounded-lg border border-border p-4">
      <!-- Province drill-down for map -->
      <div v-if="store.chartType === 'projectionMap'">
        <label class="block text-xs font-semibold text-text-2 mb-1.5" style="font-family: 'STKaiti', 'KaiTi', serif;">地图范围</label>
        <select
          v-model="store.mapProvince"
          class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
        >
          <option v-for="p in provinceList" :key="p" :value="p === '全国' ? '' : p">{{ p }}</option>
        </select>
        <div class="mt-1.5 text-xs text-text-3">
          {{ store.mapProvince ? `下钻至「${store.mapProvince}」市级地图` : '展示全国省级地图' }}
        </div>
      </div>

      <div v-if="needsX">
        <label class="block text-xs font-semibold text-text-2 mb-1.5" style="font-family: 'STKaiti', 'KaiTi', serif;">
          {{ ['pie','donut','funnel'].includes(store.chartType) ? '分类维度' : (store.chartType === 'projectionMap' ? '地区名称' : 'X 轴 / 维度') }}
        </label>
        <select
          v-model="store.xColumn"
          class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
        >
          <option v-for="h in xOptions" :key="h" :value="h">{{ h }}</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-semibold text-text-2 mb-1.5" style="font-family: 'STKaiti', 'KaiTi', serif;">
          {{ ['pie','donut','funnel','projectionMap'].includes(store.chartType) ? '数值指标' : 'Y 轴 / 指标' }}
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="h in yOptions"
            :key="h"
            @click="toggleY(h)"
            class="px-3 py-1.5 rounded-md text-xs border transition-all duration-200"
            :class="store.yColumns.includes(h) ? 'bg-primary text-white border-primary' : 'bg-surface-2 text-text-2 border-border hover:border-primary/40'"
          >
            {{ h }}
          </button>
        </div>
      </div>
    </div>

    <!-- Appearance -->
    <div class="space-y-4 bg-surface rounded-lg border border-border p-4">
      <div class="text-sm font-semibold text-text" style="font-family: 'STKaiti', 'KaiTi', serif;">外观设置</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-text-2 mb-1">标题</label>
          <input v-model="store.title" class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow" />
        </div>
        <div>
          <label class="block text-xs text-text-2 mb-1">副标题</label>
          <input v-model="store.subtitle" class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow" />
        </div>
      </div>

      <div>
        <label class="block text-xs text-text-2 mb-2">主题色</label>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="c in presetColors"
            :key="c"
            @click="store.themeColor = c"
            class="w-8 h-8 rounded-full border-2 transition-all duration-200"
            :class="store.themeColor === c ? 'border-text scale-110' : 'border-transparent hover:scale-105'"
            :style="{ backgroundColor: c }"
          />
          <input
            v-model="store.themeColor"
            type="color"
            class="w-8 h-8 rounded-full overflow-hidden border-0 p-0 cursor-pointer"
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-4 text-sm">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" v-model="store.showLegend" class="rounded border-border text-primary focus:ring-primary" />
          <span class="text-text-2">图例</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" v-model="store.showTooltip" class="rounded border-border text-primary focus:ring-primary" />
          <span class="text-text-2">提示框</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" v-model="store.showDataLabels" class="rounded border-border text-primary focus:ring-primary" />
          <span class="text-text-2">数据标签</span>
        </label>
        <label v-if="['bar','line','area'].includes(store.chartType)" class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" v-model="store.stack" class="rounded border-border text-primary focus:ring-primary" />
          <span class="text-text-2">堆叠</span>
        </label>
        <label v-if="['line','area'].includes(store.chartType)" class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" v-model="store.smooth" class="rounded border-border text-primary focus:ring-primary" />
          <span class="text-text-2">平滑曲线</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" v-model="store.sortByValue" class="rounded border-border text-primary focus:ring-primary" />
          <span class="text-text-2">按值排序</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" v-model="store.sketchMode" class="rounded border-border text-primary focus:ring-primary" />
          <span class="text-text-2">手绘风格</span>
        </label>
      </div>
    </div>
  </div>
</template>
