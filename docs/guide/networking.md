---
title: 实时通信技术
description: 深入理解 WebSocket、Socket.io、SSE、Long Polling 等前端实时通信方案，掌握握手过程、心跳保活、自动重连、封装实践与常见面试题
---

# 实时通信技术

## WebSocket

WebSocket 是一种在单个 TCP 连接上进行**全双工通信**的协议。与 HTTP 不同，WebSocket 的连接一旦建立，客户端和服务器就可以在任何时间互相推送数据，无需客户端反复轮询。它的握手复用了 HTTP 协议（端口 80/443），但握手完成后协议升级为 WebSocket，数据帧格式极为轻量（2-6 字节头部），延迟远低于 HTTP 长轮询。

### 握手过程

WebSocket 建立连接分为两步：客户端发起一个特殊的 HTTP Upgrade 请求，服务器响应 101 Switching Protocols，之后协议从 HTTP 切换为 WebSocket。

**客户端请求头示例：**

```
GET /chat HTTP/1.1
Host: example.com:8000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

- `Upgrade: websocket` —— 声明协议升级目标
- `Connection: Upgrade` —— 告知服务器本次请求需要升级连接
- `Sec-WebSocket-Key` —— 客户端随机生成 16 字节的 base64 串，用于握手校验
- `Sec-WebSocket-Version` —— 固定为 13（RFC 6455）

**服务器响应：**

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

服务器把 `Sec-WebSocket-Key` 拼接魔术字符串 `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`，做 SHA-1 哈希后 base64 编码，作为 `Sec-WebSocket-Accept` 返回。客户端验证一致后握手完成，双方进入 WebSocket 数据帧模式。

### 前端 API

浏览器原生提供 `WebSocket` 构造函数和事件驱动的 API：

```js
// 创建连接（ws 为明文，wss 为 TLS 加密）
const ws = new WebSocket('wss://echo.example.com');

// 连接成功
ws.onopen = (event) => {
  console.log('连接已建立');
  ws.send('Hello Server!');
};

// 接收消息
ws.onmessage = (event) => {
  console.log('收到消息:', event.data);
  // event.data 可能是字符串或 Blob/ArrayBuffer（取决于 binaryType）
};

// 连接关闭
ws.onclose = (event) => {
  console.log(`连接关闭: code=${event.code}, reason=${event.reason}`);
};

// 连接错误
ws.onerror = (error) => {
  console.error('WebSocket 错误:', error);
};

// 发送数据
ws.send(JSON.stringify({ type: 'chat', payload: 'hello' }));
```

`readyState` 属性可查询当前状态：`0` CONNECTING、`1` OPEN、`2` CLOSING、`3` CLOSED。发送前建议检查 `ws.readyState === WebSocket.OPEN`。

### 心跳机制

TCP 长连接在长时间无数据时可能被中间代理、NAT 设备或防火墙断掉。**心跳**（Heartbeat）即客户端或服务器周期性发送极小数据帧（ping/pong），让对方知道"我还活着"，同时也能检测对端是否已经失联。

```js
class HeartbeatWS {
  constructor(url, interval = 30000) {
    this.ws = new WebSocket(url);
    this.pingInterval = interval;
    this.pingTimer = null;

    this.ws.onopen = () => {
      this.startHeartbeat();
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
    };
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        // WebSocket 协议层面支持 ping 帧，但浏览器 JS API 不直接暴露
        // 应用层做法：发送自定义 ping 消息
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.pingInterval);
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
```

> **注意**：浏览器 WebSocket API 不支持直接发送协议级 ping 帧，通常采用应用层自定义 `{type: 'ping'}` 消息，服务端回复 `{type: 'pong'}`，客户端检测 pong 超时则判定断线。

### 自动重连

线上环境网络不稳定，断开后需要自动重连。常见策略是**指数退避**（Exponential Backoff）：首次重连等待 1s，后续每次翻倍，到达上限后恒定等待，超过最大次数则放弃并通知上层。

```js
class ReconnectingWS {
  constructor(url, options = {}) {
    this.url = url;
    this.maxRetries = options.maxRetries ?? 5;
    this.baseDelay = options.baseDelay ?? 1000;   // 起始延迟 ms
    this.maxDelay = options.maxDelay ?? 30000;     // 上限延迟 ms
    this.retryCount = 0;
    this.manualClose = false;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.retryCount = 0; // 连接成功，重置计数
      console.log('✅ WebSocket 已连接');
      this.startHeartbeat();
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onerror 后通常会触发 onclose，不在此处重连
    };
  }

