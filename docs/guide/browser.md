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

---

## 跨域处理深入 ⭐⭐

浏览器的同源策略（协议 + 域名 + 端口三者完全一致）是 Web 安全的基石，但实际开发中跨域需求非常普遍。不同方案在原理、限制、适用场景上差异显著，面试常要求对比多种方案并能手写关键配置。

### 方案总览

| 方案 | 原理 | 适用 |
|---|---|---|
| JSONP | `<script>` 标签的 `src` 不受同源策略限制，服务端返回函数调用包裹的数据 | 仅 GET 请求，老旧方案，现代项目已很少使用 |
| CORS | 服务端设置 `Access-Control-*` 系列响应头，浏览器据此放行跨域请求 | 主流方案，支持所有 HTTP 方法，需后端配合 |
| 代理（DevServer） | 同源服务器接收请求后转发到目标服务器，浏览器始终只与同源代理通信 | 开发环境（webpack-dev-server / vite） |
| Nginx 反向代理 | 利用 `proxy_pass` 将请求转发到目标服务，对浏览器完全透明 | 生产环境，配置简单，性能好 |
| PostMessage | HTML5 提供的跨窗口通信 API，`window.postMessage` + `message` 事件 | 父子窗口、iframe 嵌入页面间通信 |
| WebSocket | `ws://` / `wss://` 协议不受同源策略限制，服务端可校验 `Origin` | 实时推送、聊天、协作编辑等长连接场景 |

### JSONP

利用 `<script>` 标签没有跨域限制的特性。前端动态创建 `<script>` 标签并将回调函数名通过 URL 参数传给服务端；服务端返回一段 JS 代码，调用该回调函数并将数据作为参数传入。缺点是只能发 GET 请求、无法设置自定义请求头、错误处理困难，且存在 XSS 风险（服务端被攻破可注入任意脚本）。现代开发已基本被 CORS 取代。

```html
<!-- 前端：JSONP 请求封装 -->
<script>
function handleData(data) {
  console.log('JSONP 返回:', data)
}

function jsonp(url) {
  const script = document.createElement('script')
  script.src = url + '?callback=handleData'
  document.body.appendChild(script)
  script.onload = () => script.remove() // 用完后移除
}

jsonp('https://api.example.com/user')
</script>
```

```js
// 后端（Node.js / Express）：
app.get('/user', (req, res) => {
  const callback = req.query.callback    // 前端传来的回调名
  const data = { id: 1, name: 'Alice' }
  res.set('Content-Type', 'application/javascript')
  res.send(`${callback}(${JSON.stringify(data)})`)  // → handleData({...})
})
```

### CORS（跨域资源共享）

这是目前最标准的跨域方案。浏览器自动在跨域请求中携带 `Origin` 头，服务端通过 `Access-Control-Allow-Origin` 等响应头声明许可策略。对于非简单请求（如 `PUT`、`DELETE`、带 `Authorization` 头的请求），浏览器会先发自带的 **OPTIONS 预检请求**，通过后再发实际请求。CORS 的灵活性体现在可以精细控制允许的方法、头部、是否携带 Cookie、预检缓存时长等。

```js
// 后端（Node.js / Express）—— 使用 cors 中间件
const cors = require('cors')

// 基础用法：允许所有源
app.use(cors())

// 精细化配置
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'], // 白名单
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,       // 允许携带 Cookie
  maxAge: 86400            // 预检缓存 24 小时
}))
```

```js
// 手工配置（不用中间件）
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', 'https://example.com')
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE')
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.set('Access-Control-Allow-Credentials', 'true')
  if (req.method === 'OPTIONS') return res.sendStatus(204) // 预检直接返回
  next()
})
```

### 代理（DevServer Proxy）

开发阶段最常用的方案。webpack-dev-server / Vite 等工具内置代理能力，在本地开发服务器与浏览器之间插入一层——浏览器请求 `localhost:3000/api`，dev server 收到后转发到 `https://api.example.com`，响应原路返回。因为浏览器始终只与 `localhost:3000` 同源通信，所以完全没有跨域问题。注意这仅在开发环境生效，生产部署需要 Nginx 或后端自行处理。

```js
// webpack.config.js
module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,        // 修改 Host 头为目标地址
        pathRewrite: { '^/api': '' } // 去掉 /api 前缀
      }
    }
  }
}
```

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

### Nginx 反向代理

生产环境中通过 Nginx 统一处理跨域——将前端静态资源和后端 API 挂载在同一个域名下，或通过 `proxy_pass` 将 `/api` 路径转发到后端服务。对浏览器而言，所有请求都发往同一个源，完全绕开同源策略。Nginx 还能在同一处统一配置 CORS 头、缓存策略、负载均衡等。

