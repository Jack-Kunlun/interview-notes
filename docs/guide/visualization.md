---
title: 数据可视化
description: ECharts 核心配置、大屏性能优化、resize 处理
---

# 数据可视化（ECharts）

## 必会基础 ⭐⭐⭐

- [ ] ECharts `option` 核心结构：title / legend / tooltip / xAxis / yAxis / series
- [ ] 常用图表：line / bar / pie / scatter / heatmap
- [ ] 动态更新数据：`chart.setOption(option, { notMerge: false })`
- [ ] 响应式 resize：监听容器尺寸变化，调用 `chart.resize()`

## 进阶考点 ⭐⭐

- [ ] 大数据量优化：`large: true` / 降采样（`sampling: 'lttb'`）/ 数据集（`dataset`）
- [ ] 自定义渲染：`renderItem`（自定义系列）/ Canvas vs SVG 渲染器选择
- [ ] 地图可视化：`geo` 组件 + 自定义地图 JSON

## ECharts option 基础结构

```js
const option = {
  title: { text: '月销售额趋势' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['销售额', '利润'] },
  xAxis: {
    type: 'category',
    data: ['1月', '2月', '3月', '4月', '5月', '6月']
  },
  yAxis: { type: 'value', name: '万元' },
  series: [
    {
      name: '销售额',
      type: 'line',
      data: [120, 132, 101, 134, 90, 230],
      smooth: true,
      areaStyle: {}
    },
    {
      name: '利润',
      type: 'bar',
      data: [20, 32, 11, 34, 20, 80]
    }
  ]
}

chart.setOption(option)
```

## resize 监听示例

```ts
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts

onMounted(() => {
  chart = echarts.init(chartRef.value!)
  chart.setOption(option)

  // 推荐用 ResizeObserver（比 window.resize 更精准）
  const observer = new ResizeObserver(() => chart.resize())
  observer.observe(chartRef.value!)

  onBeforeUnmount(() => {
    observer.disconnect()
    chart.dispose()
  })
})
```
