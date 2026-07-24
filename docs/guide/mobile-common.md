---
title: 移动端常见问题与适配方案
description: 移动端 CSS 单位、自适应方案、1px 边框、安全区域适配、调试工具及高频问题解决方案的全面梳理
---

## 移动端 CSS 单位深入

在移动端开发中，CSS 单位的选择直接影响页面在不同设备上的呈现效果。不同单位有着各自的适用场景，理解它们的本质是做好移动端适配的基础。

### 六种核心单位

#### px（像素）

px 是屏幕物理像素的最小单位，也是 CSS 中最基础的绝对单位。在普通屏幕下 1px 对应 1 个物理像素，但在 Retina 高清屏上，1px 可能对应多个物理像素（由 `devicePixelRatio` 决定）。因此在高清屏上，同样是 1px 的边框，在不同设备上粗细感知不同——这也是 1px 边框问题的根源。

```css
/* px 使用示例 */
.box {
  width: 375px;      /* 固定宽度，不会随屏幕缩放 */
  font-size: 14px;   /* 固定字号 */
  border: 1px solid #ccc;
}
```

#### rpx（响应式像素，微信小程序）

rpx（Responsive Pixel）是微信小程序独有的单位，规定屏幕宽度为 **750rpx**。无论在什么设备上，750rpx 始终等于屏幕宽度，小程序底层会自动换算为对应的 px 值。例如在 iPhone 6（375px 宽）上，1rpx = 0.5px；在 iPhone 6 Plus（414px 宽）上，1rpx ≈ 0.552px。这一机制让开发者可以按 750 设计稿直接写样式，无需手动换算。

```css
/* 微信小程序中 rpx 用法 */
.container {
  width: 750rpx;         /* 占满屏幕宽度 */
  padding: 30rpx;        /* 设计稿上的 30px → 自动换算 */
  font-size: 28rpx;
}
```

#### rem（根元素相对单位）

rem 是相对于根元素（`<html>`）`font-size` 的倍数单位。例如 `html { font-size: 16px }` 时，`1rem = 16px`。rem 的核心威力在于：只需动态修改根元素字号，所有使用 rem 的元素都会等比例缩放，从而实现一稿适配多屏。通常搭配 JS 动态设置根字号（如 flexible.js），将设计稿宽度（如 375px）分成若干等份。

```css
/* rem 使用示例 */
html {
  font-size: calc(100vw / 3.75);
  /* 以 375 设计稿为基准，1rem = 100px */
}

.card {
  width: 3.45rem;    /* 设计稿 345px → 3.45rem */
  height: 1.8rem;    /* 设计稿 180px → 1.8rem */
  font-size: 0.14rem; /* 设计稿 14px → 0.14rem */
}
```

#### vw / vh（视口单位）

`vw` 是视口宽度的 1%，`vh` 是视口高度的 1%。它们是纯 CSS 方案，不需要任何 JS 介入即可实现自适应。`100vw` 等于当前窗口宽度，`100vh` 等于当前窗口高度。此外还有 `vmin`（取 vw 和 vh 中较小值）和 `vmax`（取较大值），适合在横竖屏切换时保证元素尺寸合理。

```css
/* vw/vh 使用示例 */
.hero-banner {
  width: 100vw;
  height: 50vh;         /* 占半屏高度 */
  font-size: 4vw;       /* 字号随屏幕宽度缩放 */
}

.square {
  width: 30vmin;
  height: 30vmin;       /* 横竖屏下都保持正方形 */
}
```

#### em（父元素相对单位）

em 是相对于**当前元素**或**父元素** `font-size` 的倍数单位。它的问题在于"复合"——嵌套层级越深，em 值越不可控。例如父元素 `font-size: 20px`，子元素设 `1.5em` 即 30px；若子元素再嵌套孙子元素也设 `1.5em`，则变成 45px 而非预期的 30px。因此 em 一般仅用于组件内部的局部比例（如图标与文字的间距），不宜作为全局适配方案。

```css
.parent {
  font-size: 16px;
}

.parent .child {
  font-size: 1.5em;     /* 24px */
  padding: 0.5em;       /* 12px（相对于自身 font-size 24px） */
}

.parent .child .grandchild {
  font-size: 1.5em;     /* 36px！复合叠加，容易失控 */
}
```

#### %（百分比）

% 是相对于**包含块**（containing block）对应属性的百分比值。不同属性参照不同：`width` 相对父元素 content-box 宽度；`height` 相对父元素 content-box 高度（需父元素高度明确）；`padding/margin` 的百分比（包括上下方向）始终参照父元素**宽度**；`line-height` 的百分比相对自身字号。

