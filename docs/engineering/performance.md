---
title: 前端性能优化
description: 加载优化、运行时优化、框架级优化、性能监控体系与常见面试题
---

# 前端性能优化

## 一、加载优化

### 代码分割

动态 `import()` 将大 bundle 拆为按需加载的小块，首屏只加载必需代码。React 用 `lazy + Suspense`，Vue 用 `defineAsyncComponent`：

```js
// 通用：路由级代码分割
const About = () => import('./pages/About.vue')

// React: lazy + Suspense
const HeavyChart = lazy(() => import('./HeavyChart'))
;<Suspense fallback={<Skeleton />}><HeavyChart /></Suspense>
```

### 图片优化

图片通常占页面体积 60%+。三步走：**格式**（WebP/AVIF 比 JPEG 小 25%~50%）→ **响应式**（`srcset` + `sizes` 按屏幕选最优尺寸）→ **懒加载**（`loading="lazy"` 延迟加载视口外图片）。

```html
<picture>
  <source srcset="hero.webp 1x, hero@2x.webp 2x" type="image/webp" />
  <img src="hero.jpg" loading="lazy" decoding="async" width="1200" height="630" />
</picture>
```

| 格式 | 有损压缩 | 透明 | 压缩率（vs JPEG） |
|------|---------|------|------------------|
| JPEG | ✅ | ❌ | 基准 |
| WebP | ✅ | ✅ | 小 25%-35% |
| AVIF | ✅ | ✅ | 小 50% |

### 预加载策略

| 资源提示 | 优先级 | 时机 | 典型场景 |
|---------|-------|------|---------|
| `<link rel="preload">` | 高 | 当前页面立即需要 | 字体、关键 CSS、首屏图片 |
| `<link rel="prefetch">` | 低 | 空闲时下载 | 下一页 JS chunk |
| `<link rel="preconnect">` | — | 提前 DNS+TCP+TLS | 第三方 CDN、字体服务 |

### 关键 CSS 内联

将首屏必需的 CSS 内联到 `<head>` 的 `<style>` 标签中，避免外部 CSS 的请求往返阻塞渲染。控制在 14KB 以内（一个 TCP 慢启动窗口），剩余 CSS 异步加载：

```html
<style>/* 首屏关键样式 */</style>
<link rel="preload" href="/styles/full.css" as="style" onload="this.rel='stylesheet'" />
```

### 压缩与 CDN

静态资源构建时同时生成 `.br` 和 `.gz`，Nginx `brotli_static on` 优先返回 Brotli，旧浏览器降级 Gzip。CDN 分发到边缘节点，配合强缓存（带哈希文件 `max-age=31536000, immutable`，HTML 用 `no-cache`），命中率可达 98%+。

> **踩坑**：CDN 缓存忘设 `Vary: Accept-Encoding`，Brotli 版本返回给只支持 Gzip 的旧 WebView 导致白屏。preload 滥用会抢占带宽——只对首屏字体和 Hero 图使用。

---

## 二、运行时优化

### 虚拟列表

只渲染可视区域 + 少量缓冲区的 DOM，滚动时动态替换内容。万级列表 DOM 节点从 10000 → ~30 个。

```jsx
// react-window
<FixedSizeList height={600} itemCount={100000} itemSize={50} width="100%">
  {({ index, style }) => <div style={style}>Row {index}</div>}
</FixedSizeList>
```

> 动态高度用 `ResizeObserver` 实测缓存 + 累积高度二分查找定位 startIndex。虚拟列表中嵌 ECharts 迷你图要做对象池复用，避免滚动时不断新建/销毁实例。

### 防抖节流

| | 防抖（Debounce） | 节流（Throttle） |
|---|---|---|
| 执行时机 | 停止触发后 delay ms | 每隔 delay ms 固定执行 |
| 连续触发 | 只执行最后一次 | 按固定频率执行多次 |
| 典型场景 | 搜索框联想、resize | scroll 加载、埋点上报 |

```js
function debounce(fn, delay = 300) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

function throttle(fn, delay = 300) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= delay) { last = now; fn.apply(this, args) }
  }
}
```

> 在 React/Vue 中使用需用 `useMemo`/`useCallback` 或 composable 中 `onUnmounted` 清理 timer，否则每次 render 创建新函数导致失效且内存泄漏。

### 重排重绘避免

浏览器渲染管线：**JS → Style → Layout（重排）→ Paint（重绘）→ Composite（合成）**。尽量让动画只触发 Composite——`transform` 和 `opacity` 代替 `left`/`top`/`width`/`height`。避免强制同步布局：不要在一次操作中"先写后读"。

```js
// ❌ 强制同步布局：写 → 读 → 写
el.style.width = '100px'  // 写
const h = el.offsetHeight  // 读（强制同步布局！）
el.style.height = h + 'px' // 写

// ✅ 读写分离
const heights = els.map(el => el.offsetHeight) // 批量读
els.forEach((el, i) => el.style.height = heights[i] + 'px') // 批量写
```

> 详见 CSS 深入章节的重排重绘部分。

### 首屏渲染模式

| 模式 | 首屏速度 | SEO | 服务器压力 | 适用场景 |
|------|---------|-----|-----------|---------|
| CSR | 慢 | 差 | 无 | 后台管理、工具型 SPA |
| SSR | 快 | 好 | 高 | 内容型 + 个性化 |
| SSG | 极快 | 最好 | 构建时 | 博客、文档、营销页 |
| ISR | 较快 | 好 | 中 | 内容更新不频繁 |

骨架屏是感知优化——加载期间展示占位图形，不减少实际时间但提升体验。

---

## 三、框架级优化

### React：memo / useMemo / useCallback

三者的使用原则是"**先写清晰代码，Profiler 定位瓶颈后再精确优化**"：

