import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import VueECharts from 'vue-echarts'
import 'vue-echarts/style.css'
import { use } from 'echarts/core'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart,
  RadarChart, FunnelChart, HeatmapChart, MapChart
} from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, DatasetComponent, TransformComponent,
  ToolboxComponent, DataZoomComponent, VisualMapComponent,
  MarkPointComponent, MarkLineComponent, GeoComponent
} from 'echarts/components'

use([
  CanvasRenderer, SVGRenderer,
  BarChart, LineChart, PieChart, ScatterChart,
  RadarChart, FunnelChart, HeatmapChart, MapChart,
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, DatasetComponent, TransformComponent,
  ToolboxComponent, DataZoomComponent, VisualMapComponent,
  MarkPointComponent, MarkLineComponent, GeoComponent
])

const app = createApp(App)
app.component('v-chart', VueECharts)
app.mount('#app')
