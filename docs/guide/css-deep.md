---
title: CSS 深入
description: BFC、层叠上下文、CSS 动画、合成层、响应式布局
---

# CSS 深入

## 必会基础 ⭐⭐⭐

### 盒模型

`box-sizing` 决定元素宽高的计算方式。`content-box`（默认）下 `width` 仅包含内容区，padding 和 border 会撑大元素；`border-box` 下 `width` 包含内容 + padding + border，更符合直觉，也是现代 CSS reset 的首选。面试中常考两者的尺寸计算差异，例如给 `width: 200px; padding: 20px; border: 5px`，分别回答两种模式下的实际占用宽度。

```css
/* content-box：实际宽度 = 200 + 20×2 + 5×2 = 250px */
.box-content { box-sizing: content-box; width: 200px; padding: 20px; border: 5px solid #333; }

/* border-box：实际宽度 = 200px（内容区被压缩为 150px） */
.box-border { box-sizing: border-box; width: 200px; padding: 20px; border: 5px solid #333; }

/* 全局推荐 */
*, *::before, *::after { box-sizing: border-box; }
```

### Flexbox

Flex 项目的大小由 `flex-grow`（扩张比例）、`flex-shrink`（收缩比例）和 `flex-basis`（基准尺寸）三者共同决定。分配算法：先按 `flex-basis` 分配初始空间，剩余空间按 `flex-grow` 比例瓜分，空间不足时按 `flex-shrink × flex-basis` 的加权比例收缩。`flex: 1` 是 `flex: 1 1 0%` 的简写，意味着从 0 开始均分；而 `flex: auto` 等价于 `flex: 1 1 auto`，从内容自身尺寸开始均分，两者行为有细微差异。

```css
/* 三等分容器 */
.container { display: flex; }
.item { flex: 1; }  /* flex-grow: 1; flex-shrink: 1; flex-basis: 0% */

/* 固定侧边栏 + 自适应内容 */
.sidebar { flex: 0 0 260px; }  /* 不伸缩，固定 260px */
.content { flex: 1 1 auto; }   /* 自动伸缩填满剩余空间 */
```

| 属性 | 作用 | 默认值 |
|---|---|---|
| `flex-grow` | 剩余空间分配权重 | `0` |
| `flex-shrink` | 空间不足时收缩权重 | `1` |
| `flex-basis` | 初始主轴尺寸 | `auto` |
| `flex` (简写) | 推荐写法 `flex: 1` | `0 1 auto` |

### Grid

CSS Grid 提供二维布局能力。`grid-template-columns` 定义列轨道，`fr` 单位表示剩余空间的一份比例（类似 `flex-grow` 但作用于轨道），`grid-area` 配合 `grid-template-areas` 以命名方式放置子元素，可读性比行列编号更好。Grid 适合页面级大布局，Flexbox 适合组件级一维排列。

```css
/* fr 单位：三列等比 */
.grid { display: grid; grid-template-columns: 1fr 2fr 1fr; }

/* grid-template-areas + grid-area */
.layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-areas:
    "header  header"
    "sidebar content"
    "footer  footer";
}
.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.footer  { grid-area: footer; }
```

## 进阶考点 ⭐⭐

### BFC（块级格式化上下文）

BFC 是一个独立的渲染区域，内部元素的布局不会影响外部。常用于清除浮动（包裹浮动子元素，避免高度塌陷）和防止 margin 塌陷（不同 BFC 间的垂直 margin 不会合并）。`display: flow-root` 是最推荐的创建方式，无副作用。

| 方式 | 副作用 |
|---|---|
| `overflow: hidden/auto` | 可能裁剪内容 |
| `display: flow-root` | ✅ 无副作用（推荐） |
| `float: left/right` | 脱离文档流 |
| `position: absolute/fixed` | 脱离文档流 |
| `display: flex/grid` | 改变布局模型 |

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

### 层叠上下文

`z-index` 只在定位元素（`position` 不为 `static`）或 flex/grid 子项上生效，且必须先形成层叠上下文。触发条件包括：`position: relative/absolute/fixed/sticky` + `z-index` 非 `auto`、`opacity < 1`、`transform/filter/perspective` 非 `none`、`will-change` 指定上述属性等。同一层叠上下文中，`z-index` 大的在上；不同层叠上下文中，先比较父级的层叠顺序。

```
层叠顺序（从低到高）：
  background/border → 负 z-index → block 块级盒子 → float 浮动盒子
  → inline/inline-block 行内盒子 → z-index: auto / 0
  → 正 z-index
```

```css
/* z-index 生效示例 */
.parent { position: relative; z-index: 1; }   /* 创建层叠上下文 */
.child  { position: absolute; z-index: 999; }  /* 在 parent 内有效 */

/* 常见陷阱：opacity 创建新的层叠上下文 */
.fade { opacity: 0.99; }  /* 虽然没设 z-index，但内部子元素的 z-index 被隔离 */
```

### CSS 动画性能

`transform` 和 `opacity` 的动画在合成线程执行，不触发 Layout（重排）和 Paint（重绘），性能最优。`left/top/width/height` 等布局属性每次变化都会触发布局重计算，应避免在动画中使用。配合 `will-change` 提前将元素提升为合成层，可减少动画首帧的创建开销。

