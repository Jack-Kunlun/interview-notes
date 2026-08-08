---
title: 跨端开发概览
description: 跨端框架生态地图、架构对比、选型决策，以及 CSS 单位、自适应、1px 边框、安全区域、调试等移动端适配基础
---

# 跨端开发概览

跨端开发的目标是一套代码在多个平台（微信小程序、H5、App、支付宝小程序等）运行。本章从框架选型到移动端适配基础，覆盖跨端开发全链路。各框架专题见对应文档。

## 生态地图

```
                  ┌─────────────────────────────────────┐
                  │          跨端开发框架选型              │
                  └─────────────────────────────────────┘
                                    │
        ┌───────────────┬───────────┴───────────┬───────────────┐
        ▼               ▼                       ▼               ▼
   ┌─────────┐    ┌─────────┐            ┌─────────┐     ┌─────────┐
   │ uni-app │    │  Taro   │            │   RN    │     │ Flutter │
   │  Vue 栈  │    │ React栈 │            │ 原生映射 │     │ 自绘引擎 │
   └─────────┘    └─────────┘            └─────────┘     └─────────┘
        │               │                     │               │
   ✅ 小程序最佳     ✅ React 小程序      ✅ App 端 RN     ✅ 跨平台一致
   ✅ App 端成熟     ✅ H5 开发体验好     ✅ 热更新灵活     ✅ 高性能自绘
   ✅ HBuilderX      ⚠️ App 端较弱        ⚠️ 小程序不支持   ⚠️ 热更新受限
```

## 框架架构对比

| 维度 | uni-app | Taro 3 | React Native | Flutter |
|---|---|---|---|---|
| **核心原理** | 编译时：Vue SFC → 小程序模板 | 运行时：模拟 DOM，Reconciler 直出 | Bridge 调用原生控件 | Skia 自绘引擎 |
| **渲染方式** | WebView（小程序）/ 原生（App） | WebView（小程序）/ 原生（H5） | 原生控件映射 | 自绘所有像素 |
| **默认框架** | Vue 3 / Vue 2 | React（也支持 Vue 3） | React | Dart |
| **小程序支持** | ⭐⭐⭐ 一流 | ⭐⭐⭐ 一流 | ❌ 不支持 | ❌ 不支持 |
| **App 端支持** | ⭐⭐⭐ 成熟（nvue） | ⭐ 较弱 | ⭐⭐⭐ 原生体验 | ⭐⭐⭐ 高性能 |
| **H5 支持** | ✅ | ✅ | ❌ | ✅ |
| **性能（小程序）** | 接近原生（编译优化） | 略低于原生（setData 桥接） | — | — |
| **性能（App）** | nvue 原生渲染 | — | Bridge 瓶颈，新架构改善 | 接近原生 |
| **热更新** | ❌（小程序平台审核） | ❌（小程序平台审核） | ✅ CodePush（仅 JS） | ❌ |
| **社区规模** | 最大（DCloud + 插件市场） | 大（京东 + React 生态） | 大（Meta + npm 生态） | 快速增长 |

## 选型决策矩阵

按团队栈和业务需求来选：

| 场景 | 推荐方案 | 理由 |
|---|---|---|
| Vue 团队 + 需覆盖小程序 + H5 + App | **uni-app** | HBuilderX 一键发布、插件市场最丰富 |
| React 团队 + 只做小程序 + H5 | **Taro 3** | JSX 天然契合、Web 标准体验、React 零迁移成本 |
| React 团队 + 需 App 端深度原生能力 | **React Native** | 原生控件映射、热更新绕过审核 |
| 追求跨平台 UI 像素级一致性 | **Flutter** | 自绘引擎、不依赖平台控件 |
| 仅微信小程序且对性能极致要求 | **原生小程序** | 零框架开销、启动最快 |

```
选型决策流：

需不需要小程序？
├── 需要 → Vue 还是 React？
│          ├── Vue  → uni-app
│          └── React → Taro 3
└── 不需要 → 主要做 App？
             ├── 是 → React 栈选 RN，否则选 Flutter
             └── 否（纯 H5） → 直接用 Vue/React，不需要跨端框架
```

## 共享概念

三个框架各自实现不同，但以下概念是通用的：

### 条件编译

一套代码多端运行，必须处理平台差异。方式不同但目标一致：

| 框架 | 条件编译方案 | 示例 |
|---|---|---|
| uni-app | `#ifdef` / `#ifndef` 预处理指令 | `// #ifdef MP-WEIXIN` |
| Taro | `process.env.TARO_ENV` 环境变量 + Tree Shaking | `if (process.env.TARO_ENV === 'weapp')` |
| RN | `Platform.OS` / `Platform.select()` | `Platform.select({ ios: ..., android: ... })` |

> 原则：能编译时确定就用编译时方案（零运行时开销），运行时才能确定的（如用户设备类型）才用运行时判断。

