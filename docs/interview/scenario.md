---
title: C 组：情景分析题
description: 3 道情景分析模拟面试题及参考答案
---

# C 组：情景分析题（3 题）

## Q1：你的项目上线后性能下降了 50%，你如何排查？

**参考答案（STAR 格式）**：

**排查顺序**：
1. **监控先行**：查看 Sentry 错误日志、APM 工具（如 DataDog / 阿里云 ARMS）中的 P99 延迟指标，定位是前端还是后端
2. **前端排查**：
   - Chrome DevTools Performance 录制，找 Long Task（>50ms）
   - Network 面板：检查是否有未压缩的大文件、新增了未 CDN 化的依赖
   - Core Web Vitals：LCP / CLS 是否恶化
3. **后端/网络排查**：
   - 新上线的 API 是否有 N+1 查询
   - Redis 缓存是否失效（冷启动期间）
   - CDN 缓存是否命中

**常见原因**：新 bundle 引入了未 tree-shake 的大包、图片未压缩、CDN 配置错误、数据库查询缺索引

---

## Q2：遇到跨端兼容性问题（iOS Safari vs Android Chrome），你如何处理？

**参考答案**：

**系统化处理流程**：
1. **复现与定位**：用 BrowserStack 或真机远程调试（Safari → Web Inspector）
2. **常见问题清单**：
   - iOS Safari：`position: fixed` + 软键盘导致的布局错位 → 监听 `visualViewport.resize`
   - iOS 滚动穿透：`overflow: hidden` 无效 → 使用 `pointer-events: none` 或 `body.lock` 方案
   - Android WebView 的 CSS 渲染差异：慎用 `backdrop-filter`，注意 `flex gap` 的旧版本支持
   - 日期格式：`new Date('2024-01-01')` 在 iOS 中返回 `Invalid Date`，需用 `2024/01/01`
3. **预防**：`browserslist` 配置 + PostCSS autoprefixer + Can I Use 检查

---

## Q3：低端 Android 机页面卡顿，如何优化？

**参考答案**：

**诊断阶段**：
- ADB 连接真机，用 Chrome DevTools 的 Performance 面板录制，找出 Long Task 和掉帧（目标：16ms/帧）
- 检查 FPS 是否长期低于 30

**优化策略**：

| 问题 | 解决方案 |
|---|---|
| JS 长任务阻塞主线程 | 用 `requestIdleCallback` / Web Worker 分解任务 |
| 大量 DOM 操作 | 虚拟列表（只渲染可视区）/ DocumentFragment 批量操作 |
| CSS 动画触发重排 | 改用 `transform: translate` / `opacity` |
| 图片过大 | 懒加载 + WebP + 响应式 `srcset` |
| 首屏 JS 包过大 | 路由懒加载 + 首屏 critical CSS 内联 |
| 频繁 Reflow | `getBoundingClientRect` 结果缓存，避免读写交替 |

**分级优化目标**：
- 低端机（< 2GB RAM）：FPS > 24，首屏 LCP < 3s
- 中端机（2-4GB）：FPS > 30，LCP < 2s
- 高端机：FPS 60，LCP < 1.5s
