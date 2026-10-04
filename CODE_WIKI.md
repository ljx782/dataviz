# DataViz - Code Wiki 文档

> DataViz 数据可视化手账平台 - 项目结构、模块职责与关键代码说明

---

## 1. 项目概述

| 属性 | 说明 |
|------|------|
| **项目名称** | DataViz - 数据可视化分析平台 |
| **技术栈** | Vue 3 (Composition API) + Vite + Tailwind CSS v4 |
| **图表引擎** | ECharts 6 + vue-echarts |
| **构建工具** | Vite 8 |
| **类型** | 前端静态 SPA（无后端依赖） |
| **特色风格** | 手账/手绘风格 UI，支持 Rough.js 手绘边框效果 |

### 1.1 核心功能
- **多格式数据导入**：支持 CSV、Excel(XLSX/XLS)、JSON、文本粘贴
- **10种图表类型**：柱状图、折线图、面积图、饼图、环形图、散点图、雷达图、漏斗图、热力图、中国地图（含省级下钻）
- **自然语言出图**：用中文描述直接生成图表配置
- **数据聚合分析**：按维度分组汇总（求和/平均/计数/最大/最小）
- **异常检测**：自动扫描离群值、逻辑矛盾、规律缺失、强相关性、重复数据
- **数据故事讲述**：基于规则自动生成中文数据洞察
- **时间演变动画**：按时间序列逐步展示数据变化
- **用户认证**：基于 localStorage 的登录/注册系统

---

## 2. 项目结构

```
dataviz/
├── index.html              # HTML 入口
├── package.json            # 依赖与脚本配置
├── vite.config.js          # Vite 构建配置
├── README.md               # 项目说明（模板默认）
├── map-test-data.csv       # 地图测试数据
├── 全国降雨数据.csv         # 示例降雨数据
├── 数智看板创意展示.html    # 独立静态页面
│
├── public/                 # 静态资源（不经过构建处理）
│   ├── favicon.svg
│   └── icons.svg
│
├── dist/                   # 构建输出目录（Vite 生成）
│
├── src/
│   ├── main.js             # 应用入口：初始化 Vue + ECharts
│   ├── App.vue             # 根组件：布局框架与路由式 Tab 切换
│   ├── style.css           # 全局样式：Tailwind 主题 + 自定义动画
│   │
│   ├── components/         # Vue 单文件组件
│   │   ├── DataImporter.vue      # 数据导入页（文件/粘贴/示例）
│   │   ├── DataTable.vue         # 数据表格预览（分页/搜索）
│   │   ├── ChartConfig.vue       # 图表配置面板
│   │   ├── ChartRenderer.vue     # 图表渲染核心（ECharts）
│   │   ├── StatPanel.vue         # 统计分析面板
│   │   ├── InsightCards.vue      # KPI 洞察卡片
│   │   ├── LoginView.vue         # 登录/注册页
│   │   ├── StoryTeller.vue       # 数据故事讲述
│   │   ├── AnomalyPanel.vue      # 异常检测结果展示
│   │   ├── NLCommand.vue         # 自然语言命令输入
│   │   └── TimeAnimation.vue     # 时间演变动画控制
│   │
│   ├── composables/        # 组合式函数（状态与逻辑）
│   │   ├── useStore.js     # 全局响应式状态中心
│   │   └── useAuth.js      # 用户认证逻辑
│   │
│   └── utils/              # 工具函数库
│       ├── dataParser.js   # 数据解析（CSV/Excel/JSON/文本）
│       ├── aggregator.js   # 数据聚合与 KPI 生成
│       ├── anomalyDetector.js  # 异常检测引擎
│       ├── nlParser.js     # 自然语言指令解析
│       ├── storyGenerator.js   # 数据故事生成器
│       └── sampleData.js   # 示例数据集
│
└── .vscode/
    └── extensions.json     # VS Code 推荐扩展
```

---

## 3. 核心模块详解

### 3.1 入口与全局配置