  scheduleReconnect() {
    if (this.retryCount >= this.maxRetries) {
      console.error('❌ 已达最大重试次数，停止重连');
      return;
    }
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.retryCount),
      this.maxDelay
    );
    this.retryCount++;
    console.log(`🔄 ${delay}ms 后第 ${this.retryCount} 次重连...`);
    setTimeout(() => this.connect(), delay);
  }

  close() {
    this.manualClose = true;
    this.stopHeartbeat();
    this.ws.close();
  }
}
```

### 完整封装示例

一个生产可用的 WebSocket 封装，融合**心跳+自动重连+消息队列+事件监听**：

```js
class RobustWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnect: true,
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 10000,  // 等待 pong 的超时
      ...options,
    };
    this.retryCount = 0;
    this.manualClose = false;
    this.listeners = new Map();
    this.pendingQueue = [];       // 断线期间的待发消息队列
    this.pingTimer = null;
    this.pongTimer = null;

    this._connect();
  }

  // ---- 公共 API ----
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
    return this;
  }

  off(event, callback) {
    const cbs = this.listeners.get(event);
    if (cbs) this.listeners.set(event, cbs.filter(cb => cb !== callback));
    return this;
  }

  emit(event, data) {
    (this.listeners.get(event) || []).forEach(cb => cb(data));
  }

  send(data) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.pendingQueue.push(msg);
    }
  }

  close() {
    this.manualClose = true;
    this._cleanup();
    this.ws?.close();
  }

  // ---- 内部 ----
  _connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.retryCount = 0;
      this._startHeartbeat();
      // 发送积压消息
      while (this.pendingQueue.length) {
        this.ws.send(this.pendingQueue.shift());
      }
      this.emit('open');
    };

    this.ws.onmessage = (event) => {
      let data = event.data;
      try { data = JSON.parse(data); } catch {}
      // 处理心跳响应
      if (data?.type === 'pong') {
        this._clearPongTimeout();
        return;
      }
      this.emit('message', data);
    };

    this.ws.onclose = (event) => {
      this._cleanup();
      this.emit('close', event);
      if (!this.manualClose && this.options.reconnect) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => this.emit('error', err);
  }

  _startHeartbeat() {
    this._clearPongTimeout();
    this.pingTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        // 超时未收到 pong 视为断线
        this.pongTimer = setTimeout(() => {
          console.warn('心跳超时，主动断开');
          this.ws.close();
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
  }

  _clearPongTimeout() {
    if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null; }
  }

  _cleanup() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    this._clearPongTimeout();
  }

  _scheduleReconnect() {
    if (this.retryCount >= this.options.maxRetries) {
      this.emit('reconnect-failed');
      return;
    }
    const delay = Math.min(
      this.options.baseDelay * Math.pow(2, this.retryCount),
      this.options.maxDelay
    );
    this.retryCount++;
    setTimeout(() => this._connect(), delay);
  }
}

// 使用示例
const rws = new RobustWebSocket('wss://api.example.com/ws');
rws.on('open', () => console.log('连接成功'))
   .on('message', (data) => console.log('收到:', data))
   .on('error', (err) => console.error(err))
   .on('close', (e) => console.log('断开:', e.code))
   .on('reconnect-failed', () => console.error('重连失败'));
