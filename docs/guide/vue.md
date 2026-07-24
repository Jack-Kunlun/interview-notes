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

### 💬 面试深度

**标准回答**：Vue 3 的响应式核心就三个 API——`ref` 包基本类型、`reactive` 包对象，`computed` 做缓存计算，`watch` 做显式监听。ref 得用 `.value` 读写是因为它内部是一个 getter/setter 对象，模板里自动解包所以不用写 `.value`；reactive 不能解构，解构会丢响应式，得用 `toRefs` 转一下。computed 和 watch 的最大区别是 computed 有缓存、同步返回结果，watch 没有缓存、适合做异步请求这种副作用。

**追问预判**：
- *ref 和 reactive 怎么选？* → 基本类型、需要整体替换、或者传给组合函数返回值，用 ref；一个表单对象、配置对象这种内部属性频繁变但整体不替换的，用 reactive。实际项目里我更多用 ref，因为 ref 对 TS 类型推导更友好，而且不存在解构丢失响应式的问题。
- *watchEffect 和 watch 什么时候用哪个？* → 不需要新旧值对比、只是想"依赖变了就执行"的时候用 watchEffect，比如打日志、自动保存草稿。需要拿到 oldVal/newVal 做条件判断、或者异步请求需要防抖的，用 watch。

**源码在哪**：`packages/reactivity/src/ref.ts`、`packages/reactivity/src/reactive.ts`、`packages/reactivity/src/computed.ts`、`packages/runtime-core/src/apiWatch.ts`

**踩过的坑**：有一次我用 `watch(() => state.list, callback, { deep: true })` 监听一个 5000 条数据的大列表，每次列表里任何一个字段变化都触发深度遍历，页面直接卡死。后来改成用 `watchEffect` 配合 `shallowRef`，只在真正需要响应变化的字段上包 `ref`，性能立马恢复正常。

**项目选型**：ref/reactive 这层没有替代品——这是 Vue 3 响应式系统的根基，所有上层 API 都依赖它们。


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

### 💬 面试深度

**标准回答**：Vue 组件通信最常用的就三层——父子用 props/emits，跨层级用 provide/inject，全局状态用 Pinia。provide/inject 适合深层嵌套比如表单组件里的字段注入，但不建议当全局状态管理用，因为它数据流不透明，后面的人很难追踪数据从哪来的。eventBus 在 Vue 3 里官方已经移除了，可以用 `mitt` 这个小库替代，体积才 200 字节。

**追问预判**：
- *provide/inject 和 Pinia 什么时候用哪个？* → provide/inject 是组件树级别的依赖注入，适合"一组关联组件"之间共享上下文（比如表单校验规则、主题色），数据流向是单向的祖先到后代。Pinia 是全局的、跨路由、跨模块的状态管理，有 devtools 支持，适合用户信息、购物车这种全局状态。简单判断：如果你的数据只在某个 Feature 的子组件里用，provide/inject；如果多个页面都要用，Pinia。
- *props 怎么做类型校验？* → Vue 3 的 `<script setup lang="ts">` 里直接用 `defineProps<{ title: string; count?: number }>()` 做 TS 类型声明，运行时校验可以用 `defineProps({ title: { type: String, required: true } })`，或者用 `zod` 这类校验库配合 validator 函数。

**源码在哪**：`packages/runtime-core/src/componentProps.ts`、`packages/runtime-core/src/apiInject.ts`

**踩过的坑**：用 provide 传了一个 ref 对象，子组件里 inject 后直接解构了 `.value` 去用，结果后面的 computed 里引用的还是解构后的纯值，provide 端的值变了但 computed 不更新。正确做法是子组件里始终保持对注入 ref 的 `.value` 引用，或者用 `readonly` 包一层传给 provide 避免子组件意外修改。

**项目选型**：全局状态管理选 Pinia 不选 Vuex——Pinia 没有 mutations、TS 支持开箱即用、体积更小、Setup Store 写法跟 Composition API 一致，老项目迁移成本也低。


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

### 💬 面试深度

**标准回答**：Vue 3 的生命周期记住一条线就行：setup 初始化 → onBeforeMount 编译完成但 DOM 还没挂 → onMounted DOM 挂完可以操作 → onBeforeUpdate 数据变了 DOM 还没更新 → onUpdated DOM 更新完 → onBeforeUnmount 卸载前做清理 → onUnmounted 卸载完。setup 本身等价于 Vue 2 的 beforeCreate 和 created，此时已经可以访问响应式数据，所以这两个钩子在 Vue 3 里基本用不到。销毁相关的从 destroy 改名成 unmount，语义更准了。

