---
title: 数据可视化
description: ECharts 核心配置、大数据量优化、地图可视化
---

# 数据可视化（ECharts）

## 一、ECharts 基础

### option 核心六件套

ECharts 通过声明式 `option` 描述图表，六个核心属性：`title`（标题）、`legend`（图例联动）、`tooltip`（悬浮提示）、`xAxis`/`yAxis`（坐标轴）、`series`（数据系列，决定图表类型和数据源）。

```js
const option = {
  title: { text: '月销售额' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['销售额', '利润'] },
  xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
  yAxis: { type: 'value', name: '万元' },
  series: [
    { name: '销售额', type: 'line', data: [120, 132, 101, 134, 90, 230], smooth: true, areaStyle: {} },
    { name: '利润', type: 'bar', data: [20, 32, 11, 34, 20, 80] },
  ],
}
chart.setOption(option)
```

### 常用图表类型

| 图表 | `series.type` | 典型场景 | 特有配置 |
|------|--------------|---------|---------|
| 折线图 | `line` | 趋势、时间序列 | `smooth`, `areaStyle` |
| 柱状图 | `bar` | 分类对比 | `stack`, `barWidth` |
| 饼图 | `pie` | 占比分布 | `radius`（环形）, `roseType` |
| 散点图 | `scatter` | 相关性分析 | `symbolSize`（气泡图） |
| 热力图 | `heatmap` | 矩阵密度 | 配合 `visualMap` |

### 数据更新与响应式

`setOption` 第二个参数控制合并策略：默认 `notMerge: false` 深度合并（增量换数据），设为 `true` 完全替换（切换图表类型）。第三个参数 `lazyUpdate` 批量更新时延迟渲染。

```js
chart.setOption({ series: [{ data: newData }] })          // 增量更新
chart.setOption(newOption, { notMerge: true })              // 完全替换
chart.setOption(opt, false, true); /* ... */; // 批量不立即渲染
```

### ResizeObserver 自适应

`ResizeObserver` 精确监听容器尺寸变化调用 `chart.resize()`，比 `window.resize` 更精准（侧边栏展开/收起、flex 布局变化也能感知）。

```ts
const observer = new ResizeObserver(() => chart.resize())
observer.observe(chartRef.value!)
// onBeforeUnmount: observer.disconnect(); chart.dispose()
```

---

## 二、进阶实战

### 大数据量优化

| 手段 | 作用 | 配置 |
|------|------|------|
| `large: true` | 跳过图形元素创建，直接绘制路径 | 折线/散点图适用 |
| `sampling: 'lttb'` | LTTB 降采样，视觉不失真 | 配合 dataZoom 按需渲染 |
| `dataset` | 多 series 共享数据源，避免重复传输 | option 顶层声明 |

```js
const option = {
  dataset: { source: largeDataArray },
  series: [{ type: 'line', large: true, sampling: 'lttb', encode: { x: 0, y: 1 } }],
}
```

### 渲染器选择

| 维度 | Canvas（默认） | SVG |
|------|---------------|-----|
| 大数据量 | ✅ 性能好 | ❌ DOM 过多卡顿 |
| 交互 | ECharts 事件系统 | 原生 DOM 事件 |
| 缩放 | ❌ 位图模糊 | ✅ 矢量无损 |
| 初始化 | `echarts.init(dom)` | `echarts.init(dom, null, { renderer: 'svg' })` |

### 地图可视化

ECharts 不内置地图，需加载 GeoJSON 并 `registerMap` 注册：

```js
echarts.registerMap('china', chinaGeoJSON)
const option = {
  geo: { map: 'china', roam: true, label: { show: true } },
  visualMap: { min: 0, max: 1000, inRange: { color: ['#e0f3f8', '#045a8d'] } },
  series: [{ type: 'map', map: 'china', data: [{ name: '广东', value: 800 }] }],
}
```

> **选型**：中后台 Dashboard → ECharts（组件丰富、中文生态好）；BI 分析 → AntV G2（图形语法灵活）；海外轻量 → Chart.js（bundle 小）；专业 GIS → Mapbox/deck.gl。
