---
title: Node.js & 数据库
description: Node.js Event Loop、Stream、Cluster、JWT、数据库
---

# Node.js & 数据库

## 必会基础 ⭐⭐⭐

- [ ] Node.js Event Loop：六阶段（timers → I/O → idle → poll → check → close）
- [ ] `process.nextTick` vs `setImmediate` 的执行时机差异
- [ ] RESTful API 设计与 HTTP 动词语义
- [ ] MySQL：索引原理（B+树）/ 事务隔离级别 / 慢查询优化

## 进阶考点 ⭐⭐

- [ ] Stream 背压（Backpressure）机制与 `pipe()` 的作用
- [ ] Cluster 模块：利用多核 CPU，主进程 fork 工作进程
- [ ] JWT 双令牌方案：短期 Access Token + 长期 Refresh Token
- [ ] libuv 线程池：I/O 操作的真正执行者（默认4个线程）

## Event Loop 六阶段

```
timers       → 执行 setTimeout / setInterval 回调
pending I/O  → 系统级 I/O 错误回调
idle/prepare → 内部使用
poll         → 获取新 I/O 事件（核心阶段，可能阻塞）
check        → 执行 setImmediate 回调
close        → 关闭事件回调（如 socket.on('close')）

每个阶段之间：清空 process.nextTick 队列 → 清空 Promise 微任务
```

## `nextTick` vs `setImmediate`

```js
setImmediate(() => console.log('setImmediate'))   // check 阶段
process.nextTick(() => console.log('nextTick'))   // 当前阶段结束立即执行

// 输出：nextTick → setImmediate
// process.nextTick 优先级最高，在每个阶段切换时立即清空
```

## Stream pipe 示例

```js
const fs = require('fs')
const zlib = require('zlib')

// 不一次性读入内存，边读边压缩边写
fs.createReadStream('input.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('output.txt.gz'))
```

## JWT 双令牌方案

```
登录成功 → 返回：
  Access Token（15分钟过期，用于 API 请求）
  Refresh Token（7天过期，存 httpOnly Cookie）

请求流程：
  API 请求携带 Access Token
  → 401 时前端自动用 Refresh Token 换新 Access Token
  → Refresh Token 也过期 → 重新登录
```
