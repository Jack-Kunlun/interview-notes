---
title: 前端调试与错误监控
description: Chrome DevTools、Source Map、错误监控、移动端调试与常见问题排查
---

# 前端调试与错误监控

## 一、Chrome DevTools 核心能力

### Sources：断点调试三板斧

**代码断点**：行号处点击，执行到该行暂停 → 查看 Scope 变量、Call Stack 调用链 → Step Over/Into/Out 控制流程。

**条件断点**：右键行号 → "Add conditional breakpoint" → 输入表达式（如 `i === 500`），循环中只在特定迭代暂停，告别手动跳过。

**Logpoint**：右键 → "Add logpoint" → 输入表达式，不暂停执行只输出日志。相当于无需改源码的 `console.log`，生产调试利器。

| 面板功能 | 作用 |
|---------|------|
| Call Stack | 调用链，点击可跳转 |
| Scope | Local / Closure / Global 变量 |
| Watch | 自定义监视表达式 |
| XHR/fetch Breakpoints | URL 匹配时自动断点 |
| DOM Breakpoints | DOM 修改/移除时断点 |

### Network：瀑布图分析

瀑布图各阶段：**Queueing**（排队）→ **DNS Lookup** → **Initial Connection**（TCP+TLS）→ **Waiting (TTFB)** → **Content Download**。

过滤技巧：`domain:api.example.com`、`status-code:200`、`larger-than:100K`、`method:POST`、`-domain:cdn.example.com`（排除 CDN）。

### Performance：火焰图三步法

1. 找到红色三角（Long Task > 50ms）
2. 展开火焰图，定位最宽/最热的色块
3. Bottom-Up 面板看函数总耗时排名

右上角 CPU 节流（4x/6x slowdown）模拟低端设备。勾选 Screenshots 获取每帧截图，对应用户可见变化。

### Elements：Computed 溯源

样式不生效时打开 Computed 子面板 → 找到目标属性 → 点击左侧箭头展开 → 追溯到最终生效的 CSS 规则来源。`:hov` 按钮强制触发 `:hover`/`:focus` 等伪类状态。

### Console：实用方法速查

| 方法 | 用途 |
|------|------|
| `console.table(data)` | 表格展示数组/对象 |
| `console.group(label)` / `groupEnd()` | 可折叠日志分组 |
| `console.time(label)` / `timeEnd(label)` | 精确测量执行时间 |
| `console.trace()` | 打印当前调用栈 |
| `console.assert(cond, msg)` | 条件为 false 时输出错误 |

---

## 二、Source Map

### 原理

JSON 映射文件，`mappings` 字段用 VLQ 编码存储压缩代码与源码的行列对应关系。浏览器仅在 DevTools 打开时才请求 .map 文件。

```json
{
  "version": 3,
  "sources": ["src/utils.ts", "src/index.ts"],
  "names": ["add", "a", "b"],
  "mappings": "AAAA,SAASA,IAAIC,EAAGC...",
  "sourcesContent": ["function add(a, b) { return a + b; }"]
}
```

### webpack devtool 选项对比

| devtool | 构建速度 | 质量 | 生产 | 说明 |
|---------|---------|------|------|------|
| `eval-cheap-module-source-map` | ++ | 行映射 | ❌ | 开发推荐 |
| `source-map` | -- | 完整行列 | ✅ | 独立 .map 文件 |
| `hidden-source-map` | -- | 完整行列 | ✅ | 生成 .map 但不添加引用注释 |
| `nosources-source-map` | -- | 无源码内容 | ✅ | 不含 sourcesContent |

```js
// 推荐配置
devtool: isDev ? 'eval-cheap-module-source-map' : 'hidden-source-map'
```

### 线上安全策略

**绝不将带 sourcesContent 的 .map 部署到公网**——源码一览无余。

策略：① `hidden-source-map` + Sentry 上传后 `cleanArtifacts: true` 删除本地 .map → 生产服务器上根本不存在 .map 文件；② Nginx `location ~ \.map$ { deny all; }` 兜底拦截；③ `nosources-source-map` 连源码内容都不生成，泄露危害有限。

```nginx
location ~ \.map$ { deny all; }
```

---

## 三、错误捕获与上报

### 全局错误捕获

| 方式 | 捕获 JS 运行时 | 捕获资源加载 | Promise 错误 |
|------|:---:|:---:|:---:|
| `window.onerror` | ✅ | ❌ | ❌ |
| `addEventListener('error', cb, true)` | ✅ | ✅ | ❌ |
| `unhandledrejection` | ❌ | ❌ | ✅ |

```js
// 推荐的完整错误捕获
window.addEventListener('error', (e) => {
  if (e.target !== window) {
    // 资源加载错误（img/script/link）
    report({ type: 'resource', tag: e.target.tagName, src: e.target.src || e.target.href })
    return
  }
  report({ type: 'runtime', message: e.message, stack: e.error?.stack })
}, true)

window.addEventListener('unhandledrejection', (e) => {
  report({ type: 'promise', message: e.reason?.message, stack: e.reason?.stack })
  e.preventDefault()
})
```

