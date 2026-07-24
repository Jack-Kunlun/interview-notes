---
title: B 组：实践应用题
description: 5 道实践应用模拟面试题及参考答案
---

# B 组：实践应用题（5 题）

## Q1：如何设计一个高性能的虚拟列表组件？

**参考答案**：

核心思路：只渲染可视区域内的 DOM 节点，通过计算偏移量模拟全量列表的滚动效果。

**关键实现**：
1. **容器固定高度** + `overflow: auto`，监听 `scroll` 事件
2. **计算可视范围**：`startIndex = Math.floor(scrollTop / itemHeight)`, `endIndex = startIndex + visibleCount`
3. **占位撑高**：列表总高度 = `itemCount * itemHeight`，用 padding-top/bottom 或绝对定位占位
4. **渲染切片**：只渲染 `items.slice(startIndex, endIndex + buffer)`

**动态高度方案**：无法预计算时，用 `IntersectionObserver` 或 ResizeObserver 逐步缓存测量高度。

---

## Q2：描述你实现的一个复杂权限控制系统

**参考答案**（基于真实项目经历展开）：

**背景**：多租户 SaaS 中后台，需要支持超级管理员 / 租户管理员 / 普通员工三个角色，部分菜单按钮级隔离。

**方案**：
1. 登录后从 `/api/permissions` 获取当前用户的菜单树和权限码列表
2. `router.addRoute` 动态注册路由，避免 404 白屏
3. 封装 `v-permission="'resource:action'"` 指令，不匹配时移除 DOM
4. Pinia store 持久化权限数据（`pinia-plugin-persistedstate`），刷新后不重复请求

---

## Q3：前端如何实现大文件上传？

**参考答案**：

**分片上传**：
1. 用 `File.slice(start, end)` 将文件分成若干块（如 5MB/块）
2. 并发上传各分片（控制并发数，防止请求过多）
3. 上传前计算文件 MD5 → 向服务端查询 → 已存在直接秒传
4. 全部分片上传后发 merge 请求，服务端合并

**断点续传**：
- `localStorage` 存储已上传的分片列表
- 续传时跳过已上传的分片

```js
async function uploadFile(file) {
  const chunks = sliceFile(file, 5 * 1024 * 1024)
  const hash = await calcMD5(file)
  const { uploaded } = await checkExist(hash)
  if (uploaded) return  // 秒传

  await Promise.all(chunks.map((chunk, i) => uploadChunk(chunk, hash, i)))
  await mergeChunks(hash, chunks.length)
}
```

---

## Q4：如何优化首屏加载时间？

**参考答案**：

**代码层面**：
- 路由懒加载：`() => import('./views/Home.vue')`
- 组件懒加载：`defineAsyncComponent`
- 第三方库按需引入：ECharts / Ant Design 按模块 import

**网络层面**：
- CDN 加速静态资源
- `preload` / `prefetch` 预加载关键资源
- HTTP/2 多路复用减少并发限制
- Gzip / Brotli 压缩（Nginx 配置）

**缓存层面**：
- 资源文件名加 hash，配合强缓存（`Cache-Control: max-age=31536000`）
- HTML 不缓存（`Cache-Control: no-cache`）

**监控指标**：Core Web Vitals — LCP / FID（INP）/ CLS

---

## Q5：设计一个 Node.js RESTful API，涵盖鉴权与错误处理

**参考答案**：

```
POST /api/auth/login    → 返回 Access Token + Refresh Token
GET  /api/users         → 需要 Authorization: Bearer <token>
POST /api/auth/refresh  → 用 Refresh Token 换新 Access Token
```

**鉴权中间件**（NestJS 为例）：

```ts
@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest()
    const token = req.headers.authorization?.split(' ')[1]
    try {
      req.user = this.jwtService.verify(token)
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
```

**统一错误处理**（全局异常过滤器）：
- 业务错误抛 `HttpException`（带 code + message）
- 未捕获错误统一返回 500 + 记录日志
