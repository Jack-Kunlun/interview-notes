---
title: 前端性能优化
description: 系统梳理前端性能优化的核心知识体系，涵盖加载优化、运行时优化、网络优化、React/Vue 框架级优化、性能检查工具、Web Vitals 指标及常见面试题，助你全面掌握性能优化面试考点。
---

# 前端性能优化

## 加载优化

### 资源压缩（Gzip / Brotli）

资源压缩是前端性能优化的第一道防线。服务器在传输资源之前将其压缩，浏览器接收到后自动解压，从而大幅减少传输体积。Gzip 是最广泛使用的压缩算法，兼容性极好，压缩率通常在 60%-80%。Brotli 是 Google 推出的新一代压缩算法，比 Gzip 压缩率高 15%-25%，但压缩速度更慢，适合静态资源预压缩。

两者都通过 HTTP 请求头 `Accept-Encoding` 协商，响应头 `Content-Encoding` 标识实际压缩方式。在生产环境中，静态资源（JS/CSS/HTML/JSON/SVG）必须在构建时预压缩为 `.br` 或 `.gz` 文件，由 Nginx/CDN 直接返回，而非实时压缩。

```nginx
# Nginx 启用 Gzip 实时压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
gzip_min_length 1024;
gzip_comp_level 6;

# Nginx 启用 Brotli 静态预压缩（需要 brotli 模块）
brotli_static on;
```

| 对比维度 | Gzip | Brotli |
|---------|------|--------|
| 压缩率 | 60%-80% | 比 Gzip 再高 15%-25% |
| 压缩速度 | 快 | 比 Gzip 慢（静态预压缩可规避） |
| 解压速度 | 极快 | 与 Gzip 基本持平 |
| 浏览器支持 | 所有浏览器 | 现代浏览器全覆盖（96%+） |
| 最佳实践 | 兜底方案 | 静态资源首选 |

### 代码分割（动态 import + Suspense / lazy）

代码分割（Code Splitting）将单一的大 bundle 拆分为多个小块，实现按需加载，显著降低首屏 JS 体积。Webpack/Vite 等打包工具天然支持动态 `import()` 语法，它返回一个 Promise，打包工具会将动态导入的模块自动拆分为独立 chunk。

在 React 中，`React.lazy()` 配合 `<Suspense>` 实现组件级懒加载。动态 import 的组件必须被 Suspense 包裹，并指定 fallback UI。在 Vue 中，`defineAsyncComponent` 提供类似能力，也支持 loading/error 状态配置。

```js
// 通用动态 import
button.addEventListener('click', async () => {
  const { heavyModule } = await import('./heavyModule.js');
  heavyModule.doSomething();
});

// React: lazy + Suspense
import { lazy, Suspense } from 'react';
const HeavyChart = lazy(() => import('./HeavyChart'));

function App() {
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <HeavyChart />
    </Suspense>
  );
}
```

```js
// Vue: defineAsyncComponent
import { defineAsyncComponent } from 'vue';

const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChart.vue'),
  loadingComponent: () => <div>Loading...</div>,
  delay: 200,          // 200ms 后才显示 loading
  timeout: 10000,      // 超时时间
});
```

### 图片优化（WebP / 懒加载 / 响应式图片 srcset）

图片通常占据页面传输体积的 60% 以上，是性能优化的重中之重。WebP/AVIF 是新一代图片格式，WebP 比 JPEG 小 25%-35%，比 PNG 小 26%，AVIF 则进一步优于 WebP。生产环境应使用 `<picture>` 标签提供多格式降级，并配合构建工具（如 vite-plugin-imagemin）自动生成多格式。

懒加载通过 `loading="lazy"` 属性让浏览器延迟加载视口外图片，原生支持无需 JS。响应式图片使用 `srcset` + `sizes` 让浏览器根据屏幕宽度和 DPR 选择最优分辨率，避免移动端下载 2x 桌面大图。

```html
<!-- 多格式降级 + 响应式 + 懒加载 -->
<picture>
  <source srcset="hero.avif 1x, hero@2x.avif 2x" type="image/avif" />
  <source srcset="hero.webp 1x, hero@2x.webp 2x" type="image/webp" />
  <img
    src="hero.jpg"
    srcset="hero.jpg 1x, hero@2x.jpg 2x"
    alt="Hero Banner"
    loading="lazy"
    decoding="async"
    width="1200"
    height="630"
  />
</picture>

<!-- srcset + sizes：响应式选择不同尺寸 -->
<img
  src="photo-800w.jpg"
  srcset="photo-400w.jpg 400w, photo-800w.jpg 800w, photo-1200w.jpg 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1024px) 800px, 1200px"
  loading="lazy"
  alt="Responsive photo"
/>
```