**追问预判**：
- *onMounted 里能拿到 DOM 吗？* → 能，onMounted 回调执行时组件 DOM 已经挂载到页面上，`document.getElementById` 或 `ref` 模板引用都能拿到。如果要用 `nextTick`，是因为想在同一个同步代码块里操作刚刚更新完的 DOM，而不是因为 onMounted 里拿不到 DOM。
- *父组件和子组件的生命周期执行顺序？* → 挂载阶段：父 beforeMount → 子 beforeMount → 子 mounted → 父 mounted。更新阶段：父 beforeUpdate → 子 beforeUpdate → 子 updated → 父 updated。卸载阶段：父 beforeUnmount → 子 beforeUnmount → 子 unmounted → 父 unmounted。

**源码在哪**：`packages/runtime-core/src/component.ts`（`setupRenderEffect` 函数中按顺序调用生命周期钩子）、`packages/runtime-core/src/apiLifecycle.ts`

**踩过的坑**：在 onMounted 里用 `setInterval` 轮询数据，组件切走时忘了清，导致切回来时开了两个定时器，数据请求翻倍。正确做法是在 onMounted 里存下 timerId，onBeforeUnmount 里 `clearInterval`。更好的做法是用 `useIntervalFn`（VueUse）或者 `watchEffect` + `onCleanup` 自动管理。

**项目选型**：生命周期钩子没有替代选择——它们是 Vue 组件模型的核心，但可以通过 VueUse 的 `useIntervalFn`、`useEventListener` 等组合函数减少手动管理生命周期的代码。


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

### 💬 面试深度

**标准回答**：Vue 3 的 v-model 有三个大变化：第一，默认绑定的 prop 从 `value` 改成 `modelValue`，事件从 `input` 改成 `update:modelValue`；第二，支持多个 v-model，通过参数区分，比如 `v-model:title` 绑定 `title` prop 和 `update:title` 事件；第三，支持自定义修饰符，像 `v-model.uppercase` 会在子组件里通过 `modelModifiers` prop 拿到修饰符标记。这几个改动让 v-model 从"只能有一个"变成可以按需绑定多个值，封装表单组件时特别好用。

**追问预判**：
- *多 v-model 和 .sync 修饰符的关系？* → Vue 2 里用 `.sync` 实现"双向绑定多个 prop"，`v-bind:title.sync` 等价于 `:title` + `@update:title`。Vue 3 把 `.sync` 干掉了，统一用 `v-model:title` 语法，更直观。本质上 `v-model:xxx` 就是 Vue 2 `.sync` 的升级版。
- *自定义修饰符怎么在子组件里实现？* → 假设父组件写 `v-model.uppercase="text"`，子组件里 `defineProps` 声明 `modelModifiers?: { uppercase: boolean }`，然后在 `emit('update:modelValue', value)` 之前检查 `props.modelModifiers?.uppercase` 来决定是否转大写。如果带参数的 v-model 加修饰符比如 `v-model:title.capitalize`，修饰符对应的 prop 名变成 `titleModifiers`，规律是 `arg + 'Modifiers'`。

**源码在哪**：`packages/compiler-dom/src/transforms/vModel.ts`（编译时展开 v-model 指令）、`packages/runtime-core/src/components/componentProps.ts`（运行时处理 modelModifiers）

**踩过的坑**：封装一个表单组件时，对 `v-model:title` 和 `v-model:content` 分别定义了 emit，但忘了声明对应的 `titleModifiers` 和 `contentModifiers` prop，结果父组件用了 `v-model:title.trim` 不生效，排查了半天才发现是修饰符 prop 没声明，编译器不会自动帮你加。

**项目选型**：Vue 3 多 v-model 直接替代了 Vue 2 的 `.sync`，封装复杂表单组件（比如一个用户表单有 name、email、phone 三个双向绑定字段）时比 Vue 2 的方案干净很多。


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

### 💬 面试深度

**标准回答**：Teleport 解决的是"组件逻辑在父组件但 DOM 要渲染到别的地方"的问题，最常见的场景就是 Modal、Toast、通知中心——这些组件如果放在父组件的 DOM 树里，很容易被 overflow:hidden 裁剪或者被 z-index 层叠上下文坑死。Suspense 解决的是异步组件加载的体验问题，在异步依赖就绪之前展示 fallback 内容，避免白屏。两者都是 Vue 3 内置组件，不需要额外安装。

