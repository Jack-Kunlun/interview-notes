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

### 💬 面试深度

**标准回答**：BFC 是块级格式化上下文，它是一个独立的渲染区域，内部布局不影响外部。我最常用的两个场景：一是清除浮动，用 `display: flow-root` 让容器自动包裹浮动子元素，避免高度塌陷；二是防止外边距合并，把两个段落放进不同的 BFC，它们的 margin 就不会重叠。创建 BFC 我推荐 `display: flow-root`，它没有副作用，不像 `overflow: hidden` 会意外裁剪内容。

**追问预判**：
- **"哪些属性可以触发 BFC？"** → `overflow` 非 `visible`（hidden / auto / scroll）、`float` 非 `none`（left / right）、`position: absolute` 或 `fixed`、`display: inline-block` / `flex` / `grid` / `flow-root` / `table-cell` / `table-caption`、`contain: layout`。最容易漏的是 `display: table-cell` 和 `table-caption`，它们也会隐式创建 BFC。
- **"BFC 能解决父子元素间的 margin 塌陷吗？怎么处理？"** → 可以。给父元素加 `display: flow-root` 或 `overflow: hidden` 创建 BFC；或者把父元素的 margin 换成 padding / border，甚至加一条 `border: 1px solid transparent` 也能阻断塌陷。

**踩过的坑**：用 `overflow: hidden` 清浮动导致下拉菜单和 tooltip 被裁剪。一个卡片容器用了 `overflow: hidden` 清除内部浮动，结果日期选择器弹窗超出容器边界后直接被裁掉，用户看不到日期面板。修复：把 `overflow: hidden` 换成 `display: flow-root`，或者将弹出层用 Portal / `position: fixed` 渲染到 body 下脱离当前 BFC。

**项目选型**：`display: flow-root` vs `overflow: hidden` —— 优先 flow-root，语义明确、零副作用；overflow 方案只在确实需要裁剪溢出内容（如文本截断）时用，一举两得。

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

### 💬 面试深度

**标准回答**：层叠上下文决定了元素在 z 轴上的排列顺序。`z-index` 只在同一个层叠上下文内比较才有意义——不同层叠上下文的元素，先比较父级上下文的层级。创建层叠上下文的条件很多，除了最常见的 `position` + `z-index`，还有 `opacity < 1`、`transform`、`filter`、`will-change` 等，这些属性即使没设 `z-index` 也会隐式创建层叠上下文，经常是 z-index 失效的根因。

**追问预判**：
- **"为什么加了 opacity 后 z-index 不生效了？"** → 因为 `opacity < 1` 会创建新的层叠上下文，内部子元素的 `z-index` 被隔离在这个上下文内，和外部的元素不再直接比较。如果子元素设了 `z-index: 999` 但父元素 `opacity: 0.99` 且没有 `z-index`，父元素对外表现为 `z-index: auto`，子元素的 999 只在父元素内部有效，对外面更高级别的元素无效。
- **"z-index: 9999 也没用，怎么排查？"** → 往上逐级检查每个祖先是否创建了层叠上下文（看 position + z-index、opacity、transform、filter 等），找到最近的那个层叠上下文根，问题通常是祖先的 z-index 低于竞争元素的祖先。

**踩过的坑**：给弹窗遮罩加了 `opacity` 过渡动画，结果弹窗内容永远在某个 `z-index: 10` 的侧边栏下面，无论弹窗 `z-index` 设多大都没用。根因是遮罩的 `opacity: 0` → `1` 过渡创建了层叠上下文，而遮罩本身没有 `z-index`。修复：给遮罩同时加上 `z-index` 声明，或者用 `background: rgba(0,0,0,0.5)` 替代 opacity 做半透明。

**项目选型**：弹窗/抽屉的 z-index 管理 —— 推荐用 CSS 变量 `--z-modal: 1000` 集中定义层级体系（base → dropdown → sticky → modal → toast），避免散落各处的魔法数字互相打架。

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

### 💬 面试深度

