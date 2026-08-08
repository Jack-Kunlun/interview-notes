---
title: Vue（2 & 3）
description: Vue 2 / Vue 3 核心差异与深入原理复习
---

# Vue（2 & 3）

> 核心 API → 深入组件 → 响应式原理 → 编译器与性能 → 进阶 API → 工程实战

## 一、上手 Vue 3：核心 API

### 1.1 Composition API：ref / reactive / computed / watch / watchEffect

Vue 3 引入 Composition API，将逻辑按功能组织（vs Options API 按选项类型组织），更适合逻辑复用和大型项目。

`ref` 包装基本类型或需整体替换的对象，通过 `.value` 读写；`reactive` 包装复杂对象，直接访问属性，但解构会丢失响应式，需用 `toRefs`。`computed` 缓存计算结果，依赖不变不重算；`watch` 显式监听，可获取新旧值；`watchEffect` 自动追踪依赖，立即执行。

```ts
import { ref, reactive, computed, watch, watchEffect, toRefs } from 'vue'

// --- ref vs reactive ---
const count = ref(0)              // 基本类型 / 需整体替换
const state = reactive({ list: [], loading: false })

// reactive 解构 → 丢响应式，用 toRefs 保持
const { list } = toRefs(state)

// --- computed：缓存计算 ---
const double = computed(() => count.value * 2)

// --- watch：显式监听，获取新旧值 ---
watch(count, (newVal, oldVal) => console.log(`${oldVal} → ${newVal}`))
watch([count, () => state.list], ([newC, newL]) => { /* 多源 */ })

// --- watchEffect：自动追踪，立即执行 ---
watchEffect(() => console.log(`count: ${count.value}`))
```

---

### 1.2 生命周期

Vue 3 Composition API 钩子统一为 `onXxx` 前缀，`setup()` 替代了 `beforeCreate` 和 `created`。关键：`onMounted` 可操作 DOM，`onUnmounted` 必须清理副作用。

| Vue 2 (Options) | Vue 3 (Composition) | 说明 |
|---|---|---|
| `beforeCreate` | `setup()` 本身 | 实例初始化前 |
| `created` | `setup()` 本身 | 已能访问响应式数据 |
| `beforeMount` | `onBeforeMount` | DOM 挂载前 |
| `mounted` | `onMounted` | DOM 挂载后 |
| `beforeUpdate` | `onBeforeUpdate` | 数据更新、DOM 更新前 |
| `updated` | `onUpdated` | DOM 更新后 |
| `beforeDestroy` | `onBeforeUnmount` | 组件销毁前——清理！ |
| `destroyed` | `onUnmounted` | 组件销毁后 |

```vue
<script setup>
import { onMounted, onUnmounted } from 'vue'

onMounted(() => { /* DOM 已挂载 */ })
onUnmounted(() => { /* 清理定时器、事件 */ })
</script>
```

---

### 1.3 组件通信

| 方式 | 方向 | 适用场景 |
|---|---|---|
| props + emits | 父 ↔ 子 | 直接父子，最常用 |
| provide / inject | 祖先 → 后代（跨层级） | 避免 props 逐层传递 |
| Pinia | 全局 | 跨组件共享状态（推荐） |
| eventBus（Vue 2）/ mitt（Vue 3） | 任意 | 轻量事件，Vue 3 已移除内置 |

```vue
<!-- 父 → 子：props + emits -->
<Child :title="title" @update="onUpdate" />

<script setup lang="ts">
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ update: [value: string] }>()
emit('update', 'new value')
</script>
```

```ts
// provide / inject：跨层级注入
provide('theme', ref('dark'))
const theme = inject('theme', 'light')   // 默认值
```

---

## 二、深入组件

### 2.1 v-model 全解

#### 基础语法

Vue 3 默认绑定 `modelValue` prop + `update:modelValue` 事件（Vue 2 是 `:value + @input`）。支持 **多 v-model** 和 **自定义修饰符**。

