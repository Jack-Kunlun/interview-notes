---
title: 模拟面试题
description: 实践应用题 + 情景分析题，模拟面试真实场景
---

# 模拟面试题

> 基础概念类面试题已融入[知识点复习](/core/javascript)，这里聚焦实践应用和情景分析，考察综合能力。

## 一、实践应用题

### Q1：如何设计一个高性能的虚拟列表组件？

**核心思路**：只渲染可视区域内的 DOM 节点，通过计算偏移量模拟全量列表的滚动效果。

**关键实现**：
1. **容器固定高度** + `overflow: auto`，监听 `scroll` 事件
2. **计算可视范围**：`startIndex = Math.floor(scrollTop / itemHeight)`，`endIndex = startIndex + visibleCount`
3. **占位撑高**：列表总高度 = `itemCount * itemHeight`，用绝对定位或 padding-top 做占位
4. **渲染切片**：只渲染 `items.slice(startIndex, endIndex + buffer)`

**动态高度方案**：无法预计算时，用 `ResizeObserver` 逐步缓存测量高度，滚动到位置时动态调整偏移。

> 更多面试题参见：[权限控制](/fullstack/permission)、[大文件上传](/core/javascript)、[首屏优化](/engineering/performance)、[Node.js API 设计](/fullstack/nodejs)

---

## 二、情景分析题

### Q2：项目上线后性能下降 50%，你如何排查？

**排查链路**（STAR 格式）：

1. **监控先行**：查看 Sentry 错误日志、APM 工具 P99 延迟，定位前端还是后端
2. **前端排查**：
   - Chrome DevTools Performance 录制，找 Long Task（>50ms）
   - Network 面板：检查是否新增了未压缩/CDN 化的大依赖
   - Core Web Vitals：LCP / CLS 是否恶化
3. **后端/网络排查**：新 API 是否有 N+1 查询、Redis 缓存是否失效、CDN 命中率
4. **常见根因**：大包未 tree-shake、图片未压缩、数据库缺索引 → 详见[性能优化](/engineering/performance) & [调试监控](/engineering/debugging)

---

### Q3：遇到 iOS Safari vs Android Chrome 跨端兼容性问题怎么办？

**系统化流程**：
1. **复现与定位**：BrowserStack 或真机远程调试（Safari Web Inspector）
2. **高频陷阱**：
   - iOS `position: fixed` + 软键盘 → 监听 `visualViewport.resize`
   - iOS 滚动穿透 → `body.lock` 方案
   - iOS `new Date('2024-01-01')` → `Invalid Date`，须用 `2024/01/01`
   - Android `backdrop-filter` / `flex gap` 旧版本兼容
3. **预防**：`browserslist` + PostCSS autoprefixer + Can I Use 检查

> 更多移动端知识见[移动端通用](/framework/mobile-common)

---

### Q4：低端 Android 机页面卡顿，如何优化？

**诊断**：ADB 真机 + Chrome DevTools Performance，找掉帧和 Long Task

**常见问题 & 方案**：

| 问题 | 解决方案 |
|---|---|
| JS 长任务阻塞主线程 | `requestIdleCallback` / Web Worker |
| 大量 DOM 操作 | 虚拟列表 / DocumentFragment |
| CSS 动画触发重排 | `transform` + `opacity` |
| 图片过大 | 懒加载 + WebP + 响应式 `srcset` |
| 首屏 bundle 大 | 路由懒加载 + critical CSS 内联 |

**分级目标**：低端机 FPS>24 / LCP<3s，中端机 FPS>30 / LCP<2s，高端机 FPS 60 / LCP<1.5s

> 详见[性能优化](/engineering/performance) & [CSS 深入动画](/core/css-deep)
