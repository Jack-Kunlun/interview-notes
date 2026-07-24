---
title: Taro 跨端开发
description: Taro 3 架构原理、跨端适配策略、样式方案、性能优化与面试高频考点
---

# Taro 跨端开发

## Taro 3 架构 ⭐⭐⭐

### 编译时 vs 运行时对比

Taro 1/2 采用**编译时**方案，在构建阶段将 React/Vue 代码直接编译为小程序模板（WXML/WXSS），缺点是语法限制多、JSX 动态能力受限。Taro 3 转向**运行时**方案，通过在小程序端模拟一套轻量 DOM/BOM API，让 React/Vue 的 reconciler 直接运行在小程序逻辑层，大幅提升框架兼容性。

| 维度 | Taro 1/2（编译时） | Taro 3（运行时） |
|---|---|---|
| 原理 | 编译期 AST 转换，JSX → WXML | 运行时模拟 DOM，React Reconciler 直出 |
| 语法限制 | 严格（不支持动态标签、高阶组件受限） | 宽松（接近 H5 开发体验） |
| 性能 | 接近原生（静态模板） | 有桥接开销（setData 瓶颈） |
| 框架支持 | 仅 React | React / Vue 3 / Vue 2 |
| 跨框架复用 | 差（与框架强绑定） | 好（适配层解耦框架与小程序） |

### Taro 3 适配层架构：React/Vue → Taro DOM → 小程序

Taro 3 的核心设计是在小程序逻辑层实现了一套 **Taro DOM**（轻量级虚拟 DOM + 事件系统），将 React/Vue 的渲染指令翻译为小程序 `setData` 调用。整个链路为：

```
React/Vue 组件树
  → 对应框架的 Reconciler（React Reconciler / Vue Renderer）
    → Taro DOM（TaroElement / TaroText / TaroEvent）
      → 小程序 setData 更新视图层
```

关键模块包括：**@tarojs/runtime**（DOM/BOM/Navigator 模拟）、**@tarojs/taro-loader**（Webpack 编译桥接）、**@tarojs/react**（React 自定义 Renderer）。这套架构让 Taro 能以插件形式支持新框架，理论上任何有自定义 Renderer 能力的框架都可接入。

```tsx
// Taro 3 运行时 DOM 节点的简化结构
class TaroElement {
  tagName: string
  props: Record<string, any>
  children: TaroElement[]
  parentNode: TaroElement | null

  // 属性修改触发 setData
  setAttribute(name: string, value: any) {
    this.props[name] = value
    this.enqueueUpdate()  // 批量合并更新，最终调 setData
  }
}
```

### Taro vs uni-app 对比表

两者均为国内主流跨端框架，但技术路线差异显著。Taro 与 React 生态深度绑定（也支持 Vue），运行时方案更接近 Web 标准；uni-app 使用编译时方案，在 Vue 生态和小程序性能上更具优势。

| 维度 | Taro 3 | uni-app |
|---|---|---|
| 技术路线 | 运行时（模拟 DOM） | 编译时（条件编译 + 模板编译） |
| 默认框架 | React（也支持 Vue 3/Vue 2） | Vue 3 / Vue 2 |
| React 支持 | ⭐⭐⭐ 一流（京东系主力） | ⭐ 较弱（仅部分版本支持） |
| 小程序性能 | 略低于原生（setData 开销） | 接近原生（编译期优化） |
| 跨端数量 | H5 / 微信 / 支付宝 / 百度 / 字节 / QQ / 快应用 | 更多（含 App、各小程序、快应用） |
| 社区生态 | React 生态 + Taro UI / NutUI | Vue 生态 + uni-ui / uView |
| DSL 支持 | JSX（React/Vue 统一用 JSX） | SFC 单文件组件（template/script/style） |
| 条件编译 | process.env.TARO_ENV + 环境变量 | #ifdef / #ifndef 编译指令 |

选择建议：**React 技术栈选 Taro**，**Vue 技术栈且重小程序选 uni-app**，需要 App 端（iOS/Android）优先选 uni-app（uni-app 对 App 端支持更成熟）。