```css
.parent {
  width: 375px;
  height: 600px;
}

.child {
  width: 50%;           /* 187.5px，相对父元素宽度 */
  padding-top: 20%;     /* 75px，注意：参照父元素宽度，不是高度！ */
  margin-left: 5%;      /* 18.75px，参照父元素宽度 */
}
```

### 六种单位换算对照表

| 单位 | 参照基准 | 是否随屏幕缩放 | 典型场景 |
|------|----------|:---:|------|
| px | 屏幕物理像素 | ❌ 固定 | 边框、阴影等极小值 |
| rpx | 屏幕宽度（750 等分） | ✅ | 微信小程序全场景 |
| rem | 根元素 font-size | ✅（需 JS 配合） | H5 移动端页面适配 |
| vw/vh | 视口宽/高度（100 等分） | ✅（纯 CSS） | 全屏布局、横幅、字号 |
| em | 父/自身 font-size | ⚠️ 嵌套叠加 | 组件内部局部比例 |
| % | 包含块对应属性 | ✅ | 流式布局、弹性网格 |

### 实际使用场景推荐

- **边框、分割线**：用 `px`（1px 以下可结合 transform 做 0.5px）。
- **H5 整页适配**：优先 `vw` 方案（纯 CSS）或 `rem + 动态根字号`。
- **小程序**：直接用 `rpx`，无需额外配置。
- **全屏 Hero / Banner**：`vw/vh` 最自然。
- **组件内图标大小与文字间距**：用 `em` 保持比例关系。
- **栅格/多列布局**：`%` 或 `flex` 按比例分配。

---

## 自适应方案对比

移动端屏幕碎片化严重，从 320px 宽的小屏到 428px 的全面屏再到折叠屏，一套代码需要覆盖所有尺寸。以下四种方案各有侧重。

### rem + flexible.js 方案

**原理**：JS 动态设置 `<html>` 的 `font-size`，通常按设计稿宽度（如 375px）分 10 等份或 100 等份。所有尺寸用 rem 表达，设计稿上的 px 值除以基准值即得 rem 值。

```html
<!-- flexible.js 核心逻辑精简版 -->
<script>
  (function () {
    var docEl = document.documentElement;
    var designWidth = 375;          // 设计稿宽度
    var baseSize = 100;             // 1rem = 100px 的设计稿尺寸

    function setRem() {
      var clientWidth = docEl.clientWidth;
      // 限制最大宽度，避免平板下过大
      var rem = Math.min(clientWidth, 540) / designWidth * baseSize;
      docEl.style.fontSize = rem + 'px';
    }

    setRem();
    window.addEventListener('resize', setRem);
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) setRem();    // 解决缓存页返回不触发
    });
  })();
</script>
```

```css
/* 设计稿 375px 宽度下，1rem = 100px */
.header { height: 0.44rem; }  /* 44px */
.title  { font-size: 0.18rem; margin-bottom: 0.12rem; }
```

**优点**：兼容性好（所有浏览器均支持），方案成熟，社区有大量 PostCSS 插件（如 `postcss-pxtorem`）可自动转换，开发只需按设计稿写 px。**缺点**：依赖 JS，且需要在 `resize`、`orientationchange` 等事件上重置，对服务端渲染（SSR）不友好。

### vw/vh 方案

**原理**：利用 CSS 视口单位，`100vw = 视口宽度`，纯 CSS 即可实现等比缩放。配合 `postcss-px-to-viewport` 等工具，开发时仍可写 px，构建时自动转为 vw。

```css
/* 设计稿 375px → 100vw，即 1px = 100/375 ≈ 0.26667vw */
/* 使用 postcss-px-to-viewport 可自动完成转换 */

.banner {
  width: 100vw;
  height: 53.33vw;      /* 设计稿 200px / 375 * 100vw */
  font-size: 4.8vw;     /* 设计稿 18px */
}
```

```js
// postcss.config.js 配置示例
module.exports = {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 375,       // 设计稿宽度
      unitPrecision: 5,         // vw 精度
      viewportUnit: 'vw',
      minPixelValue: 1,         // ≤1px 不转换
      exclude: [/node_modules/]
    }
  }
};
```