- **React.memo**：props 浅比较，不变则跳过渲染。适合纯展示组件。
- **useMemo**：缓存计算结果，依赖不变返回上次值。适合昂贵计算。
- **useCallback**：缓存函数引用，与 memo 配合保证回调引用稳定。

**不必要渲染三大来源**：父组件更新引起子组件被动渲染、内联对象每次创建新引用导致 memo 失效、Context 值变化导致所有 consumer 重渲染。解法：**状态下沉**（状态放最接近使用处）、**Context 拆分**（高频/低频分不同 Context）、**children 提升**（状态组件渲染时 children 已是稳定 VNode）。

```jsx
// ❌ count 变化导致 ExpensiveTree 重渲染
function App() {
  const [count, setCount] = useState(0)
  return <><button onClick={() => setCount(c => c + 1)}>{count}</button><ExpensiveTree /></>
}

// ✅ 状态下沉，ExpensiveTree 不受影响
function CounterButton() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
function App() { return <><CounterButton /><ExpensiveTree /></> }
```

### Vue：shallowRef / v-memo / KeepAlive

- **shallowRef**：只追踪 `.value` 替换，深层属性修改不触发代理递归。适合 ECharts 实例、大 JSON、地图 GeoJSON。
- **v-memo**（Vue 3.2+）：依赖数组不变时跳过 VNode 创建，类似模板层的 `useMemo`。
- **KeepAlive**：缓存被切换的组件实例，切换时保留 DOM 和响应式数据。设置 `:max` 限制缓存数量（LRU 淘汰），在 `onDeactivated` 清理定时器/事件。

```vue
<KeepAlive :include="['TabHome']" :max="3">
  <component :is="currentTab" />
</KeepAlive>
```

> **踩坑**：ECharts 实例用 `ref` 而非 `shallowRef` 存储——Vue 深度代理了几千个内部属性，初始化从 50ms 暴增到 400ms。React.memo 滥用反而加内存开销——先 Profiler 定位热点，只在渲染耗时 >1ms 的组件上做 memo。

---

## 四、性能监控体系

### 三层监控

| 层级 | 工具 | 目的 |
|------|------|------|
| CI 门禁 | Lighthouse CI + Performance Budget | 上线前阻断性能退化 |
| 线上 RUM | `web-vitals` 库 / PerformanceObserver | 采集真实用户 LCP/INP/CLS |
| 深度分析 | Chrome Performance Tab + Bundle Analyzer | 定位具体瓶颈 |

### Web Vitals 核心指标

| 指标 | 含义 | 优秀阈值 | 权重 |
|------|-----|---------|------|
| LCP | 最大内容绘制 | ≤2.5s | 25% |
| INP | 交互到下次绘制（替代 FID） | ≤200ms | — |
| CLS | 累积布局偏移 | ≤0.1 | 25% |
| FCP | 首次内容绘制 | ≤1.8s | 10% |
| TBT | 总阻塞时间 | ≤200ms | 30% |

```js
import { onLCP, onINP, onCLS, onFCP } from 'web-vitals'
function send({ name, delta, rating }) {
  fetch('/api/vitals', { method: 'POST', body: JSON.stringify({ name, value: delta, rating }), keepalive: true })
}
onCLS(send); onINP(send); onLCP(send); onFCP(send)
```

### Bundle Analyzer

webpack-bundle-analyzer / rollup-plugin-visualizer 将产物以矩形树图可视化。重点关注：`moment.js` 带了全量 locale、两个版本 lodash 重复、无意引入全量包而非 tree-shakable 版本。

### PerformanceObserver

异步监听性能条目，比轮询 `getEntries()` 更高效。关键类型：`resource`（资源加载）、`longtask`（>50ms 长任务）、`largest-contentful-paint`（LCP）、`layout-shift`（CLS）。`buffered: true` 获取注册前的条目，避免数据丢失。

---

## 五、常见面试题

### 首屏加载慢怎么排查？

**测量 → 定位 → 优化 → 验证**四步：Lighthouse 获取 FCP/LCP/TBT 评分 → Chrome Performance 找出长任务和阻塞资源 → Network 瀑布图识别关键请求链瓶颈 → 对症优化 → 重跑 Lighthouse 对比分数 + RUM P75 数据验证。

瓶颈常见方向：Bundle 过大 → 代码分割 + 替换重型库；渲染阻塞 → 关键 CSS 内联 + JS defer；网络慢 → CDN + 强缓存 + Brotli；图片大 → WebP + srcset + 懒加载。

### 长列表 10 万条怎么渲染？

虚拟列表：只渲染可视区 DOM，滚动时根据 scrollTop 计算 startIndex/endIndex。动态高度用预估 + `ResizeObserver` 实测修正。React 用 `react-window`/`react-virtuoso`，Vue 用 `vue-virtual-scroller`。边界：搜索/筛选后重置位置、结合无限滚动追加数据、DOM 复用而非创建销毁。

### 怎么做性能监控？

**合成监控**：Lighthouse CI 在 PR 阶段自动跑，设置 Performance Budget 低于阈值阻断合并。**RUM**：`web-vitals` 采集真实用户数据，按 P75/P95 分位值、设备、网络、地域分层分析，Grafana 设置告警（INP > 200ms / CLS > 0.1）。数据上报用 `navigator.sendBeacon` 或 `fetch` + `keepalive: true` 保证页面关闭时不丢失。

> **踩坑**：Lighthouse 跑分很高但用户说卡——Lighthouse 模拟 Moto G4 + 3G，和真实设备/网络差异大，必须结合 RUM 数据分层分析。全量引入 ECharts 导致 bundle 暴增 800KB——改用 `echarts/core` 按需引入，降到 150KB。