### 💬 面试深度

**标准回答**：Taro 3 用适配层（Taro DOM）在小程序逻辑层模拟浏览器环境，让 React/Vue 的 Reconciler 直接跑在小程序运行时上。编译时负责把 JSX 转成小程序模板，运行时负责事件代理、DOM 操作转 setData 以及批量更新调度。架构核心就三层：框架层（React/Vue）→ 适配层（Taro DOM）→ 小程序原生层（setData / 模板渲染），每一层都可替换，所以 Taro 3 能轻松接入新框架。

**追问预判**：
- **"为什么 Taro 3 比原生小程序慢？"** → 多了一层 Taro DOM 适配 + setData 序列化开销。每次更新都要把虚拟 DOM diff 结果序列化为 setData 的数据路径，再跨线程传到视图层，原生小程序编译时就已经是静态模板，省去了这个桥接过程。大列表场景差距尤其明显，不用虚拟列表时可能慢 3-5 倍。
- **"Taro 1/2 为什么被淘汰？"** → 编译时方案语法限制太死——不支持动态标签、高阶组件受限、render props 不能用，React 很多高级特性直接废掉。Taro 3 的运行时方案让 React 开发体验跟 H5 几乎一致，还能以插件形式接入 Vue 3。

**源码在哪**：
- 运行时核心（DOM 模拟、事件系统）：`@tarojs/runtime` — 源码见 `packages/taro-runtime/src/dom/`、`packages/taro-runtime/src/event.ts`
- 编译桥接（Webpack loader）：`@tarojs/taro-loader` — 源码见 `packages/taro-loader/src/`
- React 自定义 Renderer：`@tarojs/react` — 源码见 `packages/taro-react/src/`

**踩过的坑**：以为 Taro 3 的 `<View>` 就跟 `<div>` 一样随便写，在列表循环里直接写 `onClick={() => handleClick(item)}` 没做 memo——每次父组件 render 都生成新回调引用，触发子组件全量 diff + setData。后果：100 条列表滚动帧率掉到 20fps 以下。修复：`handleClick` 用 `useCallback`，列表项组件用 `React.memo` 包一层并传精确的比较函数。

**项目选型**：为什么用 Taro 而不是 uni-app？团队是 React 技术栈，Taro 3 的适配层更贴近 Web 标准，React 开发体验几乎零迁移成本；uni-app 虽然小程序性能略好（编译时方案），但 React 支持弱、DSL 用 SFC 而非 JSX，团队切换成本高。如果项目需要 App 端（iOS/Android），则 uni-app 更成熟。

---

## 跨端适配 ⭐⭐⭐

### 平台判断：Taro.getEnv()

`Taro.getEnv()` 返回当前运行环境标识，可用于运行时动态判断平台，执行不同逻辑。返回值为 `Taro.General.Env` 枚举类型。

```tsx
import Taro from '@tarojs/taro'

// 平台枚举值
// WEB | WEAPP | SWAN | ALIPAY | TT | QQ | JD | QUICKAPP

const env = Taro.getEnv()

if (env === Taro.General.Env.WEAPP) {
  // 微信小程序专属逻辑：调用微信 API
  wx.getLocation({ type: 'gcj02' })
} else if (env === Taro.General.Env.WEB) {
  // H5 端使用浏览器 API
  navigator.geolocation.getCurrentPosition(() => {})
}
```

### 条件编译：process.env.TARO_ENV

Taro 使用 **环境变量** 方式实现条件编译，构建时编译器会读取 `process.env.TARO_ENV` 的值，结合 Tree Shaking 剔除不可达分支代码。这样做的好处是使用标准 JS 语法，无需学习自定义编译指令。

