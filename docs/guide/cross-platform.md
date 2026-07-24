---
title: 跨端开发
description: uni-app、React Native、小程序跨端开发复习
---

# 跨端开发（uni-app / React Native / 小程序）

## 必会基础 ⭐⭐⭐

### uni-app 三层生命周期：应用 → 页面 → 组件

uni-app 的生命周期从大到小分为三个层级，执行顺序为 **App → 页面 → 组件**。理解三层生命周期是处理页面跳转、数据预加载、资源清理的前提，尤其注意 `onShow` 每次页面显示都会触发，而 `onLoad` 只在首次加载执行。

| 生命周期 | 层级 | 触发时机 |
|---|---|---|
| `onLaunch` | App | App 初始化（全局只触发一次） |
| `onLoad` | 页面 | 页面加载，可获取路由参数 |
| `onReady` | 页面 | 页面首次渲染完成（可操作 DOM） |
| `onShow` | 页面 | 页面显示（每次切换都触发） |
| `onHide` | 页面 | 页面隐藏 |
| `onUnload` | 页面 | 页面卸载 |

### 条件编译：`#ifdef MP-WEIXIN` 等实现多端差异化

条件编译让同一套代码在不同平台编译出不同产物，核心指令包括 `#ifdef` / `#ifndef` / `#endif`。编译器根据当前平台决定保留或剔除对应代码块，从而实现样式、API 调用的多端差异化，避免维护多套代码仓库。

```html
<!-- 仅微信小程序编译 -->
<!-- #ifdef MP-WEIXIN -->
<view class="wechat-only">微信专属样式</view>
<!-- #endif -->

<!-- 排除 H5 平台 -->
<!-- #ifndef H5 -->
<map :markers="markers"></map>
<!-- #endif -->
```

```javascript
// JS 中同样支持条件编译
methods: {
  login() {
    // #ifdef MP-WEIXIN
    uni.login({ provider: 'weixin' })
    // #endif
    // #ifdef APP-PLUS
    plus.oauth.getServices(...)
    // #endif
  }
}
```

### React Native 核心组件：`View` / `Text` / `FlatList` / `ScrollView`

RN 没有 HTML 标签，所有 UI 均由原生映射的 JS 组件构成。`View` 等价于 `div`，是布局容器；`Text` 承载所有文字（不能直接放在 `View` 内）；`FlatList` 是高性能长列表组件，按需渲染；`ScrollView` 适合有限内容的滚动容器，会一次性渲染全部子节点。

### RN 与 Web 的核心差异：无 DOM、Flexbox 默认列方向、样式子集

React Native 无浏览器 DOM / BOM，无法使用 `document`、`window` 等 API，动画通过 `Animated` 直接操作原生层。Flexbox 默认为 **列方向**（`flexDirection: 'column'`），与 Web 的默认行方向相反。样式仅支持 CSS 子集（无 `grid`、`@keyframes`、百分比单位），单位是逻辑像素而非 px。

## 进阶考点 ⭐⭐

### uni-app 分包策略：主包体积控制、`preloadRule` 预加载

小程序主包限制 2MB，超出必须分包。通过 `subPackages` 声明独立子包，利用 `preloadRule` 在进入某页时预下载关联分包，避免跳转时白屏等待。配置 `network: "all"` 表示不限制网络（Wi-Fi + 4G 均可预加载）。

```json
{
  "pages": [{ "path": "pages/index/index" }],
  "subPackages": [{
    "root": "subpkg-order",
    "pages": [
      { "path": "pages/order/list" },
      { "path": "pages/order/detail" }
    ]
  }],
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["subpkg-order"]
    }
  }
}
```

### RN 性能优化：`FlatList` 的 `getItemLayout` / `windowSize` / `removeClippedSubviews`

长列表性能优化关键是减少不必要的测量与渲染。`getItemLayout` 跳过动态测量（固定行高场景必备）；`windowSize` 控制当前视口外渲染的屏数（默认 21 偏大，调至 5~10 可显著降低内存）；`removeClippedSubviews` 移除屏幕外子视图，进一步释放资源。

```tsx
<FlatList
  data={items}
  keyExtractor={item => item.id}
  getItemLayout={(_, index) => ({    // 固定行高必须设置
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  windowSize={5}                     // 减小渲染窗口（默认21）
  removeClippedSubviews={true}       // 裁剪不可见组件
  initialNumToRender={10}
/>
```

### 小程序双线程架构：渲染层（WebView）与逻辑层（JSCore）通信

小程序采用 **双线程模型**：渲染层运行在 WebView 中负责界面呈现，逻辑层运行在 JSCore 中处理数据和业务逻辑，两者通过 Native 中转 `setData` 完成通信。这一设计隔离了 DOM 操作与 JS 执行，安全性高，但频繁 `setData` 会产生跨线程通信开销，需注意数据传输量和调用频率。