**优点**：纯 CSS，无 JS 依赖，SSR 友好，天然响应式。**缺点**：部分安卓 4.x 兼容性差（已基本淘汰）；无法限制最大宽度，大屏下元素会等比放大到夸张；`vh` 在移动端受浏览器地址栏收起/展开影响，容易出现跳动。

### scale 方案（固定比例大屏）

**原理**：页面按固定设计稿尺寸开发（如 1920×1080），然后通过 CSS `transform: scale()` 整体缩放以适配不同屏幕。常见于大屏可视化、数据看板、活动落地页等需要精确还原设计的场景。

```js
// scale 适配核心逻辑
function setScale() {
  var designWidth = 1920;
  var designHeight = 1080;
  var clientWidth = document.documentElement.clientWidth;
  var clientHeight = document.documentElement.clientHeight;
  var scaleX = clientWidth / designWidth;
  var scaleY = clientHeight / designHeight;
  var scale = Math.min(scaleX, scaleY); // 取较小比例，保证内容不溢出

  var app = document.getElementById('app');
  app.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
  app.style.position = 'absolute';
  app.style.left = '50%';
  app.style.top = '50%';
}

setScale();
window.addEventListener('resize', setScale);
```

```css
/* 页面容器固定尺寸，交给 JS 缩放 */
#app {
  width: 1920px;
  height: 1080px;
  transform-origin: center center;
}
```

**优点**：还原度极高，设计稿 1:1 还原，开发简单，无需单位换算。**缺点**：非等比缩放时可能留白边；缩放后事件坐标需手动换算；不适合信息流/长列表等流式内容；对 SEO 和文本选中不友好。

### 混合方案

**原理**：结合多种单位各取所长。典型做法——页面整体布局用 `vw/vh` 或 `rem` 做流式适配；极限尺寸（超小屏或超宽屏）用 `max-width`/`min-width` 配合媒体查询兜底；特定模块（如弹窗居中）用 `%` 或 `vh` + `transform` 精确定位；边框等极小尺寸保持 `px`。

```css
/* 混合方案示例 */
html {
  font-size: calc(100vw / 3.75); /* 基准 rem */
}

/* 超宽屏限制最大宽度，避免内容过度拉伸 */
@media (min-width: 768px) {
  html {
    font-size: calc(768px / 3.75);
  }
  .container {
    max-width: 768px;
    margin: 0 auto;
  }
}

/* 超小屏保证最小可读性 */
@media (max-width: 320px) {
  html {
    font-size: calc(320px / 3.75);
  }
}

/* 边框始终保持 1px，不参与缩放 */
.line {
  border-bottom: 1px solid #eee;
}
```

**优点**：灵活可控，各尺寸体验均衡，兼顾还原度与可用性。**缺点**：方案设计需要经验，不同模块规则不一致容易让维护成本上升。

### 四种方案对比总表

| 方案 | 原理 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|------|
| rem + flexible.js | JS 动态设置根 font-size | 兼容性好，生态成熟，PostCSS 自动转换 | 依赖 JS，SSR 不友好，resize 需重置 | 传统 H5 活动页、信息流页面 |
| vw/vh | CSS 视口单位等比缩放 | 纯 CSS，无 JS 依赖，SSR 友好 | 无法限制最大宽度，vh 受地址栏影响 | 现代移动端 H5，对兼容性要求偏低 |
| scale | CSS transform 整体缩放 | 还原度极高，开发无需换算 | 坐标需换算，不适合长列表，对 SEO 不友好 | 大屏可视化、数据看板、固定比例活动页 |
| 混合方案 | 多种单位+媒体查询组合 | 灵活，各尺寸体验好 | 设计成本高，需要经验 | 中大型项目、多端适配 |

---

## 1px 边框问题

### 产生原因

在 Retina（视网膜）屏幕上，`devicePixelRatio`（设备像素比，简称 DPR）大于 1。例如 iPhone 14 的 DPR = 3，意味着 CSS 的 `1px` 对应 3 个物理像素。当 CSS 设置 `border: 1px solid` 时，浏览器会用 3 个物理像素去渲染，视觉上就变成了"粗线"。设计师期望的"1 物理像素"细线无法通过 CSS `1px` 天然实现。

```
普通屏 (DPR=1): 1 CSS px → 1 物理像素  ✓ 细线
Retina (DPR=2):  1 CSS px → 2 物理像素  → 看起来稍粗
Retina (DPR=3):  1 CSS px → 3 物理像素  → 明显偏粗
```

### 解决方案对比

#### 方案一：伪元素 + transform: scale()