```tsx
// Taro 条件编译 — 使用环境变量 + 条件判断
// 构建时会根据 TARO_ENV 做 Dead Code Elimination

// 不同平台的 API 调用
if (process.env.TARO_ENV === 'weapp') {
  // 仅微信小程序编译进产物
  console.log('微信小程序环境')
} else if (process.env.TARO_ENV === 'h5') {
  // 仅 H5 编译进产物
  console.log('H5 环境')
} else if (process.env.TARO_ENV === 'alipay') {
  // 仅支付宝小程序编译进产物
  console.log('支付宝小程序环境')
}
```

```scss
// 样式文件中也支持条件编译（通过 JS 变量引入）
// 方式一：不同平台引入不同样式文件
// app.config.ts 中根据 TARO_ENV 动态加载

// 方式二：在 SCSS 中使用 JS 注入的环境变量做判断
// config/index.js
module.exports = {
  defineConstants: {
    'process.env.TARO_ENV': JSON.stringify(process.env.TARO_ENV)
  }
}
```

### 各端差异处理：样式 / API / 路由

跨端开发中最常见的三类差异。样式差异通过 **CSS Variables + 平台样式覆盖** 处理；API 差异通过 **Taro 统一 API** 抹平，不支持的 API 用条件编译降级；路由差异由 Taro 统一路由 API 遮蔽。

```tsx
// 1. 样式差异 — 平台级样式覆盖
// index.module.scss
.container {
  padding: 20rpx;
  // 小程序默认使用 rpx
}

// index.h5.module.scss（H5 专属，通过 webpack resolve 覆盖）
.container {
  padding: 10px;
  // H5 退回 px
}

// 2. API 差异 — Taro 统一 API + 条件编译降级
import Taro from '@tarojs/taro'

async function getUserInfo() {
  if (process.env.TARO_ENV === 'weapp') {
    // 微信小程序：button open-type="getUserInfo"
    const res = await Taro.getUserProfile({ desc: '用于展示昵称' })
    return res.userInfo
  }
  // 其他端通用处理
  return { nickName: '游客' }
}

// 3. 路由差异 — Taro 统一路由 API
// 跳转：所有端统一用 Taro.navigateTo
Taro.navigateTo({ url: '/pages/detail/index?id=1' })

// 小程序端：编译为 wx.navigateTo
// H5 端：编译为 history.pushState + 组件渲染
// 支付宝端：编译为 my.navigateTo
```

| 差异类型 | 处理方案 | 关键 API |
|---|---|---|
| 样式 | CSS Variables、平台样式文件覆盖、rpx 自动转换 | `designWidth` 配置 |
| API | Taro 统一 API + 条件编译降级 | `Taro.getSystemInfo` 等 |
| 路由 | Taro 路由 API 统一多端 | `Taro.navigateTo` / `Taro.redirectTo` |
| 组件 | 内置跨端组件代替 HTML 标签 | `View` / `Text` / `Image` / `ScrollView` |
| 原生能力 | 条件编译 + 各端原生 API 直接调用 | `wx.*` / `my.*` / `tt.*` |

### 💬 面试深度

**标准回答**：Taro 跨端适配分两层来做——编译时和运行时。编译时靠 `process.env.TARO_ENV` 这个环境变量，webpack 在构建阶段会把 `if (process.env.TARO_ENV === 'weapp')` 这种分支做常量折叠，不可达代码直接 Dead Code Elimination 干掉，最终产物里只有当前平台的代码。运行时用 `Taro.getEnv()` 动态判断，适合需要灵活处理的场景。样式、API、路由三类差异都提供了统一 API 来抹平，搞不定的时候还可以直接写原生 `wx.*` 做降级。

**追问预判**：
- **"条件编译和运行时判断各适合什么场景？"** → 条件编译适合平台底层差异大的代码（如调用原生 API），编译期直接剔除，零运行时开销但可读性差；运行时判断适合业务逻辑微调（如不同平台弹窗文案），代码直观但因所有分支代码都会打进产物，包体积会变大。
- **"Taro 的跨端方案覆盖不到的场景怎么办？"** → 三种方式兜底：① 用 `CustomWrapper` 嵌入原生小程序组件绕过 Taro DOM；② 在条件编译分支里直接调 `wx.*` / `my.*` 原生 API；③ 写 Taro 插件扩展编译流程。实际项目里常用①+②组合。

