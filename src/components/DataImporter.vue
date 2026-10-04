<script setup>
import { ref } from 'vue'
import { store, setData } from '../composables/useStore.js'
import { parseCSV, parseExcel, parseJSON, parseText, inferTypes } from '../utils/dataParser.js'
import { salesData, categoryData, cityData, rainfallData } from '../utils/sampleData.js'
import { Upload, FileText, Database, MapPin, ShoppingCart, TrendingUp, CloudRain } from '@lucide/vue'

const dragOver = ref(false)
const pasteText = ref('')
const error = ref('')
const loading = ref(false)

function handleDrop(e) {
  e.preventDefault()
  dragOver.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) processFile(files[0])
}

function handleFileInput(e) {
  const file = e.target.files[0]
  if (file) processFile(file)
}

async function processFile(file) {
  error.value = ''
  loading.value = true
  try {
    const name = file.name.toLowerCase()
    let result
    if (name.endsWith('.csv') || name.endsWith('.tsv')) {
      result = await parseCSV(file)
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      result = await parseExcel(file)
    } else if (name.endsWith('.json')) {
      result = await parseJSON(file)
    } else {
      // Try csv first
      result = await parseCSV(file)
    }
    setData(result)
  } catch (err) {
    error.value = err.message || '文件解析失败'
  } finally {
    loading.value = false
  }
}

function handlePaste() {
  error.value = ''
  try {
    const result = parseText(pasteText.value)
    setData(result)
    pasteText.value = ''
  } catch (err) {
    error.value = err.message || '文本解析失败'
  }
}

function loadSample(type) {
  let data
  if (type === 'sales') data = salesData
  else if (type === 'category') data = categoryData
  else if (type === 'city') data = cityData
  else if (type === 'rainfall') data = rainfallData
  if (data) {
    const { headers, rows } = data
    // re-infer types
    setData({ headers, rows, types: inferTypes(headers, rows) })
  }
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="text-center space-y-2">
      <h1 class="text-3xl font-bold text-text" style="font-family: 'STKaiti', 'KaiTi', serif;">数据可视化手账</h1>
      <p class="text-text-2">导入数据，随手画出你的数据故事</p>
    </div>

    <!-- File Drop Zone -->
    <div
      class="relative border-2 border-dashed rounded-lg p-10 text-center transition-all duration-200"
      :class="dragOver ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop="handleDrop"
    >
      <input
        type="file"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        accept=".csv,.xlsx,.xls,.json,.txt"
        @change="handleFileInput"
      />
      <div class="space-y-3 pointer-events-none">
        <div class="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Upload class="w-7 h-7" />
        </div>
        <div>
          <p class="font-medium text-text">点击或拖拽文件到此处</p>
          <p class="text-sm text-text-3 mt-1">支持 CSV、Excel、JSON 格式</p>
        </div>
      </div>
    </div>

    <!-- Paste Section -->
    <div class="bg-surface rounded-lg border border-border p-5 space-y-3">
      <div class="flex items-center gap-2 text-text font-medium" style="font-family: 'STKaiti', 'KaiTi', serif;">
        <FileText class="w-4 h-4 text-primary" />
        <span>粘贴数据</span>
      </div>
      <textarea
        v-model="pasteText"
        rows="5"
        placeholder="将 CSV、JSON 或表格数据粘贴到此处..."
        class="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
      />
      <div class="flex justify-between items-center">
        <span class="text-xs text-text-3">支持自动识别 CSV、TSV、JSON 格式</span>
        <button
          @click="handlePaste"
          class="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary-dark transition-colors"
        >
          解析数据
        </button>
      </div>
    </div>

    <!-- Sample Data -->
    <div class="bg-surface rounded-lg border border-border p-5 space-y-3">
      <div class="flex items-center gap-2 text-text font-medium" style="font-family: 'STKaiti', 'KaiTi', serif;">
        <Database class="w-4 h-4 text-primary" />
        <span>使用示例数据</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          @click="loadSample('sales')"
          class="flex items-center gap-3 p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
        >
          <div class="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp class="w-5 h-5" />
          </div>
          <div>
            <div class="font-medium text-text text-sm">月度销售数据</div>
            <div class="text-xs text-text-3">12行 × 6列</div>
          </div>
        </button>
        <button
          @click="loadSample('category')"
          class="flex items-center gap-3 p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
        >
          <div class="w-10 h-10 rounded-md bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <ShoppingCart class="w-5 h-5" />
          </div>
          <div>
            <div class="font-medium text-text text-sm">品类销售统计</div>
            <div class="text-xs text-text-3">7行 × 5列</div>
          </div>
        </button>
        <button
          @click="loadSample('city')"
          class="flex items-center gap-3 p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
        >
          <div class="w-10 h-10 rounded-md bg-warn/10 text-warn flex items-center justify-center shrink-0">
            <MapPin class="w-5 h-5" />
          </div>
          <div>
            <div class="font-medium text-text text-sm">城市经济数据</div>
            <div class="text-xs text-text-3">10行 × 5列</div>
          </div>
        </button>
        <button
          @click="loadSample('rainfall')"
          class="flex items-center gap-3 p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
        >
          <div class="w-10 h-10 rounded-md bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <CloudRain class="w-5 h-5" />
          </div>
          <div>
            <div class="font-medium text-text text-sm">全国降雨数据</div>
            <div class="text-xs text-text-3">34行 × 8列</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="p-3 rounded-md bg-danger/10 text-danger text-sm border border-danger/20">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center text-text-2 text-sm py-4">
      正在解析数据...
    </div>
  </div>
</template>
