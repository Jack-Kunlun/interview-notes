---
title: SSR 服务端渲染
description: CSR/SSR/SSG/ISR 渲染模式、同构渲染、Next.js/Nuxt、流式渲染
---

# SSR 服务端渲染

## 一、渲染模式全景

| 模式 | 渲染位置 | HTML 产出 | 首屏 | SEO | 服务器压力 |
|------|---------|----------|------|-----|-----------|
| **CSR** | 浏览器 | 空壳 `<div id="app">` | 慢（等 JS 加载+执行） | ❌ | 无 |
| **SSR** | 服务端 | 完整 HTML | 快 | ✅ | 高 |
| **SSG** | 构建时 | 静态 HTML | 最快 | ✅ | 无 |
| **ISR** | 服务端（按需缓存） | 首次 SSR，后续静态 | 快 | ✅ | 低（缓存兜底） |

### CSR（客户端渲染）

常见于纯 SPA：Vue CLI / Create React App 默认模式。浏览器下载空 HTML + JS bundle，JS 执行后动态生成 DOM。

```
浏览器                    服务器
  |                         |
  |── GET / ──────────────>|
  |<── 200 空壳 HTML ──────|  ← 只有 <div id="app">
  |── GET /app.js ────────>|
  |<── 200 JS Bundle ──────|
  | JS 执行 → 渲染页面      |
```

**优点**：开发简单、前后端分离、部署容易（静态文件服务器即可）。**缺点**：首屏白屏、SEO 抓不到内容。

### SSR（服务端渲染）

请求到达时，服务端运行前端框架代码生成完整 HTML，返回给浏览器。浏览器收到的是可直接渲染的页面，随后执行 JS 完成**水合**（hydration），接管交互。

```
浏览器                     Node 服务器
  |                         |
  |── GET / ──────────────>|
  |                          | 执行 Vue/React 组件 → 生成 HTML
  |<── 200 完整 HTML ───────|
  | 渲染页面（已有内容）      |
  | 加载 JS → 水合 → 可交互  |
```

---

## 二、SSR 核心机制

### 水合（Hydration）

服务端返回的 HTML 是纯静态的——有内容但无交互。浏览器加载 JS 后，框架会在现有 DOM 上"挂载"事件监听和响应式系统，这个过程叫**水合**。关键约束：**服务端渲染的 DOM 必须和客户端初次渲染的 DOM 完全一致**，否则水合失败，React 会报 Hydration Mismatch 错误。

```jsx
// ❌ 水合错误：服务端渲染 0，客户端渲染当前时间戳（永远不一致）
const Comp = () => <div>{Date.now()}</div>

// ✅ 用 useEffect 包裹，只在客户端执行
const Comp = () => {
  const [time, setTime] = useState(null)
  useEffect(() => { setTime(Date.now()) }, [])
  return <div>{time ?? '加载中...'}</div>
}
```

### 同构渲染

同一套组件代码，**在服务端跑一次生成 HTML，在客户端再跑一次完成水合**——这就是同构。要求组件代码不能依赖 `window`/`document` 等浏览器 API（服务端没有）。常见处理：

```js
// 用 typeof window 守卫
if (typeof window !== 'undefined') {
  // 只在浏览器执行的代码
}

// 动态导入浏览器专属模块
if (process.client) {
  const chart = await import('echarts')
}
```

### 数据预取

SSR 页面需要的数据必须在渲染前拿到。Next.js 和 Nuxt 提供了不同的数据预取方案：

| 框架 | 方法 | 执行位置 |
|------|------|---------|
| Next.js Pages | `getServerSideProps` | 每次请求服务端 |
| Next.js Pages | `getStaticProps` | 构建时 |
| Next.js App | `async` 组件 + `fetch` | 服务端 |
| Nuxt 3 | `useFetch` / `useAsyncData` | 服务端+客户端 |

### 路由同构

URL 在服务端和客户端必须映射到同一个组件。Express 作为 SSR 服务器时，所有路由都 fallback 到渲染函数：

```js
// Express SSR
app.get('*', async (req, res) => {
  const app = createSSRApp(App)
  const html = await renderToString(app)
  res.send(`<!DOCTYPE html>${html}`)
})
```

---

## 三、Next.js SSR

### Pages Router（传统）

```tsx
// pages/posts/[id].tsx
export async function getServerSideProps({ params }) {
  const post = await fetch(`https://api.example.com/posts/${params.id}`).then(r => r.json())
  return { props: { post } }
}