rws.send({ type: 'subscribe', channel: 'price' });
```

---

## Socket.io

Socket.io 是一个基于 WebSocket 的**实时通信库**，但它远不止是对 WebSocket 的简单封装——它在原生 WebSocket 之上提供了自动重连、fallback 长轮询、房间/命名空间、广播、确认（ack）等高级功能。当浏览器不支持 WebSocket 时，Socket.io 会自动降级为 HTTP 长轮询，保障兼容性。

### 与原生 WebSocket 的区别

| 维度 | 原生 WebSocket | Socket.io |
|------|---------------|-----------|
| **协议层** | 标准 RFC 6455，浏览器原生 API | 自定义协议，在 WebSocket/长轮询之上 |
| **浏览器兼容** | IE10+（部分移动端不支持） | 降级到长轮询，几乎全兼容 |
| **自动重连** | 需手动实现 | 内置，默认开启 |
| **消息格式** | 字符串 / Blob / ArrayBuffer | 自动 JSON 序列化，支持自定义编码 |
| **房间/广播** | 需自行实现 | 内置 `room` / `to()` / `broadcast` |
| **确认（ack）** | 无 | 支持，回调风格 |
| **连接状态** | `readyState`（4 种） | 更丰富的状态管理与中间件 |
| **服务端** | 可用任何语言实现 WS 协议 | 需 Node.js + socket.io 库 |

### 房间与命名空间

**命名空间**（Namespace）用于将连接按业务逻辑切分为独立通道，每个命名空间都有自己的事件处理器。**房间**（Room）是命名空间内的子分组，用于实现群聊、定向推送等场景。

```js
// ===== 服务端 (Node.js) =====
const io = require('socket.io')(3000);

// 命名空间 /chat
const chatNsp = io.of('/chat');
chatNsp.on('connection', (socket) => {
  console.log('用户进入 /chat');

  // 加入房间
  socket.on('join', (room) => {
    socket.join(room);
    // 向房间内其他人广播
    socket.to(room).emit('user-joined', socket.id);
  });

  socket.on('message', (room, msg) => {
    // 向整个房间（含自己）发送
    chatNsp.to(room).emit('message', { from: socket.id, msg });
  });
});

// ===== 客户端 =====
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat');

socket.on('connect', () => {
  socket.emit('join', 'room-42');
});

socket.on('message', (data) => {
  console.log(`${data.from}: ${data.msg}`);
});
```

### 自动重连与 Fallback

Socket.io 默认开启自动重连，断开后会指数递增延迟重试；若 WebSocket 不可用则回退到 HTTP 长轮询：

```js
const socket = io('https://api.example.com', {
  transports: ['websocket', 'polling'], // 优先级：先 WebSocket，不行则 polling
  reconnection: true,
  reconnectionAttempts: Infinity,       // 无限重试
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
});

socket.io.on('reconnect_attempt', (attempt) => {
  console.log(`第 ${attempt} 次重连尝试`);
});
```

---

## 长轮询（Long Polling）

### 原理

Long Polling 是 WebSocket 出现前最常用的"实时"方案。客户端发送 HTTP 请求到服务器，服务器**不立即响应**而是保持连接（hold），直到有新数据或超时（通常 30-60s）才返回。客户端收到响应后立即再发一个新请求，形成"请求-等待-响应-再请求"的循环，模拟推送效果。

```js
// 客户端简易实现
async function longPoll(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    handleData(data);              // 处理收到的数据
  } catch (err) {
    console.error('轮询出错:', err);
    await wait(5000);              // 出错后等待再试
  }
  longPoll(url);                   // 递归：立即发起下一次请求
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

服务端（Node.js 示例）：

```js
app.get('/poll', (req, res) => {
  // 服务器 hold 住连接，直到有新数据或超时
  const timeout = setTimeout(() => {
    res.json({ type: 'timeout' });
  }, 30000); // 30s 超时

  onNewData((data) => {
    clearTimeout(timeout);
    res.json(data);
  });
});
```