```vue
<!-- 多 v-model -->
<UserForm v-model:name="name" v-model:email="email" />

<script setup lang="ts">
const props = defineProps<{ name: string; email: string }>()
const emit = defineEmits<{
  'update:name': [value: string]
  'update:email': [value: string]
}>()
</script>
```

```ts
// 自定义修饰符（v-model.uppercase）
const props = defineProps<{
  modelValue: string
  modelModifiers?: { uppercase: boolean }
}>()
// props.modelModifiers?.uppercase → 子组件据此转换大小写
```

#### 原理：编译时语法糖

v-model 本质是**编译器语法糖**——不同元素类型展开方式不同：

| 场景 | 展开的 prop | 展开的事件 |
|---|---|---|
| `<input type="text">` | `:value` | `@input` |
| `<input type="checkbox">` | `:checked` | `@change` |
| `<select>` | `:value` | `@change` |
| 组件（Vue 3） | `:modelValue` | `@update:modelValue` |
| 组件（Vue 2） | `:value` | `@input` |

编译器流程：

```
模板: <input v-model="msg" />
  → parse → AST 节点（含 directives）
  → transform → 展开为 props + events
  → generate → h('input', { value: msg, onInput: e => msg = e.target.value })
```

```js
// 各种场景展开等价代码：
// input：h('input', { value: msg, onInput: e => msg = e.target.value })
// checkbox：h('input', { type: 'checkbox', checked, onChange: e => checked = e.target.checked })
// 组件：h(CustomInput, { modelValue: text, 'onUpdate:modelValue': val => text = val })
// 带参数：v-model:title → { title, 'onUpdate:title': val => title = val }
// 带修饰符：v-model.trim → 额外传 modelModifiers: { trim: true }
```

---

### 2.2 编译宏：defineExpose / defineOptions / defineSlots / defineModel

`<script setup>` 下的编译宏——只在编译阶段生效，不需 import。

| 宏 | 作用 | 版本 |
|---|---|---|
| `defineExpose` | 控制子组件暴露给父组件 ref 的属性 | 3.0+ |
| `defineOptions` | 声明组件 name / inheritAttrs 等选项 | 3.3+ |
| `defineSlots` | 给插槽加 TS 类型 | 3.3+ |
| `defineModel` | 一行搞定 v-model props + emits | 3.4+ ⭐ |

```vue
<script setup lang="ts">
// --- defineExpose：按需暴露 ---
const open = () => { /* ... */ }
defineExpose({ open })   // 只暴露 open，内部状态封装

// --- defineOptions ---
defineOptions({ name: 'UserTable', inheritAttrs: false })

// --- defineSlots：插槽类型 ---
const slots = defineSlots<{
  default(props: { item: User }): any
  header(): any
}>()

// --- defineModel（推荐替代手写 v-model 样板）---
const modelValue = defineModel<string>()        // 默认 v-model
const title = defineModel<string>('title')      // v-model:title
// 直接赋值即 emit：modelValue.value = '新值'
</script>
```

---

### 2.3 Teleport / Suspense

**Teleport**：组件逻辑在父组件但 DOM 渲染到指定位置（脱离 overflow:hidden / z-index 限制）。

**Suspense**：等待异步依赖就绪期间展示 fallback，避免白屏。

```vue
<!-- Teleport：Modal 到 body 末尾 -->
<Teleport to="body">
  <Modal v-if="show" @close="show = false" />
</Teleport>

<!-- Suspense + 异步组件 -->
<Suspense>
  <template #default><AsyncDashboard /></template>
  <template #fallback><LoadingSpinner /></template>
</Suspense>
```

---

## 三、响应式原理

> 这是 Vue 面试的核心区。建议先看 Vue 2 实现理解"为什么要有响应式系统"，再看 Vue 3 理解"Proxy 解决了什么"。

### 3.1 Vue 2 响应式：Observer / Dep / Watcher / Compile

Vue 2 通过 `Object.defineProperty` 劫持每个属性，三大核心模块：

- **Observer**：递归劫持所有属性为 getter/setter
- **Dep**：每个属性一个依赖收集器，管理订阅者列表
- **Watcher**：连接数据与视图，get 时收集依赖，update 时执行回调

