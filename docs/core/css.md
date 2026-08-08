---
title: CSS 基础
description: 盒模型、Flex/Grid 布局、CSS 动画、原子化 CSS、工程化速查
---

# CSS 基础

## 一、盒模型

`box-sizing` 决定元素宽高的计算方式。`content-box`（默认）下 `width` 仅包含内容区，padding 和 border 会撑大元素；`border-box` 下 `width` 包含内容 + padding + border，更符合直觉，也是现代 CSS reset 的首选。

```css
/* content-box：实际宽度 = 200 + 20×2 + 5×2 = 250px */
.box-content { box-sizing: content-box; width: 200px; padding: 20px; border: 5px solid #333; }

/* border-box：实际宽度 = 200px（内容区被压缩为 150px） */
.box-border { box-sizing: border-box; width: 200px; padding: 20px; border: 5px solid #333; }

/* 全局推荐 */
*, *::before, *::after { box-sizing: border-box; }
```

---

## 二、Flex 布局

Flex 是一维弹性布局模型，核心是三个关键属性：

### 2.1 flex-grow / flex-shrink / flex-basis

`flex-basis` 定义弹性项目在主轴上的**初始尺寸**（分配剩余空间之前），默认为 `auto`（取元素自身尺寸）。`flex-grow` 决定当容器有剩余空间时项目如何**放大**（默认 0，不放大）。`flex-shrink` 决定当容器空间不足时项目如何**缩小**（默认 1）。

```css
/* 三栏布局：左右固定，中间自适应 */
.container { display: flex; }
.sidebar { flex: 0 0 200px; }  /* 不放大、不缩小、固定 200px */
.content { flex: 1 1 auto; }   /* 放大填满剩余空间 */
```

```
剩余空间分配示例（容器宽 600px，三个子项）：
子项 A: flex-basis: 100px, flex-grow: 1  →  100 + (300 × 1/3) = 200px
子项 B: flex-basis: 100px, flex-grow: 2  →  100 + (300 × 2/3) = 300px
子项 C: flex-basis: 100px, flex-grow: 0  →  100 + 0 = 100px
剩余空间 = 600 - 300 = 300px，按 grow 比例 1:2:0 分配
```

> **`flex: 1` 和 `flex: auto` 有什么区别？** `flex: 1` = `1 1 0%`（从 0 开始均分，忽略内容尺寸），`flex: auto` = `1 1 auto`（先保留内容尺寸再均分剩余空间）。所以当子元素内容宽度不一致时，`flex: 1` 会让三个元素等宽，`flex: auto` 下内容多的会更宽。

### 2.2 align-content vs align-items

`align-items` 作用于**单行内**所有弹性项目沿交叉轴对齐。`align-content` 仅在 `flex-wrap: wrap`（多行）时生效，控制**多行之间**在交叉轴上的分布方式。单行弹性容器中 `align-content` 无效——这是最常见的混淆点。

| 属性 | 作用对象 | 生效条件 | 典型值 |
|------|---------|---------|--------|
| `align-items` | 单行内所有项目 | 始终生效 | stretch, center, flex-start |
| `align-content` | 多行（flex 行）之间 | `flex-wrap: wrap` | space-between, center, stretch |
| `justify-content` | 主轴方向 | 始终生效 | space-between, center, flex-end |
| `align-self` | 单个项目（覆盖 align-items） | 始终生效 | auto, stretch, center |

### 2.3 圣杯 / 双飞翼布局（Flex 实现）

圣杯与双飞翼均实现**三栏布局**（左右固定、中间自适应 + 优先渲染）。传统浮动实现需要负 margin 和相对定位，用 Flex 可以大幅简化。

```html
<div class="holy-grail">
  <header>Header</header>
  <div class="holy-body">
    <main class="holy-content">中间内容（优先渲染）</main>
    <nav  class="holy-left">左侧栏 200px</nav>
    <aside class="holy-right">右侧栏 300px</aside>
  </div>
  <footer>Footer</footer>
</div>

<style>
.holy-grail { display: flex; flex-direction: column; min-height: 100vh; }
.holy-body  { display: flex; flex: 1; }
.holy-content { flex: 1; order: 2; }
.holy-left    { flex: 0 0 200px; order: 1; }
.holy-right   { flex: 0 0 300px; order: 3; }
</style>
```
---

## 三、Grid 布局

Grid 是二维布局系统——同时控制行和列。Flex 适合一维排列（导航栏、卡片流），Grid 适合页面骨架、仪表盘、表单网格。两者不互斥，外层 Grid 定骨架、内层 Flex 排细节是最佳实践。

### 3.1 grid-template-areas 命名布局

