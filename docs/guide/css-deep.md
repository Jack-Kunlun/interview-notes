---
title: CSS 深入
description: BFC、层叠上下文、CSS 动画、合成层、响应式布局
---

# CSS 深入

## 必会基础 ⭐⭐⭐

- [ ] 盒模型：`content-box` vs `border-box`，`box-sizing` 的作用
- [ ] Flexbox：`flex-grow` / `flex-shrink` / `flex-basis` 的分配算法
- [ ] Grid：`grid-template-columns` / `fr` 单位 / `grid-area`

## 进阶考点 ⭐⭐

- [ ] **BFC**（块级格式化上下文）：触发条件与应用（清浮动、防 margin 塌陷）
- [ ] **层叠上下文**：`z-index` 生效条件与层叠顺序
- [ ] CSS 动画性能：`transform` / `opacity` 在合成线程执行（不触发重排）
- [ ] 响应式：媒体查询 / 容器查询 / `clamp()` 流式排版
- [ ] `contain`：CSS containment 隔离性能优化

## BFC 触发方式

| 方式 | 副作用 |
|---|---|
| `overflow: hidden/auto` | 可能裁剪内容 |
| `display: flow-root` | ✅ 无副作用（推荐） |
| `float: left/right` | 脱离文档流 |
| `position: absolute/fixed` | 脱离文档流 |
| `display: flex/grid` | 改变布局模型 |

## BFC 应用

```html
<!-- 清除浮动（高度塌陷） -->
<div style="display: flow-root">
  <div style="float: left">浮动子元素</div>
</div>  <!-- 容器自动包裹浮动元素 -->

<!-- 防止 margin 塌陷 -->
<div style="display: flow-root"><p style="margin-bottom: 20px">段落1</p></div>
<div style="display: flow-root"><p style="margin-top: 30px">段落2</p></div>
<!-- 不同 BFC 中 margin 不合并，间距 = 50px -->
```

## CSS 动画性能

```css
/* ❌ 触发重排（布局改变） */
@keyframes bad { to { left: 100px; } }

/* ✅ 合成层执行（GPU，无重排） */
@keyframes good { to { transform: translateX(100px); } }
.animated { will-change: transform; animation: good 1s; }
```

## `clamp()` 流式排版

```css
font-size: clamp(1rem, 2.5vw, 2rem);   /* 最小1rem，最大2rem，中间跟随视口 */
padding: clamp(1rem, 5%, 3rem);
```
