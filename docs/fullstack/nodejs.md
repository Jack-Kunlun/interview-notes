---
title: Node.js & 数据库
description: Node.js Event Loop、Stream、Cluster、MySQL、微服务
---

# Node.js & 数据库

## 运行时基础

### Event Loop：六阶段轮转

Node.js 基于单线程事件循环实现异步非阻塞 I/O，每个阶段维护一个 FIFO 回调队列，按固定顺序轮转：

```
timers       → 执行 setTimeout / setInterval 回调
pending I/O  → 系统级 I/O 错误回调（如 TCP socket ECONNREFUSED）
idle/prepare → 内部使用（libuv 准备阶段）
poll         → 核心阶段：接收新 I/O 事件，队列为空时可能阻塞等待
check        → 执行 setImmediate 回调
close        → 关闭事件回调（如 socket.on('close')）

每个阶段之间：清空 process.nextTick 队列 → 清空 Promise 微任务
```

### `process.nextTick` vs `setImmediate`

命名有误导性：`nextTick` 在当前阶段结束后立即触发，优先级高于所有微任务；`setImmediate` 在 check 阶段执行。直观理解：`nextTick` = 插队，`setImmediate` = 排队。

```js
setImmediate(() => console.log('setImmediate'))
process.nextTick(() => console.log('nextTick'))
// 输出：nextTick → setImmediate
```

### libuv 线程池

Node.js 主线程只执行 JS，文件 I/O、DNS 解析、加密压缩等阻塞操作委托给 libuv 线程池异步执行，完成后将回调推入事件循环。默认 4 个线程（`UV_THREADPOOL_SIZE` 可调，最大 1024），不会阻塞主线程，但线程池满后请求排队。

```bash
UV_THREADPOOL_SIZE=8 node server.js  # CPU 密集场景设为 CPU 核数
```

> **面试要点**：`setTimeout(fn, 0)` 和 `setImmediate(fn)` 谁先执行取决于事件循环启动时机——在 poll 阶段被 I/O 回调包裹调用时 setImmediate 先执行，主模块顶层直接调用时 timers 先执行概率大。`Promise.then` 和 `process.nextTick` 谁先？微任务分两层：nextTick 队列优先于 Promise 队列。源码在 `libuv/src/unix/core.c` 的 `uv_run()` 和 Node 的 `lib/internal/process/task_queues.js`。
>
> 踩坑：Node 14 起未捕获的 Promise rejection 从仅警告升级为 `process.exit(1)`，升版本后之前偷偷吞异常的 Promise 突然导致进程崩溃。修复：全局监听 `process.on('unhandledRejection', handler)` 并接入日志告警。

## 数据流与多进程

### Stream 与背压

Stream 将数据切块逐块处理，四种类型：Readable / Writable / Duplex / Transform。当可读流速度远大于可写流时，数据在内存积压——这就是背压。

`pipe()` 自动处理背压：可读流暂停 `highWaterMark` 溢出后的 push，等可写流 `drain` 事件再恢复，内存占用恒定。

```js
const fs = require('fs')
const zlib = require('zlib')

fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('output.txt.gz'))
```

手动实现背压：监听 readable 的 `data` 事件 → `writable.write()` → `write()` 返回 false（缓冲满）→ `readable.pause()` → 等 `drain` 事件 → `readable.resume()`。

### Cluster：利用多核

Node.js 单线程只能跑满一个核，Cluster 通过 `child_process.fork()` 创建工作进程共享同一端口（内核负载均衡）：

```js
const cluster = require('cluster')
const http = require('http')

if (cluster.isMaster) {
  const cpus = require('os').cpus().length
  for (let i = 0; i < cpus; i++) cluster.fork()
} else {
  http.createServer((req, res) => res.end('ok')).listen(3000)
}
```