#### `src/main.js`
应用启动入口，职责：
- 创建 Vue 应用实例
- 全局注册 `v-chart` 组件（vue-echarts）
- **按需注册 ECharts 模块**：渲染器(Canvas/SVG)、图表类型(Bar/Line/Pie/Scatter/Radar/Funnel/Heatmap/Map)、组件(Grid/Tooltip/Legend/Title/Toolbox/DataZoom/VisualMap/Geo 等)

```javascript
// 关键逻辑：按需 use ECharts 模块，减少打包体积
use([
  CanvasRenderer, SVGRenderer,
  BarChart, LineChart, PieChart, ScatterChart,
  RadarChart, FunnelChart, HeatmapChart, MapChart,
  GridComponent, TooltipComponent, LegendComponent,
  // ... 其他组件
])
```

#### `vite.config.js`
```javascript
export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
```
- 使用 `@vitejs/plugin-vue` 处理 `.vue` 单文件组件
- 使用 `@tailwindcss/vite`（Tailwind v4）处理 CSS

#### `src/style.css`
全局样式配置：
- Tailwind v4 主题变量：`@theme { --color-primary: #6b5b95; ... }`
- 手账风格配色：暖色调纸张背景 (`#fffef9`)、边框色 (`#e0d8cc`)
- 字体栈：`'STKaiti', 'KaiTi', 'FangSong', 'Georgia', 'Times New Roman', serif`
- 自定义滚动条、表格悬浮效果、淡入动画 (`fadeIn`)
- 纸张卡片样式 (`.paper-card`)

---

### 3.2 状态管理 (`composables/`)

#### `useStore.js` - 全局状态中心

**核心状态对象 `store`**（`reactive`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `headers` | `string[]` | 数据列名 |
| `rows` | `Array[]` | 数据行（二维数组） |
| `types` | `Object` | 每列推断的数据类型 `{列名: 'number'|'string'|'date'}` |
| `activeTab` | `string` | 当前激活页签：import/table/chart/stats/insight |
| `chartType` | `string` | 当前图表类型，默认 'bar' |
| `xColumn` | `string` | X轴/维度列 |
| `yColumns` | `string[]` | Y轴/指标列（支持多选） |
| `title` / `subtitle` | `string` | 图表标题与副标题 |
| `themeColor` | `string` | 主题色，默认 `#6366f1` |
| `showLegend` / `showTooltip` / `showDataLabels` | `boolean` | 显示控制 |
| `stack` / `smooth` / `area` | `boolean` | 图表样式开关 |
| `sortByValue` | `boolean` | 按值排序（默认开启） |
| `useAggregation` / `groupBy` / `aggFunction` | 聚合相关 | 数据聚合配置 |
| `sketchMode` | `boolean` | 手绘风格模式 |
| `timeAnimating` / `timeCurrentIndex` / `timeColumn` | 动画相关 | 时间演变动画状态 |
| `mapProvince` | `string` | 地图下钻省份 |

**关键导出：**

| 导出 | 类型 | 说明 |
|------|------|------|
| `store` | `reactive` | 全局状态对象 |
| `numericColumns` | `computed` | 数值列列表 |
| `stringColumns` | `computed` | 字符串列列表 |
| `chartData` | `computed` | 实际用于图表的数据（支持聚合+时间过滤） |
| `currentKPIs` | `computed` | 当前聚合数据的 KPI 指标 |
| `setData({headers, rows, types})` | `function` | 设置数据并自动推荐维度/列配置 |
| `clearData()` | `function` | 清空所有数据与配置 |

**`setData` 自动配置逻辑：**
1. 调用 `recommendDimensions()` 获取推荐分组维度
2. 默认不开启聚合，但预填推荐维度到 `groupBy`
3. 根据图表类型自动选择 X/Y 列：
   - 饼图/环形图/漏斗图：`xColumn`=字符串列, `yColumns`=[首个数值列]
   - 散点图：`xColumn`=首个数值列, `yColumns`=[第二数值列]
   - 其他：`xColumn`=推荐维度, `yColumns`=[首个数值列]
