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

### 💬 面试深度

**标准回答**：ECharts 是 option 驱动的声明式图表库——你只需描述"我想要什么样的图表"，不需要关心绘制细节。核心流程是 `echarts.init(dom)` 初始化实例，再 `setOption(option)` 传入配置，ECharts 内部做增量更新，只重绘变化的部分。`notMerge` 参数控制是否与旧配置合并：默认 `false` 做深度合并适合增量换数据，设为 `true` 则完全替换适合切换图表类型。配合 `ResizeObserver` 监听容器尺寸调用 `chart.resize()`，就能实现自适应布局。

**追问预判**：
- "ECharts 和 Chart.js / AntV G2 怎么选？"——ECharts 开箱即用、中文生态好、适合国内业务大屏场景；G2 图形语法更灵活，适合定制化 BI 分析；Chart.js 轻量（~200KB vs ECharts ~1MB 全量），适合海外项目或简单图表。国内中后台管理系统首选 ECharts。
- "为什么 resize 用 ResizeObserver 而不是 window.resize？"——`window.resize` 只在窗口大小变化时触发，如果侧边栏展开收起、父容器 flex 布局变化导致图表容器尺寸改变，它完全感知不到。`ResizeObserver` 精确监听目标元素的 content-box 变化，只在该容器真的变时才触发重绘，更精准也避免无效调用。

**源码在哪**：`echarts/src/core/echarts.ts`——`init()` 和 `setOption()` 的入口都在这里，`resize()` 方法也定义在 ECharts 类上。

**踩过的坑**：全量引入 ECharts（`import * as echarts from 'echarts'`）导致打包后 bundle 暴增约 800KB。后果是首屏加载从 2s 飙到 5s+，Lighthouse 评分直接红了。修复方案：改为按需引入——`import { BarChart, LineChart, PieChart } from 'echarts/charts'` 配合 `import { GridComponent, TooltipComponent } from 'echarts/components'`，按图表类型和组件逐个注册，最终 bundle 只增加约 120KB。

**项目选型**：中后台 Dashboard 首选 ECharts（组件丰富、文档好）；BI 分析平台考虑 AntV G2（图形语法灵活、自定义能力强）；海外轻量项目用 Chart.js（bundle 小、国际化友好）。

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

### 💬 面试深度

**标准回答**：大数据量优化的核心三板斧是 `large: true` 开启大数据模式跳过图形元素创建、`sampling: 'lttb'` 用最大三角形三桶算法做降采样保持视觉不失真、`dataset` 让多个 series 共享同一份数据源避免重复传输。渲染器方面默认 Canvas 适合万级以上数据，SVG 适合需要无损缩放或富交互的少量图形场景。地图可视化需要手动注册 GeoJSON，通过 `visualMap` 做区域着色。

**追问预判**：
- "大屏数据量大时还有什么优化手段？"——除了 LTTB 降采样，还可以配合 `dataZoom` 按需渲染可视区域，用户缩放到哪个区间就只请求那个区间的数据；Web Worker 把数据聚合计算放到子线程避免阻塞主线程；`series` 过多的图表考虑用 `notMerge: true` 一次性替换 option 而不是多次增量 setOption。
- "图表切换时有什么容易忽略的问题？"——切换图表类型时忘了 `dispose()` 旧实例就直接 `init()` 新实例，会导致 DOM 中存在多个 Canvas 节点，旧实例的 `resize` / `click` 等事件监听依然挂载，产生内存泄漏和事件残留。正确做法是切换前先调 `chart.dispose()` 释放旧实例，或者复用同一个实例直接 `setOption(newOption, { notMerge: true })`。

**源码在哪**：大数据模式核心逻辑在 `echarts/src/chart/line/LineView.ts`（`large` 分支走 `_renderLarge` 直接用 CanvasPath 绘制）；降采样算法在 `echarts/src/util/sampling/lttb.ts`；`dataset` 变换逻辑在 `echarts/src/data/SourceManager.ts`。

**踩过的坑**：Vue 组件中在 `watch` 里监听数据变化后调用 `setOption`，但组件卸载时忘了调用 `chart.dispose()`。后果：每次进入页面都创建新实例，切走再回来图表叠加、hover 事件触发多次 tooltip 闪烁，页面停留 5 分钟后内存占用从 40MB 飙到 200MB+。修复：在 `onBeforeUnmount` / `useEffect` cleanup 中必须调用 `chart.dispose()` 并置空引用，同时检查 `chart.isDisposed()` 防止重复操作。

**项目选型**：企业大屏选 ECharts + `large` + `sampling` 组合（生态成熟、性能调优方案多）；轻量嵌入场景用 uPlot（~45KB，百万级数据无压力）；专业 GIS 可视化不要硬套 ECharts 地图，直接用 Mapbox / deck.gl。
