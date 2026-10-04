<script setup>
import { ref, computed } from 'vue'
import { store, numericColumns, stringColumns } from '../composables/useStore.js'
import { parseNaturalLanguage, getExampleCommands } from '../utils/nlParser.js'
import { Wand2, Send, Lightbulb, X } from '@lucide/vue'

const input = ref('')
const showExamples = ref(false)
const lastResult = ref(null)

const context = computed(() => ({
  headers: store.headers,
  types: store.types,
  numericColumns: numericColumns.value,
  stringColumns: stringColumns.value,
}))

function execute() {
  if (!input.value.trim()) return
  const result = parseNaturalLanguage(input.value, context.value)
  lastResult.value = result

  if (result) {
    // Apply parsed config to store
    if (result.chartType) store.chartType = result.chartType
    if (result.xColumn) store.xColumn = result.xColumn
    if (result.yColumns) store.yColumns = result.yColumns
    if (result.groupBy) {
      store.groupBy = result.groupBy
      store.useAggregation = true
    }
    if (result.aggFunction) store.aggFunction = result.aggFunction
    if (result.themeColor) store.themeColor = result.themeColor
    if (result.title) store.title = result.title
    if (result.stack !== undefined) store.stack = result.stack
    if (result.smooth !== undefined) store.smooth = result.smooth
    if (result.showDataLabels !== undefined) store.showDataLabels = result.showDataLabels
    if (result.hideLegend) store.showLegend = false
    if (result.showLegend) store.showLegend = true

    // Switch to chart tab
    store.activeTab = 'chart'
  }

  input.value = ''
  showExamples.value = false
}

function useExample(cmd) {
  input.value = cmd
  execute()
}

const examples = getExampleCommands()
</script>

<template>
  <div class="bg-surface rounded-lg border border-border p-5 space-y-3 animate-fade-in">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center">
        <Wand2 class="w-4 h-4" />
      </div>
      <div>
        <div class="font-semibold text-text text-sm" style="font-family: 'STKaiti', 'KaiTi', serif;">自然语言出图</div>
        <div class="text-xs text-text-3">用中文描述你想要的图表</div>
      </div>
    </div>

    <div class="relative">
      <input
        v-model="input"
        @keydown.enter="execute"
        placeholder="例如：把销售额按月份做成折线图，用蓝色"
        class="w-full rounded-md border border-border bg-surface-2 pl-3 pr-24 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-shadow"
      />
      <div class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button
          @click="showExamples = !showExamples"
          class="p-1.5 rounded-md text-text-3 hover:text-violet-600 hover:bg-violet-50 transition-colors"
          title="示例"
        >
          <Lightbulb class="w-4 h-4" />
        </button>
        <button
          @click="execute"
          :disabled="!input.trim()"
          class="p-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Examples dropdown -->
    <div v-if="showExamples" class="relative">
      <div class="absolute z-10 w-full bg-white rounded-lg border border-border shadow-lg shadow-black/5 py-2 mt-1">
        <div class="px-3 py-1.5 text-xs font-medium text-text-3 border-b border-border mb-1">点击使用示例</div>
        <button
          v-for="(cmd, idx) in examples"
          :key="idx"
          @click="useExample(cmd)"
          class="w-full text-left px-3 py-2 text-sm text-text hover:bg-violet-50 hover:text-violet-700 transition-colors"
        >
          {{ cmd }}
        </button>
      </div>
    </div>

    <!-- Parse feedback -->
    <div v-if="lastResult && !Object.keys(lastResult).length" class="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
      未能理解指令，请尝试更具体的描述，如"柱状图显示销售额"
    </div>
  </div>
</template>