数据流：`Compile 解析模板创建 Watcher → Watcher 读数据触发 getter → Dep 收集 Watcher → 数据变化触发 setter → Dep.notify → Watcher.update → 更新视图`。

```js
// ============ Dep：依赖收集器 ============
class Dep {
  constructor() { this.subs = [] }
  addSub(watcher) { this.subs.push(watcher) }
  depend() { if (Dep.target) Dep.target.addDep(this) }
  notify() { this.subs.forEach(w => w.update()) }
}
Dep.target = null               // 全局标记当前 Watcher
const targetStack = []          // 支持嵌套 Watcher

function pushTarget(w) { targetStack.push(w); Dep.target = w }
function popTarget()  { targetStack.pop(); Dep.target = targetStack.at(-1) }

// ============ Watcher：观察者 ============
class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm; this.cb = cb; this.deps = []; this.depIds = new Set()
    this.getter = typeof expOrFn === 'function' ? expOrFn : parsePath(expOrFn)
    this.value = this.get()     // 实例化立即求值，触发 getter 收集依赖
  }
  get() {
    pushTarget(this)
    const value = this.getter.call(this.vm, this.vm)
    popTarget()
    return value
  }
  addDep(dep) {
    if (!this.depIds.has(dep)) { this.depIds.add(dep); this.deps.push(dep); dep.addSub(this) }
  }
  update() {
    const old = this.value
    this.value = this.get()
    this.cb.call(this.vm, this.value, old)
  }
}
function parsePath(path) {
  return obj => path.split('.').reduce((p, c) => p[c], obj)
}

// ============ Observer：数据劫持 ============
function observe(data) {
  if (!data || typeof data !== 'object') return
  Object.keys(data).forEach(key => defineReactive(data, key, data[key]))
}
function defineReactive(obj, key, val) {
  const dep = new Dep()
  observe(val)   // 递归劫持嵌套对象
  Object.defineProperty(obj, key, {
    enumerable: true, configurable: true,
    get() {
      if (Dep.target) dep.depend()
      return val
    },
    set(newVal) {
      if (newVal === val) return
      val = newVal
      observe(newVal)
      dep.notify()
    }
  })
}

// ============ Compile：模板编译（简版） ============
class Compile {
  constructor(el, vm) { /* 遍历节点，解析 {{}} 和 v- 指令，创建 Watcher */ }
  compileText(node) {
    const exp = /\{\{(.+?)\}\}/.exec(node.textContent)?.[1]?.trim()
    if (exp) {
      node.textContent = this.vm[exp]
      new Watcher(this.vm, exp, v => node.textContent = v)
    }
  }
  compileElement(node) {
    /* v-model → 双向绑定：读取值 + 监听 input → 更新 vm + 创建 Watcher */
  }
}
```

**Vue 2 响应式缺陷与应对：**

| 缺陷 | 原因 | Vue 2 方案 | Vue 3 改进 |
|---|---|---|---|
| 新增属性不响应 | `defineProperty` 只劫持已有 | `Vue.set(obj, key, val)` | Proxy 拦截 set |
| 删除属性不响应 | 不拦截 delete | `Vue.delete(obj, key)` | `deleteProperty` |
| 数组索引不响应 | 无法高效监听 | `Vue.set(arr, i, val)` | Proxy 拦截 |
| 数组 length 不响应 | 同上 | 用 splice 替代 | Proxy 拦截 |
| 初始化递归开销 | 遍历所有嵌套属性 | `Object.freeze` 冻结 | Proxy 惰性递归 |

---

### 3.2 Vue 3 响应式：Proxy + Reflect

Vue 3 基于 `Proxy` 代理整个对象，核心函数：

- **`reactive`**：Proxy 代理对象，get 时 track + 惰性递归
- **`ref`**：基本类型包 `.value` getter/setter，内部调 reactive
- **`effect`**：创建副作用函数，自动追踪内部响应式数据
- **`track` / `trigger`**：依赖收集 / 触发更新，用三层 WeakMap 存储

