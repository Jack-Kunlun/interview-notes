---
title: 浏览器原理
description: 渲染流程、Event Loop、缓存、V8 GC、安全、跨域、Service Worker、性能监控
---

# 浏览器原理

## 一、渲染原理

### 1.1 渲染流水线：从 HTML 到像素

浏览器从收到 HTML 到显示画面的关键管道是：解析 HTML 构建 DOM Tree，同时解析 CSS 构建 CSSOM Tree，二者合并生成 Render Tree（只包含可见节点）。Render Tree 经过 Layout 阶段计算每个节点的几何位置与大小，再由 Paint 阶段将像素绘制到图层上，最后由 Composite 阶段通过 GPU 将各图层合成到屏幕。

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

### 1.2 重排、重绘、合成

修改不同属性会触发不同的渲染阶段，性能差距可达 10 倍以上：

| 类型 | 触发属性示例 | 触发阶段 | 性能开销 |
|---|---|---|---|
| 重排 | `width` / `height` / `left` / `display` | Layout → Paint → Composite | 🔴 高 |
| 重绘 | `color` / `background` / `visibility` | Paint → Composite | 🟡 中 |
| 合成 | `transform` / `opacity` | Composite only | 🟢 低 |

**优化目标**：尽量让动画和交互只触发 Composite（多用 `transform` / `opacity`），避免在 JS 中频繁读写布局属性导致强制同步布局。

### 1.3 强制同步布局

JS 先写布局属性再立即读（如修改 `style.width` 后马上读 `offsetHeight`），浏览器被迫在当前帧同步执行 Layout。Chrome DevTools Performance 面板会标红 "Forced reflow"。

```js
// ❌ 触发强制同步布局
element.style.width = '100px'
const height = element.offsetHeight  // 强制浏览器立即 Layout

// ✅ 批量读写分离
const height = element.offsetHeight  // 先读
element.style.width = '100px'        // 后写
```

---

## 二、JavaScript 执行机制

### 2.1 Event Loop

浏览器端 Event Loop 的核心规则：**执行一个宏任务 → 清空当前所有微任务 → 渲染更新（如有需要）→ 取下一个宏任务**。

宏任务来源：`setTimeout`、`setInterval`、I/O、XHR 回调。微任务来源：`Promise.then/catch/finally`、`MutationObserver`、`queueMicrotask`。

```js
console.log('1')                              // 同步
setTimeout(() => console.log('2'), 0)         // 宏任务
Promise.resolve().then(() => console.log('3')) // 微任务
console.log('4')                              // 同步
// 输出：1 4 3 2
```

### 2.2 requestAnimationFrame vs requestIdleCallback

| | rAF | rIC |
|---|---|---|
| 执行时机 | 每帧渲染前（Layout/Paint 之前） | 帧末尾空闲时段 |
| 帧内位置 | 约 16.6ms 预算的前半段 | 帧剩余时间 |
| 典型场景 | 动画、DOM 批量读写 | 日志上报、预加载 |
| 兼容性 | 全部现代浏览器 | 部分浏览器（Safari 不支持） |

---

## 三、浏览器缓存

### 3.1 强缓存 vs 协商缓存

| 类型 | 控制头 | 命中时不发请求 | 状态码 |
|---|---|---|---|
| 强缓存 | `Cache-Control: max-age=3600` | ✅ | 200 (from cache) |
| 协商缓存 | `ETag` / `Last-Modified` | ❌（发请求验证） | 304 Not Modified |

**强缓存**由 `Cache-Control`（相对时间）或 `Expires`（绝对时间）控制，命中后浏览器直接使用本地缓存，不发起网络请求。**协商缓存**在强缓存失效后生效：浏览器携带 `If-None-Match`（对应 `ETag`）或 `If-Modified-Since`（对应 `Last-Modified`）向服务端验证。

### 3.2 最佳实践

| 资源类型 | 策略 | 原因 |
|---|---|---|
| HTML 入口文件 | `Cache-Control: no-cache`（协商缓存） | 必须保证发版后用户拿到最新 HTML |
| JS/CSS（带哈希） | `Cache-Control: max-age=31536000`（一年强缓存） | 文件名变了自动绕过缓存 |
| 图片/字体 | `max-age=86400` 或更长 | 变更频率低 |

