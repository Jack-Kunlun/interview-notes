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
| 兼容性 | IE9+ | 不可 polyfill，需 ES6+ |
| 内存占用 | 每个属性一个 Dep | 共享 Proxy，无多余对象 |
```