**标准回答**：CSS 动画性能的核心是避开重排和重绘。`transform` 和 `opacity` 的动画在合成线程上执行，不经过主线程的 Layout 和 Paint，所以即使用 JS 做复杂计算也不会卡动画。`left`、`top`、`width` 这些属性每帧都会触发 Layout → Paint → Composite 的完整管线，在低端设备上掉帧非常明显。实际开发中我优先用 `transform: translateX/Y` 替代 `left/top`，用 `transform: scale` 替代 `width/height` 缩放。

**追问预判**：
- **"will-change 用得越多越好吗？"** → 绝对不是。`will-change` 会提前创建合成层，每个合成层都是一份 GPU 位图副本，滥用会导致 GPU 显存暴涨，尤其在移动端可能引发崩溃。应该只在动画开始前添加，动画结束后移除，或者只在确实有性能瓶颈的元素上使用。
- **"requestAnimationFrame 和 CSS 动画哪个更好？"** → CSS 动画更适合简单的声明式过渡，浏览器可以对其做优化（如合成线程执行）；rAF 适合需要 JS 参与每一帧计算的场景（如跟随鼠标的视差效果、canvas 动画）。两者并不是互斥的——复杂动画用 JS 驱动 `transform` 属性同样可以在合成线程执行。

**源码在哪**：Chromium 中合成层决策逻辑在 `cc/trees/layer_tree_host_impl.cc`，`WillChangeTransform` 等 hint 的判断在 `cc/trees/property_tree_builder.cc`。

**踩过的坑**：`will-change` 滥用导致 GPU 内存暴涨。曾在一个长列表页面给所有卡片加了 `will-change: transform` 想优化 hover 动画，结果页面打开不久移动端 Safari 直接白屏崩溃。排查发现每个卡片都创建了独立合成层（几百个），GPU 显存从 200MB 飙升到 2GB+。修复：只在 hover 时动态添加 `will-change`，transition 结束后移除；或者干脆不用 will-change，让浏览器在动画发生时才自动提升为合成层，大多数情况下完全够用。

**项目选型**：`transform` vs `left/top` 动画 —— 一律 transform，除非需要影响文档流布局（transform 不改变占位空间）。如果确实需要布局动画，考虑用 FLIP 技巧：先用 `getBoundingClientRect` 记录起始位置，改布局属性，再算出差值用 `transform` 反向补回去，实现只触发一次 Layout。

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

### 💬 面试深度

**标准回答**：响应式设计的核心思路是让同一套代码适配不同屏幕。基础武器是媒体查询，根据视口宽度切换布局；进阶武器是容器查询 `@container`，它不关心视口多大，只关心父容器多宽，一个组件放进不同宽度的侧边栏和主内容区会自动切换样式。还有 `clamp()` 函数，一行就能搞定流式字号——比如 `clamp(1rem, 2.5vw, 2rem)`，在小屏不缩到看不清，在大屏不放到夸张。

**追问预判**：
- **"容器查询和媒体查询什么时候用哪个？"** → 页面级布局（如侧边栏显隐、grid 列数）用媒体查询，因为这是视口级别的变化；组件内部自适应（如卡片在宽/窄容器内的排列方向）用容器查询，因为组件不知道它会被放在哪里。一个组件可能出现在 300px 的侧边栏也可能出现在 800px 的主内容区，容器查询能让它自适应两种场景而无需写两套样式。
- **"移动端适配 1px 边框问题怎么解决？"** → 用 `transform: scaleY(0.5)` + `transform-origin: 0 0` 做 0.5px 的物理像素边框；或者用 `border-image` / `box-shadow` 模拟；也可以 postcss 插件把 `border: 1px` 自动转换为上述方案。核心原理是 Retina 屏的 1 CSS px = 2~3 物理像素，`border: 1px` 实际渲染了 2~3px 宽。