`grid-template-areas` 使用 ASCII 可视化语法定义网格区域，配合子元素的 `grid-area` 属性即完成布局，无需计算行列索引。

```css
.page {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: 60px 1fr 50px;
  grid-template-areas:
    "header  header"
    "sidebar content"
    "footer  footer";
  min-height: 100vh;
}
.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.footer  { grid-area: footer; }

/* 响应式：窄屏改为单列——只改 areas 字符串即可 */
@media (max-width: 768px) {
  .page {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header" "content" "sidebar" "footer";
  }
}
```

### 3.2 auto-fill vs auto-fit

两者都配合 `repeat()` 和 `minmax()` 自动生成尽可能多的列轨道。差异在于空轨道处理：

| 特性 | auto-fill | auto-fit |
|------|-----------|----------|
| 空轨道处理 | 保留（占位但空白） | 折叠为 0（项目拉伸） |
| 项目数 < 列数 | 末尾留白 | 项目拉伸填满 |
| 项目数 ≥ 列数 | 行为一致 | 行为一致 |
| 典型场景 | 固定卡片网格 | 响应式导航/标签栏 |

```css
.grid-fill { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.grid-fit  { grid-template-columns: repeat(auto-fit,  minmax(200px, 1fr)); }
```

> **Safari 坑**：`minmax()` 中 `min` 值在 Safari 上可能被忽略（它用内容最小宽度代替），导致卡片不收缩。修复：给 grid item 显式加 `min-width: 0` 或改用 `minmax(min(200px, 100%), 1fr)`。

### 3.3 Grid vs Flex 选型表

| 维度 | Grid | Flex |
|------|------|------|
| 布局方向 | **二维**（同时控制行列） | **一维**（主轴 + 可换行） |
| 控制粒度 | 单元格级别精确放置 | 项目级别弹性伸缩 |
| 重叠能力 | 天然支持 | 需借助 absolute |
| 间距控制 | `gap` 行列可分别设置 | `gap` 仅项目间 |
| 适用场景 | 页面整体布局、仪表盘、画廊 | 导航栏、工具栏、卡片列表 |

> 选型口诀：一维排列用 Flex，二维对齐用 Grid。两者可嵌套——外层 Grid 定骨架，内层 Flex 排细节。

---

## 四、CSS 动画与阴影

### 4.1 transition vs animation

| 维度 | transition | animation |
|------|-----------|-----------|
| 触发方式 | 必须状态改变（hover / class 切换） | 自动播放 / 延迟播放 |
| 关键帧 | 只有起点和终点 | 任意数量关键帧（0% ~ 100%） |
| 循环 | 不支持 | `animation-iteration-count: infinite` |
| 暂停 | 不支持 | `animation-play-state: paused` |
| 典型场景 | hover 变色、展开收起 | 骨架屏闪烁、旋转加载、入场动画 |

```css
/* @keyframes 定义关键帧 */
@keyframes slideIn {
  0%   { opacity: 0; transform: translateY(-20px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}

.card { animation: slideIn 0.3s ease-out both; }
.loading-dot { animation: pulse 1.2s ease-in-out infinite; }
/* 暂停动画 */
.loading-dot:hover { animation-play-state: paused; }
```

`animation-fill-mode` 最易被忽略：`forwards` 让动画结束后保持最后一帧，`backwards` 在延迟期间就应用第一帧样式，`both` 同时生效。

> **height: auto 过渡的坑**：`transition: height 0.3s` 从 `height: 0` → `auto` 完全不生效——CSS transition 需要可计算的数值，`auto` 不是数值。修复：用 `max-height` 过渡（设一个足够大的值），或 JS `getBoundingClientRect()` 先量实际高度再设具体数值。

### 4.2 box-shadow vs drop-shadow

`box-shadow` 沿元素的**盒模型边框**投射阴影（矩形），`drop-shadow()` 沿元素的**实际可见轮廓**（含透明通道）投射阴影。

```css
/* box-shadow：沿矩形盒模型 */
.card { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.card { box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); } /* 内阴影 */
.card { box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1); } /* 多重 */

/* drop-shadow：沿可见轮廓（适合 PNG 图标、三角形箭头） */
.icon { filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3)); }

/* 三角形箭头——只有 drop-shadow 能正确处理 */
.arrow {
  width: 0; height: 0;
  border: 20px solid transparent;
  border-bottom-color: #333;
  filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));
}
```

| 特性 | box-shadow | drop-shadow() |
|------|-----------|---------------|
| 作用依据 | 盒模型边界 | 像素轮廓（含透明通道） |
| 内阴影 | ✅ `inset` | ❌ 不支持 |
| PNG/SVG 透明区域 | 忽略（只投射矩形） | 精确跟随轮廓 |
| 性能 | GPU 加速，开销小 | 软件渲染，开销较大 |