4. 自动切换至 `chart` 页签

---

#### `useAuth.js` - 用户认证

基于 `localStorage` 的本地认证系统，无后端依赖。

| 导出 | 类型 | 说明 |
|------|------|------|
| `auth` | `reactive` | 认证状态 `{user, error, loading}` |
| `isLoggedIn` | `computed` | 是否已登录 |
| `login(username, password)` | `function` | 登录验证 |
| `register(username, password)` | `function` | 注册新用户 |
| `logout()` | `function` | 退出登录 |
| `initAuth()` | `function` | 初始化时从 localStorage 恢复登录态 |

**安全说明**：使用自定义 `simpleHash()` 做密码哈希（基于字符编码位移累加），仅用于演示目的，**不具备加密安全性**。

---

### 3.3 工具函数库 (`utils/`)

#### `dataParser.js` - 数据解析器

| 函数 | 说明 |
|------|------|
| `inferType(values)` | 根据值样本推断列类型（number/date/string），阈值 70% |
| `inferTypes(headers, rows)` | 对所有列执行类型推断 |
| `parseCSV(file)` | 使用 PapaParse 解析 CSV/TSV 文件 |
| `parseExcel(file)` | 使用 xlsx 库解析 Excel 文件（仅读取第一个 Sheet） |
| `parseJSON(file)` | 解析 JSON 对象数组 |
| `parseText(text)` | 智能识别文本内容：先尝试 JSON，再尝试 CSV/TSV |
| `getNumericColumns(...)` | 获取数值列列表（含类型回退采样） |
| `getStringColumns(...)` | 获取非数值列列表 |

**数据类型推断规则：**
- 数值：`!isNaN(Number(s)) && s !== ''`
- 日期：`!isNaN(Date.parse(s))`
- 数值/日期占比 > 70% 则判定为该类型，否则为 string

---

#### `aggregator.js` - 数据聚合引擎

| 导出 | 说明 |
|------|------|
| `AGG_FUNCTIONS` | 聚合方式常量：`sum`/`avg`/`count`/`max`/`min` |
| `isGoodDimension(headers, rows, types, colIndex)` | 判断列是否适合作为分组维度（唯一值 2~50，日期 2~100） |
| `recommendDimensions(...)` | 自动推荐最佳分组维度，按语义关键词打分排序 |
| `aggregate({headers, rows, types, groupBy, metrics, agg})` | 按维度分组聚合，返回聚合后的数据 |
| `generateKPIs({...})` | 基于聚合结果生成 KPI 指标（总计/平均/最大/最小及对应维度） |
| `fmt(n)` | 数值格式化（自动换算 亿/万/K） |

**维度推荐打分规则（关键词匹配）：**
| 关键词 | 分数 |
|--------|------|
| 类别/类型/分类 | 100 |
| 地区/区域/城市 | 90 |
| 渠道/平台 | 80 |
| 品牌 | 70 |
| 日期/时间/月份 | 60 |
| 客户/用户 | 50 |

---

#### `anomalyDetector.js` - 异常检测引擎

| 导出 | 说明 |
|------|------|
| `ANOMALY_TYPES` | 异常类型常量定义（含图标、颜色） |
| `detectAnomalies({headers, rows, types})` | 扫描数据并返回异常列表 |
| `getAnomalySummary(anomalies)` | 统计异常概览 |

**检测维度：**

1. **离群值（outlier）**：Z-Score > 2.5 判定为异常，> 4 为严重
2. **逻辑矛盾（logic）**：
   - 利润率 > 100% 警告
   - 销售额/销量/营收等字段出现负值警告
3. **规律缺失（missing）**：
   - 连续 3+ 个零值
   - 所有记录值完全相同（且数量 > 5）
4. **强相关暗示（correlation）**：皮尔逊相关系数 |r| > 0.85
5. **重复异常（duplicate）**：完全重复的行记录