export default function PostPage({ post }) {
  return <article><h1>{post.title}</h1><p>{post.content}</p></article>
}
```

### App Router（推荐）

```tsx
// app/posts/[id]/page.tsx
async function getPost(id: string) {
  const res = await fetch(`https://api.example.com/posts/${id}`, {
    next: { revalidate: 3600 },  // ISR：1小时重新生成
  })
  return res.json()
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id)
  return <article><h1>{post.title}</h1><p>{post.content}</p></article>
}
```

App Router 默认就是 **React Server Components（RSC）**——组件在服务端运行，零 JS 发送到客户端。只有标记 `'use client'` 的组件才会水合。

### 渲染策略选择

```
静态内容（博客/文档）→ SSG  / ISR
用户相关（仪表盘）   → SSR
实时数据（股票）     → CSR（客户端 fetch）
混合（首页静态+后台动态）→ 页面级按需选择
```

---

## 四、Nuxt 3 SSR

Nuxt 3 基于 Nitro 服务引擎，天然支持多种部署模式：

```vue
<!-- pages/posts/[id].vue -->
<script setup lang="ts">
const route = useRoute()
const { data: post } = await useFetch(`/api/posts/${route.params.id}`)

// useAsyncData 更细粒度控制
const { data: stats } = await useAsyncData('stats', () => $fetch('/api/stats'))
</script>

<template>
  <article>
    <h1>{{ post?.title }}</h1>
    <p>{{ post?.content }}</p>
  </article>
</template>
```

Nuxt 3 的 `useFetch` 和 `useAsyncData` 自动在服务端执行数据请求，并把结果序列化到客户端（`__NUXT__` 全局变量），避免重复请求。

---

## 五、SSR 性能优化

### 流式渲染（Streaming SSR）

传统 SSR 必须等整个页面数据就绪才能返回 HTML，流式渲染则边渲染边输出：

```tsx
// React 18+ Suspense 实现流式渲染
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <Header />                    {/* 立即渲染 */}
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />           {/* 数据就绪后流式输出 */}
      </Suspense>
    </div>
  )
}
```

用户先看到 Header，Loading 状态短暂出现后 SlowComponent 内容流式插入，无需等待全部就绪。

### 部分水合（Partial Hydration）

CSR 模式下整个页面都要水合，部分水合只水合有交互的组件，静态内容保持纯 HTML——大幅减少客户端 JS 量。React Server Components 是这一理念的实现：默认所有组件在服务端渲染且不水合，只有 `'use client'` 标记的组件才发送 JS。

### 缓存策略

| 层级 | 方案 | 效果 |
|------|------|------|
| CDN 缓存 | Vercel / CloudFlare | 静态资源 + SSR HTML 边缘缓存 |
| 页面缓存 | `stale-while-revalidate` | 返回缓存并后台更新 |
| 组件缓存 | React `cache()` | 同一请求内去重数据请求 |
| 数据缓存 | `fetch({ next: { revalidate } })` | ISR 按时间窗口重建 |

```ts
// React cache()：同一渲染周期复用结果
import { cache } from 'react'
const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})
// 页面中多处调用 getUser('123') 只执行一次
```

### SSR 性能监控指标

| 指标 | 含义 | 优化方向 |
|------|------|---------|
| TTFB | 首字节时间 | 服务端渲染耗时 + 网络延迟 |
| FCP | 首次内容绘制 | 流式渲染、关键 CSS 内联 |
| TTI | 可交互时间 | 减少水合 JS 体积 |
| TBT | 总阻塞时间 | 拆分水合任务，避免长任务 |

---

## 六、选型与面试

### 什么时候用 SSR

| 场景 | 推荐 | 理由 |
|------|------|------|
| 内容型网站（博客、新闻） | SSG / ISR | SEO 优先，内容相对静态 |
| 电商（商品详情） | SSR + ISR | SEO + 个性化兼得 |
| 后台管理系统 | CSR | 无需 SEO，交互密集 |
| SaaS 仪表盘 | CSR / SSR 混合 | 未登录页 SSR，登录后 CSR |

### 面试要点

> **SSR 优缺点**：优点——首屏快（服务端直出 HTML），SEO 友好（爬虫能直接拿到内容）。缺点——服务器压力大（每次请求都要渲染），开发复杂度高（水合一致性问题、浏览器 API 不可用），部署复杂（需要 Node 服务器而非纯静态）。
>
> **水合失败排查**：最常见的 Hydration Mismatch 原因——① `Date.now()` 或 `Math.random()` 直接用在渲染中；② 根据 `window.innerWidth` 做条件渲染（服务端不知道宽度）；③ 时区相关的时间格式化；④ 第三方脚本注入了额外的 DOM 节点。修复思路：把不确定内容放进 `useEffect` / `onMounted`，或使用 `suppressHydrationWarning`。
>
> **Next.js SSR vs Nuxt SSR 怎么选**：技术栈决定——React 团队用 Next.js，Vue 团队用 Nuxt。功能上 Next.js（RSC + App Router）架构更激进，Nuxt 3 更开箱即用（自动导入、文件路由、Nitro 跨平台部署）。两个框架的核心能力（SSR/SSG/ISR/流式渲染）都已对齐，没有明显短板，选熟悉的技术栈即可。
>
> **CSR + prerender 能否替代 SSR？** 部分场景可以（如 `prerender-spa-plugin` 对首页做预渲染），但局限性大——只能预渲染固定路由，动态路由（如 `/posts/123`）和个性化内容无法覆盖。真正的 SSR 在每次请求时都能生成对应数据的内容，不是一次性快照。