```nginx
server {
    listen 80;
    server_name www.example.com;

    # 前端静态资源
    location / {
        root /var/www/html;
        try_files $uri /index.html;
    }

    # API 反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;   # 去掉 /api 前缀
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # 也可以在这里统一加 CORS 头（后端不处理时）
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET,POST,PUT,DELETE';
    }
}
```

### PostMessage

HTML5 提供的安全跨域通信机制，适用于 iframe 嵌入、`window.open` 打开的子窗口、TAB 页之间的通信。发送方调用 `targetWindow.postMessage(data, targetOrigin)`，接收方监听 `window.addEventListener('message', callback)`。注意 `targetOrigin` 应指定具体域名而非 `'*'`，接收方也必须校验 `event.origin` 以防止恶意消息注入。

```html
<!-- 父页面 (https://parent.com) -->
<iframe id="child" src="https://child.com"></iframe>
<script>
// 向 iframe 发送消息
const childWindow = document.getElementById('child').contentWindow
childWindow.postMessage({ type: 'greeting', text: 'Hello' }, 'https://child.com')

// 接收 iframe 回传
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://child.com') return  // 安全校验
  console.log('收到子页面消息:', event.data)
})
</script>
```

```html
<!-- 子页面 (https://child.com) -->
<script>
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://parent.com') return
  console.log('收到父页消息:', event.data)
  // 回复父页
  event.source.postMessage({ type: 'reply', text: 'Hi back!' }, event.origin)
})
</script>
```

### WebSocket

WebSocket 使用 `ws://`（非加密）或 `wss://`（加密，等同于 HTTPS）协议，与 HTTP 同源策略完全独立——浏览器不会对 WebSocket 连接施加同源限制。不过服务端仍应校验请求的 `Origin` 头来防止跨站 WebSocket 劫持（Cross-Site WebSocket Hijacking）。WebSocket 建立连接后支持全双工实时通信，适合聊天、协作编辑、实时推送等场景。

```js
// 前端
const ws = new WebSocket('wss://api.example.com/ws')

ws.onopen = () => {
  console.log('连接已建立')
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'news' }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('收到消息:', data)
}

ws.onclose = () => console.log('连接已关闭')
ws.onerror = (err) => console.error('连接错误', err)
```

```js
// 后端（Node.js + ws 库）
const WebSocket = require('ws')
const wss = new WebSocket.Server({ port: 3000 })

wss.on('connection', (ws, req) => {
  // 校验 Origin 防止跨站劫持
  const allowedOrigins = ['https://example.com']
  if (!allowedOrigins.includes(req.headers.origin)) {
    return ws.close()
  }

  ws.on('message', (msg) => {
    console.log('收到:', msg.toString())
    ws.send(JSON.stringify({ status: 'ok' }))
  })
})
```

### 跨域方案横向对比

| 维度 | JSONP | CORS | 代理 | Nginx | PostMessage | WebSocket |
|---|---|---|---|---|---|---|
| HTTP 方法 | 仅 GET | 全部 | 全部 | 全部 | 不适用 | 不适用（自有协议） |
| 需要后端配合 | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| 携带 Cookie | ❌ | ✅（credentials） | ✅ | ✅ | ❌ | ❌ |
| 环境 | 浏览器 | 浏览器 | 仅开发 | 生产 | 浏览器 | 浏览器 |
| 双向通信 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅（原生双工） |
| 错误处理 | 弱 | 完善 | 完善 | 完善 | 手动实现 | 事件驱动 |

---

## HTTPS 原理 ⭐⭐

HTTPS = HTTP + TLS（Transport Layer Security），在 TCP 三次握手之后、HTTP 报文传输之前，插入 TLS 握手来协商加密密钥，之后的通信全部由对称加密保护。HTTPS 解决了 HTTP 明文传输的三大问题：**防窃听**（加密）、**防篡改**（完整性校验）、**防冒充**（身份认证）。

### 对称加密 vs 非对称加密

**对称加密**：通信双方使用**同一个密钥**进行加解密，速度快，适合大量数据传输。问题在于如何安全地把密钥传给对方——如果通过不安全的信道传输，密钥本身就可能被窃取。常见算法：AES、ChaCha20。

**非对称加密**：使用一对数学相关的密钥——**公钥加密的内容只能用私钥解密**，反之亦然。通信时服务端公开公钥，客户端用公钥加密数据后发送，只有持有私钥的服务端能解密。安全性高但计算慢，不适合加密大量数据。常见算法：RSA、ECDHE。

