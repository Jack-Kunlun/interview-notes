---
title: CSS 基础 & 组件库
description: Tailwind CSS、Ant Design Vue、组件封装
---

# CSS 基础 & 组件库

## 必会基础 ⭐⭐⭐

### Tailwind CSS：utility-first、`@apply` / `@layer` / 主题扩展（`theme.extend`）

Tailwind CSS 采用 **utility-first**（原子化）设计理念，通过直接在 HTML 中组合大量单一用途的 class 来构建界面，避免手写自定义 CSS。`@apply` 指令用于将一组工具类抽取为可复用的 CSS 规则，减少模板中重复的 class 组合。`@layer` 用于控制样式优先级（`base` → `components` → `utilities`），配合 `theme.extend` 可在不覆盖默认主题的前提下扩展品牌色、间距、字体等设计令牌。

```js
// tailwind.config.js
export default {
  content: ['./src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3eaf7c',
        brand: { 50: '#f0fdf4', 500: '#22c55e' }
      }
    }
  }
}
```

```css
/* @apply / @layer 示例 */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-primary text-white rounded-lg hover:bg-brand-500;
  }
}
```

### Ant Design Vue：Form 表单验证、Table 自定义列、Tree / Menu 数据驱动

Ant Design Vue 的 **Form** 组件通过 `rules` 声明式配置校验规则，`a-form-item` 的 `name` 属性绑定字段路径，调用 `formRef.validate()` 即可触发全量校验。**Table** 的列通过 `columns` 数组定义，支持 `customRender` / `slots` 实现自定义单元格渲染（如操作按钮、状态标签）。**Tree / Menu** 均采用 `tree-data` 数据驱动模式，传入嵌套的 `children` 数组即可递归渲染，选中态由 `v-model:selectedKeys` 双向绑定控制。

```vue
<!-- Form 表单验证 -->
<a-form :model="form" :rules="rules" ref="formRef">
  <a-form-item label="用户名" name="username">
    <a-input v-model:value="form.username" />
  </a-form-item>
</a-form>

<script setup>
const rules = {
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, max: 20, message: '长度 3-20 位' }
  ]
}
const formRef = ref()

// 提交前校验
await formRef.value.validate()
// 重置
formRef.value.resetFields()
</script>
```

```vue
<!-- Table 自定义列（插槽方式） -->
<a-table :columns="columns" :data-source="data">
  <template #bodyCell="{ column, record }">
    <template v-if="column.key === 'action'">
      <a-button type="link" @click="handleEdit(record)">编辑</a-button>
    </template>
  </template>
</a-table>

<script setup>
const columns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '操作', key: 'action', width: 120 }
]
</script>
```

```vue
<!-- Tree / Menu 数据驱动 -->
<a-tree
  :tree-data="treeData"
  v-model:selectedKeys="selectedKeys"
  :field-names="{ children: 'children', title: 'label', key: 'id' }"
/>

<script setup>
const treeData = [
  { id: '1', label: '根节点', children: [{ id: '1-1', label: '子节点' }] }
]
</script>
```

### 受控组件封装：`v-model` 透传、`defineProps` + `defineEmits`

封装受控组件的核心是利用 Vue 3 的 `v-model` 语法糖：父组件通过 `v-model:value` 传入 prop，子组件通过 `defineProps` 接收、`defineEmits('update:value')` 触发更新，实现数据的单向流动和双向绑定。对于多个 `v-model` 场景，可指定不同的参数名（如 `v-model:visible`），每个参数对应独立的 prop 和 emit 事件。封装时注意 `inheritAttrs: false` 配合 `useAttrs()` 可避免非 prop 属性自动继承到根元素。

```vue
<!-- 父组件 -->
<MyInput v-model:value="val" />

<!-- MyInput 内部 -->
<template>
  <input :value="props.value" @input="emit('update:value', $event.target.value)" />
</template>
<script setup>
const props = defineProps(['value'])
const emit = defineEmits(['update:value'])
</script>
```

## Flex 布局深入 ⭐⭐

### flex-grow / flex-shrink / flex-basis 分配算法

