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
