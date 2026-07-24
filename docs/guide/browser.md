---
title: 浏览器原理
description: 渲染流程、Event Loop、缓存、V8 GC、安全、HTTP/2&3
---

# 浏览器原理

## 必会基础 ⭐⭐⭐

### 渲染流程：HTML 解析 → DOM → CSSOM → Render Tree → Layout → Paint → Composite

浏览器从收到 HTML 到显示画面的关键管道是：解析 HTML 构建 DOM Tree，同时解析 CSS 构建 CSSOM Tree，二者合并生成 Render Tree（只包含可见节点）。Render Tree 经过 Layout 阶段计算每个节点的几何位置与大小，再由 Paint 阶段将像素绘制到图层上，最后由 Composite 阶段通过 GPU 将各图层合成到屏幕。理解这个流水线有助于定位性能瓶颈——每一阶段都可能成为阻塞点。

```
解析 HTML → DOM Tree
解析 CSS  → CSSOM Tree
           ↓ 合并
        Render Tree（只含可见节点）
           ↓
         Layout（计算几何信息）
           ↓
         Paint（绘制像素）
           ↓
       Composite（合成层合并，GPU）
```

### 重排（Reflow）vs 重绘（Repaint）vs 合成（Composite）的触发条件与性能差异

**重排（Reflow）**：当元素的几何属性（宽高、位置、`display`、`padding`、`margin` 等）发生变化时，浏览器必须重新执行 Layout → Paint → Composite 全流程，开销最大。**重绘（Repaint）**：仅视觉样式改变（`color`、`background`、`box-shadow` 等）但不影响布局，跳过 Layout 直接 Paint → Composite。**合成（Composite）**：只有 `transform` 和 `opacity` 变更时，浏览器可在合成线程独立完成，完全避开主线程的 Layout 和 Paint，性能最优。

| 类型 | 触发属性示例 | 触发阶段 | 性能开销 |
|---|---|---|---|
| 重排 | `width` / `height` / `left` / `display` | Layout → Paint → Composite | 🔴 高 |
| 重绘 | `color` / `background` / `visibility` | Paint → Composite | 🟡 中 |
| 合成 | `transform` / `opacity` | Composite only | 🟢 低 |

**优化目标**：尽量让动画和交互只触发 Composite（多用 `transform` / `opacity`），避免在 JS 中频繁读写布局属性导致强制同步布局。

### Event Loop：宏任务（setTimeout / XHR）vs 微任务（Promise.then / MutationObserver）

浏览器端 Event Loop 的核心规则：执行一个宏任务 → 清空当前所有微任务 → 渲染更新（如有需要）→ 取下一个宏任务。宏任务来源包括 `setTimeout`、`setInterval`、I/O、XHR 回调；微任务来源包括 `Promise.then/catch/finally`、`MutationObserver`、`queueMicrotask`。理解这个顺序可以解释为什么 `Promise` 回调总比 `setTimeout` 先执行——微任务在同一次事件循环末尾就被清空，而宏任务要等到下一轮。

```js
console.log('1')                              // 同步
setTimeout(() => console.log('2'), 0)         // 宏任务
Promise.resolve().then(() => console.log('3')) // 微任务
console.log('4')                              // 同步

// 输出：1 4 3 2
// 每次宏任务执行完，清空所有微任务队列，再取下一个宏任务
```

### 浏览器缓存：强缓存（Cache-Control / Expires）vs 协商缓存（ETag / Last-Modified）

强缓存由 `Cache-Control`（HTTP/1.1，相对时间如 `max-age=3600`）或 `Expires`（HTTP/1.0，绝对时间）控制，命中后浏览器直接使用本地缓存，不发起网络请求，状态码显示 200 (from disk/memory cache)。协商缓存在强缓存失效后生效：浏览器携带 `If-None-Match`（对应 `ETag`）或 `If-Modified-Since`（对应 `Last-Modified`）向服务端验证，若资源未变则返回 304 Not Modified，浏览器继续使用本地缓存。实际部署中推荐 `Cache-Control` + `ETag` 组合，兼顾性能与时效性。

| 类型 | 请求头 | 命中时不发请求 | 状态码 |
|---|---|---|---|
| 强缓存 | `Cache-Control: max-age=3600` | ✅ | 200 (from cache) |
| 协商缓存 | `ETag` / `Last-Modified` | ❌（发请求，服务端判断） | 304 Not Modified |

## 进阶考点 ⭐⭐

### V8 GC：新生代（Scavenge）/ 老生代（Mark-Compact / Incremental Marking）

V8 将堆内存分为新生代和老生代。新生代（约 1-8 MB）存放存活时间短的对象，使用 Scavenge 复制算法——将存活对象从 From 空间复制到 To 空间，然后交换角色，未被复制的直接回收。老生代存放存活时间长的对象，使用 Mark-Sweep（标记清除）回收不可达对象，再用 Mark-Compact（标记整理）解决内存碎片问题。为避免长时间 STW（Stop-The-World），V8 还引入了增量标记（Incremental Marking），将标记过程拆分成小步与 JS 交替执行。

| 区域 | 算法 | 存放对象 |
|---|---|---|
| 新生代（约 1-8 MB） | Scavenge（复制算法）| 存活时间短的对象 |
| 老生代 | Mark-Sweep + Mark-Compact | 存活时间长的对象 |

### 内存泄漏排查：全局变量 / 闭包引用 / 未清理的定时器与监听器

