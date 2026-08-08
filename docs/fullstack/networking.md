---
title: 网络通信
description: HTTP 协议、DNS/TCP、HTTPS、WebSocket、Socket.io、Long Polling、SSE 等前端网络通信方案
---

# 网络通信

## 一、HTTP 协议基础

### 1.1 请求与响应结构

HTTP 是基于 TCP 的应用层协议，采用请求-响应模型。一次完整的 HTTP 通信包含：客户端发送请求报文（请求行 + 请求头 + 空行 + 请求体），服务端返回响应报文（状态行 + 响应头 + 空行 + 响应体）。

```
客户端                                    服务端
  │──── GET /api/users HTTP/1.1 ────────→ │  请求行（方法 + 路径 + 版本）
  │──── Host: example.com ──────────────→ │  请求头
  │──── Accept: application/json ───────→ │
  │────                                  → │  空行（分隔符）
  │────                                  → │  请求体（GET 通常为空）
  │                                        │
  │←─── HTTP/1.1 200 OK ─────────────── │  状态行
  │←─── Content-Type: application/json ─ │  响应头
  │←─── Cache-Control: max-age=3600 ──── │
  │←───                                  │  空行
  │←─── {"users": [...]}               │  响应体
```

### 1.2 常用状态码

| 范围 | 含义 | 典型示例 |
|---|---|---|
| 1xx | 信息 | `101 Switching Protocols`（WebSocket 升级） |
| 2xx | 成功 | `200 OK`、`201 Created`、`204 No Content` |
| 3xx | 重定向 | `301` 永久重定向、`302` 临时重定向、`304 Not Modified`（协商缓存） |
| 4xx | 客户端错误 | `400 Bad Request`、`401 Unauthorized`、`403 Forbidden`、`404 Not Found`、`429 Too Many Requests` |
| 5xx | 服务端错误 | `500 Internal Server Error`、`502 Bad Gateway`、`503 Service Unavailable`、`504 Gateway Timeout` |

### 1.3 HTTP 版本演进

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| 传输层 | TCP | TCP | **QUIC（UDP）** |
| 多路复用 | ❌（队头阻塞） | ✅（流复用，TCP 层仍有队头阻塞） | ✅（流级别独立，无队头阻塞） |
| 头部压缩 | ❌ | HPACK | QPACK |
| 连接建立 | 1 RTT | 1 RTT | **0-RTT**（恢复连接） |
| 安全性 | 可选 | TLS 1.2+ | 内置 TLS 1.3 |
| 服务器推送 | ❌ | ✅（Server Push，已废弃） | ❌（改用 103 Early Hints） |

**关键区别**：HTTP/1.1 同一域名最多 6 个并发 TCP 连接，且请求-响应必须按序返回（队头阻塞）。HTTP/2 引入多路复用——一个 TCP 连接上同时传输多个 Stream，每个 Stream 独立不互相阻塞。HTTP/3 更进一步：把传输层换成 QUIC（基于 UDP），丢包只影响单个流，不像 TCP 阻塞所有流。

---

## 二、DNS 与 TCP/IP

### 2.1 DNS 解析过程

```
用户输入域名
  → 浏览器 DNS 缓存（chrome://net-internals/#dns）
  → 操作系统 hosts 文件
  → 本地 DNS 服务器（运营商）
  → 根 DNS 服务器（.）
  → 顶级域服务器（.com）
  → 权威 DNS 服务器（example.com）
  → 返回 IP 地址
```

**优化手段**：DNS 预解析 `<link rel="dns-prefetch" href="//api.example.com">`，在用户点击之前提前解析目标域名 IP，减少首次请求的 DNS 延迟。

### 2.2 TCP 三次握手与四次挥手

```
三次握手（建立连接）                    四次挥手（断开连接）
Client          Server                 Client          Server
  │──SYN───────→│                        │──FIN───────→│
  │←─SYN+ACK───│                        │←─ACK───────│
  │──ACK───────→│                        │←─FIN───────│
  │  连接建立    │                        │──ACK───────→│
                                         │  连接关闭    │
```

- **三次握手**：确认双方的收发能力。SYN 洪泛攻击就是只发 SYN 不回应 ACK，占用服务端半连接队列。
- **四次挥手**：TCP 全双工——双方都需要独立关闭自己方向的通道，所以 FIN 和 ACK 各需要两轮。

---

## 三、HTTPS 原理

HTTPS = HTTP + TLS（Transport Layer Security），在 TCP 三次握手之后、HTTP 报文传输之前，插入 TLS 握手来协商加密密钥。它解决了 HTTP 明文传输的三大问题：**防窃听**（加密）、**防篡改**（完整性校验）、**防冒充**（身份认证）。

### 3.1 对称加密 vs 非对称加密