**追问预判**：
- *Teleport 和 CSS position:fixed 有什么区别？* → fixed 定位只能让元素相对视口定位，但元素还是在原本的 DOM 层级里，父级的 `overflow:hidden`、`filter`、`transform` 仍然会把它裁掉或改变它的包含块。Teleport 直接把 DOM 节点移到 `<body>` 末尾，彻底脱离父级 DOM 层级，CSS 怎么限制都不影响。
- *Suspense 的错误处理怎么做？* → Suspense 本身不处理错误，要搭配 `onErrorCaptured` 或 `<ErrorBoundary>` 组件。更推荐用 `defineAsyncComponent` 的 `errorComponent` 配置，或者把异步请求包在 `try/catch` 里，用 `ref` 存储错误状态，fallback 里判断错误状态来决定展示 loading 还是 error。

**源码在哪**：`packages/runtime-core/src/components/Teleport.ts`、`packages/runtime-core/src/components/Suspense.ts`

**踩过的坑**：用 Teleport 把 Modal 传到 body 后，在父组件里用 `v-if` 控制 Modal 显示/隐藏，结果 Modal 关闭时报了一个 "Cannot read properties of null" 错误。原因是在 onUnmounted 里引用了父组件 provide 的数据，Teleport 改变了卸载时序。解决方案是把清理逻辑移到 Modal 组件自己的生命周期里，不依赖父组件的上下文。

**项目选型**：Teleport 和 Suspense 都是 Vue 3 原生内置组件，没有替代选择。如果项目还在 Vue 2，Modal 传 body 要用 `this.$el` 手动 appendChild 到 document.body，Suspense 功能在 Vue 2 里只能用 `v-if` + 动态组件手动模拟，远没有 Vue 3 干净。


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

## v-model 双向数据绑定实现原理

`v-model` 本质是**语法糖**，编译阶段由编译器展开为对应的 prop 绑定和事件监听。不同元素类型和组件形态下展开方式不同：原生表单元素根据 `type` 属性选择 `:value` + `@input` 或 `:checked` + `@change`；组件上则展开为 `:modelValue` + `@update:modelValue`（Vue 3）。编译器在 parse 阶段识别 `v-model` 指令生成对应 AST 节点，transform 阶段将其转换为标准的 props 和事件绑定，最终 generate 阶段产出可执行的 render 函数代码。

```js
// ===== 原生 input：v-model = :value + @input =====
// 模板：<input v-model="msg" />
// 编译后等价于：
h('input', {
  value: msg,
  onInput: (e) => { msg = e.target.value }
})

// ===== 原生 checkbox：v-model = :checked + @change =====
// 模板：<input type="checkbox" v-model="checked" />
h('input', {
  type: 'checkbox',
  checked: checked,
  onChange: (e) => { checked = e.target.checked }
})

// ===== 组件 v-model：:modelValue + @update:modelValue =====
// 模板：<CustomInput v-model="text" />
// 编译后等价于：
h(CustomInput, {
  modelValue: text,
  'onUpdate:modelValue': (val) => { text = val }
})

// ===== 带参数的 v-model =====
// 模板：<CustomInput v-model:title="title" />
// 编译后等价于：
h(CustomInput, {
  title: title,
  'onUpdate:title': (val) => { title = val }
})

// ===== 带修饰符的 v-model =====
// 模板：<CustomInput v-model.trim="text" />
// 编译后等价于（Vue 3 会额外传递 modelModifiers）：
h(CustomInput, {
  modelValue: text,
  modelModifiers: { trim: true },
  'onUpdate:modelValue': (val) => { text = val }
})
```

| 场景 | 展开的 prop | 展开的事件 | 备注 |
|---|---|---|---|
| `<input type="text">` | `:value` | `@input` | 默认 input/textarea 走此分支 |
| `<input type="checkbox">` | `:checked` | `@change` | 布尔值绑定 |
| `<input type="radio">` | `:checked` | `@change` | 与 value 比较后赋值 |
| `<select>` | `:value` | `@change` | 同 text 分支 |
| 组件（Vue 3） | `:modelValue` | `@update:modelValue` | 可多 v-model 通过参数区分 |
| 组件（Vue 2） | `:value` | `@input` | 可通过 model 选项自定义 |

