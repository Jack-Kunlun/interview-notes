---
title: Node.js & 数据库
description: Node.js Event Loop、Stream、Cluster、JWT、数据库
---

# Node.js & 数据库

## 必会基础 ⭐⭐⭐

### Node.js Event Loop：六阶段（timers → I/O → idle → poll → check → close）

Node.js 基于单线程事件循环实现异步非阻塞 I/O。每个阶段维护一个 FIFO 回调队列，按固定顺序轮转执行。poll 阶段是核心——它接收新的 I/O 事件并在队列为空时可能阻塞等待，其他阶段均为非阻塞。

```
timers       → 执行 setTimeout / setInterval 回调
pending I/O  → 系统级 I/O 错误回调（如 TCP socket ECONNREFUSED）
idle/prepare → 内部使用（libuv 准备阶段，开发者不可见）
poll         → 获取新 I/O 事件（核心阶段，可能阻塞等待）
check        → 执行 setImmediate 回调
close        → 关闭事件回调（如 socket.on('close')）

每个阶段之间：清空 process.nextTick 队列 → 清空 Promise 微任务
```

### `process.nextTick` vs `setImmediate` 的执行时机差异

二者名称具有误导性：`process.nextTick` 在当前阶段结束后立即触发，优先级高于所有微任务；`setImmediate` 则在 check 阶段执行，即每个事件循环迭代的后期。直观理解为：`nextTick` = 插队，`setImmediate` = 排队。

```js
setImmediate(() => console.log('setImmediate'))   // check 阶段
process.nextTick(() => console.log('nextTick'))   // 当前阶段结束立即执行

// 输出：nextTick → setImmediate
// process.nextTick 优先级最高，在每个阶段切换时立即清空
```

### RESTful API 设计与 HTTP 动词语义

RESTful 核心思想是"资源导向"：URL 表示资源（名词复数），HTTP 方法表示对资源的操作。状态码精确传达结果，无状态使得水平扩展简单。设计要点：版本控制放在 URL 前缀（`/api/v1/`），参数化查询用 query string，幂等性由 GET/PUT/DELETE 保证。

| 动词 | 语义 | 幂等 | 示例 |
|---|---|---|---|
| `GET` | 获取资源 | ✅ | `GET /api/users/1` |
| `POST` | 创建资源 | ❌ | `POST /api/users` |
| `PUT` | 全量替换 | ✅ | `PUT /api/users/1` |
| `PATCH` | 部分更新 | ❌ | `PATCH /api/users/1` |
| `DELETE` | 删除资源 | ✅ | `DELETE /api/users/1` |

```js
// Express RESTful 示例
app.get('/api/users', async (req, res) => {
  const users = await User.find().limit(20)
  res.json(users)
})

app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body)
  res.status(201).json(user)  // 201 Created
})
```

### MySQL：索引原理（B+树）/ 事务隔离级别 / 慢查询优化

B+ 树是 MySQL InnoDB 的默认索引结构：所有数据存于叶子节点且形成有序链表，非叶子节点只存键值用于导航，因此范围查询和排序效率极高。主键索引（聚簇索引）的叶子节点直接存整行数据，二级索引叶子节点存主键值，回表查询不可避免。

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| READ UNCOMMITTED | ✅ | ✅ | ✅ |
| READ COMMITTED | ❌ | ✅ | ✅ |
| REPEATABLE READ（默认） | ❌ | ❌ | ✅（gap lock 解决） |
| SERIALIZABLE | ❌ | ❌ | ❌ |

```sql
-- 慢查询优化三板斧
-- 1. 定位慢 SQL
SET long_query_time = 1;
SHOW VARIABLES LIKE 'slow_query_log';

-- 2. EXPLAIN 分析执行计划（关注 type、key、rows、Extra）
EXPLAIN SELECT * FROM orders WHERE user_id = 100 AND status = 'paid';

-- 3. 建立覆盖索引避免回表
CREATE INDEX idx_user_status ON orders(user_id, status);
```