| 维度 | 对称加密 | 非对称加密 |
|---|---|---|
| 密钥数量 | 1 个（共享） | 2 个（公钥 + 私钥） |
| 加密速度 | 快（适合大量数据） | 慢（计算密集） |
| 密钥分发 | 困难（需安全信道） | 简单（公钥可公开） |
| 典型算法 | AES、ChaCha20 | RSA、ECDHE、Ed25519 |
| TLS 中角色 | 加密实际 HTTP 数据 | 握手阶段交换对称密钥 |

TLS 的精妙之处在于**混合使用**：握手阶段用非对称加密安全交换"会话密钥"，后续数据传输用该会话密钥进行对称加密——兼顾安全与性能。

### 3.2 TLS 1.3 握手流程

TLS 1.3 相比 1.2 精简了往返次数（从 2-RTT 降到 1-RTT），移除了不安全的加密套件：

```
Client                                    Server
  │──── ① ClientHello ──────────────────→ │  支持的密码套件、密钥协商参数
  │←─── ② ServerHello + 证书 + 完成 ──── │  选定套件、证书链、签名验证
  │──── ③ Client Finish ────────────────→ │  验证证书、生成会话密钥
  │←─── ④ Server Finish ──────────────── │  加密确认
  ═══════ 对称加密传输 HTTP 数据 ═══════════
```

**① ClientHello**：客户端发送支持的 TLS 版本、密码套件列表、密钥协商参数（如 ECDHE 公钥）。

**② ServerHello + 证书**：服务端选定密码套件，返回证书链（包含服务端公钥）。客户端向 CA 验证证书有效性。

**③ Client Finish**：双方通过 ECDHE 独立计算出相同的会话密钥（无需在网络上传输密钥本身）。

**④ Server Finish**：服务端加密确认。此后全部用会话密钥对称加密通信。

### 3.3 证书链与 CA

```
根 CA 证书（自签名，预置在 OS/浏览器中）
  └─→ 中间 CA 证书（根 CA 签发）
       └─→ 服务端证书（中间 CA 签发，包含域名 + 公钥）
```

**CA（Certificate Authority）** 是 TLS 信任模型的核心。浏览器内置受信任的根 CA 列表，TLS 握手时沿证书链逐级验证签名。中间 CA 的存在是因为根 CA 私钥需离线保管（一旦泄露整个互联网安全崩溃），日常签发由中间 CA 完成。

| 概念 | 说明 |
|---|---|
| 根 CA | 最高层级，自签名，预置在浏览器/OS 信任库中 |
| 中间 CA | 根 CA 签发，负责日常证书颁发，隔离根 CA 风险 |
| 服务端证书 | 绑定域名与公钥，由中间 CA 签发 |
| 证书透明度（CT） | CA 必须将签发记录提交到公共 CT Log，浏览器要求证书附带 SCT 凭证 |

---

## 四、WebSocket

WebSocket 是一种在单个 TCP 连接上进行**全双工通信**的协议。握手复用了 HTTP 协议（端口 80/443），但握手完成后协议升级为 WebSocket，数据帧格式极为轻量（2-14 字节头部）。

### 4.1 握手过程

**客户端请求头**：

```
GET /chat HTTP/1.1
Host: example.com:8000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

**服务器响应**：

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

服务器把 `Sec-WebSocket-Key` 拼接魔术字符串 `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`，SHA-1 哈希后 base64 编码返回。客户端验证一致后握手完成。

### 4.2 前端 API

```js
const ws = new WebSocket('wss://echo.example.com')

ws.onopen = () => ws.send('Hello Server!')
ws.onmessage = (event) => console.log('收到:', event.data)
ws.onclose = (event) => console.log(`关闭: code=${event.code}`)
ws.onerror = (error) => console.error('错误:', error)