### 4.3 text-shadow

`text-shadow` 为文本添加阴影，语法为 `offset-x offset-y blur-radius color`。不支持 `inset` 和 spread 扩散半径，但天然支持多阴影叠加。

```css
.title  { text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
.glow   { text-shadow: 0 0 10px #0ff, 0 0 20px #0ff, 0 0 30px #0ff; }
.emboss { text-shadow: -1px -1px 0 rgba(255,255,255,0.5), 1px 1px 0 rgba(0,0,0,0.3); }
.stroke { text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; }
```

---

## 五、原子化 CSS

### 5.1 Tailwind CSS

Tailwind CSS 采用 **utility-first**（原子化）设计理念，通过直接在 HTML 中组合大量单一用途的 class 来构建界面。

```js
// tailwind.config.js
export default {
  content: ['./src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: { primary: '#3eaf7c', brand: { 50: '#f0fdf4', 500: '#22c55e' } }
    }
  }
}
```

```css
/* @apply / @layer */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-primary text-white rounded-lg hover:bg-brand-500;
  }
}
```

> **动态类名陷阱**：`bg-${color}-500` 这种模板字符串在 Tailwind JIT 中会失效——JIT 编译时扫描完整类名字符串，模板表达式对静态分析不可见。修复：写完整类名映射 `const colorMap = { red: 'bg-red-500', blue: 'bg-blue-500' }`。

### 5.2 Tailwind CSS vs UnoCSS

| 维度 | Tailwind CSS | UnoCSS |
|------|-------------|--------|
| 实现方式 | PostCSS 插件（AST 解析源码） | 原子化引擎（正则匹配按需生成） |
| 生成模式 | JIT（v3 默认） | 默认按需，无 JIT 编译步骤 |
| 构建速度 | 中等 | 极快（无 AST 解析） |
| 动态规则 | 有限（需 safelist） | 天然支持正则规则（如 `m-{float}`） |
| 生态规模 | 庞大（Headless UI 等） | 轻量，Vite 深度集成 |
| 配置方式 | `tailwind.config.js` | `uno.config.ts`（规则可编程） |

```ts
// uno.config.ts — 可编程规则
import { defineConfig } from 'unocss'

export default defineConfig({
  rules: [
    [/^m-(\d+)$/, ([, d]) => ({ margin: `${Number(d) * 0.25}rem` })],
  ],
  shortcuts: {
    'btn': 'px-4 py-2 rounded-lg font-medium',
    'btn-primary': 'btn bg-blue-500 text-white hover:bg-blue-600',
  },
})
```

> **选型建议**：已有 Tailwind 项目继续用；新 Vite 项目追求性能选 UnoCSS；需要 Headless UI 等现成组件生态选 Tailwind。两者可共存——UnoCSS 提供 Tailwind 兼容预设。

### 5.3 原子化 CSS 优缺点

| 维度 | 优点 | 缺点 |
|------|------|------|
| 可维护性 | 样式即类名，所见即所得 | 长列表类名降低 HTML 可读性 |
| 一致性 | 强制使用设计令牌 | 偏离预设值需扩展 theme |
| 按需生成 | 天然 tree-shake，生产包 < 10KB | 动态拼接类名可能遗漏 |
| 团队协作 | 类名语义清晰，新人快速上手 | 过度 `@apply` 可能退化为传统 CSS |

---

## 六、CSS 工程化要点速查

| 概念 | 一句话 |
|------|--------|
| `box-sizing: border-box` | width = 内容 + padding + border，比 content-box 更符合直觉 |
| `flex: 1` | `flex-grow: 1; flex-shrink: 1; flex-basis: 0%` — 等分剩余空间 |
| `align-content` | 多行弹性/网格容器中行与行之间的分布，**单行无效** |
| `auto-fit` | 折叠空轨道，项目拉伸填满；`auto-fill` 保留空轨道 |
| `grid-template-areas` | ASCII 可视化布局，响应式只需改 areas 字符串 |
| `transition` | 被动过渡 A→B，需触发器；`animation` 主动动画，可循环 |
| `drop-shadow` | 跟像素轮廓走（PNG 可用）；`box-shadow` 跟盒模型走 |
| `text-shadow` | 不支持 inset/spread，天然支持多阴影叠加 |
| `animation-fill-mode: both` | 延迟期间用第一帧 + 结束后保持最后一帧 |
| 原子化 CSS | Tailwind 胜在生态，UnoCSS 胜在构建速度和灵活动态规则 |