---

#### `nlParser.js` - 自然语言解析器

将中文自然语言指令解析为图表配置对象。

| 导出 | 说明 |
|------|------|
| `parseNaturalLanguage(text, context)` | 核心解析函数 |
| `getExampleCommands()` | 返回示例命令列表 |

**支持的识别维度：**
- **图表类型**：柱状图、折线图、饼图、散点图、雷达图、漏斗图、热力图、地图等
- **聚合方式**：求和/平均/计数/最大/最小
- **颜色**：红/蓝/绿/橙/紫/粉/青/黄/黑
- **样式开关**：堆叠、平滑曲线、显示数值、显示/隐藏图例
- **分组维度**：匹配 "按XX分组/汇总/聚合"、"以XX为维度"
- **标题**：匹配 "标题叫XX"、"叫XX"

**解析优先级**：图表类型 → 指标列 → 维度列 → 聚合方式 → 颜色 → 样式 → 分组 → 标题

---

#### `storyGenerator.js` - 数据故事生成器

基于规则自动分析数据特征，生成中文洞察故事。

| 导出 | 说明 |
|------|------|
| `generateStory({headers, rows, types, groupBy, metrics, agg, chartType})` | 生成故事列表（最多 5 条） |
| `generateSummary({...})` | 生成一句话摘要 |

**故事类型与触发条件：**

| 类型 | 触发条件 | 优先级 |
|------|----------|--------|
| overview | 始终生成 | 100 |
| extreme | 有 groupBy 且极值差距 > 50% | 90/80 |
| concentration | Top3 占比 > 60% 且数据量 >= 5 | 85 |
| trend | 数据量 >= 4，前后半段变化 > 15% | 88 |
| anomaly | 异常值数量在合理范围内 (<=20%) | 70 |
| correlation | 多指标间 |r| > 0.7 | 92 |

---

#### `sampleData.js` - 示例数据集

| 数据集 | 内容 | 规模 |
|--------|------|------|
| `salesData` | 月度产品销售额与利润率 | 12行 × 6列 |
| `categoryData` | 品类销售统计（销售额/订单量/客单价/满意度） | 7行 × 5列 |
| `cityData` | 城市经济数据（人口/GDP/人均GDP/增长率） | 10行 × 5列 |

---

### 3.4 组件详解 (`components/`)

#### `App.vue` - 根组件

**布局结构：**
```
┌─ Header（固定顶部）─────────────────────────────┐
│  Logo  │  导航 Tab（导入/数据/图表/统计/洞察）  │  用户信息+操作  │
└──────────────────────────────────────────────────┘
┌─ Main Content（动态内容区）─────────────────────┐
│  根据 activeTab 渲染不同组件：                     │
│  • import  → DataImporter                        │
│  • table   → DataTable                           │
│  • chart   → InsightCards + NLCommand +         │
│              ChartConfig(sticky) + TimeAnimation  │
│              + ChartRenderer + StoryTeller        │
│  • stats   → StatPanel                           │
│  • insight → AnomalyPanel + StoryTeller          │
└──────────────────────────────────────────────────┘
┌─ Footer（底部）─────────────────────────────────┐
│  DataViz · 数据可视化手账                         │
└──────────────────────────────────────────────────┘
```

**Tab 显隐逻辑**：`hasData = store.headers.length > 0`，有数据时才显示 table/chart/stats/insight

---

#### `DataImporter.vue` - 数据导入

**三大入口：**
1. **文件拖拽/点击上传**：支持 `.csv`, `.xlsx`, `.xls`, `.json`, `.txt`
   - 根据后缀自动选择解析器（CSV → Excel → JSON → fallback CSV）
2. **文本粘贴**：`parseText()` 智能识别 JSON/CSV/TSV
3. **示例数据**：一键加载 sales/category/city 三种内置数据集

状态：`dragOver`（拖拽悬停）、`loading`（解析中）、`error`（错误提示）