### 与 WebSocket 对比

| 维度 | WebSocket | Long Polling |
|------|-----------|--------------|
| **通信方式** | 全双工，双向自由推送 | 半双工，客户端驱动 |
| **连接开销** | 一次握手，持续复用 | 每次请求都带完整 HTTP 头 |
| **延迟** | 毫秒级 | 取决于轮询间隔，通常 500ms-30s |
| **服务端压力** | 低（事件驱动） | 高（大量 hold 住的长连接） |
| **实现复杂度** | 中等 | 简单，纯 HTTP |
| **适用场景** | 聊天、协作、游戏、行情 | 简单通知、低频率更新、兼容老环境 |

---

## SSE（Server-Sent Events）

SSE 是一种让服务器向客户端**单向推送**事件流的标准协议。与 WebSocket 不同，SSE 只支持服务器→客户端方向，客户端通过 `EventSource` API 自动管理连接、重连和事件解析，特别适合新闻推送、股价更新、通知流等场景。

### EventSource API

```js
const es = new EventSource('/api/stream');

// 默认 message 事件
es.onmessage = (event) => {
  console.log('收到:', event.data);
  // event.data   — 消息体
  // event.id     — 事件 ID（用于断线重连时的 Last-Event-ID）
  // event.type   — 事件类型（默认 'message'）
};

// 自定义事件类型
es.addEventListener('price-update', (event) => {
  const price = JSON.parse(event.data);
  console.log(`📈 ${price.symbol}: ¥${price.value}`);
});

es.addEventListener('error', (event) => {
  // EventSource 会自动重连，无需手动处理
  console.warn('SSE 连接出错，正在自动重连...');
});

// 关闭连接
// es.close();
```

服务端需设置响应头：

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

推送数据格式：

```
event: price-update
id: 42
data: {"symbol":"BTC","value":420000}

data: 这是一条普通消息

```

> - `event:` 行指定事件类型（省略则触发 `onmessage`）
> - `id:` 行用于断线重连，客户端自动发送 `Last-Event-ID` 头
> - `data:` 行是消息体，多行 `data:` 会拼接为单条消息
> - 空行表示一条消息结束

### SSE vs WebSocket 对比

| 维度 | SSE | WebSocket |
|------|-----|-----------|
| **方向** | 单向（服务器→客户端） | 全双工 |
| **协议** | 纯 HTTP，兼容所有 HTTP 基础设施 | 独立协议，需要代理/防火墙支持 |
| **自动重连** | 内置，`EventSource` 自动处理 | 需手动实现 |
| **消息格式** | 纯文本（`text/event-stream`） | 二进制帧 / 文本 |
| **二进制支持** | 不支持（需 base64 编码） | 原生支持 Blob / ArrayBuffer |
| **浏览器兼容** | 除 IE 外所有现代浏览器 | IE10+ |
| **HTTP/2 多路复用** | 天然兼容 | 需额外配置 |
| **服务端实现** | 简单，任何 HTTP 框架均可 | 需 WebSocket 库 |
| **适用场景** | 通知、feed 流、股价、日志监控 | 聊天、协作编辑、游戏、双向 RPC |

---

## 实时通信方案总结表

| 方案 | 双向性 | 延迟 | 服务端开销 | 实现复杂度 | 浏览器兼容性 | 适用场景 |
|------|--------|------|-----------|-----------|-------------|---------|
| **WebSocket** | ✅ 全双工 | 毫秒级 | 低 | 中等 | IE10+ | 聊天、游戏、协作、行情 |
| **Socket.io** | ✅ 全双工 | 毫秒级（WS 模式）| 中 | 低（库封装） | 近乎全兼容 | 需要快速上线的实时应用 |
| **Long Polling** | ⚠️ 半双工 | 秒级 | 高（hold 连接）| 低 | 全兼容 | 低频通知、老环境兼容 |
| **SSE** | ➡️ 单向推送 | 毫秒级 | 低 | 极低 | 除 IE 外全兼容 | 新闻推送、股价、日志流 |