### 编译器处理流程

```
模板: <input v-model="msg" />
  │
  ▼ parse
模板 AST: { type: 1, tag: 'input', directives: [{ name: 'model', exp: 'msg' }] }
  │
  ▼ transform（识别 v-model → 展开为 props + events）
JavaScript AST: {
  props: [{ name: 'value', value: 'msg' }],
  events: { input: '$event => msg = $event.target.value' }
}
  │
  ▼ generate
render: h('input', { value: msg, onInput: e => msg = e.target.value })
```

### 💬 面试深度

**标准回答**：v-model 本质是编译器层面的语法糖——在 compile 阶段，编译器根据元素类型和指令参数，把 `v-model` 展开为对应的 prop 绑定和事件监听。原生 input 展开为 `:value + @input`，checkbox 展开为 `:checked + @change`，组件上展开为 `:modelValue + @update:modelValue`。Vue 3 一个关键升级是支持多 v-model 和自定义修饰符，修饰符通过 `modelModifiers` prop 传给子组件，子组件可以据此做 trim、uppercase 等转换。

**追问预判**：
- *v-model 和手动 :value + @input 有区别吗？* → 功能上完全等价，但 v-model 帮你在编译阶段自动处理了 IME 输入法组合输入的问题（比如中文输入法拼音中间态不会触发更新），手写 `@input` 如果不用 `@compositionstart` / `@compositionend` 处理，中文输入会有 bug。
- *多 v-model 编译后长什么样？* → `v-model:title="title"` 编译后等价于 `:title="title" @update:title="title = $event"`，修饰符版本 `v-model:title.trim` 会额外传 `titleModifiers: { trim: true }` 给组件。

**源码在哪**：`packages/compiler-sfc/src/compile.ts`（SFC 编译入口）、`packages/compiler-dom/src/transforms/vModel.ts`（DOM 平台的 v-model 转换逻辑）

**踩过的坑**：封装一个自定义 Input 组件，内部用 `:value` + `@input` 手动实现了 v-model，结果中文输入法打字时，拼音中间状态就触发了更新，输入框里出现了一堆字母。查了文档才发现 v-model 内置了 compositionstart/end 的处理，手写必须自己加 `@compositionstart` 和 `@compositionend` 事件来跳过 IME 中间态。

**项目选型**：v-model 是 Vue 的双向绑定语法糖，React 没有等价物（React 是单向数据流，双向绑定要手写 value + onChange）。选择用 v-model 而不是手动绑定就是为了省代码和避免 IME 问题。


## Vue 2 响应式原理完整实现

Vue 2 的响应式系统由三大核心模块构成：**Observer**（数据劫持）、**Dep**（依赖收集器）和 **Watcher**（观察者）。Observer 通过 `Object.defineProperty` 递归遍历对象的所有属性，为每个属性创建一个 Dep 实例。当属性被读取时（getter），Dep 将当前活跃的 Watcher 收集为订阅者；当属性被修改时（setter），Dep 通知所有订阅的 Watcher 执行更新。Watcher 作为 Observer 和 Component 之间的桥梁，在实例化时触发 getter 完成依赖收集，在收到通知后执行回调驱动视图更新。整个流程：`compile` 解析模板指令创建 Watcher → Watcher 读取数据触发 getter → Dep 收集 Watcher → 数据变化触发 setter → Dep 通知 Watcher → Watcher 更新视图。