### 跨域脚本的 Script error

JS 部署在 CDN（不同于页面域），script 标签没设 `crossorigin`、CDN 没返回 CORS 头 → `window.onerror` 只能拿到 `"Script error."`，堆栈全空。

**修复**：① `<script crossorigin="anonymous">`；② CDN 响应头加 `Access-Control-Allow-Origin`；③ 同时监听 `unhandledrejection` 兜底 Promise 错误。

### Sentry 接入

```js
// Vue
import * as Sentry from '@sentry/vue'
Sentry.init({ app, dsn: '...', environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 0.2,
})

// React
import * as Sentry from '@sentry/react'
Sentry.init({ dsn: '...', integrations: [Sentry.browserTracingIntegration()] })
function App() {
  return <Sentry.ErrorBoundary fallback={<ErrorFallback />}><MainApp /></Sentry.ErrorBoundary>
}
```

### 错误上报 SDK 核心原理

```js
class ErrorTracker {
  constructor({ dsn, batchSize = 10 }) {
    this.queue = []
    window.addEventListener('error', (e) => { /* 捕获并 push */ }, true)
    window.addEventListener('unhandledrejection', (e) => { /* 捕获并 push */ })
    // flush 用 fetch + keepalive，页面关闭时用 sendBeacon 兜底
  }
  captureException(error, context) {
    this.queue.push({ message: error.message, stack: error.stack, context, url: location.href })
    if (this.queue.length >= this.batchSize) this.flush()
  }
}
```

> **错误去重**：对 `message + stack 前 3 行` 做 SHA256 作为 fingerprint，5 分钟内同 fingerprint 只上报一次，后续用 count 累计。**踩坑**：只监听了 `window.onerror` 没处理 Promise 错误，async/await 中异常静默丢失——补上 `unhandledrejection` 后一天内发现十几个真实 Bug。

---

## 四、移动端调试速查

| 方案 | 平台 | 场景 | 接入成本 |
|------|------|------|---------|
| vConsole | 通用 | 快速看 log、真机复现 | 一行 CDN 注入 |
| Safari Web Inspector | iOS + Mac | 远程调试 Safari/WebView | USB 连接 + 开启网页检查器 |
| Chrome `chrome://inspect` | Android | 远程调试 Chrome/WebView | USB 连接 + USB 调试 |
| Whistle | 通用 | 抓包、Mock、代理 | `npm i -g whistle` + 设代理 |

**Whistle 规则示例**：
```
# 线上 API 代理到本地
api.example.com 127.0.0.1:3000
# Mock 接口响应
api.example.com/user/info file:///mock/user.json
# 注入 vConsole
example.com js:///scripts/vconsole-inject.js
```

> vConsole 悬浮按钮会遮挡页面底部，通过 URL 参数 `?debug=1` 动态开关。Whistle 调试 HTTPS 需手机安装根证书，iOS 还需在"证书信任设置"中手动启用。

---

## 五、常见排查链路

### 白屏排查

```
Console 有报错？→ 根据堆栈修复
  ↓无
Network 资源 4xx/5xx？→ 检查部署产物、CDN
  ↓正常
Elements #app 空？→ JS 未挂载（入口、框架初始化）
  ↓有 DOM 但不可见 → CSS（display:none / 层叠遮挡）
  ↓正常
路由匹配？→ 检查路由守卫、重定向、base 配置
  ↓匹配
浏览器兼容性？→ polyfill 遗漏、新 API 不兼容
```

```js
// 白屏检测代码
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const root = document.getElementById('app')
    if (!root || root.children.length === 0) {
      report({ type: 'whiteScreen', detail: 'No DOM content' })
    }
  }, 3000)
})
```

### 接口报错排查

| 状态码 | 常见原因 | 排查方向 |
|-------|---------|---------|
| 400 | 参数格式错误 | 对照接口文档检查字段 |
| 401 | Token 过期/未携带 | 检查 Authorization header |
| 403 | 无权限 | 检查角色与权限配置 |
| 404 | 路径错误 | 检查 baseURL、路由配置 |
| 500 | 服务端异常 | 查看服务端日志 |
| 502/504 | 上游服务问题 | 检查 Nginx upstream、超时配置 |

## 六、框架调试工具

| 功能 | Vue DevTools | React DevTools |
|------|-------------|----------------|
| 组件树 | 查看 props/data/computed，双击编辑实时预览 | 查看 props/state/hooks，编辑预览 |
| 渲染分析 | Timeline 录制事件和渲染 | Profiler 火焰图 + "Why did this render?" |
| 状态管理 | Pinia 面板，时间旅行调试 | 需另装 Redux DevTools |
| 路由 | Routing 面板查看路由状态和历史 | 无内置，用 browser DevTools |
| 渲染高亮 | ❌ | ✅ "Highlight updates" 闪烁标记渲染 |

> Vue DevTools Timeline 录制时间过长（200+ 组件页面录 2 分钟）会导致内存飙到 4GB+ 卡死——按需录制，排查完立即停止。React Profiler 本身有 5%~15% 性能开销，关注相对差异和渲染次数而非绝对毫秒数。