**源码在哪**：
- 平台判断实现：`@tarojs/taro` 的 `getEnv()` — 读取 webpack DefinePlugin 注入的 `process.env.TARO_ENV`
- 编译条件剔除：`@tarojs/taro-loader` — 源码见 `packages/taro-loader/src/`
- 路由适配：`@tarojs/router` — 源码见 `packages/taro-router/src/`

**踩过的坑**：把 `process.env.TARO_ENV` 赋值给变量再 `switch`，比如 `const env = process.env.TARO_ENV; switch(env) { case 'weapp': ... }`——webpack 的常量折叠对这种间接引用不生效，所有 case 分支代码都被打进 H5 产物。后果：H5 包体积多了 15KB 小程序专用代码，包含 `wx.getLocation` 等在 H5 运行时报错。修复：始终用 `if (process.env.TARO_ENV === 'xxx')` 的原值直接比较，让 webpack 正确做 Tree Shaking。

**项目选型**：Taro 的条件编译用标准 JS 语法，对比 uni-app 的 `#ifdef` 指令，好处是不用学自定义语法、IDE 支持好，坏处是深度嵌套时代码不如 uni-app 的区块指令直观——但实际业务中很少需要超过两层的平台分支。

---

## 样式方案 ⭐⭐

### Taro 支持的样式方案

Taro 内置了对多种 CSS 预处理方案和模块化方案的支持，在项目初始化时即可选择。建议中型以上项目使用 **CSS Modules + SCSS** 组合，避免全局样式污染；Tailwind 可通过 `weapp-tailwindcss` 插件在小程序端使用。

| 方案 | 配置方式 | 适用场景 |
|---|---|---|
| SCSS / Sass | `taro init` 时选择，或安装 `@tarojs/plugin-sass` | 变量、混入、嵌套 — 功能全面的预处理 |
| Less | 安装 `@tarojs/plugin-less` | 与 SCSS 类似，Ant Design 生态首选 |
| CSS Modules | 文件名 `.module.scss` 即可启用 | 组件级样式隔离，避免全局污染 |
| Tailwind CSS | 配合 `weapp-tailwindcss` 插件 | 原子化 CSS，H5 端良好，小程序需插件适配 |
| Stylus | 安装 `@tarojs/plugin-stylus` | 简洁语法偏好场景 |

```scss
// CSS Modules + SCSS 示例
// Button.module.scss
$primary: #1677ff;

.button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 40rpx;
  background: $primary;
  border-radius: 12rpx;
  color: #fff;
  font-size: 28rpx;

  &--disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  // 嵌套伪类
  &:active {
    background: darken($primary, 10%);
  }
}
```

```tsx
// 在组件中使用 CSS Modules
import styles from './Button.module.scss'

function Button({ disabled, children }) {
  return (
    <View className={`${styles.button} ${disabled ? styles['button--disabled'] : ''}`}>
      {children}
    </View>
  )
}
```

### 尺寸单位转换：px → rpx 自动转换

Taro 默认以 **750px** 为设计稿宽度，编译时自动将 px 转换为 rpx（小程序的响应式单位）。转换规则：`rpx = px * (750 / designWidth)`。设计师用 375px 稿时，设置 `designWidth: 375`，CSS 中写 16px 自动转为 32rpx。

```js
// config/index.js — 尺寸单位配置
const config = {
  // 设计稿宽度（默认 750）
  designWidth: 375,
  // 计算规则对象
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,           // 750 稿 1px = 1rpx
    828: 1.81 / 2,
    375: 2 / 1        // 375 稿 1px = 2rpx
  },
  // 不转换的 CSS 单位（保持原值）
  unit: {
    // 1px 不转换（常用于边框）
    transform: true   // 默认开启 px → rpx
  }
}
```

```scss
// 实际开发中的单位处理
.card {
  width: 343px;           // 375 稿 → 编译为 686rpx（343*2）
  height: 200px;          // → 400rpx
  border: 1px solid #eee; // 若配置 1px 不转，则保留 1px（物理像素边框）
  border-radius: 12px;    // → 24rpx
  font-size: 14px;        // → 28rpx
}
```