| 格式 | 有损压缩 | 透明通道 | 动画 | 压缩率（vs JPEG） |
|------|---------|---------|------|------------------|
| JPEG | ✅ | ❌ | ❌ | 基准 |
| PNG | 无损 | ✅ | ❌ | 文件较大 |
| WebP | ✅ | ✅ | ✅ | 小 25%-35% |
| AVIF | ✅ | ✅ | ✅ | 小 50% |

### 预加载（preload / prefetch / dns-prefetch）

浏览器资源提示（Resource Hints）能让开发者提前告知浏览器哪些资源需要优先加载或预取，从而优化关键路径。`<link rel="preload">` 告诉浏览器"这个资源当前页面马上需要，用最高优先级下载"，适合字体、关键 CSS、首屏 Hero 图。`<link rel="prefetch">` 是低优先级预取，浏览器空闲时才下载，适合下一页可能需要的资源。

`dns-prefetch` 提前解析域名 DNS，`preconnect` 则提前完成 DNS + TCP + TLS 握手，适合第三方资源（CDN、分析脚本、字体服务）。

```html
<!-- preload: 高优先级，当前页面需要 -->
<link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/styles/critical.css" as="style" />

<!-- prefetch: 低优先级，未来页面可能用到 -->
<link rel="prefetch" href="/pages/about.chunk.js" as="script" />

<!-- dns-prefetch: 提前 DNS 解析 -->
<link rel="dns-prefetch" href="//api.example.com" />

<!-- preconnect: 提前完成连接建立 -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
```

| 资源提示 | 优先级 | 时机 | 典型场景 |
|---------|-------|------|---------|
| preload | 高 | 当前页面立即需要 | 字体、关键 CSS、首屏图片 |
| prefetch | 低 | 空闲时下载，未来导航需要 | 下一页 JS chunk |
| dns-prefetch | — | 提前 DNS 解析 | 第三方 API 域名 |
| preconnect | — | 提前建立完整连接 | 字体 CDN、分析服务 |

### CDN 部署

CDN（Content Delivery Network）将静态资源分发到全球边缘节点，用户请求由最近的节点响应，显著降低延迟。核心收益包括：物理距离缩短带来的 RTT 降低、分散流量减轻源站压力、边缘节点自带 DDoS 防护。生产环境中，JS/CSS/图片/字体等静态资源应全部走 CDN，HTML 入口文件则视缓存策略而定（通常不适合 CDN 强缓存）。

CDN 的回源策略与缓存键设计非常关键：不同文件类型设置不同 Cache-Control max-age；使用文件内容哈希命名（如 `app.a3f8b2.js`）确保缓存失效零风险；`Vary: Accept-Encoding` 避免 CDN 缓存了 brotli 版本却返回给不支持 br 的客户端。

```nginx
# CDN 边缘节点的典型缓存配置
location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff2)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

---

## 运行时优化

### 虚拟列表（vue-virtual-scroller / react-window）

当列表数据量达到数千甚至数十万条时，一次性渲染全部 DOM 节点会导致页面卡死。虚拟列表（Virtual List）只渲染可视区域 + 少量缓冲区内的 DOM，滚动时动态替换内容，理论上可将 DOM 节点数从 10 万降到 20-30 个。其核心原理是：监听滚动事件 → 根据 scrollTop 计算 startIndex / endIndex → 仅渲染该区间数据 → 通过 padding-top/bottom 撑开滚动条高度。

Vue 生态常用 `vue-virtual-scroller`（vueuse 团队出品），React 生态常用 `react-window`（轻量，Brian Vaughn 作品）。

```jsx
// React: react-window 固定行高示例
import { FixedSizeList as List } from 'react-window';

function VirtualList({ items }) {
  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>Row {items[index]}</div>
      )}
    </List>
  );
}
```

```vue
<!-- Vue: vue-virtual-scroller -->
<template>
  <RecycleScroller
    :items="list"
    :item-size="50"
    key-field="id"
    v-slot="{ item }"
    class="scroller"
  >
    <div class="item">{{ item.name }}</div>
  </RecycleScroller>
</template>

<script setup>
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
</script>
```

### 防抖节流

防抖（Debounce）和节流（Throttle）是控制高频事件（scroll、resize、input、mousemove）执行频率的两大经典手段。

防抖的核心思想是"延迟执行，只执行最后一次"：在事件持续触发期间不断重置计时器，直到停止触发后 `delay` ms 才真正执行。典型场景：搜索输入框联想、窗口 resize 回调、表单校验。

节流的核心思想是"固定频率执行"：无论事件触发多频繁，回调函数至少每隔 `delay` ms 执行一次。典型场景：滚动加载更多、鼠标跟随效果、上报埋点。

```js
// 防抖（支持 immediate 模式：首次立即执行）
function debounce(fn, delay = 300, immediate = false) {
  let timer = null;
  return function (...args) {
    const callNow = immediate && !timer;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!immediate) fn.apply(this, args);
    }, delay);
    if (callNow) fn.apply(this, args);
  };
}