**踩过的坑**：`@media (min-width: 768px)` 和移动端优先的样式覆盖顺序搞反。移动端优先应该是 `min-width` 从小到大叠加（基础样式=移动端，768+=平板，1024+=桌面），而不是用 `max-width` 从大到小回退。搞反之后每个断点都在互相覆盖，特定区间出现意料之外的样式组合。修复：统一 `min-width` 递增策略，基础样式 = 最小屏，每个断点只追加/覆盖必要的属性。

**项目选型**：Tailwind 响应式 vs 手写媒体查询 —— 中小项目用 Tailwind 的 `sm:` / `md:` / `lg:` 前缀足够快；大型项目混合使用：组件级用 Tailwind，页面布局级用手写 `@media` 或 `@container`，语义更清晰，避免一长串 class 难以维护。

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

### 💬 面试深度

**标准回答**：CSS containment 是性能优化的利器，核心思想是告诉浏览器"这个元素的内部变化不会影响外部"，让浏览器跳过不必要的布局和绘制计算。最常用的是 `content-visibility: auto`，它对屏幕外元素自动跳过渲染，长列表能提速 50% 以上，相当于原生的懒渲染。`contain: layout` 可以理解为 BFC 的加强版，它不仅隔离 margin 和浮动，还保证内部任何布局变化都不会触发外部重排。

**追问预判**：
- **"content-visibility: auto 有什么副作用？"** → 第一，元素高度会塌陷为 0（因为浏览器不渲染内容），需要配合 `contain-intrinsic-size` 预估一个占位高度，否则滚动条会跳动；第二，屏幕外元素的 `find`（Ctrl+F）搜不到，因为它根本没生成 DOM 渲染树；第三，JS 访问屏幕外元素的 `getBoundingClientRect` 可能返回 0。
- **"contain 和 BFC 有什么区别？"** → BFC 只隔离浮动和 margin，contain: layout 在此基础上还保证内部布局变化完全不影响外部（比方说内部子元素改变大小不会导致外部兄弟元素移动），并且阻止外部布局影响内部。contain: paint 更进一步限制绘制边界。简单说：BFC ⊆ contain: layout ⊆ contain: layout paint。

**踩过的坑**：给列表项加了 `contain: size` 但忘了显式设置宽高，结果所有项目缩成 0×0 不可见。`contain: size` 会告诉浏览器"此元素的尺寸不依赖子元素"，但如果你没给显式的 `width` / `height`，浏览器就会认为它是 0 尺寸。修复：要么改 `contain: layout paint` 不加 size，要么同时声明明确的宽高。

**项目选型**：`content-visibility: auto` vs 虚拟列表（virtual scroll）—— 简单长列表（几百条、DOM 不复杂）直接用 content-visibility，零 JS 成本；超长列表（万级以上、DOM 复杂）用虚拟列表彻底控制 DOM 数量。两者不互斥，可组合：虚拟列表的每行再叠加 content-visibility 做二级优化。

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

### 💬 面试深度

**标准回答**：合成层是浏览器把页面拆分成独立图层、在 GPU 合成线程上合并输出的机制。`transform` 和 `opacity` 的动画之所以流畅，就是因为它们只在合成线程运行，不碰主线程的 Layout 和 Paint。但合成层不是越多越好——每个层都占一份 GPU 显存，138 个层就可能吃掉 200MB+，移动端会直接白屏，这就是"层爆炸"。

**追问预判**：
- **"什么是隐式合成？如何排查层爆炸？"** → 隐式合成是指：当某个元素被提升为合成层后，如果它的 z-order 高于页面中其他合成层，浏览器为了保证渲染顺序正确，会"连带"把中间的元素也提升为合成层，哪怕它们本身不需要。这是层爆炸的主因。排查方法：打开 Chrome DevTools → More tools → Layers 面板，勾选"paint flashing"或直接在 Layers 中查看每个层的"Compositing Reasons"，如果看到大量 `Overlap with other composited element` 就是隐式合成导致的。修复：给隐式合成的元素也显式设置较低的 z-index 阻止连带提升，或减少不必要的合成层创建。
- **"translateZ(0) 这个 hack 还能用吗？"** → 能用但不如 `will-change: transform` 语义明确。`translateZ(0)` 本质是欺骗浏览器创建 3D 合成层，浏览器不知道你的意图；will-change 则是明确声明"这个属性会变，请提前创建合成层"，浏览器可以更智能地管理资源。但如果页面合成层已经很多，两者都别滥用。