常见内存泄漏场景有三类：一是意外创建的全局变量（`this.xxx` 或未声明变量），它们不会被 GC 回收；二是闭包中持有大对象引用且闭包长期存活（如被 `setInterval` 引用）；三是 DOM 节点被移除后，JS 中仍保留对其的引用（Detached DOM）。排查时使用 Chrome DevTools → Memory 面板，通过 Heap Snapshot 对比（观察 Delta 列）定位持续增长的对象，或通过 Allocation Timeline 实时观察分配情况。

```js
// ❌ 泄漏示例 1：意外全局变量
function leak() {
  bar = { huge: new Array(1000000) } // 未声明，挂到 window
}

// ❌ 泄漏示例 2：未清理的定时器持有闭包
let data = { huge: new Array(1000000) }
const timer = setInterval(() => console.log(data.length), 1000)
// 组件卸载时忘了 clearInterval(timer) → data 永远无法回收

// ✅ 清理姿势（React useEffect 为例）
useEffect(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id) // 清理
}, [])
```

### requestAnimationFrame vs requestIdleCallback 的调度时机

`requestAnimationFrame`（rAF）在每帧渲染前执行，与屏幕刷新率同步（通常 60fps，即约 16.6ms 一帧），适合做动画和 DOM 批量更新——浏览器会在 rAF 回调后将所有变更统一提交到下一帧。`requestIdleCallback`（rIC）在浏览器空闲时段执行，优先级最低，适合非关键的后台任务（日志上报、数据预取）。注意 rIC 的回调会收到一个 `IdleDeadline` 参数，可通过 `timeRemaining()` 判断剩余空闲时间，避免阻塞用户交互。

| | rAF | rIC |
|---|---|---|
| 执行时机 | 每帧渲染前 | 帧末尾空闲时段 |
| 帧内位置 | Layout/Paint 之前 | 帧剩余时间 |
| 典型场景 | 动画、DOM 批量读写 | 日志上报、预加载 |
| 兼容性 | 全部现代浏览器 | 部分浏览器（Chrome） |

### CORS：预检请求（OPTIONS）/ 简单请求条件 / Access-Control-Allow-\*

跨域资源共享（CORS）的核心是区分简单请求和需预检的请求。简单请求需同时满足：方法为 GET / HEAD / POST，Content-Type 限定为 `text/plain` / `multipart/form-data` / `application/x-www-form-urlencoded`，且无自定义头部。不满足任一条件则触发预检——浏览器先发 OPTIONS 请求询问服务端是否允许，通过后才发实际请求。服务端通过 `Access-Control-Allow-Origin`、`Access-Control-Allow-Methods`、`Access-Control-Allow-Headers` 等响应头告知许可范围；带 Cookie 的跨域还需设置 `Access-Control-Allow-Credentials: true` 且 `Origin` 不能用 `*`。

```http
# 服务端典型 CORS 响应头
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400   # 预检结果缓存 24h
```

### XSS 防御：CSP / 输入过滤 / httpOnly Cookie；CSRF 防御：SameSite / Token

**XSS（跨站脚本攻击）** 指攻击者将恶意脚本注入页面执行，分存储型（提交到数据库后展示）、反射型（URL 参数直接拼入页面）和 DOM 型（前端 JS 不安全操作 `innerHTML`）。防御核心：输入输出过滤转义（`<` → `&lt;`）、设置 CSP（Content-Security-Policy）白名单拦截未知脚本来源、关键 Cookie 标记 `httpOnly` 禁止 JS 读取。**CSRF（跨站请求伪造）** 利用用户已登录状态诱导其点击恶意链接发起非自愿请求。防御：Cookie 设置 `SameSite=Lax/Strict`、请求携带 CSRF Token 由服务端验证、关键操作校验 Referer/Origin 头部。

```http
# CSP 示例
Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com

# Cookie 加固
Set-Cookie: session=xxx; HttpOnly; Secure; SameSite=Lax
```

| 攻击类型 | 攻击目标 | 核心防御 |
|---|---|---|
| XSS | 注入脚本，窃取 Cookie / 劫持会话 | CSP + 输入转义 + httpOnly |
| CSRF | 伪造用户请求（改密、转账） | SameSite + Token + Referer 校验 |

## 深入理解 ⭐

### Service Worker 生命周期

```
install → waiting → activate → fetch/message → redundant(销毁)
```

- **install**：首次注册时触发，适合预缓存关键资源（`caches.open + addAll`）
- **activate**：旧 SW 控制的页面全部关闭后激活，适合清理旧缓存
- **fetch**：拦截网络请求（`event.respondWith`），实现离线优先策略
- **scope**：SW 只能控制其所在目录及子目录的页面

**PWA 核心三件套**：SW + Web App Manifest + HTTPS

### HTTP/2 vs HTTP/3 对比

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| 传输层 | TCP | TCP | **QUIC（UDP）** |
| 多路复用 | ❌（队头阻塞） | ✅（流复用，TCP 层仍有队头阻塞） | ✅（流级别独立，无队头阻塞） |
| 头部压缩 | ❌ | HPACK | QPACK |
| 连接建立 | 1 RTT | 1 RTT | **0-RTT**（恢复连接） |
| 安全性 | 可选 | TLS 1.2+ | 内置 TLS 1.3 |

**面试关键**：HTTP/3 最大改进——QUIC 跑在 UDP 上，丢包只影响单个流，不像 TCP 会阻塞所有流。

### 前端性能监控指标

| 指标 | 含义 | 及格线 |
|---|---|---|
| FCP | 首次内容绘制 | < 1.8s |
| LCP | 最大内容绘制（核心 Web Vitals） | < 2.5s |
| FID | 首次输入延迟 | < 100ms |
| CLS | 累积布局偏移（核心 Web Vitals） | < 0.1 |
| TTI | 可交互时间 | < 3.8s |
| TBT | 总阻塞时间 | < 200ms |
