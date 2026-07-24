---
title: 跨端开发
description: uni-app、React Native、小程序跨端开发复习
---

# 跨端开发（uni-app / React Native / 小程序）

## 必会基础 ⭐⭐⭐

- [ ] uni-app 三层生命周期：应用 → 页面 → 组件
- [ ] 条件编译：`#ifdef MP-WEIXIN` 等实现多端差异化
- [ ] React Native 核心组件：`View` / `Text` / `FlatList` / `ScrollView`
- [ ] RN 与 Web 的核心差异：无 DOM、Flexbox 默认列方向、样式子集

## 进阶考点 ⭐⭐

- [ ] uni-app 分包策略：主包体积控制、`preloadRule` 预加载
- [ ] RN 性能优化：`FlatList` 的 `getItemLayout` / `windowSize` / `removeClippedSubviews`
- [ ] 小程序双线程架构：渲染层（WebView）与逻辑层（JSCore）通信

## uni-app 生命周期对照

| 生命周期 | 触发时机 |
|---|---|
| `onLaunch` | App 初始化（全局只触发一次） |
| `onLoad` | 页面加载，可获取路由参数 |
| `onsearch_skillsy` | 页面首次渲染完成（可操作 DOM） |
| `onShow` | 页面显示（每次切换都触发） |
| `onHide` | 页面隐藏 |
| `onUnload` | 页面卸载 |

## 分包配置示例

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

## FlatList 性能优化

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