// 节流（时间戳 + 定时器结合，保证首尾都执行）
function throttle(fn, delay = 300) {
  let lastTime = 0;
  let timer = null;
  return function (...args) {
    const now = Date.now();
    const remaining = delay - (now - lastTime);
    clearTimeout(timer);
    if (remaining <= 0) {
      lastTime = now;
      fn.apply(this, args);
    } else {
      timer = setTimeout(() => {
        lastTime = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
}

// 使用示例
const onInput = debounce((e) => fetchSuggestions(e.target.value), 300);
const onScroll = throttle(() => checkAndLoadMore(), 200);
```

| 对比维度 | 防抖（Debounce） | 节流（Throttle） |
|---------|-----------------|-----------------|
| 执行时机 | 停止触发后 delay ms | 每隔 delay ms 固定执行 |
| 连续触发 | 只执行最后一次 | 按固定频率执行多次 |
| 典型场景 | 搜索框、resize、表单校验 | scroll 加载、鼠标跟随 |
| 是否合并 | 合并为一次 | 不合并，固定间隔 |

### 首屏渲染优化（SSR / SSG / 骨架屏）

首屏渲染速度直接决定用户对网站快慢的主观感知。CSR（客户端渲染）的致命缺陷是白屏时间长——浏览器需要下载 JS → 执行 JS → 请求数据 → 渲染，整个过程串行。SSR（服务端渲染，如 Next.js / Nuxt）在服务器将组件渲染为 HTML 字符串交付，浏览器收到即显示，大幅缩短 FCP 和 LCP。SSG（静态站点生成）更进一步，构建时直接预渲染为静态 HTML，适合内容型站点。

骨架屏（Skeleton Screen）是一种感知优化：在真实内容加载完成前展示占位图形，让用户感知到"页面正在加载中"而非"卡死了"。它不减少实际加载时间，但显著提升用户体验。实现方式有手写骨架组件、使用 `react-content-loader` 或自动生成骨架方案。

```jsx
// React 骨架屏组件示例
function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-text" />
      <div className="skeleton-line skeleton-text short" />
    </div>
  );
}

// 配合 Suspense 使用
function ProductList() {
  return (
    <Suspense fallback={<SkeletonCard />}>
      <AsyncProductData />
    </Suspense>
  );
}
```

| 渲染模式 | 首屏速度 | SEO | 服务器压力 | 适用场景 |
|---------|---------|-----|-----------|---------|
| CSR | 慢 | 差（需额外处理） | 无 | 后台管理、工具型 SPA |
| SSR | 快 | 好 | 高 | 内容型 + 个性化页面 |
| SSG | 极快 | 最好 | 构建时 | 博客、文档、营销页 |
| ISR | 较快 | 好 | 中 | 内容更新不频繁的页面 |

### 重排重绘避免

浏览器的渲染流水线为：JavaScript → Style（样式计算）→ Layout（布局/重排）→ Paint（绘制/重绘）→ Composite（合成）。**重排（Reflow）** 触发 Layout 阶段，开销最大，因为它需要重新计算元素几何属性并重新布局后续所有元素。**重绘（Repaint）** 只触发 Paint 阶段，不改变几何属性，开销次之。**合成（Composite）** 仅涉及 GPU 层的平移/缩放/旋转，开销最小。

优化策略的核心是：**尽量让动画只触发 Composite**。使用 `transform` 和 `opacity` 代替 `left`/`top`/`width`/`height`；批量 DOM 修改使用 `document.createDocumentFragment()` 或先 `display: none` → 修改 → 恢复；读取布局信息（offsetHeight 等）时避免"强制同步布局"——不要在修改样式后立即读取。

```js
// ❌ 差：循环中逐条修改触发多次重排
items.forEach((item, i) => {
  item.style.width = `${data[i].w}px`;   // 写
  const h = item.offsetHeight;           // 读 → 强制同步布局！
  item.style.height = `${h + 10}px`;     // 写
});

// ✅ 好：读写分离，批量修改
const heights = items.map(item => item.offsetHeight); // 批量读
items.forEach((item, i) => {                           // 批量写
  item.style.width = `${data[i].w}px`;
  item.style.height = `${heights[i] + 10}px`;
});

// ✅ 使用 transform 代替 left/top（只走 Composite）
.slide-in {
  transform: translateX(100px);  /* Composite only */
  transition: transform 0.3s;
}
```

| 操作类型 | 触发阶段 | 开销 | 典型属性 |
|---------|---------|------|---------|
| 重排（Reflow） | Layout → Paint → Composite | 最大 | width, height, left, top, margin, padding, font-size |
| 重绘（Repaint） | Paint → Composite | 中等 | color, background, box-shadow, border-color |
| 合成（Composite） | Composite only | 最小 | transform, opacity（需 promote 到独立层） |

---

## 网络优化

### HTTP 缓存策略（Cache-Control / ETag）

HTTP 缓存是性能优化中最具性价比的手段——命中缓存后请求甚至不会到达服务器，响应时间趋近于 0ms。缓存体系分为两级：**强缓存**通过 `Cache-Control`（HTTP/1.1）或 `Expires`（HTTP/1.0）控制，命中时不发请求，状态码 200（from disk/memory cache）；**协商缓存**通过 `ETag` / `If-None-Match` 或 `Last-Modified` / `If-Modified-Since` 控制，每次发请求但服务器返回 304 Not Modified 表示内容未变。

最佳实践：带哈希的静态资源（JS/CSS/字体/图片）设置 `Cache-Control: public, max-age=31536000, immutable`（一年强缓存，文件名即版本）；HTML 入口文件设置 `Cache-Control: no-cache`（必须协商，确保最新）；API 数据接口根据业务权衡新鲜度和缓存收益。

```nginx
# 静态资源：一年强缓存 + immutable
location /assets/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# HTML 入口：每次必须协商
location / {
  add_header Cache-Control "no-cache";
}
```

```http
# 请求头（协商缓存）
If-None-Match: "abc123"          # ETag 校验
If-Modified-Since: Wed, 21 Oct 2023 07:28:00 GMT

# 响应头（304 时）
HTTP/1.1 304 Not Modified
ETag: "abc123"
Cache-Control: max-age=3600
```

| 缓存类型 | 是否发请求 | 状态码 | 控制头 | 适用资源 |
|---------|----------|--------|-------|---------|
| 强缓存 | 否 | 200 (from cache) | Cache-Control: max-age | 带哈希的 JS/CSS/图片 |
| 协商缓存 | 是 | 304 / 200 | ETag, Last-Modified | HTML, 无哈希 API |

### HTTP/2 多路复用

HTTP/1.1 的队头阻塞（Head-of-Line Blocking）是页面加载延迟的核心瓶颈之一——同一 TCP 连接上一个请求慢会阻塞后面所有请求。HTTP/2 通过**多路复用（Multiplexing）** 在单个 TCP 连接上并行交错发送多个请求/响应帧，各帧带 stream ID 标识归属，彻底解除了请求间的阻塞关系。

HTTP/2 还带来了头部压缩（HPACK）、服务器推送（Server Push，现已较少使用）、二进制分帧等特性。需要注意：HTTP/2 消除了 HTTP 层的队头阻塞，但 TCP 层的队头阻塞仍然存在（包丢失重传阻塞后续所有流），这是 HTTP/3（基于 QUIC/UDP）解决的问题。

```nginx
# Nginx 启用 HTTP/2
listen 443 ssl http2;
```

HTTP/1.1 时代常用的"域名分片"（多域名突破 6 连接限制）和"资源合并"（文件合并减少请求数）在 HTTP/2 下反而适得其反——域名分片增加建连成本、文件合并牺牲缓存粒度。HTTP/2 下的最佳实践恰恰相反：细粒度模块化、无需 CSS Spirite、不做 JS/CSS 大包合并。

| 对比维度 | HTTP/1.1 | HTTP/2 |
|---------|----------|--------|
| 连接复用 | 同一域名 6 个并行连接 | 单个连接多路复用 |
| 队头阻塞 | 严重 | HTTP 层解决，TCP 层仍存在 |
| 头部压缩 | 无（每次全量发送） | HPACK 压缩 |
| 资源合并 | 推荐（减少请求数） | 不推荐（保持细粒度） |
| 域名分片 | 推荐 | 不推荐 |

### 资源内联（关键 CSS）

关键 CSS（Critical CSS）是将首屏渲染必需的 CSS 直接内联到 HTML `<head>` 的 `<style>` 标签中，避免外部 CSS 的请求往返延迟。浏览器渲染页面前必须构建 CSSOM，外部样式表是渲染阻塞资源——关键 CSS 内联后，浏览器无需等待 CSS 文件下载即可完成首屏渲染。

实践中通常通过构建工具（如 `critical`、`critters-webpack-plugin`）自动提取首屏 CSS 并内联，剩余 CSS 通过 `media="print" onload="this.media='all'"` 异步加载。注意：内联 CSS 不参与缓存，所以只应内联真正关键的少量样式（通常控制在 14KB 以内，即一个 TCP 慢启动窗口）。

```html
<head>
  <!-- 内联关键 CSS：首屏渲染必需，无额外请求 -->
  <style>
    /* Critical CSS - 首屏布局、字体、颜色 */
    .header { display: flex; height: 60px; background: #fff; }
    .hero { font-size: 2rem; color: #333; }
    /* ... 首屏关键样式 ... */
  </style>

  <!-- 非关键 CSS：异步加载，不阻塞渲染 -->
  <link
    rel="preload"
    href="/styles/full.css"
    as="style"
    onload="this.onload=null;this.rel='stylesheet'"
  />
  <noscript><link rel="stylesheet" href="/styles/full.css" /></noscript>
</head>
```

---

## React 性能优化

### React.memo / useMemo / useCallback

React 的默认行为是父组件更新时递归渲染所有子组件，这在大组件树中可能导致大量无意义的重渲染。**React.memo** 是高阶组件，对 props 做浅比较，props 不变则跳过渲染，适合"纯展示组件"。**useMemo** 缓存计算结果，依赖不变则返回上次缓存值，适合昂贵计算（排序、过滤、复杂派生状态）。**useCallback** 缓存函数引用，与 React.memo 配合时确保子组件拿到的回调引用稳定不变。

三者共同的使用原则是"不做过度优化"——先写清晰直观的代码，遇到性能瓶颈再用 Profiler 定位后精确优化。滥用 memo/useCallback 反而会增加内存开销和比较成本。

```jsx
import { memo, useMemo, useCallback, useState } from 'react';

// React.memo: props 浅比较
const ExpensiveList = memo(function ExpensiveList({ items, onSelect }) {
  console.log('ExpensiveList rendered');
  return items.map(item => <div key={item.id} onClick={() => onSelect(item.id)}>{item.name}</div>);
});

function Parent() {
  const [count, setCount] = useState(0);
  const [query, setQuery] = useState('');

  // useMemo: 缓存过滤结果
  const filtered = useMemo(
    () => items.filter(i => i.name.includes(query)),
    [items, query]
  );

  // useCallback: 缓存回调引用（与 memo 配合）
  const handleSelect = useCallback((id) => {
    console.log('Selected:', id);
  }, []);

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <ExpensiveList items={filtered} onSelect={handleSelect} />
    </>
  );
}
```

### 避免不必要渲染

不必要渲染的主要来源有三个：父组件更新引起子组件被动渲染、内联对象/函数每次创建全新引用导致 memo 失效、Context 值变化导致所有 consumer 重渲染。

解决方案包括：将状态尽量下沉到叶子组件（状态提升的反模式——状态应放在最接近使用它的地方），避免顶层频繁变化的状态驱动整棵组件树；通过 `children` 或 render props 将"不变组件"提升到状态组件之上（状态组件渲染时 children 已是稳定的 VNode）；Context 拆分——高频变化的状态（如主题、计数器）和低频变化的状态（如用户信息）放在不同 Context 中。

```jsx
// ❌ 差：count 变化导致 ExpensiveTree 也重新渲染
function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveTree />
    </div>
  );
}

// ✅ 好：将 count 状态下沉，ExpensiveTree 不受影响
function CounterButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

function App() {
  return (
    <div>
      <CounterButton />
      <ExpensiveTree /> {/* count 变化时不再重渲染 */}
    </div>
  );
}
```

### React Profiler

React DevTools 内置的 Profiler 面板是定位性能瓶颈的核心工具。它会记录每次 Commit 的渲染信息：哪些组件渲染了、渲染耗时、以及渲染原因（props changed / hooks changed / parent re-render）。

使用步骤：打开 React DevTools → 切换到 Profiler 标签 → 点击录制 → 执行目标操作 → 停止录制 → 查看火焰图和排名。火焰图中颜色越暖（黄/红）表示渲染耗时越长，点击组件可查看本次重渲染的 props 差异。虚拟列表旁边有"Render Reason"提示，直接告诉你为什么渲染。

```jsx
// 编程式 Profiler（React.Profiler API）
import { Profiler } from 'react';

function onRenderCallback(
  id,          // Profiler 树 ID
  phase,       // "mount" 或 "update"
  actualDuration, // 本次渲染耗时
  baseDuration,   // 无优化情况下的预估耗时
  startTime,
  commitTime,
) {
  console.log(`${id} ${phase}: ${actualDuration}ms`);
  if (actualDuration > 16) {
    // 超过一帧（60fps）上报性能数据
    reportSlowRender({ id, phase, actualDuration });
  }
}

<Profiler id="ProductList" onRender={onRenderCallback}>
  <ProductList />
</Profiler>
```

---

## Vue 性能优化

### v-once / v-memo

`v-once` 指令让元素/组件只渲染一次，之后将其视为静态内容，跳过后续所有 diff 和 patch。适合纯静态内容（如文档正文、条款页面、从不变更的配置信息）。注意：v-once 的元素及其子树全部变为静态，内部任何动态绑定都会被忽略。

`v-memo`（Vue 3.2+）更精细——接收一个依赖数组，只有当数组中的值变化时才重新渲染，类似 React 的 `useMemo` 作用于模板。适合大列表中的单个项，当大部分项数据不变时跳过其 VNode 创建。

```vue
<template>
  <!-- v-once: 只渲染一次，后续永不更新 -->
  <div v-once>
    <h1>{{ staticTitle }}</h1>
    <p>{{ staticContent }}</p>
  </div>

  <!-- v-memo: 仅当依赖变化才重新渲染 -->
  <div v-for="item in list" :key="item.id" v-memo="[item.name, item.selected]">
    <span>{{ item.name }}</span>
    <span>{{ item.selected ? '✓' : '' }}</span>
  </div>
</template>
```

### shallowRef / shallowReactive

Vue 3 的响应式系统默认是深层（deep）的——对 `ref({a: {b: 1}})` 的修改 `value.a.b = 2` 会触发更新。这在处理大型数据结构（如表格数据、JSON 树）时，深度递归代理本身就会消耗大量时间。

`shallowRef` 和 `shallowReactive` 只对 `.value` 或根层级属性做响应式处理，嵌套对象不会被深度代理。修改深层属性不会自动触发视图更新，需要手动触发（例如重新赋值 `.value = {...oldValue.value}`）。典型场景：大量只读静态数据（地图 GeoJSON、图表配置）、需要整体替换的大数据对象。

```js
import { shallowRef, triggerRef } from 'vue';

// shallowRef: 只有 .value 替换才触发更新
const chartData = shallowRef({ series: [...], categories: [...] });

// ❌ 深层修改不触发更新
chartData.value.series[0].data = newData;

// ✅ 整体替换触发更新
chartData.value = { ...chartData.value, series: newSeries };

// 或手动 triggerRef
chartData.value.series[0].data = newData;
triggerRef(chartData);
```

| API | 深度 | 触发更新方式 | 典型场景 |
|-----|------|------------|---------|
| ref / reactive | 深层递归 | 任意层级属性修改 | 普通响应式状态 |
| shallowRef | 仅 .value | .value 整体替换或 triggerRef | 图表数据、大 JSON |
| shallowReactive | 仅根属性 | 根属性修改 | 表单配置、少量顶层状态 |

### keep-alive

`<KeepAlive>` 是 Vue 内置的抽象组件，用于缓存被切换移除的组件实例，使其不被销毁。当用户在标签页/步骤条/列表-详情之间来回切换时，缓存的组件保留 DOM 状态和响应式数据，无需重新创建和初始化。核心原理是：将 VNode 缓存到内部 Map 中，再次渲染时直接从缓存取出，跳过 mount 阶段走 patch 更新。

`<KeepAlive>` 提供了 `include`/`exclude`（按组件名匹配）、`max`（最大缓存数量，LRU 策略淘汰）等精细控制。被缓存组件会触发 `onActivated`/`onDeactivated` 生命周期钩子代替 `mounted`/`unmounted`。

```vue
<template>
  <KeepAlive :include="['TabHome', 'TabProfile']" :max="3">
    <component :is="currentTab" />
  </KeepAlive>
</template>

<script setup>
import { onActivated, onDeactivated } from 'vue';

// 替代 mounted：被激活时调用
onActivated(() => {
  console.log('组件被激活，可在此刷新数据');
});

// 替代 unmounted：被缓存时调用
onDeactivated(() => {
  console.log('组件被缓存，清理定时器/事件');
});
</script>
```

---

## 性能检查方法

### Lighthouse

Lighthouse 是 Google 推出的开源自动化审计工具，对网页进行性能、可访问性、最佳实践、SEO、PWA 五个维度的打分。它模拟移动端中端设备（Moto G4）、3G 慢网络、4x CPU 降速的条件运行，产出 0-100 的评分及具体优化建议。

六个核心性能指标各有权重，其中 TBT（Total Blocking Time）和 CLS 权重最大。优化建议是贴身的检查清单：减少 JS 执行时间、移除渲染阻塞资源、适当调整图片大小、预加载关键请求等，每项都附带具体文件路径和预估节省时间。

| 指标 | 含义 | 权重 | 优化方向 |
|------|-----|------|---------|
| FCP（First Contentful Paint） | 首次内容绘制 | 10% | 减少渲染阻塞资源、内联关键 CSS |
| SI（Speed Index） | 速度指数 | 10% | 减小主文档体积、优化关键路径 |
| LCP（Largest Contentful Paint） | 最大内容绘制 | 25% | 优化首屏大图/文本块、预加载 |
| TBT（Total Blocking Time） | 总阻塞时间 | 30% | 代码分割、减少长任务 |
| CLS（Cumulative Layout Shift） | 累积布局偏移 | 25% | 为图片/广告预留空间、字体加载策略 |
| TTI（Time to Interactive） | 可交互时间 | _(已移除)_ | 与 TBT 强相关 |

### Chrome Performance Tab

Chrome DevTools 的 Performance 面板是运行时性能分析的终极武器。它录制页面一段时间内的完整活动数据，以火焰图（Flame Chart）形式呈现调用栈，横轴为时间，纵轴为调用深度。核心分析流程：录制 → 找到长任务（Long Task，>50ms 的红三角）→ 展开火焰图定位耗时函数 → 在 Summary 面板查看具体耗时分布（Scripting / Rendering / Painting）。

火焰图中色块越宽、颜色越暖表示耗时越长。点击色块可在底部看到源码位置。右上角的 CPU 节流（4x/6x slowdown）可模拟低端设备。录制时勾选 "Screenshots" 可获得每帧的屏幕截图，用于对应用户可见变化。

```
分析三步法：
1. 找到红色三角（Long Task > 50ms）
2. 展开火焰图，定位最宽/最热的色块
3. Bottom-Up 面板查看函数总耗时排名
```

### Web Vitals（FCP / LCP / CLS / FID / INP）

Web Vitals 是 Google 定义的核心用户体验指标集，是 SEO 排名因子（Core Web Vitals 包含 LCP/INP/CLS）。指标分为"加载体验"和"交互体验"两类：

- **FCP**（First Contentful Paint）：首次内容绘制，页面从空白到显示第一个 DOM 内容的时间，≤1.8s 为优秀。
- **LCP**（Largest Contentful Paint）：最大内容绘制（通常是首屏 Hero 图或标题文本块），≤2.5s 为优秀。受图片加载、渲染阻塞资源、服务器响应时间影响最大。
- **CLS**（Cumulative Layout Shift）：累积布局偏移，衡量页面的视觉稳定性，≤0.1 为优秀。无尺寸属性的图片、动态注入的广告/嵌入内容、FOIT/FOUT 是主要诱因。
- **FID**（First Input Delay）：首次输入延迟，用户首次交互到浏览器实际响应的延迟，≤100ms 为优秀。2024 年起被 **INP** 取代。
- **INP**（Interaction to Next Paint）：整个页面生命周期中用户交互的最大延迟，≤200ms 为优秀。比 FID 更全面（涵盖所有交互而非仅首次）。

```js
// 使用 web-vitals 库在项目中采集
import { onLCP, onFID, onCLS, onINP, onFCP } from 'web-vitals';

function sendToAnalytics({ name, delta, id, rating }) {
  // 上报到自建监控或第三方平台
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({ name, value: delta, id, rating }),
    keepalive: true,
  });
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
```

### Bundle Analyzer（webpack-bundle-analyzer / rollup-plugin-visualizer）

打包分析工具将构建产物的模块组成以可视化矩形图展示，每个模块的大小、占比一目了然。**webpack-bundle-analyzer** 是 Webpack 生态标配，生成交互式树状图，能快速发现重复依赖、巨型库、未使用代码。**rollup-plugin-visualizer** 服务于 Vite/Rollup 生态，功能相似。

核心使用场景：发现 `moment.js` 带了全量 locale（常见隐藏巨型依赖）、两个不同版本的 `lodash` 被重复打包、无意中引入了 `lodash` 全量而非 `lodash-es` 的 tree-shakable 版本。优化手段：按体积从大到小排序 → 评估必要性 → 替换轻量库 → 配置 splitChunks/manualChunks。

```js
// webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',     // 生成 HTML 文件而非启动服务器
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
    }),
  ],
};
```

```js
// vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      filename: 'stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
};
```

### 性能监控 API（PerformanceObserver）

`PerformanceObserver` 是现代浏览器提供的性能数据采集 API，它异步监听性能时间线条目，避免了轮询 `performance.getEntries()` 的额外开销。可订阅的类型包括：`navigation`（页面导航性能）、`resource`（所有资源加载耗时）、`paint`（FCP/FP）、`largest-contentful-paint`（LCP）、`layout-shift`（CLS）、`longtask`（长任务 > 50ms）、`element`（元素渲染时间）。

其工作原理是注册 Observer 并指定 `entryTypes`，浏览器在相应事件发生后异步回调，数据包含精确的高精度时间戳。结合 `buffered: true` 可获取 Observer 注册前已发生的条目（如页面加载早期的 FCP），这是数据不丢失的关键配置。

```js
// 采集资源加载性能
const resourceObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.duration > 1000) {
      console.warn(`慢资源: ${entry.name} — ${entry.duration.toFixed(0)}ms`);
    }
  });
});
resourceObserver.observe({ type: 'resource', buffered: true });