### 💬 面试深度

**标准回答**：Node.js 的事件循环分为六个阶段——timers 执行 setTimeout/setInterval 回调，pending callbacks 处理系统级 I/O 错误，idle/prepare 是 libuv 内部用的，poll 是核心阶段负责接收新 I/O 事件并可能阻塞等待，check 执行 setImmediate 回调，close callbacks 处理 socket.on('close') 这类关闭事件。每个阶段之间会清空 process.nextTick 队列和 Promise 微任务队列，所以 nextTick 永远比 setImmediate 先执行。这个设计让 Node.js 在单线程下也能高效处理高并发 I/O。

**追问预判**：

- **"如果在 setTimeout(fn, 0) 和 setImmediate(fn) 同时存在，谁先执行？"** → 答案是不确定，取决于事件循环启动时是否已经过了 timers 阈值。如果在 poll 阶段被 I/O 回调包裹调用，则 setImmediate 先执行；如果在主模块顶层直接调用，则 timers 先执行的概率大（受系统性能影响）。
- **"Promise.then 和 process.nextTick 谁先？"** → nextTick 优先。微任务队列实际分两层：nextTick 队列优先于 Promise 队列，每个阶段切换时先清空 nextTick 再清空 Promise。

**源码在哪**：
- 事件循环核心：`libuv/src/unix/core.c` 中的 `uv_run()`，六个阶段的循环体
- Node 端的阶段定义：`lib/internal/process/task_queues.js`，nextTick 和微任务调度逻辑

**踩过的坑**：未捕获的 Promise rejection 在 Node 14 之前只会打印一个警告 `UnhandledPromiseRejectionWarning`，进程继续运行；Node 14 起升级为 `unhandledRejection` 未监听时直接 `process.exit(1)`。团队从 Node 12 升到 16 后，之前偷偷吞掉异常的 Promise 突然导致生产进程崩溃，排查了两天才定位。修复方案：全局监听 `process.on('unhandledRejection', handler)` 并接入日志告警，逐个修复业务代码中的 try/catch 缺失。

**项目选型**：为什么选 NestJS 而不是 Express——Express 太灵活导致大型项目代码组织混乱，NestJS 的依赖注入、模块化、装饰器让代码天然分层，Controller/Service/Module 职责清晰，配合 TypeScript 的类型安全在 10+ 人的团队里维护成本显著低于 Express。

## 进阶考点 ⭐⭐

### Stream 背压（Backpressure）机制与 `pipe()` 的作用

当可读流速度远大于可写流时，数据会在内存中积压——这就是背压问题。`pipe()` 内部自动处理背压：可读流暂停 `highWaterMark` 溢出后的 `push()`，等待可写流 `drain` 事件再恢复，确保内存占用恒定。

```js
const fs = require('fs')
const zlib = require('zlib')

// pipe() 自动管理背压：不一次性读入内存，边读边压缩边写
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('output.txt.gz'))
```

### Cluster 模块：利用多核 CPU，主进程 fork 工作进程

Node.js 单线程只能跑满一个 CPU 核，Cluster 模块通过 `child_process.fork()` 创建多个工作进程，共享同一端口（内核负载均衡）。主进程负责管理和调度，工作进程各自独立运行事件循环，进程间通过 IPC 通道通信。

```js
const cluster = require('cluster')
const http = require('http')

if (cluster.isMaster) {
  // 主进程 fork 工作进程（数量=CPU 核数）
  for (let i = 0; i < require('os').cpus().length; i++) {
    const worker = cluster.fork()
    worker.on('message', msg => console.log('主进程收到:', msg))
    worker.send({ type: 'config', data: { port: 3000 + i } })  // 发消息
  }
} else {
  // 工作进程
  process.on('message', msg => {
    // 收到主进程消息
    http.createServer((req, res) => res.end('ok')).listen(msg.data.port)
  })
  process.send({ status: 'ready' })  // 向主进程报告
}
```

