---
title: Vue（2 & 3）
description: Vue 2 / Vue 3 核心差异与深入原理复习
---

# Vue（2 & 3）

> 本节同时覆盖 Vue 2 与 Vue 3，重点标出两版本差异。

## 必会基础 ⭐⭐⭐

### Composition API vs Options API：ref / reactive / watch / computed 的区别

Vue 3 引入 Composition API（`setup` 函数 / `<script setup>`）将逻辑按功能组织，而 Options API（`data` / `methods` / `computed` 等选项）按选项类型组织。Composition API 更适合逻辑复用和大型项目。

`ref` 包装基本类型或需整体替换的对象，通过 `.value` 读写；`reactive` 包装复杂对象，直接访问属性。`reactive` 解构会丢失响应式，需用 `toRefs` 转换。`computed` 缓存计算结果，依赖不变不重新执行；`watch` 显式监听一个或多个响应式源，可获取新旧值，适合异步操作和副作用。

```ts
import { ref, reactive, computed, watch, toRefs } from 'vue'

// --- ref vs reactive ---
const count = ref(0)              // 基本类型 / 需整体替换的对象
const state = reactive({          // 复杂对象，内部属性频繁读写
  list: [], loading: false
})

// reactive 解构后丢失响应式
const { list } = toRefs(state)   // ✅ 用 toRefs 保持响应式

// --- computed：缓存计算结果 ---
const double = computed(() => count.value * 2)   // count 不变不重算

// --- watch：显式监听，获取新旧值 ---
watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} → ${newVal}`)
})
watch([count, () => state.list], ([newC, newL]) => {
  // 监听多个响应式源
})
```

### 组件通信：props / emits / provide-inject / Pinia / eventBus

| 方式 | 方向 | 适用场景 |
|---|---|---|
| props + emits | 父 ↔ 子 | 直接父子通信，最常用 |
| provide / inject | 祖先 → 后代（跨层级） | 避免 props 逐层传递（prop drilling） |
| Pinia / Vuex | 全局 | 跨组件共享状态，推荐 Pinia |
| eventBus（Vue 2）/ mitt（Vue 3） | 任意组件 | 轻量事件总线，Vue 3 已移除内置 `$on/$off/$once` |

```vue
<!-- 父组件 -->
<Child :title="title" @update="onUpdate" />

<!-- 子组件 (Vue 3 <script setup>) -->
<script setup lang="ts">
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ update: [value: string] }>()
emit('update', 'new value')
</script>
```

```ts
// provide / inject：跨层级注入
// 祖先组件
import { provide, ref } from 'vue'
provide('theme', ref('dark'))

// 任意后代组件
import { inject } from 'vue'
const theme = inject('theme', 'light')  // 第二个参数为默认值
```

### Vue 3 生命周期：setup → onMounted → onUnmounted

Vue 3 Composition API 的生命周期钩子统一为 `onXxx` 前缀；`setup()` 本身就替代了 Vue 2 的 `beforeCreate` 和 `created`（此时已能访问响应式数据，无需单独钩子）。销毁相关钩子也从 `destroy` 更名为 `unmount`，语义更准确。

| Vue 2 (Options API) | Vue 3 (Composition API) | 说明 |
|---|---|---|
| `beforeCreate` | `setup()` 本身 | 实例初始化前 |
| `created` | `setup()` 本身 | 实例创建后，可访问响应式数据 |
| `beforeMount` | `onBeforeMount` | DOM 挂载前 |
| `mounted` | `onMounted` | DOM 挂载后 |
| `beforeUpdate` | `onBeforeUpdate` | 数据更新、DOM 更新前 |
| `updated` | `onUpdated` | DOM 更新后 |
| `beforeDestroy` | `onBeforeUnmount` | 组件销毁前 |
| `destroyed` | `onUnmounted` | 组件销毁后 |
| `errorCaptured` | `onErrorCaptured` | 捕获子组件错误 |

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  console.log('组件已挂载，可访问 DOM')
})

onUnmounted(() => {
  console.log('组件即将卸载，清理定时器 / 事件监听')
})
</script>
```

### v-model 在 Vue 3 中的变化

Vue 3 中 `v-model` 默认绑定 `modelValue` prop 和 `update:modelValue` 事件（Vue 2 是 `:value` + `@input`）。核心增强：**支持多个 v-model**（通过参数指定 prop 名）和**自定义修饰符**（通过 `modelModifiers` prop 感知修饰符）。