```js
// 依赖存储：WeakMap<target, Map<key, Set<effect>>>
const targetMap = new WeakMap()
let activeEffect = null
const effectStack = []

// ============ reactive ============
function reactive(target) {
  if (typeof target !== 'object' || target === null) return target
  return new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      track(target, key)
      // 惰性递归：访问到嵌套对象时才 reactive
      return typeof result === 'object' && result !== null ? reactive(result) : result
    },
    set(target, key, value, receiver) {
      const old = target[key]
      const ok = Reflect.set(target, key, value, receiver)
      if (old !== value) trigger(target, key)
      return ok
    },
    deleteProperty(target, key) {
      const had = Object.hasOwn(target, key)
      const ok = Reflect.deleteProperty(target, key)
      if (had && ok) trigger(target, key)
      return ok
    }
  })
}

// ============ track & trigger ============
function track(target, key) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, depsMap = new Map())
  let deps = depsMap.get(key)
  if (!deps) depsMap.set(key, deps = new Set())
  if (!deps.has(activeEffect)) {
    deps.add(activeEffect)
    activeEffect.deps.push(deps)
  }
}
function trigger(target, key) {
  const deps = targetMap.get(target)?.get(key)
  if (!deps) return
  new Set(deps).forEach(e => { if (e !== activeEffect) e() })
}

// ============ effect ============
function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn)
    effectStack.push(effectFn); activeEffect = effectFn
    fn()
    effectStack.pop(); activeEffect = effectStack.at(-1)
  }
  effectFn.deps = []
  effectFn()   // 立即执行，触发 getter 完成依赖收集
}
function cleanup(effectFn) {
  effectFn.deps.forEach(s => s.delete(effectFn))
  effectFn.deps.length = 0
}

// ============ ref ============
function ref(value) {
  const isObj = typeof value === 'object' && value !== null
  const inner = isObj ? reactive(value) : value
  const r = {
    _value: inner,
    get value() { track(r, 'value'); return this._value },
    set value(v) { this._value = isObj ? reactive(v) : v; trigger(r, 'value') }
  }
  return r
}

// ============ computed ============
function computed(getter) {
  let cached, dirty = true
  const e = effect(() => { cached = getter(); dirty = false })
  return {
    get value() {
      if (dirty) { cached = getter(); dirty = false }
      track(e, 'computed')
      return cached
    }
  }
}
```

### 3.3 Vue 2 vs Vue 3 响应式核心差异

| 对比维度 | Vue 2（defineProperty） | Vue 3（Proxy） |
|---|---|---|
| 劫持粒度 | 逐个属性 | 整个对象 |
| 新增属性 | ❌ 需 Vue.set | ✅ 自动 |
| 删除属性 | ❌ 需 Vue.delete | ✅ 自动 |
| 数组索引/length | ❌ | ✅ |
| 递归策略 | 初始化全量 | 惰性（get 时按需） |
| 依赖存储 | Dep 实例（闭包） | WeakMap → Map → Set |
| 当前 Watcher | Dep.target 全局 | activeEffect + stack |
| 拦截操作数 | 2 种 | 13 种（含 has, ownKeys 等） |
| 浏览器兼容 | IE9+ | 不可 polyfill，ES6+ |
| 内存 | 每属性一 Dep | 共享 Proxy |

---

## 四、编译器与性能

### 4.1 编译器三阶段

```
Template → parse → AST → transform → JavaScript AST → generate → Render Function
```

1. **parse**：模板字符串 → 模板 AST
2. **transform**：遍历 AST，处理指令（v-if/v-for/v-model）、标记 PatchFlag、静态提升
3. **generate**：生成 `render()` 函数代码

### 4.2 Diff 优化：PatchFlag / 静态提升 / Block Tree

- **PatchFlag**：标记动态绑定类型（`1`=TEXT, `2`=CLASS, `4`=STYLE, `8`=PROPS 等），diff 时只对比有标记的动态节点
- **静态提升**：不变的 VNode 提升到 render 外复用，不重复创建
- **Block Tree**：动态后代节点收集进 `dynamicChildren` 扁平数组，跳过所有静态兄弟节点