### JWT 双令牌方案：短期 Access Token + 长期 Refresh Token

将"身份凭证"和"续期凭证"分离是安全最佳实践。Access Token 短期有效（15 分钟），直接携带于请求头；Refresh Token 长期有效（7 天），存储于 httpOnly Cookie，只在 Access Token 过期时用于无感刷新，降低泄露风险。

```
登录成功 → 返回：
  Access Token（15分钟过期，用于 API 请求，存内存/localStorage）
  Refresh Token（7天过期，存 httpOnly Cookie，不可 JS 读取）

请求流程：
  API 请求携带 Authorization: Bearer <Access Token>
  → 401 时前端自动用 Refresh Token 换新 Access Token
  → Refresh Token 也过期 → 跳转登录页
```

### libuv 线程池：I/O 操作的真正执行者（默认4个线程）

Node.js 主线程只执行 JS，但文件 I/O、DNS 解析、加密压缩等阻塞操作委托给 libuv 线程池异步执行，完成后将回调推入事件循环。默认 4 个线程，CPU 密集型场景可调大至 CPU 核数以提升吞吐。

- **默认 4 个线程**（`UV_THREADPOOL_SIZE` 环境变量可调，最大 1024）
- 处理：文件 I/O（`fs.*`）、DNS 查询（`dns.lookup`）、压缩（`zlib`）、加密（`crypto.pbkdf2`）
- **不会阻塞主线程**，但线程池满后请求排队等待

```bash
# 调整线程池大小（CPU 密集场景，设为 CPU 核数）
UV_THREADPOOL_SIZE=8 node server.js
```

### 💬 面试深度

**标准回答**：Stream 是 Node.js 处理大数据的核心机制——它把数据切成小块逐块处理，而不是一次加载到内存。四种流：Readable、Writable、Duplex、Transform。背压是指可读流速大于可写流导致数据在内存积压的问题，pipe() 自动处理了这个：可读流暂停 push，等可写流 emit drain 再恢复。Cluster 模块则解决多核利用问题，通过 fork 多个子进程共享同一端口，内核做轮询负载均衡，主进程负责管理和 IPC 通信。

**追问预判**：

- **"背压（backpressure）怎么处理？pipe 自动处理，那手动怎么实现？"** → `pipe()` 本质是：监听 readable 的 `data` 事件 → 调用 writable.write() → 如果 write 返回 false（说明内部缓冲满了），就调用 readable.pause()，等 writable emit `drain` 时再 readable.resume()。手动实现就是用 pause/resume 配合 drain 事件做流量控制。
- **"PM2 的 cluster mode 和 Node 原生 cluster 有什么区别？"** → PM2 的 cluster mode 底层也是用的 Node cluster 模块，但 PM2 额外提供了：零停机重启（graceful reload，逐个进程重启）、进程监控和自动重启、日志聚合、内存/CPU 阈值自动重启、以及 `pm2 scale` 动态扩缩容。原生 cluster 需要自己实现这些运维能力。

**源码在哪**：
- Stream 背压逻辑：`lib/internal/streams/readable.js` 中的 `Readable.prototype.pipe()`，以及 `stream.readable.js` 中的 `pause()` / `resume()`
- Cluster 共享端口：`lib/internal/cluster/round_robin_handle.js`，调度策略在 `lib/internal/cluster/master.js`
- libuv 线程池：`libuv/src/threadpool.c`，`UV_THREADPOOL_SIZE` 宏定义

**踩过的坑**：用 `fs.createReadStream` 读一个大 JSON 文件做流式解析，但忘了 JSON.parse 需要完整字符串——流式读到 chunks 后 `Buffer.concat(chunks).toString()` 拼起来再 parse，这跟一次读入内存没区别，8GB 的文件直接把容器 OOM 了。修复方案：改用 streaming JSON 解析器（如 `JSONStream` 或逐行 NDJSON 格式），真正实现流式处理。