```js
// ==================== Dep：依赖收集器 ====================
class Dep {
  constructor() {
    this.subs = []              // 存储所有订阅该属性的 Watcher
  }
  addSub(watcher) {             // 添加订阅者
    this.subs.push(watcher)
  }
  depend() {                    // Watcher 调用此方法将自己加入 subs
    if (Dep.target) {
      Dep.target.addDep(this)   // Watcher.addDep 内部调用 dep.addSub
    }
  }
  notify() {                    // 通知所有订阅者更新
    this.subs.forEach(watcher => watcher.update())
  }
}

Dep.target = null               // 全局标记：当前正在执行的 Watcher
const targetStack = []          // 栈结构支持嵌套 Watcher

function pushTarget(watcher) {
  targetStack.push(watcher)
  Dep.target = watcher
}

function popTarget() {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}

// ==================== Watcher：观察者 ====================
class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm                 // Vue 实例
    this.cb = cb                 // 回调（更新视图）
    this.deps = []               // 记录自己被哪些 Dep 收集
    this.depIds = new Set()      // 去重：避免同一 Dep 重复收集

    // expOrFn 可能是字符串 'person.name' 或渲染函数
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)   // 'a.b.c' → 取值函数
    }

    this.value = this.get()      // 实例化时立即求值，触发 getter 收集依赖
  }

  get() {
    pushTarget(this)             // Dep.target = this
    const value = this.getter.call(this.vm, this.vm)
    popTarget()                  // Dep.target = 上一个 watcher
    return value
  }

  addDep(dep) {                  // dep 调用此方法将 watcher 加入
    if (!this.depIds.has(dep)) { // 去重：同一 dep 只收集一次
      this.depIds.add(dep)
      this.deps.push(dep)
      dep.addSub(this)
    }
  }

  update() {                     // Dep.notify 调用
    const oldValue = this.value
    this.value = this.get()      // 重新求值
    this.cb.call(this.vm, this.value, oldValue)
  }
}

// 解析 'obj.a.b' 路径取值
function parsePath(path) {
  const segments = path.split('.')
  return function (obj) {
    return segments.reduce((prev, cur) => prev[cur], obj)
  }
}

// ==================== Observer：数据劫持 ====================
class Observer {
  constructor(data) {
    this.walk(data)
  }

  walk(obj) {
    if (!obj || typeof obj !== 'object') return
    Object.keys(obj).forEach(key => defineReactive(obj, key, obj[key]))
  }

  // 数组特殊处理（简化版，Vue 2 源码实际重写了 push/pop/shift/unshift/splice/sort/reverse）
  observeArray(arr) {
    arr.forEach(item => observe(item))
  }
}

function observe(data) {
  if (!data || typeof data !== 'object') return
  return new Observer(data)
}

function defineReactive(obj, key, val) {
  const dep = new Dep()              // 每个属性一个独立的 Dep

  // 递归劫持嵌套对象
  observe(val)

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      // 收集依赖：如果当前有正在执行的 Watcher，收集它
      if (Dep.target) {
        dep.depend()
      }
      return val
    },
    set(newVal) {
      if (newVal === val) return
      val = newVal
      // 新值如果是对象，也要劫持
      observe(newVal)
      // 通知所有订阅者更新
      dep.notify()
    }
  })
}

// ==================== Compile：模板编译（简化版） ====================
class Compile {
  constructor(el, vm) {
    this.vm = vm
    this.el = typeof el === 'string' ? document.querySelector(el) : el
    this.fragment = this.nodeToFragment(this.el)
    this.compile(this.fragment)
    this.el.appendChild(this.fragment)
  }

  nodeToFragment(node) {
    const fragment = document.createDocumentFragment()
    let child = node.firstChild
    while (child) {
      fragment.appendChild(child)
      child = node.firstChild
    }
    return fragment
  }

  compile(fragment) {
    const childNodes = [...fragment.childNodes]
    childNodes.forEach(node => {
      if (this.isElementNode(node)) {
        this.compileElement(node)       // 编译元素节点（指令）
      } else if (this.isTextNode(node)) {
        this.compileText(node)          // 编译文本节点（{{ }}）
      }
      // 递归编译子节点
      if (node.childNodes && node.childNodes.length) {
        this.compile(node)
      }
    })
  }

  compileElement(node) {
    const attrs = [...node.attributes]
    attrs.forEach(attr => {
      const { name, value } = attr
      if (name.startsWith('v-')) {
        const dir = name.slice(2)       // model / text / html
        if (dir === 'model') {
          // v-model：双向绑定
          node.value = this.vm[value]
          node.addEventListener('input', (e) => {
            this.vm[value] = e.target.value
          })
          new Watcher(this.vm, value, (newVal) => {
            node.value = newVal
          })
        }
      }
    })
  }

  compileText(node) {
    const reg = /\{\{(.+?)\}\}/g
    if (reg.test(node.textContent)) {
      const exp = RegExp.$1.trim()
      node.textContent = this.vm[exp]
      new Watcher(this.vm, exp, (newVal) => {
        node.textContent = newVal
      })
    }
  }

  isElementNode(node) { return node.nodeType === 1 }
  isTextNode(node)    { return node.nodeType === 3 }
}

// ==================== Vue 实例（简化版） ====================
class Vue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    this.$options = options

    // 1. 数据劫持
    observe(this.$data)

    // 2. 数据代理：this.xxx → this.$data.xxx
    Object.keys(this.$data).forEach(key => {
      Object.defineProperty(this, key, {
        get() { return this.$data[key] },
        set(val) { this.$data[key] = val }
      })
    })

    // 3. 模板编译
    new Compile(this.$el, this)
  }
}

// ==================== 使用示例 ====================
/*
<div id="app">
  <p>{{ message }}</p>
  <input v-model="message" />
</div>

<script>
const vm = new Vue({
  el: '#app',
  data: {
    message: 'Hello Vue 2'
  }
})
// 修改 vm.message → setter → dep.notify() → Watcher.update() → DOM 更新
</script>
*/
```