> **面试要点**：PM2 的 cluster mode 底层也是 Node cluster 模块，但额外提供：零停机重启（graceful reload）、进程监控和自动重启、日志聚合、内存/CPU 阈值重启、动态扩缩容。原生 cluster 需自己实现这些运维能力。
>
> 踩坑：用 `fs.createReadStream` 读大 JSON 文件做流式解析，但 `JSON.parse` 需要完整字符串——`Buffer.concat(chunks).toString()` 拼起来再 parse 跟一次读入内存没区别，8GB 文件直接 OOM。修复：用 streaming JSON 解析器（如 NDJSON 逐行格式），真正流式处理。日志管道每天 200GB，用 Stream + Transform 实现解析→过滤→写入流水线，内存恒定 50MB。

## API 设计与数据存储

### RESTful API 设计

核心思想是"资源导向"：URL 表示资源（名词复数），HTTP 方法表示操作：

| 动词 | 语义 | 幂等 | 示例 |
|---|---|---|---|
| `GET` | 获取 | ✅ | `GET /api/users/1` |
| `POST` | 创建 | ❌ | `POST /api/users` |
| `PUT` | 全量替换 | ✅ | `PUT /api/users/1` |
| `PATCH` | 部分更新 | ❌ | `PATCH /api/users/1` |
| `DELETE` | 删除 | ✅ | `DELETE /api/users/1` |

```js
// Express 示例
app.get('/api/users', async (req, res) => {
  const users = await User.find().limit(20)
  res.json(users)
})

app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body)
  res.status(201).json(user)
})
```

### MySQL 核心

B+ 树是 InnoDB 默认索引结构：所有数据存叶子节点且形成有序链表，非叶子节点只存键值导航，范围查询和排序效率极高。主键索引（聚簇索引）叶子节点存整行数据，二级索引存主键值，回表不可避免。

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| READ UNCOMMITTED | ✅ | ✅ | ✅ |
| READ COMMITTED | ❌ | ✅ | ✅ |
| REPEATABLE READ（默认） | ❌ | ❌ | ✅（gap lock 解决） |
| SERIALIZABLE | ❌ | ❌ | ❌ |

```sql
-- 慢查询优化三板斧
SET long_query_time = 1;                    -- 1. 定位慢 SQL
EXPLAIN SELECT * FROM orders WHERE ...;      -- 2. 分析执行计划（关注 type/key/rows/Extra）
CREATE INDEX idx_user_status ON orders(user_id, status);  -- 3. 覆盖索引避免回表
```

> **面试要点**：项目选型——为什么 NestJS 而非 Express：Express 太灵活导致大项目代码组织混乱，NestJS 的依赖注入、模块化、装饰器天然分层（Controller/Service/Module），10+ 人团队维护成本显著更低。

## 微服务架构

从单体到微服务的关键：服务边界划分和通信方式选择。初期按业务域拆分用 HTTP + JSON 过渡，成熟后换 gRPC 获得更好性能：

| 组件 | 推荐方案 |
|---|---|
| 服务通信 | gRPC / NATS / RabbitMQ |
| API 网关 | Kong / Nginx + Lua / Traefik |
| 服务发现 | Consul / Etcd / Kubernetes DNS |
| 弹性治理 | opossum 熔断 / 重试 + 指数退避 / 降级 |
| 链路追踪 | OpenTelemetry + Jaeger |

> **面试要点**：分布式事务——尽量避免跨服务事务，优先用最终一致性。Saga 模式（每服务执行本地事务 + 发消息触发下一步，失败执行补偿操作）、事务发件箱（outbox pattern，本地事务同步写入事件表，CDC 推送到消息队列）。gRPC vs REST：Protobuf 比 JSON 体积小 3-10 倍、编解码快 5-10 倍，基于 HTTP/2 的多路复用和双向流让吞吐提升 5-7 倍；代价是可调试性下降（gRPC 需 grpcurl，不能直接 curl）。
>
> 踩坑：把单体里同一事务的"下单+扣库存"拆到两个服务，HTTP 串联调用——订单已生成但库存服务挂了，数据不一致。修复：引入消息队列，订单服务发 "OrderCreated" 事件，库存服务消费事件扣库存，失败则发 "InventoryDeductFailed" 事件让订单服务标记取消——最终一致性代替强一致性。选 gRPC 而非 REST 的决策点：内部微服务间无浏览器兼容需求，`.proto` 文件即接口规范，代码自动生成，前后端联调不再为"文档和实现不一致"吵架。