```vue
<!-- Vue 3 多 v-model -->
<UserForm
  v-model:name="name"
  v-model:email="email"
/>

<!-- 子组件 -->
<script setup lang="ts">
const props = defineProps<{ name: string; email: string }>()
const emit = defineEmits<{
  'update:name': [value: string]
  'update:email': [value: string]
}>()
</script>
```

```ts
// 自定义修饰符（以 v-model.uppercase 为例）
const props = defineProps<{
  modelValue: string
  modelModifiers?: { uppercase: boolean }
}>()

// 父组件 <MyInput v-model.uppercase="text" />
// props.modelModifiers?.uppercase === true → 子组件内可据此转换大小写
```

### Teleport / Suspense 的使用场景

**Teleport** 将组件模板渲染到 DOM 中指定位置（如 `<body>` 末尾），常用于 Modal / Toast / 通知等需要脱离父级 `overflow: hidden` 或 `z-index` 层叠上下文的场景。

**Suspense** 优雅处理异步组件加载：等待异步依赖就绪期间显示 fallback 插槽内容，避免白屏；可嵌套多层，每层独立控制加载状态。

```vue
<!-- Teleport：Modal 渲染到 body 末尾，脱离父组件 CSS 限制 -->
<Teleport to="body">
  <Modal v-if="show" @close="show = false" />
</Teleport>

<!-- Suspense：异步组件加载时显示 Loading -->
<Suspense>
  <template #default>
    <AsyncDashboard />
  </template>
  <template #fallback>
    <LoadingSpinner />
  </template>
</Suspense>
```

## 进阶考点 ⭐⭐

### 响应式差异：Vue 2 Object.defineProperty vs Vue 3 Proxy

Vue 2 使用 `Object.defineProperty` 劫持对象已有属性，存在三个致命缺陷：无法检测**新增/删除属性**（必须 `Vue.set` / `Vue.delete`）、无法监听**数组索引**和 `length` 变化、初始化时**递归遍历**所有属性性能开销大。

Vue 3 改用 `Proxy` 代理整个对象，可拦截 `get` / `set` / `deleteProperty` / `has` / `ownKeys` 等 13 种操作，天然支持动态属性增删和数组操作，惰性代理（按需递归），性能与内存均优于 Vue 2。

```js
// ===== Vue 2：Object.defineProperty =====
const data = { count: 0, items: [1, 2, 3] }
Object.defineProperty(data, 'count', {
  get() { /* 收集依赖 */ return data.count },
  set(val) { /* 触发更新 */ }
})
// ❌ data.newKey = 1       → 不触发更新（需 Vue.set）
// ❌ delete data.count     → 不触发更新（需 Vue.delete）
// ❌ data.items[0] = 9     → 不触发更新
// ❌ data.items.length = 0 → 不触发更新

// ===== Vue 3：Proxy =====
const proxy = new Proxy(target, {
  get(target, key) {
    track(target, key)             // 收集依赖
    return Reflect.get(target, key)
  },
  set(target, key, value) {
    Reflect.set(target, key, value)
    trigger(target, key)           // 触发更新
    return true
  },
  deleteProperty(target, key) {
    Reflect.deleteProperty(target, key)
    trigger(target, key)           // ✅ 删除属性自动触发
    return true
  }
})
// ✅ proxy.newKey = 1       → 自动检测
// ✅ delete proxy.count     → 自动检测
// ✅ 数组索引 / length 操作 → 全部响应
```

### Vue 3 Diff 优化：PatchFlag / 静态提升 / Block Tree

Vue 3 编译器在 transform 阶段对模板做静态分析，通过 **PatchFlag** 标记动态节点类型（`1`=TEXT, `2`=CLASS, `4`=STYLE, `8`=PROPS 等），diff 时静态节点直接跳过，只对比标记了 PatchFlag 的动态绑定。**静态提升**将不变的 VNode 提升到 `render` 函数外部复用，避免每次渲染重复创建。**Block Tree** 将动态后代节点收集进一个扁平 `dynamicChildren` 数组，diff 时只遍历该数组而跳过所有静态兄弟节点，将传统树形 diff 的复杂度大幅降低。

```js
// 模板：<div :class="cls">{{ text }}</div>
// 编译后生成（简化示意）：
createElementVNode("div", { class: _ctx.cls }, _ctx.text, 2 /* CLASS */ + 1 /* TEXT */)
// 静态节点 PatchFlag = undefined，diff 直接跳过
```