**项目选型**：Stream vs 全量读入——日志处理管道每天吞吐 200GB，用 Stream + Transform 实现解析→过滤→写入的流水线，内存占用恒定在 50MB 以内；如果用 `fs.readFileSync` 全量读入，单次就吃满内存。

## 深入理解 ⭐

### 微服务 Node.js 基础

从单体到微服务的关键在于服务边界划分和通信方式选择。初期建议按业务域拆分并用 HTTP + JSON 过渡，成熟后逐步迁移到 gRPC 以获得更优性能。弹性治理（熔断、重试、降级）和可观测性（链路追踪）是生产环境必备能力。

| 组件 | 推荐方案 |
|---|---|
| 服务间通信 | gRPC（性能）/ NATS / RabbitMQ |
| API 网关 | Kong / Nginx + Lua / Traefik |
| 服务发现 | Consul / Etcd / Kubernetes DNS |
| 弹性 | 熔断（opossum）/ 重试 / 降级 |
| 链路追踪 | OpenTelemetry / Jaeger |

**最简单的单体拆分**：按业务域拆服务 → HTTP + JSON（过渡期）→ gRPC（成熟后）

### 💬 面试深度

**标准回答**：微服务在 Node.js 中落地，核心是三点——服务边界怎么划分（按业务域，如用户服务、订单服务、支付服务）、服务间怎么通信（初期 HTTP + JSON 够用，QPS 上去后换 gRPC 性能好一个数量级）、以及治理怎么做（熔断用 opossum、重试加指数退避、链路追踪上 OpenTelemetry + Jaeger）。Node.js 的异步非阻塞特性天然适合微服务的 I/O 密集场景，配合 Kubernetes 做服务发现和编排是目前最主流的方案。

**追问预判**：

- **"分布式事务怎么处理？"** → 尽量避免跨服务事务，优先用最终一致性。常见方案：Saga 模式（每个服务执行本地事务 + 发消息触发下一步，失败则执行补偿操作）、事务发件箱（outbox pattern，本地事务同时写入事件表，CDC 推送到消息队列）、或者两阶段提交（不推荐，性能差且耦合重）。
- **"gRPC 和 HTTP + JSON 的实际性能差距有多大？"** → 序列化方面，Protobuf 比 JSON 体积小 3-10 倍、编解码快 5-10 倍；传输方面，gRPC 基于 HTTP/2 支持多路复用和双向流，比 HTTP/1.1 的 JSON API 在吞吐上通常有 5-7 倍的提升。但代价是可调试性下降——JSON 可以直接 curl，gRPC 需要用 grpcurl 或 BloomRPC。

**源码在哪**：
- Node.js gRPC 实现：`@grpc/grpc-js` 包，核心 Channel 和 subchannel 负载均衡在 `packages/grpc-js/src/load-balancer*.ts`
- opossum 熔断器：`node_modules/opossum/lib/circuit.js`，状态机 Open → HalfOpen → Closed 的转换逻辑

**踩过的坑**：微服务拆分时，把原本单体里一个数据库事务就能保证一致性的"下单+扣库存"拆到了两个服务，用 HTTP 调用串联——订单服务创建订单后调库存服务扣库存，如果库存服务挂了或者超时，订单已经生成但库存没扣，数据不一致。修复方案：引入消息队列（RabbitMQ），订单服务发"OrderCreated"事件，库存服务消费事件扣库存。如果扣库存失败，发"InventoryDeductFailed"事件，订单服务收到后标记订单为取消状态——最终一致性代替强一致性。

**项目选型**：为什么选 gRPC 而不是继续用 REST——内部微服务之间调用没有浏览器兼容性需求，gRPC 的 Protobuf 强类型合约天然解决了"接口文档和实现不一致"的问题，`.proto` 文件就是唯一的接口规范，代码自动生成，前后端联调不再吵架。
