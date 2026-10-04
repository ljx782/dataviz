<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { store } from '../composables/useStore.js'
import { Play, Pause, RotateCcw, Timer } from '@lucide/vue'

// Detect potential time columns
const timeColumns = computed(() => {
  return store.headers.filter(h => {
    if (store.types[h] === 'date') return true
    const n = h.toLowerCase()
    return n.includes('日期') || n.includes('时间') || n.includes('月份') || n.includes('年') ||
           n.includes('date') || n.includes('time') || n.includes('month') || n.includes('year')
  })
})

const hasTimeColumn = computed(() => timeColumns.value.length > 0)
const selectedTimeCol = ref('')

watch(timeColumns, (cols) => {
  if (cols.length > 0 && !selectedTimeCol.value) {
    selectedTimeCol.value = cols[0]
  }
}, { immediate: true })

const totalSteps = computed(() => store.rows.length)
const progress = computed(() => {
  if (totalSteps.value <= 1) return 0
  return Math.round((store.timeCurrentIndex / totalSteps.value) * 100)
})

let timer = null
const speed = ref(300) // ms per step

function start() {
  if (!hasTimeColumn.value) return
  store.timeAnimating = true
  if (store.timeCurrentIndex <= 0) store.timeCurrentIndex = 1
  if (store.timeCurrentIndex >= totalSteps.value) store.timeCurrentIndex = 1

  timer = setInterval(() => {
    if (store.timeCurrentIndex < totalSteps.value) {
      store.timeCurrentIndex++
    } else {
      stop()
    }
  }, speed.value)
}

function stop() {
  store.timeAnimating = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function reset() {
  stop()
  store.timeCurrentIndex = 0
}

function onSliderChange(e) {
  const val = Number(e.target.value)
  store.timeCurrentIndex = val
  if (val > 0 && val < totalSteps.value) {
    store.timeAnimating = true
  }
}

function togglePlay() {
  if (store.timeAnimating && timer) {
    stop()
  } else {
    start()
  }
}

onUnmounted(() => {
  stop()
})

// Auto-stop when leaving chart tab
watch(() => store.activeTab, (tab) => {
  if (tab !== 'chart') stop()
})
</script>

<template>
  <div v-if="hasTimeColumn && store.rows.length > 3" class="bg-surface rounded-lg border border-border p-4 space-y-3 animate-fade-in">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-md bg-sky-100 text-sky-600 flex items-center justify-center">
        <Timer class="w-4 h-4" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-text text-sm" style="font-family: 'STKaiti', 'KaiTi', serif;">数据演变动画</div>
        <div class="text-xs text-text-3">
          <span v-if="store.timeAnimating">正在播放 {{ progress }}%</span>
          <span v-else-if="store.timeCurrentIndex > 0">已暂停 {{ progress }}%</span>
          <span v-else>按数据顺序逐步展示演变过程</span>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          @click="togglePlay"
          class="p-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
          :title="store.timeAnimating ? '暂停' : '播放'"
        >
          <component :is="store.timeAnimating && timer ? Pause : Play" class="w-4 h-4" />
        </button>
        <button
          @click="reset"
          class="p-2 rounded-lg border border-border hover:bg-surface-3 text-text-2 transition-colors"
          title="重置"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Progress slider -->
    <div class="flex items-center gap-3">
      <input
        type="range"
        min="0"
        :max="totalSteps"
        :value="store.timeCurrentIndex"
        @input="onSliderChange"
        class="flex-1 h-1.5 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-sky-600"
      />
      <span class="text-xs text-text-3 w-16 text-right shrink-0">
        {{ store.timeCurrentIndex }} / {{ totalSteps }}
      </span>
    </div>

    <!-- Speed control -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-text-3">速度</span>
      <div class="flex gap-1">
        <button
          v-for="s in [600, 300, 150]"
          :key="s"
          @click="speed = s; if (store.timeAnimating) { stop(); start(); }"
          class="px-2 py-0.5 rounded text-xs border transition-colors"
          :class="speed === s ? 'bg-sky-50 border-sky-300 text-sky-700' : 'border-border text-text-3 hover:border-sky-300'"
        >
          {{ s === 600 ? '慢' : s === 300 ? '中' : '快' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #0284c7;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #0284c7;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
</style>