```js
// 模板：<div :class="cls">{{ text }}</div>
// 编译后：
createElementVNode("div", { class: _ctx.cls }, _ctx.text, 2 /* CLASS */ + 1 /* TEXT */)
// 静态节点 PatchFlag = undefined → 直接跳过 diff
```

### 4.3 异步组件：defineAsyncComponent

内置 loading / error / timeout / delay 配置，适合代码分割和首屏优化。

```ts
const AsyncModal = defineAsyncComponent({
  loader: () => import('./Modal.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,       // 200ms 后才显示 loading（避免闪烁）
  timeout: 5000
})
```

### 4.4 KeepAlive

缓存组件不触发 `onUnmounted`，代之以 `onActivated`（激活）和 `onDeactivated`（失活）。

```vue
<KeepAlive :include="['UserList', 'Dashboard']">
  <component :is="currentView" />
</KeepAlive>

<script setup>
import { onActivated, onDeactivated } from 'vue'

onActivated(() => { /* 切回来：恢复轮询 */ })
onDeactivated(() => { /* 切走：暂停轮询 */ })
</script>
```

---

## 五、进阶响应式 API

### 5.1 浅层响应式：shallowRef / shallowReactive / triggerRef

只对顶层做响应式处理，内部嵌套不追踪。大幅减少大数据集的代理开销。

```ts
import { ref, shallowRef, shallowReactive, triggerRef, toRef, toRefs } from 'vue'

// ref：深层追踪
const deep = ref({ items: [1, 2, 3], meta: { total: 100 } })
deep.value.meta.total = 200  // ✅ 触发

// shallowRef：只有 .value 整体替换才触发
const shallow = shallowRef({ items: [1, 2, 3] })
shallow.value.meta.total = 200   // ❌ 不触发
shallow.value = { items: [4, 5] } // ✅ 触发
triggerRef(shallow)              // 手动触发

// shallowReactive：只代理第一层
const s = shallowReactive({ user: { name: 'Alice' } })
s.user = { name: 'Bob' }          // ✅ 触发
s.user.name = 'Charlie'           // ❌ 不触发

// toRefs：解构保持响应式
const state = reactive({ count: 0, name: 'Vue' })
const { count: c, name: n } = toRefs(state)
c.value++  // state.count 同步
```

| | `ref` | `shallowRef` |
|---|---|---|
| 追踪深度 | 深层递归 | 仅 .value 本身 |
| 适用场景 | 表单、交互数据 | 大数据集、图表配置、不可变对象 |

### 5.2 响应式工具：readonly / markRaw / toRaw / customRef

```ts
// --- readonly：锁定只读 ---
const r = readonly(state)
r.count = 1          // ⚠️ 开发警告

// --- markRaw：标记永不代理（大数据、第三方实例）---
const large = markRaw({ values: new Array(100000) })
const state2 = reactive({ list: large })  // large 不会被代理

// --- toRaw：获取代理的原始对象 ---
const original = toRaw(reactiveObj)

// --- customRef：自定义 get/set 行为 ---
function useDebouncedRef<T>(value: T, delay = 300) {
  let timeout: ReturnType<typeof setTimeout>
  return customRef<T>((track, trigger) => ({
    get() { track(); return value },
    set(v) { clearTimeout(timeout); timeout = setTimeout(() => { value = v; trigger() }, delay) }
  }))
}
```

### 5.3 effectScope：批量管理副作用生命周期

独立于组件生命周期，创建/销毁一组 watch/watchEffect/computed。

```ts
const scope = effectScope()
scope.run(() => {
  const count = ref(0)
  watchEffect(() => console.log(count.value))
  onScopeDispose(() => console.log('scope 销毁'))
  return { count }
})
scope.stop()  // 内部所有 effect 同时停止
```

| 场景 | 方案 |
|---|---|
| 组件内 | 自动随组件卸载 |
| 组合函数对外暴露 | effectScope 包一层，外部可控 |
| Pinia Setup Store | 内部自动用 effectScope |
| 全局监听/轮询 | effectScope + onScopeDispose |