**源码在哪**：Chromium 合成层创建逻辑入口 `cc/trees/layer_tree_host.cc` 的 `UpdateLayers`，隐式合成的 overlap 检测在 `cc/trees/draw_property_utils.cc`。

**踩过的坑**：`will-change: transform` 滥用导致 GPU 内存暴涨（同 CSS 动画深度所述）。追加一个案例：页面嵌入了 30 个 iframe 卡片（如广告位），每个 iframe 本身就是合成层（视频/iframe 自动创建），加上卡片上的 `will-change` 和 `box-shadow`，Layers 面板显示 200+ 层，低端安卓机页面直接卡死。修复：iframe 懒加载（IntersectionObserver + `loading="lazy"`），移除不必要的 will-change，用 `transform: translate3d(0,0,0)` 合并相邻层。

**项目选型**：Chrome DevTools Layers 面板 vs Performance 面板 —— Layers 面板看"层为什么产生"（Compositing Reasons），Performance 面板看"层创建花费多长时间"和帧时间线；两者配合：先在 Performance 中确认掉帧区间，再到 Layers 中排查该区间内层数量暴增的原因。

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

### 💬 面试深度

**标准回答**：大屏自适应的核心是"等比缩放、不变形、铺满全屏"。我主要用 transform: scale 方案：页面按固定设计稿（1920×1080）开发，JS 监听 resize 算出当前窗口与设计稿的宽高比，取最小比例做整体缩放，配合 margin 偏移实现居中。这个方案最大的优点是 1:1 还原设计稿，像素级对齐，不会出现 rem 方案中比例计算偏差导致的错位问题。

**追问预判**：
- **"scale 方案的鼠标事件坐标偏移怎么修正？"** → scale 缩放后，元素的视觉位置变了但 DOM 的坐标体系没变，`event.clientX` 拿到的还是原始坐标系的值。修正方法：`actualX = clientX / scale - offsetX`，`actualY = clientY / scale - offsetY`。或者在事件代理层统一处理，封装一个 `getScaledPosition(e)` 工具函数，传入当前 scale 值和 margin 偏移量，返回换算后的坐标。如果用了图表库如 ECharts，可以通过 `chart.getZr().pointerCapture` 的 `trigger` 参数传入修正坐标。
- **"大屏在 4K 和 1366 上表现不一致怎么处理？"** → 如果设计稿是 16:9，两个屏幕都是 16:9，scale 方案天然兼容——只是缩放倍数不同。如果比例不一致（比如客户现场是超宽拼接屏 32:9），取最小比例后会上下或左右留白。解决方案：设计阶段就协商确定目标比例，或者用"多套设计稿 + 断点切换"，还可以留白区域放一些装饰性背景元素减少空洞感。

**源码在哪**：无特定框架源码。ECharts 的缩放适配可参考 `echarts/lib/core/impl.ts` 中 `resize` 方法，它内部通过监听容器尺寸变化重新计算图表坐标系。

**踩过的坑**：scale 方案下 ECharts 图表的 tooltip 跟随鼠标时位置严重偏移。根因是 ECharts 内部用 `event.offsetX/Y` 定位 tooltip，而 scale 缩放后 offset 坐标未修正。修复：在容器的 `mousemove` 事件中拦截，手动换算坐标后传给 ECharts 的 `dispatchAction({ type: 'showTip', ... })`；或者给 ECharts 容器单独设置 `chart.setOption({ tooltip: { position: function(point) { return [point[0]/scale, point[1]/scale]; } } })`。

**项目选型**：`transform: scale` vs `vw/vh + rem` —— 固定比例大屏（数据看板、驾驶舱）优先 scale，设计稿 100% 还原；内容型页面（信息流、后台管理）用 vw+rem 或 clamp 流式，不需要像素级对齐且文字可读性更好。