---

## 四、V8 引擎与内存

### 4.1 垃圾回收机制

V8 将堆内存分为新生代和老生代：

| 区域 | 算法 | 存放对象 |
|---|---|---|
| 新生代（约 1-8 MB） | Scavenge（Cheney 复制算法） | 存活时间短的对象 |
| 老生代 | Mark-Sweep + Mark-Compact | 存活时间长的对象 |

- **新生代**：使用 Scavenge 复制算法——将存活对象从 From 空间复制到 To 空间，然后交换角色，未被复制的直接回收。存活够久的对象晋升到老生代。
- **老生代**：Mark-Sweep（标记清除）回收不可达对象，Mark-Compact（标记整理）解决内存碎片。引入**增量标记**（Incremental Marking）将标记过程拆分成小步与 JS 交替执行，避免长时间 STW。

### 4.2 内存泄漏排查

最常见的三类泄漏：

| 类型 | 场景 | 排查工具 |
|---|---|---|
| 意外全局变量 | `bar = { huge: ... }`（未声明变量挂到 window） | Heap Snapshot 对比（Delta 列） |
| 闭包持有大对象 | 定时器/事件监听器长期引用闭包 | Allocation Timeline |
| Detached DOM | DOM 节点移除后 JS 仍持有引用 | Memory 面板 → Detached 筛选 |

```js
// ❌ 泄漏示例：未清理的定时器持有闭包
let data = { huge: new Array(1000000) }
const timer = setInterval(() => console.log(data.length), 1000)
// 组件卸载时忘了 clearInterval(timer) → data 永远无法回收

// ✅ 清理姿势（React useEffect 为例）
useEffect(() => {
  const id = setInterval(tick, 1000)
  return () => clearInterval(id)
}, [])
```

---

## 五、浏览器安全

### 5.1 XSS（跨站脚本攻击）

攻击者将恶意脚本注入页面执行，分三种类型：

| 类型 | 注入方式 | 防御 |
|---|---|---|
| 存储型 | 提交到数据库后展示 | 输出转义 + CSP |
| 反射型 | URL 参数直接拼入页面 | 输入过滤 + 不拼接 HTML |
| DOM 型 | 前端不安全操作 `innerHTML` / `document.write` | 避免直接操作 innerHTML |

**核心防御**：输入输出过滤转义（`<` → `&lt;`）、设置 CSP（Content-Security-Policy）白名单拦截未知脚本来源、关键 Cookie 标记 `httpOnly` 禁止 JS 读取。

### 5.2 CSRF（跨站请求伪造）

利用用户已登录状态诱导其点击恶意链接发起非自愿请求。

**核心防御**：Cookie 设置 `SameSite=Lax/Strict`、请求携带 CSRF Token 由服务端验证、关键操作校验 Referer/Origin 头部。

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

---

## 六、跨域方案

浏览器的同源策略（协议 + 域名 + 端口三者完全一致）是 Web 安全的基石，但实际开发中跨域需求非常普遍。

### 6.1 CORS（跨域资源共享）

CORS 的核心是区分简单请求和需预检的请求。**简单请求**需同时满足：方法为 GET / HEAD / POST，Content-Type 限定为 `text/plain` / `multipart/form-data` / `application/x-www-form-urlencoded`，且无自定义头部。不满足任一条件则触发预检——浏览器先发 OPTIONS 请求询问服务端是否允许。

```http
# 服务端典型 CORS 响应头
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400   # 预检结果缓存 24h
```

```js
// 后端 Express 使用 cors 中间件
app.use(cors({
  origin: ['https://example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}))
```

### 6.2 JSONP

利用 `<script>` 标签没有跨域限制的特性。优点是兼容性好，缺点明显：仅支持 GET 请求、无法设置自定义请求头、错误处理困难、有 XSS 风险。现代项目已基本被 CORS 取代。