---

## 六、工程化实战

### 6.1 Vue 2 vs Vue 3 差异速查

| 对比项 | Vue 2 | Vue 3 |
|---|---|---|
| 响应式 | Object.defineProperty | Proxy |
| 组合方式 | Options API | Composition API（兼容 Options） |
| 根节点 | 单根 | 多根（Fragments） |
| 全局 API | `Vue.xxx` | `createApp().xxx` |
| v-model | `:value + @input` | `modelValue + update:modelValue` |
| 状态管理 | Vuex | Pinia（推荐） |
| 多 v-model | ❌（需 .sync） | ✅ `v-model:xxx` |
| TypeScript | 需额外声明 | 开箱即用 |
| IE11 | ✅ | ❌（Proxy 不可 polyfill） |

### 6.2 状态管理：Pinia vs Vuex

| 对比项 | Vuex 4 | Pinia（推荐） |
|---|---|---|
| 模块化 | 嵌套 modules，需命名空间 | 独立 store，天然扁平 |
| TypeScript | 需额外声明 | 完整类型推导 |
| API | state/getters/mutations/actions | state/getters/actions（无 mutations）|
| 写法 | 仅 Options Store | Options + Setup Store |
| devtools | 支持 | 更好（时间旅行、action 追踪） |
| 体积 | ~10KB | ~2KB |

```ts
// Pinia Setup Store（推荐，与 Composition API 统一）
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  function increment() { count.value++ }
  return { count, double, increment }
})
```

### 6.3 Vue 3.4+ 新特性

**`defineModel`（3.4+）**：一行替代 defineProps + defineEmits，推荐所有新项目使用。

```vue
<script setup lang="ts">
const modelValue = defineModel<string>()       // 默认 v-model
const title = defineModel<string>('title')     // v-model:title
modelValue.value = '新值'   // 即 emit('update:modelValue', ...)
</script>
```

**`useTemplateRef`（3.5+）**：类型安全的模板引用，替代 `ref(null)`。

```vue
<script setup lang="ts">
const inputEl = useTemplateRef<HTMLInputElement>('inputEl')
onMounted(() => inputEl.value?.focus())
</script>
<template><input ref="inputEl" /></template>
```

**`useId`（3.5+）**：生成组件级唯一 ID，SSR 中服务端与客户端一致。

```vue
<label :for="id">姓名</label>
<input :id="id" />
```

### 6.4 边界控制：useAttrs / useSlots / nextTick

```vue
<script setup lang="ts">
import { useAttrs, useSlots, nextTick } from 'vue'

const attrs = useAttrs()  // class、style、$attrs 中未声明的 props
const slots = useSlots()
const hasFooter = computed(() => !!slots.footer)

// nextTick：等待 DOM 更新完成
count.value++
await nextTick()
// 此时 DOM 已更新
</script>
```

### 6.5 样式杂项：useCssModule / useCssVars

```vue
<style module>.container { padding: 20px; }</style>

<script setup>
import { useCssModule, useCssVars } from 'vue'

const $style = useCssModule()           // JS 中访问 CSS Module 类名
useCssVars({ '--primary': '#1a3a5c' })  // 运行时动态 CSS 变量
</script>
```

---

## 面试要点速查

**高频必问**：
1. **Vue 2 vs Vue 3 响应式差异** → Proxy 解决了 defineProperty 的 5 大缺陷（见 3.3 对比表）
2. **ref vs reactive 怎么选** → 基本类型/需整体替换用 ref；复杂对象用 reactive；TS 友好选 ref
3. **v-model 原理** → 编译时语法糖，不同元素展开不同的 prop + event（见 2.1 表格）
4. **Diff 优化** → PatchFlag 标记动态节点 + 静态提升 + Block Tree 扁平化（见 4.2）
5. **组件通信方案选型** → 父子 props/emits，跨层级 provide/inject，全局 Pinia（见 1.3）

**进阶追问方向**：computed 缓存原理、effect cleanup 机制、WeakMap 为什么不用 Map、KeepAlive 缓存生命周期、defineModel 实现原理。