`flex-basis` 定义弹性项目在主轴上的**初始尺寸**（分配剩余空间之前），默认为 `auto`（取元素自身尺寸）。`flex-grow` 决定当容器有剩余空间时项目如何**放大**：剩余空间按各项目的 `flex-grow` 值按比例分配（默认 0，不放大）。`flex-shrink` 决定当容器空间不足时项目如何**缩小**：收缩量 = 溢出空间 × (flex-shrink × flex-basis) / Σ(flex-shrink × flex-basis)，默认值为 1（允许收缩）。简写 `flex: 1` 等价于 `flex: 1 1 0%`，即等分空间且忽略内容尺寸。

```css
/* 三栏布局：左右固定，中间自适应 */
.container { display: flex; }
.sidebar { flex: 0 0 200px; }  /* 不放大、不缩小、固定 200px */
.content { flex: 1 1 auto; }   /* 放大填满剩余空间、允许缩小 */
```

```
剩余空间分配示例（容器宽 600px，三个子项）：
子项 A: flex-basis: 100px, flex-grow: 1  →  100 + (300 × 1/3) = 200px
子项 B: flex-basis: 100px, flex-grow: 2  →  100 + (300 × 2/3) = 300px
子项 C: flex-basis: 100px, flex-grow: 0  →  100 + 0 = 100px
剩余空间 = 600 - 300 = 300px，按 grow 比例 1:2:0 分配
```

### align-content vs align-items

`align-items` 作用于**单行内**所有弹性项目，沿交叉轴对齐（`stretch` / `flex-start` / `flex-end` / `center` / `baseline`）。`align-content` 仅在 `flex-wrap: wrap`（多行）时生效，控制**多行之间**在交叉轴上的分布方式（`stretch` / `flex-start` / `flex-end` / `center` / `space-between` / `space-around` / `space-evenly`）。单行弹性容器中 `align-content` 无效——这是最常见的混淆点。

| 属性 | 作用对象 | 生效条件 | 典型值 |
|------|---------|---------|--------|
| `align-items` | 单行内所有项目 | 始终生效 | stretch, center, flex-start |
| `align-content` | 多行（flex 行）之间 | `flex-wrap: wrap` | space-between, center, stretch |
| `justify-content` | 主轴方向 | 始终生效 | space-between, center, flex-end |
| `align-self` | 单个项目（覆盖 align-items） | 始终生效 | auto, stretch, center |

### 圣杯 / 双飞翼布局（Flex 实现）

圣杯与双飞翼均实现**三栏布局**（左右固定、中间自适应 + 优先渲染）。传统浮动实现需要负 margin 和相对定位，用 Flex 可以大幅简化：容器 `display: flex`，中间栏 `flex: 1` 且 DOM 顺序居中，左右侧边栏固定宽度即可。

```html
<!-- 圣杯 / 双飞翼 — Flex 简化版 -->
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
.holy-content { flex: 1; order: 2; }         /* 中间自适应，视觉居中 */
.holy-left    { flex: 0 0 200px; order: 1; } /* 左侧固定 */
.holy-right   { flex: 0 0 300px; order: 3; } /* 右侧固定 */
</style>
```

```
圣杯 vs 双飞翼（Flex 实现对比）：
              圣杯（Flex 版）           双飞翼（Flex 版）
核心思路       order 控制视觉顺序        main 内部再嵌套一层包裹
中间栏         flex: 1                  flex: 1 + 内部 margin/padding
额外 DOM       无需额外包裹             中间栏内部多一个 div
实现复杂度    order 即可               需要嵌套元素
推荐度        ★★★★★（更简单）          ★★★（历史遗留方案）
```

## Grid 布局深入 ⭐⭐

### grid-template-areas 命名布局

`grid-template-areas` 使用 **ASCII 可视化语法**定义网格区域，将布局意图直接映射到代码上。每个字符串代表一行，引号内用空格分隔的标识符代表列。用 `.` 表示空单元格。配合子元素的 `grid-area` 属性，无需计算行列索引即可完成布局，极大提升可读性和可维护性。

```css
/* 经典页面布局：header / sidebar / content / footer */
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

/* 响应式：窄屏改为单列 */
@media (max-width: 768px) {
  .page {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "content"
      "sidebar"
      "footer";
  }
}
```