| 模块 | 职责 | 关键方法 |
|---|---|---|
| **Observer** | 递归劫持 `data` 所有属性为 getter/setter | `defineReactive`, `observe` |
| **Dep** | 每个属性对应一个 Dep，管理订阅者列表 | `depend`（收集）, `notify`（通知） |
| **Watcher** | 连接数据与视图，get 时收集依赖，update 时执行回调 | `get`, `addDep`, `update` |
| **Compile** | 解析模板指令和插值表达式，创建 Watcher | `compileElement`, `compileText` |

### Vue 2 响应式缺陷与应对

| 缺陷 | 原因 | Vue 2 解决方案 | Vue 3 改进 |
|---|---|---|---|
| 新增属性不响应 | `defineProperty` 只能劫持已有属性 | `Vue.set(obj, key, val)` | Proxy 拦截 `set`，天然支持 |
| 删除属性不响应 | `defineProperty` 不拦截 `delete` | `Vue.delete(obj, key)` | Proxy 拦截 `deleteProperty` |
| 数组索引赋值不响应 | `defineProperty` 可劫持但不能高效监听 | `Vue.set(arr, idx, val)` | Proxy 拦截数组索引 `set` |
| 数组 length 修改不响应 | 同上 | 用 `splice` 替代 | Proxy 拦截 `set`（含 length） |
| 初始化递归遍历开销 | 遍历所有嵌套属性 | 冻结大数据 `Object.freeze` | Proxy 惰性代理，按需递归 |

### 💬 面试深度

**标准回答**：Vue 2 响应式的核心是三个类——Observer 用 Object.defineProperty 劫持每个属性，Dep 做依赖收集，Watcher 做观察者。整个流程是：模板编译时创建 Watcher → Watcher 读数据触发 getter → Dep 收集这个 Watcher → 数据变化触发 setter → Dep 通知所有 Watcher → Watcher 更新视图。这套方案的根本缺陷就是 defineProperty 只能劫持已有属性，新增/删除属性感知不到，数组索引和 length 也不行，所以有了 Vue.set 和 Vue.delete 这些补丁 API。

**追问预判**：
- *Vue 2 怎么处理数组的？* → Vue 2 重写了数组原型的 7 个变异方法（push/pop/shift/unshift/splice/sort/reverse），在调用这些方法时手动触发通知。但直接通过索引赋值 `arr[0] = x` 或修改 `arr.length = 0` 依然监听不到，必须用 `Vue.set` 或 `splice`。
- *Dep.target 为什么是全局变量？* → 因为 JavaScript 是单线程的，同一时刻只有一个 Watcher 在执行，用全局变量 `Dep.target` 标记"当前正在求值的 Watcher"是最简单的方案。嵌套 Watcher 的情况（比如 computed 里引用了另一个 computed）用 `targetStack` 栈结构来保证进出顺序正确。

**源码在哪**：Vue 2 源码 `src/core/observer/index.js`（Observer）、`src/core/observer/dep.js`（Dep）、`src/core/observer/watcher.js`（Watcher）

**踩过的坑**：一个动态表单场景，后端返回 JSON 字段列表然后渲染成输入框，我用 `this.formData[field.key] = ''` 动态加了属性，结果输入框输入不更新。问题就是 defineProperty 劫持不到新属性。临时加了 `this.$set(this.formData, field.key, '')` 修复。这个坑也是后来推动团队升级 Vue 3 的重要原因之一。

**项目选型**：Vue 2 的响应式方案在 2016 年的时候是唯一的可行方案（Proxy 不可 polyfill），但放到今天来看，所有新增属性的场景都需要手动 `$set`，维护成本太高，这就是升级 Vue 3 / Proxy 响应式的最大驱动力。


## Vue 3 Proxy 响应式对比