### 💬 面试深度

**标准回答**：Taro 推荐 CSS Modules + SCSS 做样式方案——CSS Modules 通过 `.module.scss` 文件名自动启用，实现组件级样式隔离，不用担心全局污染；SCSS 提供变量、混入、嵌套这些能力。尺寸单位上，Taro 默认以 750 为设计稿基准，编译时自动把 px 转成 rpx——rpx 是微信的自适应单位，以 iPhone 6 屏幕宽度 375px 对应 750rpx。如果设计师给的是 375 稿，把 `designWidth` 设成 375，16px 就自动变成 32rpx。

**追问预判**：
- **"小程序 1px 边框问题怎么解决？"** → Taro 配置里 `unit.transform` 默认所有 px 都转 rpx，`border: 1px` 会变成 2rpx，在 iPhone 上看起来偏粗。两种解法：① 用大写 `PX`——Taro 约定大写单位不转换，`border: 1PX solid #eee` 就是真实的 1 物理像素；② 通过 postcss 插件对 border 属性做排除。
- **"Tailwind CSS 能在 Taro 小程序端正常用吗？"** → 能，但要加 `weapp-tailwindcss` 插件做编译层适配。该插件会把 Tailwind 的 class 转成小程序能识别的样式，但部分属性如 `gap` 在老版本小程序基础库不兼容，需要用 `margin` 降级。

**源码在哪**：
- SCSS 编译插件：`@tarojs/plugin-sass` — 源码见 `packages/taro-plugin-sass/`
- px → rpx 转换逻辑：`@tarojs/taro-loader` 中的 CSS loader 链 — 源码见 `packages/taro-loader/src/css/`
- CSS Modules 支持：Taro 复用 webpack `css-loader` 的 modules 模式，通过文件名 `.module.` 后缀自动开启

**踩过的坑**：设置了 `designWidth: 375`，但边框统一写了 `border: 1px solid #eee`，编译后变成 2rpx，在 iPhone 上边框显得很粗，设计师说跟稿子差远了。根因是小程序下 2rpx 约等于 1 物理像素，在 3x 屏幕上就是 3 个物理像素，肉眼可见的粗。修复：全局搜索 `border.*1px` 统一改成 `1PX`（大写），Taro 不转换大写 PX，保证在所有屏幕上都是 1 物理像素。

**项目选型**：Taro 的样式方案比 uni-app 更贴近 Web 标准——CSS Modules + SCSS 跟传统 React 项目一模一样，前端上手成本几乎为零；uni-app 用 SFC 的 `<style scoped>` 通过属性选择器做隔离，样式穿透要用 `:deep()`，跟标准 Vue 一致但在小程序里有奇奇怪怪的兼容问题。

---

## 常见问题 & 面试题 ⭐⭐⭐

### 1. Taro 的渲染性能如何？为什么比原生小程序慢？

Taro 3 的运行时方案天然存在一层性能开销，核心瓶颈在小程序的 **setData 通信机制**。Taro DOM 运行在逻辑层（JS 线程），每次 DOM 更新都需要通过 `setData` 序列化数据、跨线程传输到视图层（渲染线程），而原生小程序模板编译方案在编译期就已确定静态结构，运行时不需额外桥接。

性能差距主要来自三个方面：

1. **setData 序列化开销**：Taro 需将虚拟 DOM diff 结果转为 setData 数据路径，大数据量时序列化耗时显著
2. **Taro DOM 的内存占用**：运行时需维护完整的虚拟 DOM 树，页面复杂度上升时内存线性增长
3. **事件系统代理**：所有事件先由 Taro 事件系统捕获、合成、再分发，比原生多一层间接调用