```css
/* ❌ 触发重排（布局改变） */
@keyframes bad { to { left: 100px; } }

/* ✅ 合成层执行（GPU，无重排） */
@keyframes good { to { transform: translateX(100px); } }
.animated { will-change: transform; animation: good 1s; }
```

| 属性类型 | 触发阶段 | 性能 |
|---|---|---|
| `left / top / width / height` | Layout → Paint → Composite | ❌ 差 |
| `color / background / box-shadow` | Paint → Composite | ⚠️ 一般 |
| `transform / opacity` | Composite only | ✅ 最佳 |

### 响应式

响应式布局的核心工具链：媒体查询根据视口宽度切换样式；容器查询（`@container`）根据父容器尺寸而非视口变化，更适合组件级自适应；`clamp()` 实现流式尺寸，一个声明即可覆盖最小、理想、最大值，无需多断点干预。

```css
/* 媒体查询 */
@media (max-width: 768px) {
  .sidebar { display: none; }
}

/* 容器查询 */
.card-wrapper { container-type: inline-size; }
@container (min-width: 400px) {
  .card { flex-direction: row; }
}

/* clamp() 流式排版 */
font-size: clamp(1rem, 2.5vw, 2rem);   /* 最小 1rem，最大 2rem，中间跟随视口 */
padding: clamp(1rem, 5%, 3rem);
```

### contain

`contain` 属性告诉浏览器元素的内部变化不会影响外部，从而跳过不必要的布局/绘制计算，实现性能隔离。`contain: layout` 是 BFC 的强化版，`contain: paint` 限制绘制边界，`content-visibility: auto` 则自动跳过屏幕外元素的渲染（懒渲染），适合长列表优化。

```css
contain: layout;         /* 内部布局不影响外部（BFC 的强化版） */
contain: paint;          /* 后代不绘制在元素边界外 */
contain: layout paint;   /* 组合使用，适合长列表中的单项隔离 */
content-visibility: auto /* 跳过屏幕外元素的渲染（≈懒渲染） */
```

| 值 | 隔离范围 |
|---|---|
| `layout` | 元素内部布局变化不影响外部几何 |
| `paint` | 后代超出边界部分不绘制 |
| `size` | 元素尺寸不依赖子元素（需显式指定宽高） |
| `style` | `counter` / `quotes` 等样式不穿透 |

## 深入理解 ⭐

### 合成层（Compositor Layers）

浏览器渲染的最后一步——合成线程将多个图层合并输出到屏幕。

**哪些属性在合成线程执行（不触发 Layout/Paint）**：
- `transform`（translate / scale / rotate）
- `opacity`
- `filter`（部分）

**创建合成层的触发条件**：
1. 3D transform：`transform: translateZ(0)`
2. `will-change: transform` / `will-change: opacity`
3. `<video>` / `<canvas>` / `<iframe>` 元素
4. `position: fixed`（部分浏览器）

**注意**：合成层过多 → 内存暴涨（每个层≈位图副本）→ 反而性能下降（层爆炸）

### CSS Houdini（了解即可）

CSS Houdini 允许开发者用 JS 编写 CSS 引擎内部逻辑：

| API | 用途 |
|---|---|
| Paint API | 自定义 `background-image` 绘制 |
| Layout API | 自定义布局算法 |
| Properties & Values API | 注册带类型的 CSS 自定义属性 |
| Animation Worklet | 合成线程运行动画（不阻塞主线程） |

```css
/* 注册带类型的 CSS 变量（支持动画） */
@property --my-color {
  syntax: '<color>';
  initial-value: #000;
  inherits: false;
}
```

## 大屏自适应方案 ⭐⭐

大屏（数据看板、可视化驾驶舱）的分辨率跨度极大——从 1366×768 的笔记本到 4K/8K 拼接屏都可能跑同一套页面。大屏自适应的核心诉求是"等比缩放、不变形、铺满全屏"，以下是四种主流方案。

### 方案对比

| 方案 | 原理 | 优点 | 缺点 | 适用场景 |
|---|---|---|---|---|
| `vw/vh + rem` | 视口单位 + rem 动态基准 | 纯 CSS，无 JS 缩放计算 | 比例关系不严格时文字可能偏大/偏小 | 简单大屏，内容型页面 |
| `transform: scale` | 监听 resize，按比例整体缩放 | 设计稿 1:1 还原，不走样 | 鼠标事件坐标偏移需手动修正 | 设计稿固定比例（如 16:9） |
| DataV / FlyFish | 组件库内置自适应容器 | 开箱即用，配套图表丰富 | 绑定框架生态，定制受限 | 可视化大屏，数据看板 |
| 自适应 + 媒体查询 | 多断点切换布局 | 灵活可控，所有屏幕通吃 | 断点间过渡生硬，设计工作量大 | 通用页面，非严格固定比例 |

### scale 变换方案（推荐掌握）

