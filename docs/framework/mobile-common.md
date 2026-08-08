---
title: 移动端通用知识
description: CSS 单位对比、自适应方案、1px 边框、安全区域适配、调试工具与高频问题
---

# 移动端通用知识

移动端开发中跨框架通用的适配与调试知识——CSS 单位、自适应方案、1px 边框、安全区域、调试、常见坑。

## 一、CSS 单位

### 1.1 六种核心单位

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

### 1.2 使用建议

- 边框/分割线：`px`（1px 以下结合 transform）
- H5 整页适配：优先 `vw`（纯 CSS），需兼容老安卓选 `rem`
- 小程序：直接用 `rpx`
- 组件内图标与文字间距：`em` 保持比例

## 二、自适应方案

### 2.1 四大方案对比

| 方案 | 原理 | 优点 | 缺点 | 场景 |
|---|---|---|---|---|
| **rem + JS** | JS 动态设 `html` 字号 | 兼容好，生态成熟 | 依赖 JS，SSR 不友好 | 传统 H5 活动页 |
| **vw/vh** | CSS 视口单位 | 纯 CSS，SSR 友好 | 无法限最大宽度，vh 受地址栏影响 | 现代移动端 H5 |
| **scale** | `transform: scale()` 整体缩放 | 还原度极高 | 坐标需换算，不适合长列表 | 大屏/数据看板 |
| **混合** | vw + rem + 媒体查询 | 灵活，各尺寸体验好 | 设计成本高 | 中大型项目 |

### 2.2 rem 方案核心代码

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

### 2.3 vw 方案

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

### 2.4 面试要点

**rem vs vw 怎么选？** rem 兼容性好、可设最大宽度限制，但依赖 JS；vw 纯 CSS、SSR 友好，但无法限制最大宽度。中大型项目推荐 vw + rem 混合。

**scale 方案致命缺陷？** 事件坐标需手动换算（`clientX / scale`）、SEO 不友好、文本选中异常、不适合长列表。只适合固定一屏的大屏可视化。

## 三、1px 边框问题

### 3.1 产生原因

Retina 屏 `devicePixelRatio ≥ 2`，CSS `1px` 被渲染为 2~3 个物理像素，视觉偏粗。

```
DPR=1: 1 CSS px = 1 物理像素  ✓
DPR=2: 1 CSS px = 2 物理像素  稍粗
DPR=3: 1 CSS px = 3 物理像素  明显粗
```

### 3.2 方案对比

| 方案 | 兼容性 | 圆角 | 侵入性 | 推荐度 |
|---|---|---|---|---|
| **伪元素 + transform** | ✅ 全兼容 | ✅ | 低 | ⭐⭐⭐⭐⭐ |
| box-shadow | ✅ 全兼容 | ❌ | 低 | ⭐⭐⭐ |
| border-image | ✅ 较全 | ⚠️ | 低 | ⭐⭐⭐ |
| viewport 缩放 | ✅ 全兼容 | ✅ | **高（整页影响）** | ⭐⭐ |

### 3.3 伪元素方案（推荐）

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

## 四、安全区域适配

iPhone X 起引入刘海屏和底部 Home Indicator。CSS 通过 `env(safe-area-inset-*)` 获取安全区边距。

### 4.1 三步适配

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

非全面屏设备上 `safe-area-inset-*` 值均为 0，放心加不影响布局。

## 五、移动端调试

### 5.1 三板斧

| 工具 | 场景 | 能力 |
|---|---|---|
| **vConsole** | 真机快速排查 | 控制台、网络、存储——注入页面，轻量级 |
| **Charles/Whistle** | 接口联调、Mock | HTTPS 抓包、Map Remote、Mock 数据 |
| **Safari/Chrome 远程调试** | 深度排查 | 元素审查、断点、性能分析 |

### 5.2 关键用法

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

## 六、移动端常见问题

### 6.1 300ms 点击延迟

现代浏览器在 `<meta viewport width=device-width>` 时已默认消除（iOS 9.3+、Android Chrome 32+）。FastClick 方案基本成为历史。

### 6.2 iOS 橡皮筋效果

```css
body {
  overscroll-behavior: none;  /* 现代方案，iOS 16+ / Chrome 63+ */
  -webkit-overflow-scrolling: touch;  /* 老 iOS 兼容 */
}
```

### 6.3 输入框被键盘遮挡

```js
input.addEventListener('focus', () => {
  setTimeout(() => {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 300)  // 等键盘弹出
})
```

### 6.4 键盘弹出导致 100vh 变小

```js
// 初始化注入真实视口高度
const setVh = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
}
setVh()
window.addEventListener('resize', setVh)
```

```css
.full-screen { height: calc(var(--vh, 1vh) * 100); }
```

### 6.5 面试要点

- **300ms 延迟**：现代浏览器已消除，新项目无需 FastClick
- **橡皮筋效果**：`overscroll-behavior: none` 一行搞定
- **输入框遮挡**：`scrollIntoView({ block: 'center' })` 最简单
- **100vh 坑**：统一用 JS 注入 `--vh`，全局不要直接用 `100vh`
- **fixed 底部 Android 键盘坑**：键盘弹出时 `bottom: 0` 会跟上来，弹出时隐藏底部栏或切 `position: absolute`