// readyState: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
```

### 4.3 心跳机制

TCP 长连接在长时间无数据时可能被中间代理、NAT 设备或防火墙断掉。心跳即周期性发送极小数据帧（ping/pong）让对方知道"我还活着"。

```js
class HeartbeatWS {
  constructor(url, interval = 30000) {
    this.ws = new WebSocket(url)
    this.ws.onopen = () => {
      this.pingTimer = setInterval(() => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, interval)
    }
    this.ws.onclose = () => clearInterval(this.pingTimer)
  }
}
```

> 浏览器 WebSocket API 不支持直接发送协议级 ping 帧，通常采用应用层自定义 `{type: 'ping'}` 消息，服务端回复 `{type: 'pong'}`，客户端检测 pong 超时则判定断线。

### 4.4 自动重连（指数退避）

```js
scheduleReconnect() {
  if (this.retryCount >= this.maxRetries) return
  const delay = Math.min(
    this.baseDelay * Math.pow(2, this.retryCount),
    this.maxDelay
  )
  this.retryCount++
  setTimeout(() => this.connect(), delay)
}
```

**指数退避**公式 `Math.min(baseDelay * 2^n, maxDelay)`——首次重连 1s，后续每次翻倍，到达上限后恒定等待。目的是避免所有客户端同时涌入造成的**雷群效应**（Thundering Herd）。

### 4.5 生产级封装

融合**心跳 + 自动重连 + 消息队列 + 事件监听**：

```js
class RobustWebSocket {
  constructor(url, options = {}) {
    this.url = url
    this.options = {
      reconnect: true, maxRetries: 5, baseDelay: 1000, maxDelay: 30000,
      heartbeatInterval: 30000, heartbeatTimeout: 10000, ...options
    }
    this.retryCount = 0
    this.manualClose = false
    this.listeners = new Map()
    this.pendingQueue = []
    this._connect()
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event).push(callback)
    return this
  }

  send(data) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg)
    } else {
      this.pendingQueue.push(msg)
    }
  }

  close() { this.manualClose = true; this._cleanup(); this.ws?.close() }

  _connect() {
    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => {
      this.retryCount = 0
      this._startHeartbeat()
      while (this.pendingQueue.length) this.ws.send(this.pendingQueue.shift())
      this._emit('open')
    }
    this.ws.onmessage = (event) => {
      let data = event.data
      try { data = JSON.parse(data) } catch {}
      if (data?.type === 'pong') return
      this._emit('message', data)
    }
    this.ws.onclose = (event) => {
      this._cleanup()
      this._emit('close', event)
      if (!this.manualClose && this.options.reconnect) this._scheduleReconnect()
    }
    this.ws.onerror = (err) => this._emit('error', err)
  }

  _startHeartbeat() {
    this.pingTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
        this.pongTimer = setTimeout(() => this.ws.close(), this.options.heartbeatTimeout)
      }
    }, this.options.heartbeatInterval)
  }

  _cleanup() { clearInterval(this.pingTimer); clearTimeout(this.pongTimer) }
  _emit(event, data) { (this.listeners.get(event) || []).forEach(cb => cb(data)) }
  _scheduleReconnect() {
    if (this.retryCount >= this.options.maxRetries) return
    const delay = Math.min(this.options.baseDelay * Math.pow(2, this.retryCount++), this.options.maxDelay)
    setTimeout(() => this._connect(), delay)
  }
}
```

---

## 五、Socket.io

Socket.io 是在原生 WebSocket 之上建立的实时通信框架，提供自动重连、fallback 长轮询、房间/命名空间、广播、消息确认（ack）等功能。

### 5.1 与原生 WebSocket 对比

| 维度 | 原生 WebSocket | Socket.io |
|---|---|---|
| **协议层** | 标准 RFC 6455，浏览器原生 API | 自定义 engine.io 协议 |
| **浏览器兼容** | IE10+ | 降级到长轮询，几乎全兼容 |
| **自动重连** | 需手动实现 | 内置，默认开启 |
| **房间/广播** | 需自行实现 | 内置 `room` / `to()` / `broadcast` |
| **消息确认** | 无 | 支持（回调风格） |
| **服务端** | 可用任何语言实现 WS 协议 | 需 Node.js + socket.io 库 |

### 5.2 房间与命名空间

```js
// 服务端
const io = require('socket.io')(3000)
const chatNsp = io.of('/chat')  // 命名空间

chatNsp.on('connection', (socket) => {
  socket.on('join', (room) => {
    socket.join(room)
    socket.to(room).emit('user-joined', socket.id)  // 向房间内其他人广播
  })
  socket.on('message', (room, msg) => {
    chatNsp.to(room).emit('message', { from: socket.id, msg })  // 含自己
  })
})

// 客户端
const socket = io('http://localhost:3000/chat')
socket.emit('join', 'room-42')
```

---

## 六、长轮询（Long Polling）

### 6.1 原理

客户端发送 HTTP 请求到服务器，服务器**不立即响应**而是保持连接（hold），直到有新数据或超时（通常 30-60s）才返回。客户端收到响应后立即再发一个新请求，形成"请求-等待-响应-再请求"的循环。

```js
async function longPoll(url) {
  try {
    const response = await fetch(url)
    const data = await response.json()
    handleData(data)
  } catch (err) {
    await wait(5000)
  }
  longPoll(url)  // 递归：立即发起下一次请求
}
```

### 6.2 与 WebSocket 对比

| 维度 | WebSocket | Long Polling |
|---|---|---|
| 通信方式 | 全双工 | 半双工，客户端驱动 |
| 连接开销 | 一次握手，持续复用 | 每次请求带完整 HTTP 头 |
| 延迟 | 毫秒级 | 取决于轮询间隔 |
| 服务端压力 | 低（事件驱动） | 高（大量 hold 住的长连接） |
| 适用场景 | 聊天、协作、游戏 | 简单通知、老环境兼容 |

---

## 七、SSE（Server-Sent Events）

SSE 是一种让服务器向客户端**单向推送**事件流的标准协议。客户端通过 `EventSource` API 自动管理连接、重连和事件解析。

### 7.1 EventSource API

```js
const es = new EventSource('/api/stream')