TLS 的精妙之处在于**混合使用**：握手阶段用非对称加密安全交换"会话密钥"，后续数据传输用该会话密钥进行对称加密——兼顾安全与性能。

| 维度 | 对称加密 | 非对称加密 |
|---|---|---|
| 密钥数量 | 1 个（共享） | 2 个（公钥 + 私钥） |
| 加密速度 | 快（适合大量数据） | 慢（计算密集） |
| 密钥分发 | 困难（需安全信道） | 简单（公钥可公开） |
| 典型算法 | AES、ChaCha20 | RSA、ECDHE、Ed25519 |
| TLS 中角色 | 加密实际 HTTP 数据 | 握手阶段交换对称密钥 |

### TLS 1.3 握手流程（4 步简化）

TLS 1.3 相比 1.2 精简了往返次数（从 2-RTT 降到 1-RTT），移除了不安全的加密套件。以下为简化流程：

```
Client                                    Server
  │                                          │
  │──── ① ClientHello ────────────────────→ │
  │     (支持的密码套件、密钥协商参数)         │
  │                                          │
  │←─── ② ServerHello + 证书 + 完成 ────── │
  │     (选定密码套件、证书链、签名验证)       │
  │                                          │
  │──── ③ Client Finish ──────────────────→ │
  │     (验证证书、生成会话密钥、加密完成)      │
  │                                          │
  │←─── ④ Server Finish ────────────────── │
  │     (加密确认，此后全部用对称密钥通信)      │
  │                                          │
  ═══════ 对称加密传输 HTTP 数据 ═══════════
```

**① ClientHello**：客户端发送支持的 TLS 版本、密码套件列表、随机数、密钥协商参数（如 ECDHE 公钥）。

**② ServerHello + 证书**：服务端选定密码套件，返回自己的随机数、密钥协商参数、**证书链**（包含服务端公钥）。客户端拿到证书后向 CA 验证其有效性（域名匹配、未过期、未吊销、CA 可信）。

**③ Client Finish**：客户端验证通过后，双方通过 ECDHE 等算法独立计算出相同的 **会话密钥**（无需在网络上传输密钥本身）。客户端发送加密的 Finished 消息。

**④ Server Finish**：服务端也发送加密的 Finished 消息。此后双方用会话密钥进行对称加密通信，握手完成。

```text
安全要点：
- ECDHE 密钥协商使得即使服务端私钥泄露，历史会话也无法被解密（前向安全性）
- TLS 1.3 要求在 ① 阶段就传递密钥协商参数，减少 1 个 RTT
- 证书链中的每个证书都用上级 CA 的私钥签名，根 CA 自签名并预置在操作系统中
```

### 证书链与 CA

**CA（Certificate Authority，证书颁发机构）** 是 TLS 信任模型的核心。服务端将自己的公钥和域名提交给 CA 申请证书，CA 用自己的私钥对证书内容签名后颁发。浏览器/操作系统内置了受信任的根 CA 列表（如 DigiCert、Let's Encrypt、GlobalSign），TLS 握手时沿证书链逐级验证签名，直到找到信任的根。

**证书链结构**：

```
根 CA 证书（自签名，预置在 OS/浏览器中）
  └─→ 中间 CA 证书（根 CA 签发）
       └─→ 服务端证书（中间 CA 签发，包含域名 + 公钥）
```

验证链路上每一环签名的有效性，任一环节失败则整个链不被信任。面试中常问的"为什么需要中间 CA"——因为根 CA 私钥需离线保管（一旦泄露整个互联网安全崩溃），日常签发由中间 CA 完成，形成层级隔离。

```bash
# 查看某域名的证书链（命令行）
openssl s_client -connect example.com:443 -showcerts </dev/null 2>/dev/null \
  | grep -E "subject=|issuer="
# subject= /CN=example.com        ← 服务端证书
# issuer=  /C=US/O=Let's Encrypt  ← 中间 CA
# （继续往上追到根 CA）
```

| 概念 | 说明 |
|---|---|
| 根 CA | 最高层级，自签名，预置在浏览器/OS 信任库中 |
| 中间 CA | 根 CA 签发，负责日常证书颁发，隔离根 CA 风险 |
| 服务端证书 | 绑定域名与公钥，由中间 CA 签发 |
| 证书链 | 从服务端证书逐级验证到根 CA 的完整签名路径 |
| 吊销检查 | OCSP（在线证书状态协议）或 CRL（证书吊销列表），浏览器会检查证书是否已被吊销 |