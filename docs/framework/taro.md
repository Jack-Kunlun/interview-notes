---
title: Taro 跨端开发
description: Taro 3 架构原理、跨端适配策略、样式方案与性能优化
---

# Taro 跨端开发

Taro 是京东开源的跨端框架，Taro 3 采用**运行时方案**——在小程序逻辑层模拟 DOM/BOM API，让 React/Vue 的 Reconciler 直接运行，开发体验接近 H5。

## 一、架构原理

### 1.1 Taro 1/2 vs Taro 3

| 维度 | Taro 1/2（编译时） | Taro 3（运行时） |
|---|---|---|
| 原理 | AST 转换 JSX → WXML | 模拟 DOM，Reconciler 直出 |
| 语法限制 | 严格（不支持动态标签、HOC 受限） | 宽松（接近 H5） |
| 性能 | 接近原生（静态模板） | 有 setData 桥接开销 |
| 框架支持 | 仅 React | React / Vue 3 / Vue 2 |

### 1.2 Taro 3 适配层架构

```
React/Vue 组件树
  → Reconciler（React Reconciler / Vue Renderer）
    → Taro DOM（TaroElement / TaroText / TaroEvent）
      → 小程序 setData 更新视图层
```

核心模块：`@tarojs/runtime`（DOM/BOM 模拟）、`@tarojs/taro-loader`（Webpack 桥接）、`@tarojs/react`（React 自定义 Renderer）。每个框架只需实现适配层即可接入——Taro 3 因此能插件式支持多框架。

```tsx
// TaroElement 简化结构
class TaroElement {
  tagName: string
  props: Record<string, any>
  children: TaroElement[]

  setAttribute(name: string, value: any) {
    this.props[name] = value
    this.enqueueUpdate()  // 批量合并，最终调 setData
  }
}
```

> Taro 3 比原生小程序慢在哪？多了一层 Taro DOM 适配 + setData 序列化开销。每次更新都要把虚拟 DOM diff 结果序列化为 setData 数据路径，再跨线程传到视图层。大列表场景不用虚拟列表时可能慢 3-5 倍。

## 二、跨端适配

### 2.1 条件编译：process.env.TARO_ENV

Taro 使用环境变量 + Tree Shaking 实现条件编译，编译时 webpack 常量折叠剔除不可达分支——用标准 JS 语法，无需学自定义指令。

```tsx
// 不同平台的 API 调用
if (process.env.TARO_ENV === 'weapp') {
  // 仅微信小程序编译进产物
  Taro.getUserProfile({ desc: '用于展示昵称' })
} else if (process.env.TARO_ENV === 'h5') {
  // 仅 H5 编译进产物
  navigator.geolocation.getCurrentPosition(...)
}
```

::: danger 常见坑
不要赋值给变量再 switch：`const env = process.env.TARO_ENV; switch(env) {...}`——webpack 常量折叠对间接引用不生效，所有分支都会打进产物。始终用 `if (process.env.TARO_ENV === 'xxx')` 原值直接比较。
:::

### 2.2 运行时判断：Taro.getEnv()

```tsx
import Taro from '@tarojs/taro'

if (Taro.getEnv() === Taro.General.Env.WEAPP) {
  wx.getLocation({ type: 'gcj02' })
}
```

### 2.3 三类差异处理

| 差异类型 | 方案 | 关键 API |
|---|---|---|
| 样式 | CSS Variables、平台样式文件覆盖、rpx 自动转换 | `designWidth` |
| API | Taro 统一 API + 条件编译降级 | `Taro.getSystemInfo` 等 |
| 路由 | Taro 路由 API 统一多端 | `Taro.navigateTo` / `redirectTo` |

## 三、样式方案

### 3.1 推荐：CSS Modules + SCSS

Taro 浏览器端自动转换：

| 方案 | 配置 | 适用场景 |
|---|---|---|
| SCSS / Sass | `@tarojs/plugin-sass` | 变量、混入、嵌套 |
| CSS Modules | `.module.scss` 自动启用 | 组件级隔离 |
| Tailwind CSS | `weapp-tailwindcss` 插件 | 原子化 CSS |

### 3.2 尺寸单位：px → rpx 自动转换

Taro 默认 750 设计稿，编译时自动 `px → rpx`：

```js
// config/index.js
const config = {
  designWidth: 375,  // 375 稿：16px → 32rpx
  deviceRatio: { 375: 2 / 1 }
}
```

::: tip 1px 边框问题
`border: 1px` 会转为 2rpx，在 3x 屏上显粗。拼写 `1PX`（大写）——Taro 约定大写不转换，保持 1 物理像素。
:::

## 四、性能优化与面试要点

### 4.1 优化策略

| 策略 | 原理 | 收益 |
|---|---|---|
| **VirtualList** | 仅渲染可视区节点 | 长列表性能 ↑10-100 倍 |
| **React.memo + 精确比较** | 跳过子树 diff | 减少 30-70% 无意义渲染 |
| **CustomWrapper** | 绕过 Taro DOM，直用原生组件 | 高频交互接近原生 |
| **图片懒加载 + WebP** | 减少首屏请求 | 首屏 ↑20-50% |

```tsx
// VirtualList 虚拟列表
import { VirtualList } from '@tarojs/components'

<VirtualList
  height={600}
  itemData={data}
  itemCount={data.length}
  itemSize={80}
/>
```

### 4.2 组件库选择

| 组件库 | 框架 | 跨端覆盖 |
|---|---|---|
| **NutUI (React)** | React Hooks | 微信 / H5 |
| **NutUI (Vue 3)** | Vue 3 | 微信 / H5 |
| Taro UI | React（Class） | 微信/H5/支付宝/百度 |
| tdesign-miniprogram | 原生小程序 | 微信/QQ（配合 CustomWrapper） |

NutUI 不支持的端用条件编译降级为原生组件。

### 4.3 面试高频问答

**Q1: Taro 3 为什么比原生小程序慢？**

Taro DOM 运行在逻辑层（JS 线程），每次更新都需 setData 序列化 → 跨线程传输 → 视图层反序列化。原生小程序编译时已是静态模板，无桥接开销。差距在大列表场景最明显（3-5 倍），用 VirtualList 后可缩至 20-30%。

**Q2: 条件编译和运行时判断的取舍？**

条件编译（`process.env.TARO_ENV`）适合底层 API 差异——编译期剔除，零运行时开销但可读性差。运行时判断（`Taro.getEnv()`）适合业务微调——代码直观但所有分支都打进产物，包体积变大。

**Q3: Taro 线上白屏怎么排查？**

分三步：

**Q4: Taro ScrollView 常见坑？**

必须显式指定高度（`height: '100vh'` 或计算值），小程序 `<scroll-view>` 的 `flex: 1` 部分版本不生效，H5 端 `overflow: auto` 却能自动撑开——同段代码两端表现不同。修复：`<ScrollView style={ { height: '...' } }>`，H5 用条件编译单独设 `height: auto`。