### watchEffect vs watch

`watchEffect` 自动追踪回调内访问的所有响应式依赖，**立即执行**一次，适合"只要依赖变就执行"的副作用（如日志、自动保存）。`watch` 需**显式声明**要监听的源，惰性执行，可获得 `newVal` / `oldVal`，适合需要比较新旧值或按条件触发的场景（如请求重发）。

```ts
import { watch, watchEffect, ref } from 'vue'

const count = ref(0)
const name = ref('Vue')

// watchEffect：自动追踪所有依赖，立即执行
watchEffect(() => {
  console.log(`count: ${count.value}, name: ${name.value}`)
}) // count 或 name 任一变化 → 重新执行

// watch：显式指定源，惰性执行，可获取新旧值
watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} → ${newVal}`)
})

// watch 也可监听多个源
watch([count, name], ([newC, newN], [oldC, oldN]) => {
  // 任一变化触发
})

// watch 惰性 → 加 immediate: true 改为立即执行
watch(count, () => { /* ... */ }, { immediate: true })
```

### Pinia vs Vuex

| 对比项 | Vuex 4 | Pinia（推荐） |
|---|---|---|
| 模块化 | 嵌套 modules，需命名空间 | 独立 store，天然扁平 |
| TypeScript | 需额外类型声明 | 完整类型推导，开箱即用 |
| API | `state` / `getters` / `mutations` / `actions` | `state` / `getters` / `actions`（无 mutations） |
| 写法 | 仅 Options Store | Options Store + Setup Store |
| devtools | 支持 | 支持更好（时间旅行、action 追踪） |
| 体积 | ~10KB | ~2KB |

```ts
// Pinia Setup Store（推荐写法，与 Composition API 统一）
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  function increment() { count.value++ }

  return { count, double, increment }
})
```

### defineAsyncComponent + Suspense 实现异步组件加载

`defineAsyncComponent` 定义异步组件，内置 loading / error / timeout / delay 等配置，适合**代码分割**和**首屏优化**。搭配 `Suspense` 可在父级统一控制 fallback 展示，避免多个异步组件各自维护 loading 状态。

```ts
import { defineAsyncComponent } from 'vue'

const AsyncModal = defineAsyncComponent({
  loader: () => import('./Modal.vue'),
  loadingComponent: LoadingSpinner,   // 加载中
  errorComponent: ErrorDisplay,       // 加载失败
  delay: 200,                         // 200ms 后才显示 loading（避免闪烁）
  timeout: 5000                       // 超时判定失败
})
```

```vue
<!-- 配合 Suspense -->
<Suspense @resolve="onReady">
  <AsyncModal />
  <template #fallback>
    <Spinner />
  </template>
</Suspense>
```

## Vue 2 vs Vue 3 核心差异速查

| 对比项 | Vue 2 | Vue 3 |
|---|---|---|
| 响应式实现 | `Object.defineProperty` | `Proxy` |
| 组合方式 | Options API | Composition API（兼容 Options） |
| 根节点 | 单根 | 多根（Fragments） |
| 全局 API | `Vue.xxx` | `createApp().xxx` |
| v-model | `:value` + `@input` | `modelValue` + `update:modelValue` |
| 状态管理 | Vuex | Pinia（推荐） |

## 深入理解 ⭐

### Vue 3 编译器三阶段

```
Template → parse → AST → transform → JavaScript AST → generate → Render Function
```

1. **parse**：模板字符串 → 模板 AST
2. **transform**：遍历 AST，处理 `v-if` / `v-for` / 静态标记（PatchFlag）等
3. **generate**：生成 `render()` 函数代码

**静态提升**：transform 阶段标记静态节点，generate 时提升到 `render` 外部，复用同一 VNode，不重复创建。

### Diff 算法核心优化

- **PatchFlag**：标记动态绑定类型（`1`=TEXT, `2`=CLASS, `4`=STYLE），静态节点直接跳过
- **Block Tree**：只收集有动态绑定的节点进 diff 数组，省略静态兄弟节点

### 自定义渲染器（了解即可）

```js
import { createRenderer } from '@vue/runtime-core'

const { createApp } = createRenderer({
  createElement(type) { /* 平台特定创建 */ },
  insert(el, parent) { /* 平台特定插入 */ },
  patchProp(el, key, value) { /* 平台特定属性更新 */ }
})
// 可以渲染到 Canvas / 小程序 / 终端
```