最主流方案。用伪元素画出边框，再通过 `transform: scale(0.5)` 缩小到原来的 0.5 倍（DPR=2 时 1 物理像素）。DPR=3 时 `scale(0.33)`，但实际 0.5 也能接受。

```css
.hairline {
  position: relative;
}

.hairline::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 1px;
  background: #ddd;
  transform: scaleY(0.5);          /* Y 轴缩小 0.5 */
  transform-origin: 0 0;
}

/* 四边边框用两个伪元素分别画 */
.hairline-border::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 200%;                     /* 先放大再缩小，避免模糊 */
  height: 200%;
  border: 1px solid #ddd;
  transform: scale(0.5);
  transform-origin: 0 0;
  box-sizing: border-box;
}
```

#### 方案二：box-shadow

利用 `box-shadow` 的第四个参数（扩展半径）模拟边框。只能做外侧或内侧"边框"，不支持 `border-radius`（阴影不跟随圆角）。

```css
.shadow-border {
  box-shadow: 0 0 0 0.5px #ddd;
  /* 模糊半径=0，扩展半径=0.5px → 模拟 0.5px 边框 */
}
```

#### 方案三：border-image

用 1px 的图片/渐变作为边框图片。可精确控制边框颜色和粗细。

```css
.border-image-1px {
  border-width: 0 0 1px 0;
  border-image: linear-gradient(to bottom, #ddd, #ddd) 1 1;
  /* 或使用 SVG data URI */
}
```

#### 方案四：viewport（initial-scale）

通过 `<meta name="viewport">` 的 `initial-scale` 值来缩放：DPR=2 设 `initial-scale=0.5`，DPR=3 设 `initial-scale=0.333`。此方案能让所有 CSS `1px` 在物理像素层面真正等于 1 个物理像素——但代价是**整个页面都被缩放**，所有尺寸和布局都需要重新计算适配，只适合特定场景。

```html
<!-- DPR=2 时 -->
<meta name="viewport"
  content="width=device-width, initial-scale=0.5, maximum-scale=0.5, user-scalable=no">
```

### 1px 方案对比表

| 方案 | 兼容性 | 圆角支持 | 侵入性 | 推荐度 |
|------|:---:|:---:|:---:|:---:|
| 伪元素 + transform | ✅ 全兼容 | ✅ 支持 | 低（仅目标元素） | ⭐⭐⭐⭐⭐ |
| box-shadow | ✅ 全兼容 | ❌ 不跟随 | 低 | ⭐⭐⭐ |
| border-image | ✅ 较全 | ⚠️ 需要额外处理 | 低 | ⭐⭐⭐ |
| viewport 缩放 | ✅ 全兼容 | ✅ 支持 | **高（整页影响）** | ⭐⭐ |

---

## 安全区域适配

iPhone X 开始，苹果引入了刘海屏和底部 Home Indicator 横条，这些区域会遮挡页面内容或被系统手势占用。CSS 通过 `safe-area-inset-*` 环境变量标识"安全区"——即不会被遮挡、可放心放置交互元素的区域。

### safe-area-inset-* CSS 变量

四个方向的安全区边距，由系统自动注入：

```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top);       /* 顶部安全区（状态栏+刘海） */
  --safe-area-inset-right: env(safe-area-inset-right);
  --safe-area-inset-bottom: env(safe-area-inset-bottom); /* 底部安全区（横条） */
  --safe-area-inset-left: env(safe-area-inset-left);
}
```

典型 iPhone 14 Pro 竖屏下：`safe-area-inset-top ≈ 59px`，`safe-area-inset-bottom ≈ 34px`。

### env() 与 constant() 兼容写法

iOS 11.0-11.2 使用 `constant()`，iOS 11.2+ 改为 `env()`。兼容写法是将 `constant` 放在前面作为 fallback（因为 `env` 实现后，`constant` 被忽略；而旧系统不认识 `env` 时会使用 `constant`）：

```css
.fixed-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  /* 兼容顺序：constant 在前，env 在后 */
  padding-bottom: constant(safe-area-inset-bottom); /* iOS 11.0-11.2 */
  padding-bottom: env(safe-area-inset-bottom);      /* iOS 11.2+ */
}
```

### 底部横条与刘海屏适配