### 选型指南

1. **只需服务器推送给客户端（如通知、新闻流）** → 优先 **SSE**，HTTP 基础设施友好，自动重连，实现极简。
2. **需要双向高频通信（如聊天、协作）** → 优先 **Socket.io**，开发效率高，fallback 可靠。
3. **对性能要求极致且可控环境（如内部系统）** → 使用原生 **WebSocket**，减少库的封装开销。
4. **极端兼容性要求（如老式浏览器、受限网络）** → **Long Polling** 作为最终 fallback。

---

## 常见面试题

### WebSocket 与 HTTP 的区别？

**回答要点：**

1. **协议模型不同**：HTTP 是请求-响应模型，客户端发起请求，服务器被动响应；WebSocket 是**全双工**，双方随时可以主动推送。
2. **连接生命周期不同**：HTTP 连接通常短（Keep-Alive 可复用但仍是"请求-响应"一问一答）；WebSocket 是一次握手后保持**长连接**，持续双向通信。
3. **消息格式不同**：HTTP 每次通信带完整请求头（通常 500-800 字节+）；WebSocket 数据帧头仅 2-6 字节，远更轻量。
4. **与 HTTP 的关系**：WebSocket 的握手借助 HTTP Upgrade 机制（端口 80/443），但握手完成后协议切换到 WebSocket，不再是 HTTP。
5. **适用场景**：HTTP 适合 RESTful API、资源获取；WebSocket 适合实时推送（聊天、行情、游戏）。

```js
// HTTP：每次请求独立
fetch('/api/messages').then(r => r.json());

// WebSocket：一次连接，持续推送
const ws = new WebSocket('wss://chat.example.com');
ws.onmessage = (e) => console.log('新消息:', e.data);
```

### 如何实现一个稳定的 WebSocket 连接？

**回答要点：**

1. **心跳保活**：定时（如 30s）发送 ping，超时（如 10s）未收到 pong 则主动断开重连。
2. **自动重连**：`onclose` / `onerror` 中触发重连，采用**指数退避**（1s → 2s → 4s → ... → 30s 封顶），设置最大重试次数（如 5 次），避免无限循环。
3. **消息确认**：关键消息（如订单）加入 ack 机制，超时未确认则重发。
4. **消息队列**：断线期间的消息暂存队列，重连成功后批量发送。
5. **幂等设计**：服务端应对重连后的消息做去重处理。
6. **状态管理**：封装 `readyState` 检查，发送前确保连接为 OPEN；对外暴露连接状态事件供 UI 展示（如"连接中/已连接/已断开"）。

### 为什么需要心跳？

**回答要点：**

1. **检测死连接**：TCP 层面的 FIN/RST 在某些场景不会及时到达（如网线拔出、Wi-Fi 断开、NAT 设备静默清理），应用层心跳能主动发现对端失联。
2. **防止中间设备清理**：运营商 NAT 路由器、负载均衡器、代理服务器会在空闲一定时间（通常 60-120s）后回收映射表项。心跳（每隔 30-50s）维持"有数据流动"，防止被误清。
3. **及时释放资源**：没有心跳，服务端可能在客户端已离线很久后仍维护连接和内存，浪费资源。
4. **触发重连**：心跳超时是可靠的重连触发信号，比被动等待 `onclose` 更及时。

```js
// 核心：发送 ping + 等待 pong 超时判定
function heartbeat(ws, timeout = 10000) {
  ws.send(JSON.stringify({ type: 'ping' }));
  const timer = setTimeout(() => {
    console.warn('心跳超时，断开重连');
    ws.close(); // 触发 onclose → 自动重连
  }, timeout);
  // 收到 pong 时清除 timer
  ws._heartbeatTimer = timer;
}
```