```tsx
// 性能瓶颈示例：大列表更新
function LargeList({ items }: { items: Item[] }) {
  return (
    <View>
      {items.map(item => (
        // 每个 item 都是 TaroElement 实例，占用 JS 线程内存
        // 更新时 diff 整个数组，setData 传输全部数据
        <View key={item.id}>
          <Text>{item.name}</Text>
          <Text>{item.desc}</Text>
        </View>
      ))}
    </View>
  )
}
// 原生小程序等效写法：<block wx:for="{{items}}" /> 仅传输数据本身
```

### 2. 如何做 Taro 项目的性能优化？

性能优化的核心思路是**减少 setData 调用频率和数据量、降低虚拟 DOM diff 范围、利用小程序原生能力绕过 Taro 桥接层**。

```tsx
// ① 使用 VirtualList 虚拟列表 — 仅渲染可视区域节点
import { VirtualList } from '@tarojs/components'

function OptimizedList() {
  const [data] = useState(generateLargeData(10000))

  return (
    <VirtualList
      height={600}        // 可视区域高度
      itemData={data}
      itemCount={data.length}
      itemSize={80}       // 每个 item 高度
      // 只有约 10 个节点在 DOM 中，setData 极轻量
    >
      {/* ... */}
    </VirtualList>
  )
}

// ② 精细化 shouldComponentUpdate / React.memo — 避免无意义 diff
const ExpensiveItem = React.memo(
  ({ title, price }: ItemProps) => (
    <View>
      <Text>{title}</Text>
      <Text>¥{price}</Text>
    </View>
  ),
  (prev, next) => prev.title === next.title && prev.price === next.price
)

// ③ 使用 CustomWrapper 绕过 Taro DOM，直接使用原生组件
// 适合高频交互区域（如拖拽、动画）
import { CustomWrapper } from '@tarojs/components'

<CustomWrapper>
  {/* 内部直接操作原生小程序节点，不走 Taro DOM */}
  <movable-view direction="all">
    <view>可拖拽区域</view>
  </movable-view>
</CustomWrapper>
```

| 优化策略 | 原理 | 收益 |
|---|---|---|
| VirtualList 虚拟列表 | 仅渲染可视区节点，减少 setData 量 | 长列表性能提升 10-100 倍 |
| React.memo + 精确比较函数 | 跳过子树 diff，减少 JS 执行 | 减少 30-70% 无意义渲染 |
| CustomWrapper 原生降级 | 绕过 Taro DOM，直接操作原生节点 | 高频交互（拖拽/动画）接近原生 |
| 图片懒加载 + WebP 格式 | 减少首屏网络请求和内存占用 | 首屏速度提升 20-50% |
| 拆分组件 + 局部 setData | 缩小更新粒度 | 避免全页数据序列化 |
| preload 数据预取 | 页面跳转前异步拉取数据 | 消除跳转白屏 |

### 3. Taro 如何处理组件库兼容？

Taro 生态中主要有两大 UI 库：**Taro UI**（官方、仅 React）和 **NutUI**（京东开源、支持 React + Vue 3）。选择组件库需同时考虑框架匹配、跨端覆盖度、以及未覆盖端的手动降级策略。

```tsx
// NutUI — 京东官方推荐，支持 Taro React / Vue 3，覆盖微信 + H5
// 安装: npm i @nutui/nutui-react-taro
import { Button, Dialog, Input, Toast } from '@nutui/nutui-react-taro'

function LoginForm() {
  const showToast = () => Toast.show('登录成功')

  return (
    <View>
      <Input placeholder="请输入手机号" />
      <Button type="primary" block onClick={showToast}>
        登录
      </Button>
      <Dialog id="my-dialog" />
    </View>
  )
}

// 若 NutUI 某端不支持（如支付宝小程序），条件编译降级为自定义实现：
function DatePicker({ onChange }: DatePickerProps) {
  if (process.env.TARO_ENV === 'alipay') {
    // NutUI 暂不支持支付宝，降级为原生 picker
    return (
      <Picker mode="date" onChange={e => onChange(e.detail.value)}>
        <View>选择日期</View>
      </Picker>
    )
  }

  // 微信 / H5 用 NutUI DatePicker
  return <NutDatePicker onConfirm={onChange} />
}
```

