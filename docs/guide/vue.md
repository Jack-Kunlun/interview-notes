---
title: Vue（2 & 3）
description: Vue 2 / Vue 3 核心差异与深入原理复习
---

# Vue（2 & 3）

> 本节同时覆盖 Vue 2 与 Vue 3，重点标出两版本差异。

## 必会基础 ⭐⭐⭐

- [ ] Composition API vs Options API：`ref` / `reactive` / `watch` / `computed` 的区别
- [ ] 组件通信：props / emits / provide-inject / Pinia / eventBus
- [ ] Vue 3 生命周期：`setup` → `onMounted` → `onUnmounted` 对应 Vue 2 的 `created` / `mounted` / `beforeDestroy`
- [ ] `v-model` 在 Vue 3 中的变化（支持多 v-model、自定义修饰符）
- [ ] Teleport / Suspense 的使用场景（Vue 3 新增）

## 进阶考点 ⭐⭐

- [ ] **响应式差异**：Vue 2 用 `Object.defineProperty`（无法检测新增/删除属性），Vue 3 用 `Proxy`（拦截 13 种操作）
- [ ] Vue 3 Diff 优化：静态标记（PatchFlag）/ 静态提升 / Block Tree
- [ ] `watchEffect` vs `watch`：副作用自动追踪 vs 显式依赖声明
- [ ] Pinia vs Vuex：setup store / option store、插件机制、devtools 支持
- [ ] `defineAsyncComponent` + Suspense 实现异步组件加载

## Vue 2 vs Vue 3 核心差异速查

| 对比项 | Vue 2 | Vue 3 |
|---|---|---|
| 响应式实现 | `Object.defineProperty` | `Proxy` |
| 组合方式 | Options API | Composition API（兼容 Options） |
| 根节点 | 单根 | 多根（Fragments） |
| 全局 API | `Vue.xxx` | `createApp().xxx` |
| v-model | `:value` + `@input` | `modelValue` + `update:modelValue` |
| 状态管理 | Vuex | Pinia（推荐） |

## `ref` vs `reactive`

```ts
const count = ref(0)              // 基本类型 / 需整体替换的对象
const state = reactive({          // 复杂对象，内部属性频繁读写
  list: [], loading: false
})

// reactive 解构后丢失响应式
const { list } = toRefs(state)   // ✅ 用 toRefs 保持响应式
```

## Vue 3 响应式原理

```js
const proxy = new Proxy(target, {
  get(target, key) {
    track(target, key)             // 收集依赖
    return Reflect.get(target, key)
  },
  set(target, key, value) {
    Reflect.set(target, key, value)
    trigger(target, key)           // 触发更新
  }
})
```