核心思路：将大屏页面按固定设计稿尺寸（如 1920×1080）开发，然后通过 JS 监听 `resize` 事件，计算当前窗口与设计稿的宽高比，选择较小的缩放比例（保证不裁剪），以 `transform: scale` + `transform-origin: left top` 整体缩放并居中。

缩放策略选择"最小比例"的原因：如果取 `scaleX` 和 `scaleY` 中较大的那个，另一个方向会溢出被裁剪；取较小的那个，另一个方向虽然留白但内容完整，配合背景色或 flex 居中即可消除留白感。

```html
<!-- index.html -->
<div id="app" class="screen-container">
  <!-- 所有大屏内容写在这里，按 1920×1080 设计稿开发 -->
  <div class="screen-content">
    <!-- 图表、数据等 -->
  </div>
</div>

<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #app {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000; /* 留白区域填充底色 */
  }
  .screen-container {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .screen-content {
    /* 按设计稿固定尺寸开发 */
    width: 1920px;
    height: 1080px;
    transform-origin: left top;
    /* scale 由 JS 动态设置 */
  }
</style>

<script>
(function() {
  const DESIGN_WIDTH  = 1920;
  const DESIGN_HEIGHT = 1080;
  const container = document.querySelector('.screen-content');

  function resize() {
    const scaleX = window.innerWidth  / DESIGN_WIDTH;
    const scaleY = window.innerHeight / DESIGN_HEIGHT;
    // 取较小比例，保证内容不裁剪（另一个方向留白居中）
    const scale = Math.min(scaleX, scaleY);
    container.style.transform = `scale(${scale})`;

    // 水平 / 垂直居中偏移（处理留白侧）
    const offsetX = (window.innerWidth  - DESIGN_WIDTH  * scale) / 2;
    const offsetY = (window.innerHeight - DESIGN_HEIGHT * scale) / 2;
    container.style.marginLeft = offsetX + 'px';
    container.style.marginTop  = offsetY + 'px';
  }

  window.addEventListener('resize', resize);
  resize(); // 首次执行
})();
</script>
```

**常见坑与修复**：

| 问题 | 原因 | 修复 |
|---|---|---|
| 鼠标点击位置偏移 | `scale` 缩放后事件坐标仍是原始坐标系 | 事件处理中将 `clientX / scale` 换算 |
| 屏幕出现滚动条 | 缩放后元素实际占位仍为 1920×1080 | 父容器设置 `overflow: hidden` |
| 字体模糊 | scale < 1 时文字缩放到非整数像素 | 适当加大设计稿字号，优先用 `transform: translateZ(0)` 提层 |
| iframe / video 不缩放 | 内嵌元素有独立渲染上下文 | 对其也应用 `transform: scale` 或使用 `zoom` |

### vw/vh + rem 方案

通过 `rem` 单位绑定根字体大小，利用 `vw` / `vh` 动态计算 `html` 的 `font-size`，让所有 rem 尺寸随视口等比变化。适合内容型大屏，实现简洁。

```css
/* 设计稿宽度 1920px，100vw = 1920px 时 1rem = 10px */
html {
  font-size: calc(100vw / 1920 * 10);
  /* 1920px 视口下 1rem = 10px，写 100rem = 1000px */
}

/* 防字体过小/过大 */
@media (max-width: 1200px) {
  html { font-size: calc(100vw / 1200 * 10); }
}
@media (min-width: 2560px) {
  html { font-size: calc(2560 / 1920 * 10px); } /* 锁定上限 */
}
```

### px2rem PostCSS 插件配置

`postcss-pxtorem` 自动将 px 转为 rem，开发时继续写 px，构建后自动换算。配合上面的 vw+rem 动态基准，做到"写设计稿 px，自动等比适配"。

```js
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 192,       // 设计稿宽度 / 10，即 1920 / 10 = 192
      propList: ['*'],      // 所有属性都转换
      selectorBlackList: ['.norem'], // 不转换的选择器
      minPixelValue: 2,     // ≤2px 不转换（处理 1px 边框）
      exclude: /node_modules/i,
    },
  },
};
```

```js
// vite.config.js 示例（vite 使用 postcss-pxtorem）
import pxtorem from 'postcss-pxtorem';

export default {
  css: {
    postcss: {
      plugins: [
        pxtorem({
          rootValue: 192,
          propList: ['*'],
        }),
      ],
    },
  },
};
```

**`rootValue` 计算原则**：`rootValue = 设计稿宽度 / 10`。原因是 `html { font-size: calc(100vw / 1920 * 10) }` 在 1920px 视口下 `1rem = 10px`，所以插件需要知道设计稿宽度→rem 基准的换算关系。若设计稿为 1920，则 `rootValue: 192`（即 1920/10），因为源码中 `192px` → `192 / 192 = 1rem`，而 `1rem = 10px`（在 1920 视口下），因此 `192px = 1920/10 = 192px` 实际占据 1/10 宽度——与设计稿一致。

**与 tailwind 共存时注意**：`rootValue` 需与 tailwind 的 rem 基准（默认 16px 即 1rem=4px 在 640px 视口下）区分，建议 tailwind 项目用 `postcss-px-to-viewport`（直接转 vw）而非 pxtorem，避免两套 rem 体系冲突。