| 组件库 | 框架 | 跨端覆盖 | 特点 |
|---|---|---|---|
| Taro UI | React（Class 组件） | 微信 / H5 / 支付宝 / 百度 | Taro 官方出品，风格统一，更新较慢 |
| NutUI (React) | React（Hooks） | 微信 / H5（持续扩展中） | 京东出品，设计精美，更新活跃 |
| NutUI (Vue 3) | Vue 3 | 微信 / H5（持续扩展中） | 同上，Vue 3 技术栈首选 |
| tdesign-miniprogram | 原生小程序 | 微信 / QQ | 腾讯出品，可配合 CustomWrapper 嵌入 Taro |

### 4. 跨三端计数器组件实战

下面是一个在**微信小程序 + H5 + 支付宝小程序**三端完整运行的计数器组件，涵盖条件编译、样式适配、平台 API 差异化处理。

```tsx
// Counter/index.tsx
import { useState, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'

interface CounterProps {
  initial?: number
  max?: number
}

export default function Counter({ initial = 0, max = 99 }: CounterProps) {
  const [count, setCount] = useState(initial)

  const increment = useCallback(() => {
    setCount(c => {
      if (c >= max) {
        Taro.showToast({ title: `已达上限 ${max}`, icon: 'none' })
        return c
      }
      return c + 1
    })
  }, [max])

  const decrement = useCallback(() => {
    setCount(c => Math.max(0, c - 1))
  }, [])

  const reset = useCallback(() => {
    // 不同端的确认弹窗
    if (process.env.TARO_ENV === 'weapp') {
      // 微信小程序专属：使用 wx.showModal
      Taro.showModal({
        title: '重置确认',
        content: '确定要重置计数器吗？',
        success: (res) => res.confirm && setCount(initial)
      })
    } else {
      // H5 / 支付宝等端
      Taro.showModal({
        title: '确认重置',
        content: '计数器将归零',
        success: (res) => res.confirm && setCount(initial)
      })
    }
  }, [initial])

  // 分享功能 — 各端差异化
  const handleShare = useCallback(() => {
    if (process.env.TARO_ENV === 'weapp') {
      // 微信：调用分享面板
      Taro.showShareMenu({ withShareTicket: true })
    } else if (process.env.TARO_ENV === 'h5') {
      // H5：调用 Web Share API 或复制链接
      navigator.clipboard?.writeText(`当前计数: ${count}`)
      Taro.showToast({ title: '已复制到剪贴板', icon: 'success' })
    } else {
      Taro.showToast({ title: '当前平台不支持分享', icon: 'none' })
    }
  }, [count])

  return (
    <View className={styles.counter}>
      <Text className={styles.title}>跨端计数器</Text>

      <View className={styles.display}>
        <Text className={styles.number}>{count}</Text>
        {count >= max && (
          <Text className={styles.hint}>已满</Text>
        )}
      </View>

      <View className={styles.actions}>
        <Button className={styles.btn} onClick={decrement} disabled={count === 0}>
          - 减少
        </Button>
        <Button className={styles.btn} type="primary" onClick={increment}>
          + 增加
        </Button>
      </View>

      <View className={styles.footer}>
        <Button className={styles.btnReset} onClick={reset}>
          重置
        </Button>
        <Button className={styles.btnShare} onClick={handleShare}>
          分享计数
        </Button>
      </View>

      {/* 平台标识 — 调试用 */}
      <Text className={styles.envTag}>
        当前环境：{process.env.TARO_ENV}
      </Text>
    </View>
  )
}
```

