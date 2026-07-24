---
title: 浏览器原理
description: 渲染流程、Event Loop、缓存、V8 GC、安全、HTTP/2&3
---

# 浏览器原理

## 必会基础 ⭐⭐⭐

- [ ] 渲染流程：HTML 解析 → DOM → CSSOM → Render Tree → Layout → Paint → Composite
- [ ] 重排（Reflow）vs 重绘（Repaint）vs 合成（Composite）的触发条件与性能差异
- [ ] **Event Loop**：宏任务（setTimeout / XHR）vs 微任务（Promise.then / MutationObserver）
- [ ] 浏览器缓存：强缓存（`Cache-Control` / `Expires`）vs 协商缓存（`ETag` / `Last-Modified`）

## 进阶考点 ⭐⭐

- [ ] V8 GC：新生代（Scavenge）/ 老生代（Mark-Compact / Incremental Marking）
- [ ] 内存泄漏排查：全局变量 / 闭包引用 / 未清理的定时器与监听器
- [ ] `requestAnimationFrame` vs `requestIdleCallback` 的调度时机
- [ ] CORS：预检请求（OPTIONS）/ 简单请求条件 / `Access-Control-Allow-*`
- [ ] XSS 防御：CSP / 输入过滤 / `httpOnly` Cookie；CSRF 防御：SameSite / Token

## 渲染流程简述

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

**优化目标**：尽量让改变只触发 Composite（如 `transform` / `opacity`），避免触发 Layout。

## Event Loop

```js
console.log('1')                          // 同步
setTimeout(() => console.log('2'), 0)     // 宏任务
Promise.resolve().then(() => console.log('3'))  // 微任务
console.log('4')                          // 同步

// 输出：1 4 3 2
// 每次宏任务执行完，清空所有微任务队列，再取下一个宏任务
```

## 浏览器缓存策略

| 类型 | 请求头 | 命中时不发请求 | 状态码 |
|---|---|---|---|
| 强缓存 | `Cache-Control: max-age=3600` | ✅ | 200 (from cache) |
| 协商缓存 | `ETag` / `Last-Modified` | ❌（发请求，服务端判断） | 304 Not Modified |

## V8 GC 简述

| 区域 | 算法 | 存放对象 |
|---|---|---|
| 新生代（约 1-8 MB） | Scavenge（复制算法）| 存活时间短的对象 |
| 老生代 | Mark-Sweep + Mark-Compact | 存活时间长的对象 |