**底部横条（Home Indicator）适配**：底部固定定位的按钮、TabBar 需要为横条留出空间，否则会被遮挡或误触。做法是在底部 padding 上叠加 `safe-area-inset-bottom`。

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(50px + constant(safe-area-inset-bottom));
  height: calc(50px + env(safe-area-inset-bottom));
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  box-sizing: border-box;
}
```

**刘海屏适配**：对于顶部导航栏，需要避开刘海区域。设置 `viewport-fit=cover` 让页面扩展到全屏，然后在导航栏加上 `padding-top`：

```html
<!-- viewport-fit=cover 让页面撑满全屏 -->
<meta name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

```css
.navbar {
  height: 44px;
  padding-top: constant(safe-area-inset-top); /* 非刘海屏该值为 0 */
  padding-top: env(safe-area-inset-top);
  padding-left: constant(safe-area-inset-left);
  padding-left: env(safe-area-inset-left);
  padding-right: constant(safe-area-inset-right);
  padding-right: env(safe-area-inset-right);
}
```

**背景延伸至全屏**：若只是背景色或装饰需要延伸到非安全区，使用 `padding` 维持内容在安全区内，背景色往外延伸：

```css
.page {
  /* 背景色铺满，内容被 padding 约束在安全区内 */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  background: linear-gradient(to bottom, #f0f0f5, #fff);
  min-height: 100vh;
}
```

---

## 移动端调试

移动端调试比 PC 端复杂，因为代码运行在真机或模拟器上。以下工具覆盖了从开发阶段到线上排查的完整链路。

### vConsole

vConsole 是微信团队开源的一个轻量级移动端调试面板，注入后在页面上悬浮一个按钮，点击展开类似 Chrome DevTools 的控制台、网络、元素、存储等面板。适合快速在真机上查看日志、接口请求、本地存储状态。

```html
<!-- CDN 引入 -->
<script src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js"></script>
<script>
  var vConsole = new VConsole();
  console.log('Hello vConsole!');
</script>
```

```js
// 按环境控制开启
if (process.env.NODE_ENV !== 'production') {
  const VConsole = require('vconsole');
  new VConsole();
}
```

**使用场景**：① 无法连接电脑调试时的真机快速排查；② 测试同学抓日志复现 bug；③ 查看接口请求详情和 localStorage。**局限**：性能分析弱，不方便断点调试，不替代桌面 DevTools。

### Charles / Whistle 抓包

**Charles** 是经典 HTTP 代理工具。手机设置代理指向 PC 端 Charles（同 WiFi），安装 SSL 证书后可解密 HTTPS 流量。常用于：查看/修改请求与响应、模拟慢网速、Map Remote 将线上资源指向本地文件实现"线上调试本地代码"。

**Whistle**（基于 Node.js）是现代抓包利器，较 Charles 更灵活。支持规则配置（类似编程）、Mock 数据、修改请求头/响应体、WebSocket 抓包、插件生态。

```bash
# 安装 Whistle
npm install -g whistle

# 启动（默认 8899 端口）
w2 start
```

```conf
# Whistle 规则示例 (Rules)
# 将线上 JS 映射到本地文件
https://cdn.example.com/app.js file:///Users/me/local/app.js

# Mock 接口返回
api.example.com/user/info resBody://{ mock-user.json }

# 给所有请求加 header
* reqHeaders://{ cors-headers.txt }
```

**使用场景**：① 线上问题定位（查看完整请求链路）；② 本地开发调试线上页面（Map Remote）；③ Mock 后端接口未就绪时的前端自测；④ HTTPS 证书校验问题排查。

### Safari / Chrome 远程调试

**Safari 远程调试（iOS）**：iPhone 用数据线连接 Mac → 手机 Safari 打开页面 → Mac Safari 菜单"开发 → [设备名] → [页面]"→ 弹出 Web Inspector。支持元素审查、断点、网络、Timeline。

**Chrome 远程调试（Android）**：Android 手机 USB 连接电脑，开启开发者模式 + USB 调试 → 电脑 Chrome 访问 `chrome://inspect` → 看到设备列表后点击 `inspect` → 弹出 DevTools。支持所有桌面 DevTools 功能，包括 Performance、Memory、Network。

```bash
# Android 若 chrome://inspect 不显示设备，尝试 adb 转发
adb devices                          # 确认设备在线
adb forward tcp:9222 localabstract:chrome_devtools_remote
```

**关键差异**：iOS 只能用 Safari 调试 Safari/WebView（且 Mac 版 Safari 版本需 ≥ 手机版本）；Android 用 Chrome 调试 Chrome/WebView（部分国产 ROM 的 WebView 需开启调试开关）。

---

## 移动端常见问题

### 300ms 点击延迟