### auto-fill vs auto-fit

两者都配合 `repeat()` 和 `minmax()` 自动生成尽可能多的列轨道，区别在于**空轨道处理**：`auto-fill` 保留所有可容纳的空轨道（即使没有足够项目填充），布局中会留下空白列；`auto-fit` 将空轨道折叠为 0，已有项目会拉伸填满剩余空间。记忆口诀：fill = 填满轨道数（留空白），fit = 填满容器宽度（项目撑开）。

```css
/* auto-fill：保留空列轨道，末尾可能有空白 */
.grid-fill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* auto-fit：折叠空轨道，已有项目拉伸填满 */
.grid-fit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

| 特性 | auto-fill | auto-fit |
|------|-----------|----------|
| 空轨道处理 | 保留（占位但不显示） | 折叠为 0（项目拉伸） |
| 项目数 < 列数 | 末尾留白 | 项目拉伸填满 |
| 项目数 ≥ 列数 | 行为一致 | 行为一致 |
| 典型场景 | 固定卡片的网格列表 | 响应式导航/标签栏 |

### Grid vs Flex 选型表

| 维度 | Grid | Flex |
|------|------|------|
| 布局方向 | **二维**（同时控制行列） | **一维**（主轴 + 可换行） |
| 控制粒度 | 单元格级别精确放置 | 项目级别弹性伸缩 |
| 重叠能力 | 天然支持（同一网格单元多元素） | 需借助负 margin / absolute |
| 间距控制 | `gap` 行列统一 / 分别设置 | `gap` 仅项目间 |
| 对齐方式 | `place-items` / `place-content` | `justify-content` / `align-items` |
| 适用场景 | 页面整体布局、仪表盘、画廊 | 导航栏、工具栏、卡片列表 |
| 学习曲线 | 陡峭（属性多、概念多） | 平缓（主轴 + 交叉轴） |

```
选型口诀：
一维排列用 Flex（导航、操作栏、标签流）
二维对齐用 Grid（页面骨架、表单布局、卡片网格）
两者可嵌套使用——外层 Grid 定骨架，内层 Flex 排细节
```

## CSS 动画与阴影 ⭐⭐

### transition vs animation 对比

`transition` 需要**触发器**（如 hover、class 变更）才能执行，仅描述属性从状态 A → 状态 B 的平滑过渡，无法自动播放或循环。`animation` 通过 `@keyframes` 定义**任意数量的关键帧**，可自动播放、循环、暂停、反向，适用于入场动画、加载动画等复杂场景。简言之：transition 是"被动过渡"，animation 是"主动动画"。

| 维度 | transition | animation |
|------|-----------|-----------|
| 触发方式 | 必须状态改变（hover / class 切换） | 自动播放 / 延迟播放 |
| 关键帧 | 只有起点和终点 | 任意数量关键帧（0% ~ 100%） |
| 循环 | 不支持 | `animation-iteration-count: infinite` |
| 反向 | 状态恢复时自动反向 | `animation-direction: alternate` |
| 暂停 | 不支持（只在触发时运行） | `animation-play-state: paused` |
| 典型场景 | hover 变色、展开收起 | 骨架屏闪烁、旋转加载、入场动画 |
| 性能 | 仅触发属性变更时重绘 | 持续运行消耗 GPU |

### @keyframes 与 animation 属性

`@keyframes` 定义动画的**关键帧序列**，用百分比（或 `from` / `to`）指定每个阶段的状态。`animation` 是简写属性，涵盖 8 个子属性：`name`、`duration`、`timing-function`、`delay`、`iteration-count`、`direction`、`fill-mode`、`play-state`。其中 `animation-fill-mode` 最易被忽略：`forwards` 让动画结束后保持最后一帧状态，`backwards` 在延迟期间就应用第一帧样式，`both` 同时生效。

```css
/* 定义关键帧 */
@keyframes slideIn {
  0%   { opacity: 0; transform: translateY(-20px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}

/* 使用动画 */
.card {
  animation: slideIn 0.3s ease-out both;
  /* 等价于分别设置：
     animation-name: slideIn;
     animation-duration: 0.3s;
     animation-timing-function: ease-out;
     animation-fill-mode: both; */
}

.loading-dot {
  animation: pulse 1.2s ease-in-out infinite;
}

/* 暂停动画（hover 时） */
.loading-dot:hover {
  animation-play-state: paused;
}
```

### box-shadow vs drop-shadow 差异

`box-shadow` 是 CSS 属性，沿元素的**盒模型边框**投射阴影（矩形），支持内阴影（`inset`）、多阴影叠加。`drop-shadow()` 是 CSS `filter` 函数，沿元素的**实际可见轮廓**（含透明区域）投射阴影，会跟随 border-radius 裁剪、支持 PNG 镂空图形和 SVG 的透明轮廓。核心差异：box-shadow 看盒子，drop-shadow 看像素。

```css
/* box-shadow：沿矩形盒模型 */
.card {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);      /* 外阴影 */
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);  /* 内阴影 */
  box-shadow:
    0 2px 4px rgba(0,0,0,0.1),
    0 8px 16px rgba(0,0,0,0.1);                 /* 多重阴影 */
}

