---
title: 数据可视化
description: ECharts 核心配置、大屏性能优化、resize 处理
---

# 数据可视化（ECharts）

## 必会基础 ⭐⭐⭐

### ECharts `option` 核心结构：title / legend / tooltip / xAxis / yAxis / series

ECharts 通过一个声明式的 `option` 对象来描述图表。六个核心属性各司其职：`title` 控制标题样式与位置，`legend` 管理图例与系列联动，`tooltip` 配置悬浮提示框的触发方式和格式化，`xAxis` / `yAxis` 定义坐标轴类型（category/value/time），`series` 则是数据系列的核心入口，决定图表类型及数据源。理解这个骨架后，所有图表本质上都是在这六者之上做组合与扩展。

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

### 常用图表：line / bar / pie / scatter / heatmap

五种图表覆盖了绝大多数业务场景：折线图适合趋势与时间序列，柱状图用于分类对比，饼图展示占比关系（慎用过多扇区），散点图揭示双变量分布与相关性，热力图以颜色密度表达矩阵强度。面试中常问它们的适用场景差异及 series.type 对应的特有配置项。

| 图表类型 | `series.type` | 典型场景 | 特有配置 |
|----------|--------------|---------|---------|
| 折线图 | `line` | 趋势、时间序列 | `smooth`, `areaStyle`, `step` |
| 柱状图 | `bar` | 分类对比 | `stack`, `barWidth`, `barGap` |
| 饼图 | `pie` | 占比分布 | `radius`（环形）, `roseType` |
| 散点图 | `scatter` | 相关性分析 | `symbolSize`（气泡图） |
| 热力图 | `heatmap` | 矩阵密度 | `visualMap` 配合使用 |

### 动态更新数据：`chart.setOption(option, { notMerge: false })`

`setOption` 的第二个参数控制合并策略。默认 `notMerge: false` 会将新 option 深度合并到已有配置中，适合增量更新（比如只换数据不改样式）。设为 `true` 则完全替换，适合切换图表类型或重置配置。第三个参数 `lazyUpdate` 在批量更新多个图表时可延迟渲染以提升性能。

```js
// 增量更新：只替换 series 数据，保留其他配置
chart.setOption({ series: [{ data: newData }] })

// 完全替换：切换图表类型时使用
chart.setOption(newOption, { notMerge: true })

// 批量更新时不立即渲染，最后统一 flush
chart.setOption(opt1, false, true)
chart.setOption(opt2, false, true)
chart.setOption(opt3, false, true)
// ECharts 会在下一帧自动合并渲染
```

### 响应式 resize：监听容器尺寸变化，调用 `chart.resize()`

当容器大小改变（窗口缩放、侧边栏展开/收起）时，必须调用 `chart.resize()` 让图表重新计算布局。推荐使用 `ResizeObserver` 而非 `window.resize` 事件，前者精确监听容器自身尺寸变化，避免无关的全局 resize 触发无意义的重绘，也无需手动计算容器宽高。

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

## 进阶考点 ⭐⭐

### 大数据量优化：`large: true` / 降采样（`sampling: 'lttb'`）/ 数据集（`dataset`）

当数据量达到万级以上时，Canvas 绘制会成为性能瓶颈。三条路径可组合使用：`large: true` 开启折线/散点图的大数据模式，跳过图形元素创建直接绘制路径；`sampling: 'lttb'`（Largest-Triangle-Three-Buckets）在视觉不失真的前提下对数据进行降采样；`dataset` 将数据提取到 option 顶层，多个 series 共享同一数据集，避免重复传输。

```js
const option = {
  dataset: {
    source: largeDataArray // 共享数据集
  },
  series: [
    {
      type: 'line',
      large: true,            // 大数据模式
      sampling: 'lttb',       // 降采样算法
      encode: { x: 0, y: 1 }  // 配合 dataset 映射列
    }
  ]
}
```

### 自定义渲染：`renderItem`（自定义系列）/ Canvas vs SVG 渲染器选择

`renderItem` 允许开发者用 Canvas API 完全接管图形绘制，适用于复杂可视化（如甘特图、关系图）或需要自定义形状的场景。ECharts 默认使用 Canvas 渲染器（适合大量图形），如需更好的交互体验或导出缩放不失真，可在 `init` 时指定 SVG 模式。

| 维度 | Canvas（默认） | SVG |
|------|---------------|-----|
| 大数据量 | ✅ 性能好 | ❌ DOM 节点过多会卡顿 |
| 交互/事件 | 需通过 ECharts 事件系统 | 原生 DOM 事件 |
| 缩放不失真 | ❌ 位图缩放模糊 | ✅ 矢量无损 |
| 导出/打印 | 需 `getDataURL` 导出位图 | 可直接嵌入 HTML |
| 使用方式 | 默认 | `echarts.init(dom, null, { renderer: 'svg' })` |

### 地图可视化：`geo` 组件 + 自定义地图 JSON

ECharts 不内置中国地图，需要注册自定义 GeoJSON（通常从 DataV 或自然资源部获取）。`geo` 组件定义地图底图，`series.type: 'map'` 绑定数据和地图名称，`visualMap` 实现区域着色映射。注意地图 GeoJSON 必须通过 `echarts.registerMap('name', geoJSON)` 注册后才能使用。

```js
// 1. 注册地图
echarts.registerMap('china', chinaGeoJSON)

// 2. 配置 option
const option = {
  geo: {
    map: 'china',
    roam: true,        // 允许缩放拖拽
    label: { show: true }
  },
  visualMap: {
    min: 0,
    max: 1000,
    inRange: { color: ['#e0f3f8', '#045a8d'] }
  },
  series: [{
    type: 'map',
    map: 'china',
    data: [{ name: '广东', value: 800 }, { name: '北京', value: 600 }]
  }]
}
```