// 采集长任务
const longtaskObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`长任务: ${entry.duration.toFixed(0)}ms`, entry.attribution);
  });
});
longtaskObserver.observe({ type: 'longtask', buffered: true });

// 通过 Performance API 直接获取导航性能
const navEntry = performance.getEntriesByType('navigation')[0];
console.log({
  DNS: navEntry.domainLookupEnd - navEntry.domainLookupStart,
  TCP: navEntry.connectEnd - navEntry.connectStart,
  TTFB: navEntry.responseStart - navEntry.requestStart,
  DOM解析: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
});
```

---

## 常见性能面试题

### 首屏加载慢怎么排查和优化？

这是一道经典的性能优化体系题，面试官期望听到**完整的排查链路**而非零散优化点。回答时应按\"测量 → 定位 → 优化 → 验证\"四步展开。

**第一步：测量量化。** 使用 Lighthouse 获取 FCP/LCP/TBT 评分及优化建议；使用 Chrome Performance Tab 录制加载过程，找出长任务和阻塞资源；查看 Network 面板瀑布图，识别关键请求链中的瓶颈资源。

**第二步：定位瓶颈。** 通常瓶颈集中在几个方向：① JS Bundle 过大——用 bundle-analyzer 找出巨型依赖；② 渲染阻塞——外部 CSS/JS 阻塞首屏渲染；③ 网络——未开启压缩/CDN/缓存；④ 服务端——慢 API 或无 SSR，TTFB 高；⑤ 资源——首屏大图未优化。

**第三步：对症优化。**
- Bundle 过大 → 代码分割 + 懒加载 + tree-shaking + 替换重型库
- 渲染阻塞 → 关键 CSS 内联 + JS defer/async + preload 字体
- 网络慢 → Gzip/Brotli + CDN + 强缓存静态资源
- 服务端慢 → SSR/SSG + API 聚合 + CDN 缓存动态内容
- 图片大 → WebP + srcset + 懒加载 + CDN 图片处理

**第四步：验证回归。** 优化后重新跑 Lighthouse 对比分数，结合 Web Vitals 线上数据对比 75 分位值，确保优化有效且没有引入新问题。

### 长列表如何优化？

面试官通常先问\"列表有 10 万条数据怎么渲染\"——直接回答虚拟列表即可，但好的回答需要展开原理 + 实现方式 + 边界场景。

**核心方案：虚拟列表。** 只渲染可视区域内的 DOM 节点，非可视区通过空 div 撑开高度。滚动时根据 scrollTop 计算当前应渲染的数据区间（startIndex / endIndex），替换内部 DOM 内容。React 用 `react-window`（固定高度）或 `react-virtuoso`（动态高度），Vue 用 `vue-virtual-scroller`。

**进阶讨论点：** ① 动态高度——无法预知每项高度时，需要先估算高度（预估 + 实测修正），滚动过程中动态更新项高度缓存；② 搜索/筛选——虚拟列表数据源变化后重置滚动位置；③ 结合无限滚动（Infinite Scroll）——滚动到底部触发加载更多，追加数据后更新 itemCount；④ DOM 复用——不是创建/销毁 DOM，而是更新已有 DOM 的内容和位置。

**补充方案：分页加载。** 对于非滚动的表格场景，传统分页仍然有效——后端返回 total + pageSize，前端渲染当前页数据，无需虚拟列表的滚动测算。

### 如何做性能监控？

性能监控体系分为**合成监控（Synthetic Monitoring）**和**真实用户监控（RUM）**两个维度，面试回答应覆盖两者。

**合成监控（Lighthouse CI）：** 在 CI/CD 流水线中自动运行 Lighthouse，设置性能预算（Performance Budget），若评分低于阈值则阻断构建。适用场景：上线前的门禁检查，确保每次发布不引入性能退化。

**真实用户监控（RUM）：** 核心使用 `web-vitals` 库或 `PerformanceObserver` API 采集真实用户的 Web Vitals（LCP/INP/CLS/FCP）。数据通过 `navigator.sendBeacon` 或 `fetch`（`keepalive: true`）上报。关键策略：采样率控制（全量或按比例）、数据聚合后关注 P75/P95 分位值而非平均值、按设备/网络/地域维度拆分分析。

```js
// 最小化 RUM 实现
function reportWebVitals() {
  // LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    send({ name: 'LCP', value: lastEntry.renderTime || lastEntry.loadTime });
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // CLS
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) clsValue += entry.value;
    }
    send({ name: 'CLS', value: clsValue });
  }).observe({ type: 'layout-shift', buffered: true });

  // INP（简化版：监听 longtask + FID 兜底）
  // 生产环境建议直接用 web-vitals 库
}

function send(data) {
  navigator.sendBeacon('/api/vitals', JSON.stringify(data));
}
```

**监控平台：** 自建方案通常基于 Prometheus + Grafana 或 ELK；第三方方案如 Sentry Performance、Datadog RUM、阿里 ARMS。关键看板指标：Core Web Vitals 趋势图、P75/P95 分位值、按页面路由拆分的性能分布、慢资源 Top 10。