/* drop-shadow：沿可见轮廓（适合 PNG 图标） */
.icon {
  filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.3));
}

/* 三角形箭头 — 只有 drop-shadow 能正确处理 */
.arrow {
  width: 0; height: 0;
  border: 20px solid transparent;
  border-bottom-color: #333;
  filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));
  /* box-shadow 会按 0x0 矩形渲染，完全错误 */
}
```

| 特性 | box-shadow | drop-shadow() |
|------|-----------|---------------|
| 作用依据 | 盒模型边界 | 像素轮廓（含透明通道） |
| 内阴影 | ✅ `inset` | ❌ 不支持 |
| 多重阴影 | ✅ 逗号分隔多个 | ✅ 多个 filter 叠加 |
| 性能 | GPU 加速，开销小 | 软件渲染，开销较大 |
| border-radius | 自动跟随 | 自动跟随 |
| PNG/SVG 透明区域 | 忽略（只投射矩形） | 精确跟随轮廓 |
| Spread（扩散半径） | ✅ 第四个参数 | ❌ 不支持 |
| 适用场景 | 卡片、按钮、弹窗 | PNG 图标、气泡箭头、镂空图形 |

### text-shadow 用法

`text-shadow` 为文本添加阴影，语法为 `offset-x offset-y blur-radius color`。与 `box-shadow` 不同，它不支持 `inset` 和 spread 扩散半径，但天然支持多阴影叠加（逗号分隔），可创造发光字、浮雕、描边等效果。注意：模糊半径越大性能开销越大，尽量避免在大量文本上使用大模糊值。

```css
/* 基本用法 */
.title   { text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }

/* 发光效果 */
.glow    { text-shadow: 0 0 10px #0ff, 0 0 20px #0ff, 0 0 30px #0ff; }

/* 浮雕效果（亮暗双阴影） */
.emboss  { text-shadow: -1px -1px 0 rgba(255,255,255,0.5), 1px 1px 0 rgba(0,0,0,0.3); }

/* 文字描边（四方向无模糊） */
.stroke  {
  text-shadow:
    -1px -1px 0 #000, 1px -1px 0 #000,
    -1px  1px 0 #000, 1px  1px 0 #000;
}
```

## Tailwind CSS vs UnoCSS ⭐⭐

### 核心对比

| 维度 | Tailwind CSS | UnoCSS |
|------|-------------|--------|
| 实现方式 | PostCSS 插件（扫描源码生成 CSS） | 原子化引擎（按需生成，无解析阶段） |
| 预设体系 | 完整的默认预设（颜色、间距、断点） | 完全可定制，预设可选 |
| 生成模式 | JIT（Just-In-Time，v3 默认） | 默认按需，无 JIT 编译步骤 |
| 构建速度 | 中等（PostCSS AST 解析） | 极快（正则匹配 + 按需规则注入） |
| 生态规模 | 庞大的社区、插件、组件库（Headless UI 等） | 更轻量，Vite 生态深度集成 |
| 配置方式 | `tailwind.config.js` | `uno.config.ts`（规则可编程定义） |
| 动态规则 | 有限（需 safelist 或完整类名） | 天然支持正则规则（如 `m-{float}`） |
| 包体积 | 开发时较大，生产 tree-shake | 运行时零开销，仅生成用到的 CSS |

```ts
// uno.config.ts — UnoCSS 可编程规则示例
import { defineConfig } from 'unocss'

export default defineConfig({
  // 用正则定义动态规则：m-1 → margin: 0.25rem
  rules: [
    [/^m-(\d+)$/, ([, d]) => ({ margin: `${Number(d) * 0.25}rem` })],
    [/^p-(\d+)$/, ([, d]) => ({ padding: `${Number(d) * 0.25}rem` })],
  ],
  // 快捷方式：组合多个原子类
  shortcuts: {
    'btn': 'px-4 py-2 rounded-lg font-medium transition-colors',
    'btn-primary': 'btn bg-blue-500 text-white hover:bg-blue-600',
  },
  // 主题定制
  theme: {
    colors: {
      primary: '#3eaf7c',
      brand: { 50: '#f0fdf4', 500: '#22c55e' }
    }
  }
})
```

```html
<!-- Tailwind CSS 写法 -->
<button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
  Click
</button>

<!-- UnoCSS（语法兼容 Tailwind，也可用 shortcuts） -->
<button class="btn-primary">
  Click
</button>
```

### 原子化 CSS 优缺点

| 维度 | 优点 | 缺点 |
|------|------|------|
| 可维护性 | 样式即类名，所见即所得，无需在文件间跳转 | 长列表类名降低 HTML 可读性（类名爆炸） |
| 一致性 | 强制使用设计令牌，杜绝随意取色/取间距 | 偏离预设值时需扩展 theme，有学习成本 |
| 按需生成 | 只产出用到的 CSS，天然 tree-shake | 动态拼接类名时可能遗漏（需 safelist） |
| 全局样式 | 重置 + 设计令牌统一注入 | 覆盖第三方组件样式需 `@layer` 或 `important` |
| 自定义 theme | Tailwind `theme.extend` / UnoCSS `theme` 配置 | 非标准值时需跳出原子体系写自定义 CSS |
| 团队协作 | 类名语义清晰，新人快速上手 | 过度使用 `@apply` 可能退化为传统 CSS |
| 性能 | 生产包极小（通常 < 10KB gzip） | 开发时 Tailwind 完整包较大，UnoCSS 更轻 |

```
选型建议：
• 已有 Tailwind 项目 / 团队 → 继续使用，生态成熟
• 新 Vite 项目追求极致性能 → UnoCSS（默认按需，启动更快）
• 需要大量动态规则（如 m-{n}）→ UnoCSS 正则规则更灵活
• 需要现成组件库生态 → Tailwind（Headless UI、Radix、Flowbite）
• 两者可共存 — UnoCSS 提供了 Tailwind 兼容预设
```

## CSS 工程化要点速查 ⭐⭐

### 关键概念一句话总结

| 概念 | 一句话 |
|------|--------|
| `flex: 1` | `flex-grow: 1; flex-shrink: 1; flex-basis: 0%` — 等分剩余空间 |
| `align-content` | 多行弹性/网格容器中行与行之间的分布，单行无效 |
| `auto-fit` | 折叠空轨道，项目拉伸填满；`auto-fill` 保留空轨道 |
| `grid-template-areas` | ASCII 可视化布局，响应式只需改 areas 字符串 |
| `transition` | 被动过渡 A→B，需触发器；`animation` 主动动画，可循环 |
| `drop-shadow` | 跟像素轮廓走（PNG 可用）；`box-shadow` 跟盒模型走 |
| `text-shadow` | 不支持 inset/spread，天然支持多阴影叠加 |
| `animation-fill-mode: both` | 延迟期间用第一帧 + 结束后保持最后一帧 |
| UnoCSS 核心优势 | 正则规则 + 按需默认 + 零运行时 + Vite 深度集成 |

---

*本笔记持续更新，建议配合 MDN 文档和实际项目练习加深理解。*