es.onmessage = (event) => console.log('收到:', event.data)

// 自定义事件类型
es.addEventListener('price-update', (event) => {
  const price = JSON.parse(event.data)
  console.log(`📈 ${price.symbol}: ¥${price.value}`)
})

// EventSource 自动重连，无需手动处理
es.addEventListener('error', () => console.warn('连接出错，自动重连中...'))
```

服务端响应头：

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

推送数据格式：

```
event: price-update
id: 42
data: {"symbol":"BTC","value":420000}

```

- `event:` 指定事件类型（省略则触发 `onmessage`）
- `id:` 用于断线重连，客户端自动发送 `Last-Event-ID` 头
- 空行表示一条消息结束

### 7.2 SSE vs WebSocket

| 维度 | SSE | WebSocket |
|---|---|---|
| 方向 | 单向（服务器→客户端） | 全双工 |
| 协议 | 纯 HTTP | 独立协议 |
| 自动重连 | 内置 | 需手动实现 |
| 二进制支持 | 不支持（需 base64） | 原生支持 |
| HTTP/2 多路复用 | 天然兼容 | 需降级到 HTTP/1.1 |
| 适用范围 | 通知、feed 流、股价 | 聊天、协作编辑、游戏 |

---

## 八、方案对比与选型

### 8.1 实时通信四方案总览

| 方案 | 双向性 | 延迟 | 服务端开销 | 实现复杂度 | 适用场景 |
|---|---|---|---|---|---|
| **WebSocket** | ✅ 全双工 | 毫秒级 | 低 | 中等 | 聊天、游戏、协作、行情 |
| **Socket.io** | ✅ 全双工 | 毫秒级 | 中 | 低（库封装） | 快速上线的实时应用 |
| **Long Polling** | ⚠️ 半双工 | 秒级 | 高 | 低 | 低频通知、老环境兼容 |
| **SSE** | ➡️ 单向推送 | 毫秒级 | 低 | 极低 | 新闻推送、股价、日志流 |

### 8.2 选型决策矩阵

```
需要双向通信？
├── 是 → 需要快速上线 + Node.js 后端？
│        ├── 是 → Socket.io
│        └── 否 → 原生 WebSocket
└── 否 → 只需服务端推送？
         ├── 是 → SSE（HTTP 基础设施友好，自动重连）
         └── 否 → 仅需兼容极端老环境？
                  ├── 是 → Long Polling
                  └── 否 → Short Polling（最简单）
```

### 8.3 HTTP 版本选型

| 场景 | 推荐 |
|---|---|
| 大量小资源（图标、小 CSS） | HTTP/2 多路复用 |
| 弱网环境（移动端、高丢包） | HTTP/3（QUIC，丢包不阻塞） |
| 内网/可控环境 | HTTP/2 即可，兼容性最好 |
| 实时推送 | SSE 走 HTTP/2 多路复用，WebSocket 走独立通道 |

---

## 面试要点速查

| 问题 | 关键词 |
|---|---|
| HTTP 版本演进 | 1.1 队头阻塞 → 2 多路复用(HPACK) → 3 QUIC(UDP, 0-RTT, 无队头阻塞) |
| DNS 解析过程 | 浏览器缓存 → hosts → 本地 DNS → 根 → 顶级域 → 权威 DNS |
| TCP 握手挥手 | 三次握手(SYN→SYN+ACK→ACK)，四次挥手(FIN→ACK→FIN→ACK) |
| HTTPS 原理 | 握手阶段非对称加密交换会话密钥，后续对称加密传输数据 |
| TLS 1.3 握手 | ClientHello → ServerHello+证书 → Finished(1-RTT vs 1.2的2-RTT) |
| 证书链 | 根CA(自签名) → 中间CA → 服务端证书，浏览器逐级验证 |
| WebSocket 握手 | HTTP Upgrade 101 → Sec-WebSocket-Key/Accept 校验 → 协议切换 |
| 心跳机制 | 30s 间隔 ping，10s 未收到 pong 判定断线，指数退避重连 |
| Socket.io vs 原生 | 自动重连、房间广播、ack 确认、fallback 长轮询，但绑 Node.js 生态 |
| Long Polling | 客户端发请求→服务端 hold 到有数据/超时→立即再请求，兼容性最强 |
| SSE | EventSource API 三行代码，自动重连+Last-Event-ID 断点续传，仅单向推送 |
| 雷群效应 | 指数退避 + 随机抖动（±20%），让客户端重连时间天然分散 |