```scss
// Counter/index.module.scss
.counter {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.title {
  font-size: 36rpx;
  color: #fff;
  margin-bottom: 60rpx;
  font-weight: bold;
}

.display {
  width: 200rpx;
  height: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  margin-bottom: 60rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
}

.number {
  font-size: 72rpx;
  color: #fff;
  font-weight: bold;
  line-height: 1;
}

.hint {
  font-size: 20rpx;
  color: #ffcc00;
  margin-top: 8rpx;
}

.actions {
  display: flex;
  gap: 30rpx;
  margin-bottom: 40rpx;
}

.btn {
  padding: 20rpx 50rpx !important;
  font-size: 28rpx;
  border-radius: 40rpx;
}

.footer {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.btnReset {
  padding: 16rpx 40rpx !important;
  font-size: 26rpx;
  background: rgba(255,255,255,0.15) !important;
  color: #fff !important;
  border-radius: 30rpx;
}

.btnShare {
  padding: 16rpx 40rpx !important;
  font-size: 26rpx;
  background: rgba(255,255,255,0.25) !important;
  color: #fff !important;
  border-radius: 30rpx;
}

.envTag {
  position: absolute;
  bottom: 40rpx;
  font-size: 22rpx;
  color: rgba(255,255,255,0.5);
}
```

该组件在三个平台的行为：
- **微信小程序**：使用 `wx.showModal` + `wx.showShareMenu` 原生 API
- **H5**：使用 Web Share / Clipboard API，样式退回到 px 渲染
- **支付宝小程序**：Taro 通用 API 保持兼容，弹窗文案略有不同

### 💬 面试深度

**标准回答**：Taro 项目常见问题集中在四块——性能（setData 序列化开销比原生大）、组件库兼容（NutUI / Taro UI 各端覆盖不全）、样式坑（1px 边框、rpx 转换）、以及调试难（小程序端 DevTools 受限）。核心优化就一条思路：减少 setData 的调用频率和数据量。具体手段是 VirtualList 虚拟列表砍节点数、React.memo 控制 diff 范围、CustomWrapper 绕过 Taro DOM 直接走原生渲染。线上排查主要靠 vConsole + 小程序性能面板看 setData 瓶颈。

**追问预判**：
- **"大列表场景 Taro 和原生差距到底多大？"** → 不用虚拟列表时，Taro 比原生慢 3-5 倍——每个 item 都是 TaroElement 实例占用 JS 内存，再加 diff 计算和 setData 序列化。用了 VirtualList 后差距缩小到 20-30%，只剩 setData 序列化本身的差异，视觉上基本感知不到。
- **"Taro 线上白屏/卡死怎么快速定位？"** → 三步走：① 看是不是 setData 过大——小程序开发工具性能面板里 setData 单次超过 256KB 就会警告；② 看是不是死循环渲染——React DevTools 或 `why-did-you-render` 抓重复渲染；③ 看是不是内存泄漏——`Taro.getLogManager()` 捞日志，配合真机 PerfDog 看内存曲线。

**源码在哪**：
- VirtualList 实现：`@tarojs/components` — 底层调用小程序 `<recycle-view>` 原生组件
- CustomWrapper 实现：`@tarojs/components` — 编译为小程序 `<custom-wrapper>` 标签
- 事件代理 + setData 批量调度：`@tarojs/runtime` — 源码见 `packages/taro-runtime/src/event.ts`、`packages/taro-runtime/src/next-tick.ts`

**踩过的坑**：Taro 的 `<ScrollView>` 没设 `height: 100%`（或具体高度值），内容撑不开导致小程序端完全不可滚动。根因是小程序 ScrollView 必须显式指定高度——CSS 的 `flex: 1` 在部分小程序基础库版本上不生效，而 H5 的 `overflow: auto` 会自动撑开。后果：小程序端整页卡死，用户反馈"页面坏了"。修复：`<ScrollView style={{ height: '100vh' }}>` 或 `calc(100vh - 导航栏高度)`，H5 端通过条件编译设 `height: auto`，用 `overflow-y: auto` 兜底。

**项目选型**：Taro 更适合 React 技术栈团队做小程序+H5 双端——最大优势是"写一次 Web 标准代码，到处运行"，React 知识零迁移成本复用；uni-app 更适合 Vue 技术栈、需要 App 端或对小程序性能有极致要求的场景——编译时方案在小程序端性能接近原生。如果团队 React 为主且不做 App，选 Taro 3 是性价比最高的选择。