---

#### `DataTable.vue` - 数据表格

**功能：**
- 显示数据类型标签（数值/文本/日期）
- 全文搜索（跨列模糊匹配）
- 分页浏览（每页 15 条）
- 响应式布局，最大高度 520px 可滚动

---

#### `ChartConfig.vue` - 图表配置面板

**配置区域：**

1. **数据聚合区**（数据量 > 20 时显示）
   - 聚合开关 + 维度选择（推荐维度优先）+ 聚合方式 + 聚合结果预览

2. **图表类型选择**
   - 10 种类型网格按钮：bar/line/area/pie/donut/scatter/radar/funnel/heatmap/projectionMap

3. **轴配置**
   - X轴/维度选择（根据图表类型智能过滤可选列）
   - Y轴/指标选择（支持多选/单选切换）
   - 地图范围选择（全国/各省下钻）

4. **外观设置**
   - 标题/副标题输入
   - 主题色选择（10种预设 + 自定义取色器）
   - 显示开关：图例/提示框/数据标签/堆叠/平滑曲线/按值排序/手绘风格

**`selectType(type)` 逻辑**：切换图表类型时自动重置 X/Y 列的默认选择，以适配新图表类型的数据要求。

---

#### `ChartRenderer.vue` - 图表渲染核心

**核心职责：** 根据 `store` 状态和 `chartData` 计算 ECharts `option`。

**关键设计：**

| 特性 | 实现方式 |
|------|----------|
| 图表类型覆盖 | bar/line/area/pie/donut/scatter/radar/funnel/heatmap/projectionMap |
| 手绘风格 | `sketchMode` 开启时：SVG 渲染器 + Rough.js 边框 + 更大圆角/边框宽度 + `elasticOut` 动画 |
| 主题色系统 | `getColors(count, baseColor, sketch)` 基于调色板生成系列色 |
| 中国地图 | 阿里云 DataV GeoJSON 服务动态加载，支持省级下钻 |
| 数值格式化 | 自动换算 亿/万/K（tooltip 和 axisLabel） |
| 导出图片 | `chart.getDataURL()` 生成 PNG 下载 |
| 强制刷新 | `chartKey++` 销毁重建图表组件，清除配置残留 |

**手绘模式 (`sketchMode`) 细节：**
- 使用 `ResizeObserver` 监听容器尺寸变化，动态重绘 Rough.js SVG 边框
- 边框效果：手绘风格矩形边框 + 四角胶带装饰
- 图表内部：更粗的线宽、更大的圆角、`elasticOut` 弹性动画

**地图加载 (`loadMap`) 流程：**
1. 根据 `store.mapProvince` 确定 mapName（全国或 `province-{adcode}`）
2. 检查缓存 `provinceMapCache`，已缓存直接复用
3. 并发控制：`mapLoadingPromise` 防止重复请求
4. 从 `https://geo.datav.aliyun.com/areas_v3/bound/` 获取 GeoJSON
5. `echarts.registerMap(mapName, geoJson)` 注册地图数据
6. 省级名称标准化映射 + 市级名称自动补全后缀（市/区/州/盟/县）

---

#### `StatPanel.vue` - 统计分析

**功能：**
- 数值列选择器
- 统计量计算：样本数、总和、平均值、最大值、最小值、中位数、标准差
- 分布概览可视化：最小/中位/平均/最大值的位置条带图

---

#### `InsightCards.vue` - KPI 洞察卡片

**数据来源优先级：**
1. `currentKPIs`（聚合后的 KPI）
2. fallback：直接从当前 chartData 计算简单 KPI

**展示内容：**
- 4 张核心卡片：总计 / 平均值 / 最大值 / 最小值
- 额外洞察标签：最高/最低出现的维度值

---

#### `LoginView.vue` - 登录/注册页

**特性：**
- 登录/注册 Tab 切换
- 密码可见性切换
- 表单校验（用户名 ≥3 字符，密码 ≥6 位）
- 注册后自动登录