### 尺寸适配

所有跨端框架都面临屏幕碎片化问题，各有自适应方案：

| 框架 | 自适应单位 | 设计稿基准 |
|---|---|---|
| uni-app / 小程序 | `rpx` | 750rpx = 屏幕宽度 |
| Taro | `px` 自动转 `rpx` | `designWidth` 配置（默认 750） |
| RN | 逻辑像素（无单位） | Flexbox 布局，通过 `Dimensions` 获取屏幕尺寸 |
| H5 | `rem` / `vw` / `vh` | 详见下方 [CSS 单位](#一css-单位) 和 [自适应方案](#二自适应方案) |

### 包体积与分包

小程序主包限制 2MB，所有框架都支持分包加载。uni-app 和 Taro 在 `pages.json` / `app.config.ts` 中配置 `subPackages`，微信小程序底层机制相同。

---

## 移动端适配基础

以下内容跨框架通用——不管你用 uni-app、Taro 还是原生 H5，CSS 单位、自适应、1px 边框、安全区域、调试这些知识都用得上。

### 一、CSS 单位

#### 六种核心单位

| 单位 | 参照基准 | 缩放？ | 典型场景 |
|---|---|---|---|
| `px` | 屏幕物理像素 | ❌ | 边框、阴影等极小值 |
| `rpx` | 屏幕宽度 750 等分 | ✅ | 微信小程序全场景 |
| `rem` | 根元素 `font-size` | ✅（需 JS） | H5 移动端页面 |
| `vw/vh` | 视口宽/高度 100 等分 | ✅（纯 CSS） | 全屏布局、Banner |
| `em` | 父/自身 `font-size` | ⚠️ 嵌套叠加 | 组件内局部比例 |
| `%` | 包含块对应属性 | ✅ | 流式布局、弹性网格 |

关键细节：

- **rpx**：小程序专用，750rpx = 屏幕宽度，底层自动换算（iPhone 6 上 1rpx = 0.5px）
- **rem**：`html { font-size: calc(100vw / 3.75) }` → 375 稿下 1rem = 100px，设计稿 16px = 0.16rem
- **em 陷阱**：嵌套叠加——父 16px → 子 1.5em = 24px → 孙子 1.5em = **36px**（不是 24px）
- **% 陷阱**：`padding-top: 20%` 参照父元素**宽度**，不是高度

#### 使用建议

- 边框/分割线：`px`（1px 以下结合 transform）
- H5 整页适配：优先 `vw`（纯 CSS），需兼容老安卓选 `rem`
- 小程序：直接用 `rpx`
- 组件内图标与文字间距：`em` 保持比例

### 二、自适应方案

#### 四大方案对比

| 方案 | 原理 | 优点 | 缺点 | 场景 |
|---|---|---|---|---|
| **rem + JS** | JS 动态设 `html` 字号 | 兼容好，生态成熟 | 依赖 JS，SSR 不友好 | 传统 H5 活动页 |
| **vw/vh** | CSS 视口单位 | 纯 CSS，SSR 友好 | 无法限最大宽度，vh 受地址栏影响 | 现代移动端 H5 |
| **scale** | `transform: scale()` 整体缩放 | 还原度极高 | 坐标需换算，不适合长列表 | 大屏/数据看板 |
| **混合** | vw + rem + 媒体查询 | 灵活，各尺寸体验好 | 设计成本高 | 中大型项目 |

#### rem 方案核心代码

```js
(function () {
  const setRem = () => {
    const scale = document.documentElement.clientWidth / 375
    document.documentElement.style.fontSize = 100 * Math.min(scale, 1.5) + 'px'
    // Math.min 限制最大宽度，平板不拉伸
  }
  setRem()
  window.addEventListener('resize', setRem)
  window.addEventListener('pageshow', e => e.persisted && setRem())
})()
```

#### vw 方案

```js
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,
      viewportUnit: 'vw',
      minPixelValue: 1,  // ≤1px 不转换
    }
  }
}
```

::: warning vh 移动端坑
地址栏收起/展开时 `100vh` 会跟着变，页面跳动。修复：JS 注入 `--vh` 变量——`window.innerHeight * 0.01`，CSS 用 `calc(var(--vh) * 100)` 替代 `100vh`。
:::

#### 面试要点

**rem vs vw 怎么选？** rem 兼容性好、可设最大宽度限制，但依赖 JS；vw 纯 CSS、SSR 友好，但无法限制最大宽度。中大型项目推荐 vw + rem 混合。

**scale 方案致命缺陷？** 事件坐标需手动换算（`clientX / scale`）、SEO 不友好、文本选中异常、不适合长列表。只适合固定一屏的大屏可视化。

### 三、1px 边框问题

#### 产生原因

Retina 屏 `devicePixelRatio ≥ 2`，CSS `1px` 被渲染为 2~3 个物理像素，视觉偏粗。

```
DPR=1: 1 CSS px = 1 物理像素  ✓
DPR=2: 1 CSS px = 2 物理像素  稍粗
DPR=3: 1 CSS px = 3 物理像素  明显粗
```

#### 方案对比

| 方案 | 兼容性 | 圆角 | 侵入性 | 推荐度 |
|---|---|---|---|---|
| **伪元素 + transform** | ✅ 全兼容 | ✅ | 低 | ⭐⭐⭐⭐⭐ |
| box-shadow | ✅ 全兼容 | ❌ | 低 | ⭐⭐⭐ |
| border-image | ✅ 较全 | ⚠️ | 低 | ⭐⭐⭐ |
| viewport 缩放 | ✅ 全兼容 | ✅ | **高（整页影响）** | ⭐⭐ |

#### 伪元素方案（推荐）

```css
/* 底部 1px 细线 */
.hairline::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 1px;
  background: #ddd;
  transform: scaleY(0.5);
  transform-origin: 0 0;
}

/* 四边 1px 边框 */
.hairline-border::after {
  content: '';
  position: absolute;
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  border: 1px solid #ddd;
  transform: scale(0.5);
  transform-origin: center;
}
```

> `border: 0.5px` 直接写半像素——iOS 8+ 支持但安卓大部分机型当 0 不渲染。伪元素 + transform 方案最稳。DPR=3 时 `scale(0.5)` 其实也够了，肉眼难辨。

### 四、安全区域适配

iPhone X 起引入刘海屏和底部 Home Indicator。CSS 通过 `env(safe-area-inset-*)` 获取安全区边距。

```html
<!-- ① viewport-fit=cover 让页面撑满全屏 -->
<meta name="viewport" content="width=device-width, viewport-fit=cover">
```

```css
/* ② 顶部导航避开刘海 */
.navbar {
  padding-top: env(safe-area-inset-top);
  /* 兼容 iOS 11.0-11.2 */
  padding-top: constant(safe-area-inset-top);
}

/* ③ 底部 fixed 避开横条 */
.tab-bar {
  padding-bottom: env(safe-area-inset-bottom);
  padding-bottom: constant(safe-area-inset-bottom);
}
```

::: warning constant() 和 env() 的顺序
`constant()` 写在前面——iOS 11.0-11.2 只认 `constant()` 它会生效；iOS 11.2+ 两个都认，后面的 `env()` 覆盖。反过来新版 iOS 会吃到旧值。
:::

非全面屏设备上 `safe-area-inset-*` 值均为 0，直接加不会影响布局。

### 五、移动端调试

| 工具 | 场景 | 能力 |
|---|---|---|
| **vConsole** | 真机快速排查 | 控制台、网络、存储——注入页面，轻量级 |
| **Charles/Whistle** | 接口联调、Mock | HTTPS 抓包、Map Remote、Mock 数据 |
| **Safari/Chrome 远程调试** | 深度排查 | 元素审查、断点、性能分析 |

关键用法：

```bash
# Whistle 快速上手
npm install -g whistle
w2 start  # 默认 8899 端口

# 规则示例
https://cdn.example.com/app.js file:///Users/me/local/app.js  # 线上映射本地
api.example.com/user/info resBody://{mock-user.json}             # Mock 接口
```

- **iOS 调试**：手机数据线连 Mac → Mac Safari "开发" → 选择设备和页面 → Web Inspector（需 Mac Safari 版本 ≥ iOS Safari 版本）
- **Android 调试**：USB 连接 → `chrome://inspect` → 点击 inspect → 完整 DevTools

### 六、移动端常见问题

**300ms 点击延迟**：现代浏览器在 `<meta viewport width=device-width>` 时已默认消除（iOS 9.3+、Android Chrome 32+）。FastClick 方案基本成为历史。

**iOS 橡皮筋效果**：`body { overscroll-behavior: none; }` 一行搞定（iOS 16+ / Chrome 63+），老 iOS 加 `-webkit-overflow-scrolling: touch`。

**输入框被键盘遮挡**：

```js
input.addEventListener('focus', () => {
  setTimeout(() => {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 300)  // 等键盘弹出
})
```

**键盘弹出导致 100vh 变小**：统一用 JS 注入 `--vh`，全局用 `calc(var(--vh) * 100)` 替代裸 `100vh`。

**fixed 底部 Android 键盘坑**：键盘弹出时 `bottom: 0` 会跟上来，弹出时隐藏底部栏或切 `position: absolute`。

---

> 📖 **各框架专题文档**：
> - [uni-app](./uni-app) — 生命周期、条件编译、分包、nvue、性能优化
> - [Taro](./taro) — Taro 3 架构、跨端适配、样式方案、性能优化
> - [React Native](./rn) — Bridge 通信、热更新、性能优化、新架构、vs Flutter