```js
// 前端封装
function jsonp(url) {
  const script = document.createElement('script')
  script.src = url + '?callback=handleData'
  document.body.appendChild(script)
  script.onload = () => script.remove()
}
```

### 6.3 代理方案

开发环境用 dev server proxy（webpack-dev-server / Vite），生产环境用 Nginx 反向代理——本质上都是让浏览器始终与同源通信，完全绕开同源策略。

```js
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

```nginx
# Nginx 反向代理
location /api/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 6.4 PostMessage

HTML5 提供的安全跨域通信机制，适用于 iframe 嵌入、`window.open` 子窗口、TAB 页之间的通信。

```js
// 父页面
childWindow.postMessage({ type: 'greeting', text: 'Hello' }, 'https://child.com')

// 接收
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://child.com') return  // 安全校验！
  console.log('收到:', event.data)
})
```

### 6.5 方案对比

| 方案 | HTTP 方法 | 需要后端配合 | 携带 Cookie | 环境 | 适用场景 |
|---|---|---|---|---|---|
| **CORS** | 全部 | ✅ | ✅（需配置） | 浏览器 | 主流 API 跨域 |
| **JSONP** | 仅 GET | ✅ | ❌ | 浏览器 | 历史方案，已淘汰 |
| **DevServer 代理** | 全部 | ❌ | ✅ | 仅开发环境 | 本地开发 |
| **Nginx 反向代理** | 全部 | ✅（Nginx 配置） | ✅ | 生产环境 | 生产部署 |
| **PostMessage** | 不适用 | ❌ | ❌ | 浏览器 | iframe/窗口通信 |

---

## 七、进阶主题

### 7.1 Service Worker

```
install → waiting → activate → fetch/message → redundant(销毁)
```

- **install**：首次注册时触发，适合预缓存关键资源（`caches.open + addAll`）
- **activate**：旧 SW 控制的页面全部关闭后激活，适合清理旧缓存
- **fetch**：拦截网络请求（`event.respondWith`），实现离线优先策略

**PWA 核心三件套**：SW + Web App Manifest + HTTPS

### 7.2 前端性能监控指标

| 指标 | 含义 | 及格线 | 核心 Web Vitals |
|---|---|---|---|
| FCP | 首次内容绘制 | < 1.8s | |
| **LCP** | 最大内容绘制 | **< 2.5s** | ✅ |
| **FID** | 首次输入延迟 | **< 100ms** | ✅（3 月已替换为 INP） |
| **CLS** | 累积布局偏移 | **< 0.1** | ✅ |
| TTI | 可交互时间 | < 3.8s | |
| TBT | 总阻塞时间 | < 200ms | |

---

## 面试要点速查

| 问题 | 关键词 |
|---|---|
| 浏览器渲染流水线 | DOM → CSSOM → Render Tree → Layout → Paint → Composite |
| 重排/重绘/合成区别 | Layout 开销最大，Composite 开销最小，动画只用 transform/opacity |
| 强制同步布局 | 写 DOM → 立即读 → 浏览器被迫同步 Layout，Performance 面板标红 |
| Event Loop 顺序 | 宏任务 → 清空微任务 → rAF → 渲染 → 下一个宏任务 |
| rAF vs rIC | rAF 每帧渲染前必执行，rIC 帧末尾空闲时段（不保证执行） |
| 强缓存 vs 协商缓存 | `Cache-Control` 不发请求(200 cache)，`ETag` 发请求验证(304) |
| V8 GC 两代 | 新生代 Scavenge(复制)，老生代 Mark-Sweep-Compact(增量标记) |
| 内存泄漏三类 | 意外全局变量 / 闭包持有大对象 / Detached DOM |
| XSS vs CSRF | XSS 注入脚本(CSP+转义)，CSRF 伪造请求(SameSite+Token) |
| CORS 预检条件 | 非 GET/HEAD/POST，或 Content-Type 非三个简单类型，或有自定义头 |
| Service Worker | install → waiting → activate → fetch，PWA = SW + Manifest + HTTPS |
| LCP / FID / CLS | Core Web Vitals 三大指标：2.5s / 100ms / 0.1 |