---

#### `StoryTeller.vue` - 数据故事

**展示结构：**
- 头部：图标 + "数据故事" 标题 + 一句话摘要
- 故事卡片列表：根据类型显示不同背景色和图标
  - `📊 overview` / `🏆 extreme` / `🎯 concentration` / `📈 trend` / `⚡ anomaly` / `🔗 correlation`

---

#### `AnomalyPanel.vue` - 异常侦探

**展示结构：**
- 头部：异常总数 + 严重级别统计
- 分类标签：按异常类型显示彩色徽章
- 异常列表：可展开查看详细说明，按严重程度（高/中/低）排序和着色

---

#### `NLCommand.vue` - 自然语言出图

**交互流程：**
1. 用户在输入框键入中文指令（如 "把销售额按月份做成折线图，用蓝色"）
2. 回车或点击发送按钮触发 `execute()`
3. `parseNaturalLanguage()` 解析为配置对象
4. 将解析结果应用到 `store`（图表类型/X轴/Y轴/聚合/颜色/样式等）
5. 自动切换至 chart 页签
6. 底部显示解析反馈（成功/失败提示）

**辅助功能：**
- 示例命令下拉面板（点击灯泡图标展开）
- 6 条内置示例命令

---

#### `TimeAnimation.vue` - 时间演变动画

**触发条件：** 数据中包含时间相关列（类型为 date 或列名含日期/时间/月份/年等关键词）且数据量 > 3

**控制功能：**
- 播放/暂停/重置
- 进度条拖拽（`input[type=range]`）
- 三档速度：慢(600ms)/中(300ms)/快(150ms)

**与图表联动：** `chartData` computed 中根据 `timeCurrentIndex` 对 `rows` 做 `slice(0, timeCurrentIndex)`，实现逐步展示效果。

**生命周期管理：**
- 组件卸载时 `stop()` 清除定时器
- 离开 chart 页签时自动停止动画

---

## 4. 数据流与依赖关系

### 4.1 核心数据流

```
用户操作（导入/配置/NLP）
    │
    ▼
┌──────────────┐     ┌──────────────┐
│ useStore.js  │◄────│ 各种 setter  │
│  (store)     │     │ setData/直接修改
└──────┬───────┘     └──────────────┘
       │
       │ reactive 依赖追踪
       ▼
┌─────────────────────────────────────┐
│ computed: chartData / currentKPIs   │
│  • 聚合计算 (aggregator.js)         │
│  • 时间过滤 (TimeAnimation)         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ 各组件消费状态                        │
│  • ChartRenderer.vue → echarts option│
│  • InsightCards.vue → KPI 卡片       │
│  • StoryTeller.vue → 数据故事        │
│  • AnomalyPanel.vue → 异常检测       │
│  • StatPanel.vue → 统计分析          │
└─────────────────────────────────────┘
```

### 4.2 模块依赖图

```
App.vue
├── useStore.js ──────┬── dataParser.js
├── useAuth.js        ├── aggregator.js
│                     ├── anomalyDetector.js
├── DataImporter.vue ─┘── sampleData.js
├── DataTable.vue
├── ChartConfig.vue ──┬── aggregator.js (AGG_FUNCTIONS)
├── ChartRenderer.vue─┬── useStore.js (chartData)
│                     ├── echarts/core (registerMap)
│                     └── rough.js (sketchMode)
├── StatPanel.vue
├── InsightCards.vue ─┬── aggregator.js (fmt)
├── StoryTeller.vue ──┬── storyGenerator.js
├── AnomalyPanel.vue ─┴── anomalyDetector.js
├── NLCommand.vue ────┴── nlParser.js
└── TimeAnimation.vue
```

---

## 5. 项目运行方式

### 5.1 环境要求
- Node.js 18+
- npm 或兼容包管理器

### 5.2 安装依赖
```bash
npm install
```