Vue 3 基于 `Proxy` 和 `Reflect` 重构响应式系统，核心由三个函数驱动：**`reactive`** 通过 Proxy 代理整个对象，**`ref`** 对基本类型包装一个 `.value` 访问器并在内部可能依赖 reactive，**`effect`** 创建副作用函数并自动追踪其内部访问的响应式数据。`track`（依赖收集）在 getter 中调用，将当前活跃的 effect 存入一个 WeakMap 结构（`targetMap: WeakMap<target, Map<key, Set<effect>>>`）；`trigger`（触发更新）在 setter / deleteProperty 中调用，从 targetMap 中找到对应 key 的所有 effect 并重新执行。与 Vue 2 的本质区别：不再逐个属性劫持，而是代理整个对象；不再需要 Dep 类和全局 target 栈，改用 WeakMap + 嵌套 effectStack 管理依赖关系。

```js
// ==================== reactive 简化实现 ====================
// WeakMap<target, Map<key, Set<effect>>>
const targetMap = new WeakMap()

// 当前正在执行的 effect
let activeEffect = null
const effectStack = []

function reactive(target) {
  // 基本类型直接返回
  if (typeof target !== 'object' || target === null) return target

  return new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)

      // 依赖收集
      track(target, key)

      // 惰性递归：访问到嵌套对象时才 reactive
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }
      return result
    },

    set(target, key, value, receiver) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value, receiver)

      // 值变化时才触发更新
      if (oldValue !== value) {
        trigger(target, key)
      }
      return result
    },

    deleteProperty(target, key) {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.deleteProperty(target, key)

      // 确实删除成功才触发
      if (hadKey && result) {
        trigger(target, key)
      }
      return result
    },

    has(target, key) {
      const result = Reflect.has(target, key)
      track(target, key)    // 同时支持 in 操作符依赖收集
      return result
    },

    ownKeys(target) {
      track(target, Symbol.for('iterate'))   // 用于 for...in / Object.keys
      return Reflect.ownKeys(target)
    }
  })
}

// ==================== track & trigger ====================
function track(target, key) {
  if (!activeEffect) return   // 没有正在执行的 effect，无需收集

  // 三层结构：target → key → effects
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }

  if (!deps.has(activeEffect)) {
    deps.add(activeEffect)
    // 同时让 effect 知道自己被哪些 dep 收集（用于 cleanup）
    activeEffect.deps.push(deps)
  }
}

function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const deps = depsMap.get(key)
  if (!deps) return

  // 创建副本再遍历，避免 effect 执行时修改 deps 导致死循环
  const effectsToRun = new Set(deps)
  effectsToRun.forEach(effect => {
    // 避免递归触发：当前正在执行的 effect 不重复执行
    if (effect !== activeEffect) {
      effect()
    }
  })
}

// ==================== effect 副作用函数 ====================
function effect(fn) {
  // 包装一层，给 fn 注入依赖追踪能力
  const effectFn = () => {
    // cleanup：每次重新执行前清空旧的依赖关系
    cleanup(effectFn)

    // 入栈 → 设为 active → 执行 fn → 出栈
    effectStack.push(effectFn)
    activeEffect = effectFn
    fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }

  // 存储自己被哪些 dep Set 收集（用于 cleanup）
  effectFn.deps = []

  // 立即执行一次，触发 getter 完成依赖收集
  effectFn()
}

function cleanup(effectFn) {
  effectFn.deps.forEach(depSet => depSet.delete(effectFn))
  effectFn.deps.length = 0
}

// ==================== ref 简化实现 ====================
function ref(value) {
  // 如果 value 是对象，内部用 reactive 包装
  const rawValue = value
  const isObject = typeof value === 'object' && value !== null
  const reactiveValue = isObject ? reactive(value) : value

  const refObj = {
    _value: reactiveValue,
    get value() {
      track(refObj, 'value')
      return this._value
    },
    set value(newVal) {
      if (newVal !== rawValue) {
        this._value = isObject ? reactive(newVal) : newVal
        trigger(refObj, 'value')
      }
    }
  }
  return refObj
}

// ==================== computed 简化实现 ====================
function computed(getter) {
  let cachedValue        // 缓存值
  let dirty = true       // 脏标记

  // 依赖变化时将 dirty 置为 true
  const effectFn = effect(() => {
    cachedValue = getter()
    dirty = false
  })

  return {
    get value() {
      if (dirty) {
        cachedValue = getter()
        dirty = false
      }
      track(effectFn, 'computed')
      return cachedValue
    }
  }
}

// ==================== 使用示例 ====================
/*
const state = reactive({ count: 0, user: { name: 'Alice' } })
const double = computed(() => state.count * 2)

effect(() => {
  // 首次执行时自动收集 state.count 为依赖
  console.log('render:', state.count, double.value)
})
// 输出：render: 0 0

state.count = 1
// 输出：render: 1 2（自动触发 effect 重新执行）

state.user.name = 'Bob'
// 也会触发（Proxy 惰性递归 + track）
*/

// ==================== 对比：Vue 2 vs Vue 3 响应式核心差异 ====================

| 对比维度 | Vue 2（Object.defineProperty） | Vue 3（Proxy） |
|---|---|---|
| 劫持粒度 | 逐个属性（getter/setter） | 整个对象代理 |
| 新增属性 | ❌ 不触发（需 `Vue.set`） | ✅ 自动拦截 `set` |
| 删除属性 | ❌ 不触发（需 `Vue.delete`） | ✅ `deleteProperty` 拦截 |
| 数组索引 | ❌ 不触发 | ✅ 自动拦截 |
| 数组 length | ❌ 不监听 | ✅ 自动拦截 |
| 递归策略 | 初始化时全量递归 | 惰性递归（get 时按需） |
| 依赖存储 | Dep 实例（闭包内） | WeakMap → Map → Set |
| 依赖收集触发 | `Dep.target` 全局变量 | `activeEffect` + `effectStack` |
| 拦截操作数 | 2 种（get / set） | 13 种（含 has、ownKeys、deleteProperty 等） |
### 💬 面试深度

**标准回答**：Vue 3 的 Proxy 响应式跟 Vue 2 最大的不同是——不再逐个属性劫持，而是代理整个对象。reactive 用 Proxy 包一层，get 时通过 track 函数收集依赖，set/deleteProperty 时通过 trigger 触发更新。依赖存储结构是三层 WeakMap：target → key → Set<effect>。ref 本质是对基本类型包了一个带 `.value` getter/setter 的对象，内部 value 如果是对象会调用 reactive 转响应式。惰性递归也是关键优化：只在 get 访问到嵌套对象时才递归调用 reactive，不像 Vue 2 初始化就全量遍历。

**追问预判**：
- *Vue 3 的 track/trigger 为什么用 WeakMap 而不是 Map？* → WeakMap 的 key 是弱引用，当被代理的对象不再被外部引用时，它可以被垃圾回收，不会造成内存泄漏。如果用 Map，只要 targetMap 还活着，所有被代理过的对象都回收不掉。
- *effect 的 cleanup 机制是干什么的？* → 每次 effect 重新执行前，先从所有之前收集它的 dep Set 里把自己删掉，然后清空自己的 deps 列表。这样做的目的是处理动态依赖——比如 effect 里有一个 if 分支，第一次执行走了 if 分支收集了 A 的依赖，第二次走了 else 分支不需要 A 了，如果不 cleanup，A 变了还会触发这个 effect 不必要地重新执行。

**源码在哪**：`packages/reactivity/src/reactive.ts`、`packages/reactivity/src/ref.ts`、`packages/reactivity/src/effect.ts`、`packages/reactivity/src/dep.ts`

**踩过的坑**：用 `reactive` 包了一个从 API 返回的大对象，然后用 `const extracted = state.data.items` 取出来传给了子组件，结果子组件里改了 extracted 的值，父组件没反应。原因是 `extracted` 取出来的是一个 Proxy 子对象没错，但如果子组件里对这个引用做了整体替换（`extracted = newItems`），那就断开了与原始 Proxy 的连接。正确做法是始终通过 `state.data.items = newItems` 的方式修改，或者在子组件里用 `defineModel` / `v-model` 做双向绑定。

**项目选型**：Vue 3 Proxy vs Vue 2 defineProperty 没有选型余地——升级 Vue 3 本身就意味着切换到 Proxy 响应式系统。这个升级带来的收益（自动检测属性增删、数组操作、惰性递归、更少内存）远大于兼容性损失（放弃 IE11），99% 的项目都应该升级。


| 兼容性 | IE9+ | 不可 polyfill，需 ES6+ |
| 内存占用 | 每个属性一个 Dep | 共享 Proxy，无多余对象 |
```