**问题**：移动端浏览器为区分"双击缩放"，在 `touchend` 后等待约 300ms，若期间无第二次点击才触发 `click` 事件。这带来明显的"点击迟钝感"。

**解决方案**：

1. **viewport 禁用缩放**（现代移动端浏览器自动消除延迟）：
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<!-- 或 minimum-scale=1.0, maximum-scale=1.0 -->
```
> 注意：`user-scalable=no` 会影响无障碍访问，需权衡。

2. **FastClick**（老旧方案，如今基本不需要）：
```js
// 安装 fastclick，在入口初始化
import FastClick from 'fastclick';
FastClick.attach(document.body);
```

3. **使用 touch 事件替代**（自己处理或使用 BetterScroll 等手势库）。

> 现代移动端浏览器（iOS 9.3+、Android Chrome 32+）在 `<meta viewport width=device-width>` 时已默认禁用 300ms 延迟，新项目一般**无需额外处理**。

### iOS 橡皮筋效果

**问题**：iOS Safari 页面滚动到顶部或底部继续拖拽时，整个页面会"弹回"（bounce），露出背景。若页面本身有固定头部/底部，弹回时会出现白底露出，体验不佳。

**解决方案**：

```css
/* 禁止整个页面弹性滚动 */
body {
  overscroll-behavior: none;            /* 现代方案 */
  -webkit-overflow-scrolling: touch;    /* iOS 平滑滚动（已内置，但保留兼容） */
}

/* 若只需禁止局部滚动容器弹回 */
.scroll-container {
  overscroll-behavior: contain;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

```js
// 极端方案：阻止 body 的 touchmove 默认行为（慎用，会导致内部滚动也失效）
document.body.addEventListener('touchmove', function (e) {
  e.preventDefault();
}, { passive: false });
```

> `overscroll-behavior` 是标准方案，iOS 16+ 和现代 Android 均支持。对于老版本 iOS，`-webkit-overflow-scrolling: touch` 可启用惯性滚动和回弹控制。

### 输入框遮挡

**问题**：软键盘弹出后，固定定位的输入框可能被键盘遮挡，或页面被推上去后输入框不在可视区域。

**解决方案**：

1. **scrollIntoView**（最直接）：
```js
inputElement.addEventListener('focus', function () {
  setTimeout(() => {
    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300); // 延时等键盘弹出
});
```

2. **Element.scrollIntoViewIfNeeded**（非标准但 iOS Safari 支持）：
```js
inputElement.addEventListener('focus', function () {
  setTimeout(() => {
    this.scrollIntoViewIfNeeded(true);
  }, 300);
});
```

3. **监听 visualViewport 变化**（更精准）：
```js
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const currentInput = document.activeElement;
    if (currentInput && currentInput.tagName === 'INPUT') {
      // 根据 visualViewport.offsetTop + height 计算是否被遮挡
      const viewportHeight = window.visualViewport.height;
      const rect = currentInput.getBoundingClientRect();
      if (rect.bottom > viewportHeight) {
        currentInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  });
}
```

### 软键盘弹出导致页面变形

**问题**：Android 软键盘弹出时可能挤压视口导致 `100vh` 变小，页面被"压缩"，固定底部的按钮可能跑到键盘上方；而 iOS 键盘是覆盖层，不影响视口高度，两种行为不一致。

**解决方案**：

1. **避免使用 `100vh` 做全屏高度**，改用 JS 获取的窗口高度：

```js
// 页面初始化时记录真实视口高度
const setRealVh = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};
setRealVh();
window.addEventListener('resize', setRealVh);
```

```css
.full-screen {
  height: calc(var(--vh, 1vh) * 100); /* 使用 JS 注入的真实视口高度 */
}
```

2. **固定底部元素不要用 `bottom: 0` 在 Android 上**，键盘弹出时会跟随位移。可考虑键盘弹出时隐藏底部固定栏：

```js
const isAndroid = /android/i.test(navigator.userAgent);
let lastHeight = window.innerHeight;

window.addEventListener('resize', () => {
  const currentHeight = window.innerHeight;
  const bottomBar = document.querySelector('.bottom-bar');
  if (!bottomBar || !isAndroid) return;

  if (currentHeight < lastHeight) {
    // 键盘弹出，隐藏底部栏
    bottomBar.style.display = 'none';
  } else {
    bottomBar.style.display = '';
  }
  lastHeight = currentHeight;
});
```

3. **对固定定位元素**，在输入框聚焦时切换为 `position: absolute`，失焦后恢复，减少布局异常。