### 5.3 开发模式
```bash
npm run dev
```
- 启动 Vite 开发服务器
- 默认地址：`http://localhost:5173`
- 支持热更新 (HMR)

### 5.4 生产构建
```bash
npm run build
```
- 输出目录：`dist/`
- 生成优化后的静态资源（JS/CSS 自动拆分、压缩）

### 5.5 预览生产构建
```bash
npm run preview
```
- 本地预览 `dist/` 目录内容

### 5.6 依赖清单

**生产依赖：**
| 包名 | 版本 | 用途 |
|------|------|------|
| `vue` | ^3.5.34 | 前端框架 |
| `echarts` | ^6.1.0 | 图表引擎 |
| `echarts-gl` | ^2.1.0 | 3D 图表支持（预留） |
| `vue-echarts` | ^8.0.1 | Vue 封装的 ECharts 组件 |
| `tailwindcss` | ^4.3.0 | CSS 工具类框架 |
| `@tailwindcss/vite` | ^4.3.0 | Tailwind v4 Vite 插件 |
| `@lucide/vue` | ^1.17.0 | 图标库 |
| `papaparse` | ^5.5.3 | CSV 解析 |
| `xlsx` | ^0.18.5 | Excel 解析 |
| `roughjs` | ^4.6.6 | 手绘风格 SVG 渲染 |

**开发依赖：**
| 包名 | 版本 | 用途 |
|------|------|------|
| `vite` | ^8.0.12 | 构建工具 |
| `@vitejs/plugin-vue` | ^6.0.6 | Vue SFC 支持 |

---

## 6. 设计规范与约定

### 6.1 命名规范
- **组件名**：PascalCase（如 `ChartRenderer.vue`）
- **composables**：camelCase 以 `use` 开头（如 `useStore.js`）
- **utils**：camelCase 纯函数文件（如 `dataParser.js`）
- **状态变量**：`store.xxx` 全局状态，局部响应式用 `ref`/`computed`

### 6.2 样式约定
- 使用 Tailwind CSS 工具类为主
- 自定义颜色通过 `@theme` 在 `style.css` 中定义
- 手账风格字体栈：`'STKaiti', 'KaiTi', 'FangSong', 'Georgia', serif`
- 纸张背景色：`#fffef9`，边框色：`#e0d8cc`
- 动画类：`.animate-fade-in` 用于页面切换淡入

### 6.3 代码组织原则
- **状态集中**：所有全局状态放在 `useStore.js`，组件通过导入直接使用
- **逻辑复用**：数据解析/聚合/检测等纯逻辑提取到 `utils/`
- **组件职责单一**：每个组件聚焦一个功能域
- **计算属性驱动**：图表渲染通过 `computed` option 自动响应状态变化

---

## 7. 扩展与定制指南

### 7.1 添加新图表类型
1. 在 `main.js` 中 `use()` 注册对应的 ECharts chart 模块
2. 在 `ChartConfig.vue` 的 `chartTypes` 数组添加新类型
3. 在 `ChartRenderer.vue` 的 `option` computed 中添加新类型的 option 生成逻辑
4. 在 `nlParser.js` 的 `CHART_TYPE_MAP` 中添加自然语言映射

### 7.2 添加新数据源格式
1. 在 `dataParser.js` 中新增解析函数
2. 在 `DataImporter.vue` 的 `processFile()` 中添加格式判断分支

### 7.3 添加新异常检测规则
1. 在 `anomalyDetector.js` 的 `detectAnomalies()` 中新增检测逻辑
2. 如需新类型，在 `ANOMALY_TYPES` 中定义
3. 在 `AnomalyPanel.vue` 中确认展示逻辑已兼容

### 7.4 修改主题色
- 全局主题色：修改 `style.css` 中 `@theme` 的 `--color-primary`
- 图表预设色板：修改 `ChartRenderer.vue` 中 `palettes` 对象

---

*文档生成时间：2026-07-13*
*对应代码版本：以仓库当前代码为准*
