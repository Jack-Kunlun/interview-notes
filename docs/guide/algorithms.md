---
title: 手写核心 JavaScript 方法
description: 深入掌握 call/apply/bind、new、深拷贝、数组去重与扁平化、树遍历、排序、LRU 缓存、EventEmitter、柯里化、大数相加等高频手写题，包含原理讲解、完整实现代码与对比总结。
---

# 手写核心 JavaScript 方法

本文覆盖前端面试中最高频的手写算法与 JavaScript 内置方法模拟，每个知识点包含**概念解释**、**原理剖析**、**完整代码实现**和**对比总结**。

---

## 手写 call / apply / bind

这三个方法都用于改变函数执行时的 `this` 指向，是 `Function.prototype` 上的核心方法。`call` 和 `apply` 会立即执行函数，区别仅在于参数传递方式；`bind` 不会立即执行，而是返回一个绑定了 `this` 的新函数。

### call

`fn.call(ctx, arg1, arg2, ...)`：第一个参数为函数执行时的 `this` 上下文，后续参数以**逗号分隔**逐个传入。

实现思路：将调用函数临时挂载到上下文对象上，以该对象方法的形式执行后删除挂载，返回结果。

```js
Function.prototype.myCall = function (ctx, ...args) {
  // 处理 null / undefined，默认指向 globalThis
  ctx = ctx ?? globalThis
  // 使用 Symbol 避免属性名冲突
  const key = Symbol('fn')
  ctx[key] = this
  const result = ctx[key](...args)
  delete ctx[key]
  return result
}

// 示例
const obj = { name: 'Alice' }
function greet(greeting) {
  return `${greeting}, I'm ${this.name}`
}
console.log(greet.myCall(obj, 'Hello')) // "Hello, I'm Alice"
```

### apply

`fn.apply(ctx, [arg1, arg2, ...])`：与 `call` 功能一致，但参数以**数组**形式传入。

实现思路与 `call` 几乎相同，区别在于参数解构方式。

```js
Function.prototype.myApply = function (ctx, args = []) {
  ctx = ctx ?? globalThis
  const key = Symbol('fn')
  ctx[key] = this
  const result = ctx[key](...args)
  delete ctx[key]
  return result
}

// 示例
const obj = { name: 'Bob' }
function introduce(age, city) {
  return `${this.name}, ${age} years old, from ${city}`
}
console.log(introduce.myApply(obj, [25, 'Beijing']))
// "Bob, 25 years old, from Beijing"
```

### bind

`fn.bind(ctx, ...preArgs)`：返回一个**新函数**，新函数的 `this` 被永久绑定为传入的上下文。支持**柯里化**——预设部分参数，新函数调用时拼接剩余参数。

关键点：`bind` 返回的函数可以作为构造函数使用（`new` 调用），此时 `this` 指向实例对象而非绑定的上下文。

```js
Function.prototype.myBind = function (ctx, ...preArgs) {
  const fn = this // 保存原函数引用
  function bound(...args) {
    // 如果是 new 调用（this instanceof bound），this 指向实例
    // 否则使用绑定的 ctx
    const finalCtx = this instanceof bound ? this : (ctx ?? globalThis)
    return fn.apply(finalCtx, [...preArgs, ...args])
  }
  // 维护原型链：让 bound 的实例能访问 fn.prototype
  bound.prototype = Object.create(fn.prototype)
  return bound
}

// 示例
const obj = { name: 'Carol' }
function say(a, b) {
  return `${this.name}: ${a} + ${b} = ${a + b}`
}
const boundSay = say.myBind(obj, 3)
console.log(boundSay(4)) // "Carol: 3 + 4 = 7"

// new 调用场景
function Person(name, age) {
  this.name = name
  this.age = age
}
const BoundPerson = Person.myBind(null, 'Dave')
const dave = new BoundPerson(30)
console.log(dave.name, dave.age) // "Dave" 30
```

### 三者对比

| 方法   | 执行时机     | 参数形式       | 返回值           | 是否可 new |
|--------|-------------|---------------|------------------|-----------|
| call   | 立即执行     | 逗号分隔       | 函数执行结果      | ❌        |
| apply  | 立即执行     | 数组           | 函数执行结果      | ❌        |
| bind   | 返回新函数   | 逗号分隔+柯里化 | 新函数（bound）   | ✅        |

---


### 💬 面试深度

- **标准回答**：call/apply/bind 都是 Function.prototype 上改变 this 指向的方法。call 和 apply 立即执行，区别是 call 逐个传参、apply 用数组传参。bind 不立即执行，而是返回一个永久绑定 this 的新函数，支持柯里化预设参数，而且 bind 返回的函数还能被 new 调用——此时 this 指向实例而非绑定的上下文。手写时核心思路是把函数临时挂到上下文对象上，用 Symbol 做 key 避免属性冲突，执行完再删除。

- **追问预判**：
  1. **"手写一个 softBind 或偏函数"**：softBind 是 bind 的变体——只在调用时 this 为 undefined/null/globalThis 时才使用绑定的 ctx，否则保留调用时的 this。实现方式：在 bound 函数内判断 `this === globalThis || this == null` 决定最终上下文，而非像 bind 那样永远用绑定的 ctx。偏函数（partial）则是不绑定 this，只预设部分参数，返回 `fn.apply(this, [...preArgs, ...args])`。
  2. **"bind 返回的函数作为构造函数时，原型链怎么处理"**：关键代码是 `bound.prototype = Object.create(fn.prototype)`。这样 new bound() 产生的实例 → bound.prototype → fn.prototype，所以 `instance instanceof fn` 为 true。用 Object.create 而非直接赋值是为了避免修改 bound.prototype 时污染 fn.prototype。

- **源码在哪**：V8 中 `Function.prototype.call` 的 C++ 实现在 `src/builtins/builtins-function.cc` 中的 `FunctionPrototypeCall`，bind 在同文件 `FunctionPrototypeBind`。

- **踩过的坑**：用 `ctx[key] = this` 时 key 用了普通字符串如 `'fn'`——如果 ctx 上恰好有同名属性就被覆盖了。后来改用 `Symbol('fn')` 解决。另一个坑是 `ctx ?? globalThis` 对原始类型如 `call(123)` 没转包装对象，更严谨的写法是 `Object(ctx)`，否则原始类型上挂属性会静默失败（严格模式下报错）。

- **项目选型**：参数固定用 call，参数已是数组用 apply，需延迟执行或预设参数用 bind——日常直接用原生方法，手写版的价值在于彻底理解 this 绑定规则，这对调试 React 类组件和回调中的 this 问题帮助巨大。

---
## 手写 new

### new 的四件事

`new` 操作符在执行构造函数时完成以下四个步骤：

1. **创建空对象**：在内存中创建一个全新的空对象。
2. **链接原型**：将新对象的 `__proto__` 指向构造函数的 `prototype`。
3. **绑定 this 并执行**：以新对象为 `this` 上下文执行构造函数，使新对象获得属性。
4. **返回对象**：若构造函数返回一个**引用类型**，则返回该引用；否则返回新创建的对象。

### 完整实现

```js
function myNew(constructor, ...args) {
  // 步骤 1+2：创建对象并链接原型
  const instance = Object.create(constructor.prototype)
  // 步骤 3：执行构造函数
  const result = constructor.apply(instance, args)
  // 步骤 4：判断返回值
  // 如果构造函数返回对象（包括函数、数组等引用类型），优先返回该结果
  // 否则返回创建的实例
  return (result !== null && typeof result === 'object') || typeof result === 'function'
    ? result
    : instance
}

// 示例
function Person(name, age) {
  this.name = name
  this.age = age
  // 不返回任何值，默认返回 this
}
const p = myNew(Person, 'Eve', 28)
console.log(p.name, p.age)          // "Eve" 28
console.log(p instanceof Person)    // true

// 边界：构造函数显式返回对象
function Factory(name) {
  this.name = name
  return { override: true }
}
const f = myNew(Factory, 'test')
console.log(f) // { override: true }（不是 Factory 实例）
```

---

## 深拷贝增强版

浅拷贝只复制一层属性值，对于引用类型只拷贝地址；深拷贝需要**递归复制所有嵌套的引用类型**，生成完全独立的对象。

### 增强版需要处理的问题

| 问题             | 解决方案                          |
|------------------|----------------------------------|
| 循环引用         | `WeakMap` 记录已拷贝对象          |
| `Map` / `Set`    | 识别类型后逐个元素递归拷贝          |
| `Date` / `RegExp`| 通过构造函数创建新实例              |
| 普通对象 / 数组  | 递归遍历属性                      |
| Symbol 键        | `Reflect.ownKeys` 一并处理         |
| 原型链           | 可选保留（通过 `constructor`）      |

### 完整实现代码

```js
function deepClone(value, cache = new WeakMap()) {
  // 基本类型 / null：直接返回
  if (value === null || typeof value !== 'object') return value

  // 循环引用检查
  if (cache.has(value)) return cache.get(value)

  // Date
  if (value instanceof Date) {
    return new Date(value.getTime())
  }

  // RegExp
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags)
  }

  // Map
  if (value instanceof Map) {
    const clonedMap = new Map()
    cache.set(value, clonedMap)
    for (const [k, v] of value) {
      clonedMap.set(deepClone(k, cache), deepClone(v, cache))
    }
    return clonedMap
  }

  // Set
  if (value instanceof Set) {
    const clonedSet = new Set()
    cache.set(value, clonedSet)
    for (const item of value) {
      clonedSet.add(deepClone(item, cache))
    }
    return clonedSet
  }

  // 数组 / 普通对象
  const cloned = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value))
  cache.set(value, cloned)

  // 遍历所有自有属性（含 Symbol 键）
  for (const key of Reflect.ownKeys(value)) {
    cloned[key] = deepClone(value[key], cache)
  }

  return cloned
}

// 示例
const circular = { a: 1 }
circular.self = circular // 循环引用
const cloned = deepClone(circular)
console.log(cloned.a)           // 1
console.log(cloned.self === cloned) // true（循环引用正确保留）

const complex = {
  date: new Date('2025-01-01'),
  map: new Map([['x', 10]]),
  set: new Set([1, 2, 3]),
  regex: /hello/gi,
  [Symbol('key')]: 'symbol-value'
}
const cloned2 = deepClone(complex)
console.log(cloned2.map.get('x'))         // 10
console.log(cloned2.date.getFullYear())   // 2025
console.log(cloned2.set.has(2))           // true
console.log(complex !== cloned2)          // true（独立对象）
```

---


### 💬 面试深度

- **标准回答**：深拷贝的核心是递归复制所有嵌套引用类型。我一般用 WeakMap 解决循环引用——拷贝前把源对象作为 key、克隆对象作为 value 存入 WeakMap，再次遇到同一个引用时直接返回缓存的克隆对象。特殊类型要分别处理：Date 用 getTime 创建新实例，RegExp 传 source 和 flags，Map/Set 逐个元素递归拷贝。遍历属性时用 Reflect.ownKeys 而不是 Object.keys，因为前者能拿到 Symbol 键。

- **追问预判**：
  1. **"为什么循环引用用 WeakMap 而不是 Map？WeakMap 的 key 必须是对象，这有什么限制"**：WeakMap 的 key 是弱引用，不影响垃圾回收——如果源对象在外部被置为 null，WeakMap 中对应的条目会被自动回收，避免内存泄漏。但在 deepClone 的场景里，cache 是局部变量，函数执行完就销毁了，所以这里用 Map 也没问题。面试官真正想听的是 WeakMap 的弱引用特性。至于 key 必须是对象的限制，在这里恰好不是问题——因为基本类型不会产生循环引用，根本不会进入 cache。
  2. **"如果对象的 key 本身也是对象（比如 Map 的 key），深拷贝怎么处理"**：对于 Map，遍历时对 key 和 value 都要递归深拷贝：`clonedMap.set(deepClone(k, cache), deepClone(v, cache))`。key 也可能有循环引用，所以传给 deepClone 时带上同一个 cache，这样 key 的循环引用也能被正确处理。

- **源码在哪**：V8 的 structuredClone 实现在 `src/bindings/v8/serialization/` 目录，lodash 的 cloneDeep 在 `lodash/.internal/baseClone.js`。

- **踩过的坑**：曾经对 Date 直接用展开运算符 `{...date}`——展开 Date 实例只能拿到 enumerable 属性，本质上是空对象 {}，丢失了时间值。正确做法是 `new Date(date.getTime())`。另一个坑是忘了处理 Function 和 Symbol——这类不可克隆的类型在 structuredClone 中会直接抛错，在业务中通常直接赋值引用而非深拷贝。

- **项目选型**：简单场景 `structuredClone` 原生 API 够用（但无 Function/Symbol 支持），复杂场景用 lodash.cloneDeep，手写版本主要用于面试和需要处理特殊类型（如自引用 Map、自定义类实例）的场景。

---
## 数组去重

### 五种基础方法

#### 1. Set（最简洁）

`Set` 天然只存储唯一值，结合解构即可一步去重。

```js
const arr = [1, 2, 2, 3, 3, 3]
const unique = [...new Set(arr)]
// [1, 2, 3]
```

#### 2. Map

利用 `Map` 的键唯一性进行去重，`has` + `set` 组合。

```js
function uniqueByMap(arr) {
  const map = new Map()
  const result = []
  for (const item of arr) {
    if (!map.has(item)) {
      map.set(item, true)
      result.push(item)
    }
  }
  return result
}
console.log(uniqueByMap([1, 2, 2, 3])) // [1, 2, 3]
```

#### 3. filter + indexOf

利用 `indexOf` 只返回第一个匹配项位置的特性，保留首个出现。

```js
function uniqueByFilter(arr) {
  return arr.filter((item, index) => arr.indexOf(item) === index)
}
console.log(uniqueByFilter([1, 2, 2, 3])) // [1, 2, 3]
```

#### 4. reduce

逐项累积，仅当累积结果中不存在当前项时才追加。

```js
function uniqueByReduce(arr) {
  return arr.reduce((acc, cur) => {
    if (!acc.includes(cur)) acc.push(cur)
    return acc
  }, [])
}
console.log(uniqueByReduce([1, 2, 2, 3])) // [1, 2, 3]
```

#### 5. 双重循环（经典法）

不使用任何 API 的朴素实现，时间复杂度 O(n²)。

```js
function uniqueByLoop(arr) {
  const result = []
  for (let i = 0; i < arr.length; i++) {
    let isDuplicate = false
    for (let j = 0; j < result.length; j++) {
      if (arr[i] === result[j]) {
        isDuplicate = true
        break
      }
    }
    if (!isDuplicate) result.push(arr[i])
  }
  return result
}
```

### 对象数组去重（按某属性）

当数组元素是对象时，需要按某个字段判断唯一性。

```js
function uniqueByKey(arr, key) {
  const seen = new Set()
  return arr.filter(item => {
    const val = item[key]
    if (seen.has(val)) return false
    seen.add(val)
    return true
  })
}

// 示例
const users = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 1, name: 'C' } // 重复 id
]
console.log(uniqueByKey(users, 'id'))
// [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
```

### 方法对比

| 方法              | 时间复杂度 | 空间复杂度 | 适用场景                     |
|-------------------|-----------|-----------|-----------------------------|
| Set               | O(n)      | O(n)      | 基本类型，最推荐              |
| Map               | O(n)      | O(n)      | 需要记录额外信息的场景          |
| filter + indexOf  | O(n²)     | O(1)      | 简单场景，大数据不推荐          |
| reduce + includes | O(n²)     | O(n)      | 函数式风格                   |
| 双重循环          | O(n²)     | O(1)      | 兼容旧环境，无 API 依赖        |

---

## 数组扁平化

将多层嵌套数组转换为单层数组。

### flat(Infinity)

ES2019 原生方法，传入 `Infinity` 可将任意深度嵌套展平。

```js
const nested = [1, [2, [3, [4, 5]]]]
console.log(nested.flat(Infinity)) // [1, 2, 3, 4, 5]

// 指定深度
console.log(nested.flat(2)) // [1, 2, 3, [4, 5]]
```

### 手写递归实现

递归遍历每个元素：是数组则继续递归，否则直接推入结果。

```js
function flattenRecursive(arr, depth = Infinity) {
  const result = []
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flattenRecursive(item, depth - 1))
    } else {
      result.push(item)
    }
  }
  return result
}

console.log(flattenRecursive([1, [2, [3, [4]]]])) // [1, 2, 3, 4]
console.log(flattenRecursive([1, [2, [3, [4]]]], 1)) // [1, 2, [3, [4]]]
```

### 栈实现（非递归）

使用栈（Stack）模拟递归，适合深度很大的场景，避免栈溢出。

```js
function flattenStack(arr) {
  const stack = [...arr]
  const result = []
  while (stack.length) {
    const item = stack.pop()
    if (Array.isArray(item)) {
      // 是数组则展开后重新推入栈
      stack.push(...item)
    } else {
      // 非数组元素直接加入结果（注意头插保持顺序）
      result.unshift(item)
    }
  }
  return result
}

console.log(flattenStack([1, [2, [3, [4]]]])) // [1, 2, 3, 4]
```

### 递归 vs 栈

| 特性           | 递归实现                         | 栈实现                           |
|----------------|---------------------------------|---------------------------------|
| 可读性         | ✅ 直观易懂                     | ⚠️ 需理解栈逻辑                 |
| 深度限制       | ❌ 超深嵌套可能栈溢出             | ✅ 不受调用栈限制               |
| 指定深度       | ✅ 容易控制 depth 参数           | ⚠️ 需要额外计数器               |
| 性能           | 一般                             | 较好（减少函数调用开销）          |

---

## 树遍历

树形结构是前端最常见的复杂数据结构之一（DOM 树、组件树、路由配置等），掌握 DFS / BFS 是基本功。

### 深度优先遍历（DFS）

尽可能深地访问子节点，访问完所有子节点后回溯。递归实现天然契合树的递归结构；栈实现模拟函数调用栈。

#### 递归实现

```js
// 前序遍历（根 → 左 → 右）
function dfsRecursive(node, callback) {
  if (!node) return
  callback(node)                       // 访问根
  for (const child of node.children || []) {
    dfsRecursive(child, callback)      // 递归访问子节点
  }
}

// 示例树
const tree = {
  id: 1, name: 'root',
  children: [
    { id: 2, name: 'a', children: [{ id: 3, name: 'a1' }] },
    { id: 4, name: 'b', children: [] }
  ]
}

const dfsResult = []
dfsRecursive(tree, node => dfsResult.push(node.id))
console.log(dfsResult) // [1, 2, 3, 4]
```

#### 栈实现

```js
function dfsStack(root, callback) {
  if (!root) return
  const stack = [root]
  while (stack.length) {
    const node = stack.pop()
    callback(node)
    // 倒序入栈保证从左到右顺序（栈是后进先出）
    const children = node.children || []
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i])
    }
  }
}

const dfsResult2 = []
dfsStack(tree, node => dfsResult2.push(node.id))
console.log(dfsResult2) // [1, 2, 3, 4]
```

### 广度优先遍历（BFS）

逐层访问——先访问完同一层的所有节点再进入下一层，使用队列（Queue）实现。

```js
function bfs(root, callback) {
  if (!root) return
  const queue = [root]
  while (queue.length) {
    const node = queue.shift()  // 队首出队
    callback(node)
    for (const child of node.children || []) {
      queue.push(child)          // 子节点入队尾
    }
  }
}

const bfsResult = []
bfs(tree, node => bfsResult.push(node.id))
console.log(bfsResult) // [1, 2, 4, 3]
```

### 树形数据 → 列表（含 parentId 标记）

将嵌套的树形结构"打平"为带 `parentId` 的扁平数组，常用于数据库存储或表格展示。

```js
function treeToList(tree, parentId = null) {
  const list = []
  for (const node of tree) {
    const { children, ...rest } = node
    list.push({ ...rest, parentId })
    if (children && children.length) {
      list.push(...treeToList(children, node.id))
    }
  }
  return list
}

// 示例
const forest = [
  { id: 1, name: 'A', children: [{ id: 2, name: 'A1' }] },
  { id: 3, name: 'B', children: [] }
]
console.log(treeToList(forest))
// [
//   { id: 1, name: 'A', parentId: null },
//   { id: 2, name: 'A1', parentId: 1 },
//   { id: 3, name: 'B', parentId: null }
// ]
```

反之，列表转树也是常见面试题：

```js
function listToTree(list, parentId = null) {
  return list
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: listToTree(list, item.id)
    }))
}
```

### DFS vs BFS 对比

| 特性       | DFS                          | BFS                          |
|------------|------------------------------|------------------------------|
| 数据结构   | 栈（递归调用栈 / 显式栈）      | 队列                         |
| 访问顺序   | 纵深优先，一条路走到头          | 逐层展开                     |
| 适用场景   | 路径查找、拓扑排序、回溯        | 最短路径、层级遍历、渲染树    |
| 空间复杂度 | O(h) — h 为树高度             | O(w) — w 为最宽层宽度         |

---

## 排序算法

### 冒泡排序（Bubble Sort）

每次遍历比较相邻元素，将较大值"冒泡"到末尾。时间复杂度 O(n²)，稳定排序。

```js
function bubbleSort(arr) {
  const len = arr.length
  for (let i = 0; i < len - 1; i++) {
    let swapped = false // 优化：提前终止
    for (let j = 0; j < len - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        swapped = true
      }
    }
    if (!swapped) break
  }
  return arr
}
```

### 选择排序（Selection Sort）

每次从未排序区间选出最小值，放到已排序区间的末尾。时间复杂度 O(n²)，不稳定。

```js
function selectionSort(arr) {
  const len = arr.length
  for (let i = 0; i < len - 1; i++) {
    let minIndex = i
    for (let j = i + 1; j < len; j++) {
      if (arr[j] < arr[minIndex]) minIndex = j
    }
    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]]
    }
  }
  return arr
}
```

### 插入排序（Insertion Sort）

将未排序元素逐个插入已排序区间的正确位置。时间复杂度 O(n²)，稳定，**对小规模/近乎有序数据表现优异**。

```js
function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i]
    let j = i - 1
    while (j >= 0 && arr[j] > current) {
      arr[j + 1] = arr[j] // 后移
      j--
    }
    arr[j + 1] = current // 插入
  }
  return arr
}
```

### 快速排序（Quick Sort）

**分治思想**：选取基准值（pivot），将数组分为小于和大于基准的两部分，递归排序。平均 O(n log n)，最坏 O(n²)，不稳定。

```js
function quickSort(arr) {
  if (arr.length <= 1) return arr
  const pivot = arr[Math.floor(arr.length / 2)]
  const left = []
  const right = []
  const equal = []
  for (const item of arr) {
    if (item < pivot) left.push(item)
    else if (item > pivot) right.push(item)
    else equal.push(item)
  }
  return [...quickSort(left), ...equal, ...quickSort(right)]
}

// 原地快排（节省空间，面试进阶）
function quickSortInPlace(arr, left = 0, right = arr.length - 1) {
  if (left >= right) return
  const pivotIndex = partition(arr, left, right)
  quickSortInPlace(arr, left, pivotIndex - 1)
  quickSortInPlace(arr, pivotIndex + 1, right)
  return arr
}

function partition(arr, left, right) {
  const pivot = arr[right] // 选最右为基准
  let i = left
  for (let j = left; j < right; j++) {
    if (arr[j] < pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]]
      i++
    }
  }
  [arr[i], arr[right]] = [arr[right], arr[i]]
  return i
}

console.log(quickSortInPlace([5, 2, 9, 1, 5, 6]))
// [1, 2, 5, 5, 6, 9]
```

### 四者对比

| 算法     | 平均时间   | 最坏时间   | 空间     | 稳定性 | 适用场景                     |
|----------|-----------|-----------|---------|--------|-----------------------------|
| 冒泡     | O(n²)     | O(n²)     | O(1)    | ✅ 稳定 | 教学，小数据量               |
| 选择     | O(n²)     | O(n²)     | O(1)    | ❌ 不稳定| 数据量小，交换成本高          |
| 插入     | O(n²)     | O(n²)     | O(1)    | ✅ 稳定 | 近乎有序数据，小数据量        |
| 快速     | O(n log n)| O(n²)     | O(log n)| ❌ 不稳定| 通用，大数据量（实际首选）     |

---


### 💬 面试深度

- **标准回答**：快排是分治思想，选基准值把数组分成小于和大于两部分再递归，平均 O(n log n)，但基准选得不好会退化到 O(n²)。实际工程中 V8 用的是 TimSort——一种混合排序，结合了归并排序的稳定性和插入排序在小数组上的高效性，平均和最坏都是 O(n log n)，且是稳定排序。面试手写时如果要求原地排序，用 Lomuto 分区方案选最右为基准，两个指针扫描交换。

- **追问预判**：
  1. **"为什么 V8 不用快排而用 TimSort"**：快排不稳定（相同元素的相对顺序可能改变），且最坏 O(n²)。TimSort 利用了现实数据中经常存在有序片段（run）的特点，把这些 run 用归并合并，在近乎有序的数组上接近 O(n)，且稳定。
  2. **"Array.prototype.sort 的比较函数返回 0、正数、负数分别代表什么"**：返回负数表示 a 在 b 前，正数表示 b 在 a 前，0 表示不变（但不保证稳定——ES2019 之前规范不要求稳定，现在 V8 TimSort 是稳定的）。

- **源码在哪**：V8 的 TimSort 实现：`v8/third_party/v8/builtins/array-sort.tq`（Torque 语言），核心逻辑在 `deps/v8/src/builtins/array-sort.tq` 中的 `ArrayTimSort`。

- **踩过的坑**：直接用 `arr.sort()` 对数字数组排序——`[1, 2, 10, 20].sort()` 结果是 `[1, 10, 2, 20]`，因为默认按字符串 Unicode 序排列。必须传比较函数 `(a, b) => a - b`。

- **项目选型**：日常开发直接用 `Array.prototype.sort`（V8 已是最优的 TimSort），手写排序的价值在于理解分治思想和复杂度分析，这对算法面试和性能敏感场景（如手写 TopK）非常重要。

---
## LRU 缓存

LRU（Least Recently Used）缓存：当缓存达到容量上限时，淘汰**最久未使用**的数据。`Map` 的遍历顺序等于插入顺序，天然适合实现 LRU——每次访问后删除再重新插入即可移到末尾。

### 完整 class 代码

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity
    this.cache = new Map()
  }

  get(key) {
    if (!this.cache.has(key)) return -1
    // 将访问的 key 移到末尾（表示最近使用）
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  put(key, value) {
    // 已存在：先删除再重新插入
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.capacity) {
      // 超出容量：删除最久未使用（Map 的第一个键）
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    this.cache.set(key, value)
  }
}

// 示例
const lru = new LRUCache(2)
lru.put(1, 'A')   // {1: 'A'}
lru.put(2, 'B')   // {1: 'A', 2: 'B'}
console.log(lru.get(1)) // 'A' → 1 移到末尾，{2: 'B', 1: 'A'}
lru.put(3, 'C')   // 淘汰 2，{1: 'A', 3: 'C'}
console.log(lru.get(2)) // -1（已淘汰）
console.log(lru.get(1)) // 'A'
console.log(lru.get(3)) // 'C'
```

### 核心原理

- `Map.keys().next().value` 获取第一个（最旧）键——O(1)。
- `delete` + `set` 组合将访问项移到末尾——O(1)。
- 所有操作均为 O(1) 时间复杂度。

---


### 💬 面试深度

- **标准回答**：LRU 缓存的核心是"容量满了淘汰最久未使用的"。用 Map 实现是最简洁的——Map 的遍历顺序就是插入顺序，get 时 delete 再 set 就能把访问项移到末尾，put 时如果满了就删 `map.keys().next().value`（第一个键）。三个操作 get、put、淘汰都是 O(1)。如果面试官要求不用 Map，就用双向链表+哈希表——链表维护访问顺序，哈希表实现 O(1) 查找。

- **追问预判**：
  1. **"Map 替代双向链表的原理是什么？Map 的 keys() 迭代器为什么能拿到最旧的键"**：ES6 Map 的迭代顺序严格等于插入顺序。每次 get 先 delete 再 set，相当于把该键"重新插入"到末尾，所以 `map.keys().next().value` 始终是第一次插入后没有被访问过的键——即最久未使用。
  2. **"如果面试官让你用双向链表实现 LRU，你会怎么设计"**：维护 head 和 tail 哨兵节点——最近使用的放在 head.next，最久未使用在 tail.prev。get 时通过哈希表 O(1) 找到节点，断开并移到 head 后。put 时如果容量满了，删除 tail.prev。核心是链表指针操作不能出错。

- **源码在哪**：Node.js 内部没用 LRU 做通用缓存模块，但 V8 的编译缓存（code cache）使用了类似 LRU 策略，源码在 `v8/src/objects/compilation-cache-table.cc`。

- **踩过的坑**：在 put 方法里先 `cache.has(key)` 判断再 delete，逻辑是对的，但如果先 delete 再判断 size，在某些边界（比如 key 已存在且刚好在满容时 put 同 key）顺序错了会导致误删。正确顺序：先检查 key 是否存在 → 存在则 delete 再 set（不移除最旧），不存在且满了才先删最旧再 set。

- **项目选型**：前端做请求去重/缓存时直接用 `new Map()` + 手动维护容量即可，不需要引入 lru-cache 库。但如果缓存项有 TTL 过期需求，考虑用 `lru-cache` npm 包（支持 maxAge）。

---
## EventEmitter

观察者模式的经典实现，Node.js `events` 模块的核心。需要实现四个方法：`on`（订阅）、`once`（一次性订阅）、`emit`（发布）、`off`（取消订阅）。

### 完整实现

```js
class EventEmitter {
  constructor() {
    // 事件名 → 回调数组的映射
    this._events = Object.create(null)
  }

  // 订阅事件
  on(event, callback) {
    if (!this._events[event]) {
      this._events[event] = []
    }
    this._events[event].push(callback)
    return this // 支持链式调用
  }

  // 一次性订阅：触发后自动取消
  once(event, callback) {
    const wrapper = (...args) => {
      callback.apply(this, args)
      this.off(event, wrapper) // 执行后移除自身
    }
    wrapper._original = callback // 保留原始回调引用，便于 off 精确匹配
    this.on(event, wrapper)
    return this
  }

  // 发布事件
  emit(event, ...args) {
    const callbacks = this._events[event]
    if (!callbacks || callbacks.length === 0) return false
    // 拷贝一份再遍历，避免回调中修改数组（如 once 中 off）导致迭代异常
    for (const callback of [...callbacks]) {
      callback.apply(this, args)
    }
    return true
  }

  // 取消订阅
  off(event, callback) {
    const callbacks = this._events[event]
    if (!callbacks) return this
    if (!callback) {
      // 不传 callback → 移除该事件的所有回调
      delete this._events[event]
    } else {
      this._events[event] = callbacks.filter(
        cb => cb !== callback && cb._original !== callback
      )
    }
    return this
  }
}

// 示例
const emitter = new EventEmitter()

function onConnect(msg) {
  console.log('connected:', msg)
}
function onOnce(msg) {
  console.log('once:', msg)
}

emitter.on('connect', onConnect)
emitter.once('connect', onOnce)

emitter.emit('connect', 'hello')
// "connected: hello"
// "once: hello"

emitter.emit('connect', 'world')
// "connected: world"  （once 回调已移除，不再触发）

emitter.off('connect', onConnect)
emitter.emit('connect', 'third')
// （无输出，所有回调已移除）
```

---


### 💬 面试深度

- **标准回答**：EventEmitter 是发布-订阅模式的实现。on 注册回调存到事件名对应的数组，emit 遍历数组执行，off 从数组移除，once 包装一个执行后自动 off 的回调。关键细节是 emit 时要先拷贝回调数组再遍历——因为 once 的回调在执行时会调用 off 修改原数组，如果直接遍历原数组会导致跳过元素或下标错乱。off 匹配回调时要用 `cb !== callback && cb._original !== callback` 来处理 once 包装的情况。

- **追问预判**：
  1. **"emit 时如果某个回调里触发了 off 移除其他回调，会发生什么"**：如果 emit 里直接遍历 `this._events[event]` 而不拷贝，splice/delete 会导致数组长度变化、索引错乱，后面的回调可能被跳过。用 `[...callbacks]` 创建浅拷贝就能避免——遍历的是快照，修改原数组不影响迭代。这也是 Node.js 源码 `lib/events.js` 中 `emit` 的实现方式。
  2. **"如何实现事件优先级或异步 emit"**：优先级可以让回调变成 `{ fn, priority }` 对象，注册时按优先级插入；异步 emit 用 `process.nextTick` 或 `Promise.resolve().then()` 包裹回调执行，常见于需要批量触发后统一处理的场景。

- **源码在哪**：Node.js 的 EventEmitter 实现在 `lib/events.js`，核心方法 `_addListener`、`emit`、`removeListener` 都在该文件中。

- **踩过的坑**：once 实现时直接用 `this.on(event, callback); this.off(event, callback)`——off 的第二个参数和 on 注册的不是同一个引用（once 注册的是 wrapper），导致 off 无效。正确做法是：on 注册 wrapper，wrapper 内部先执行 callback 再 `this.off(event, wrapper)`，同时给 wrapper 挂 `_original` 引用方便外部 off 精确匹配。

- **项目选型**：前端组件通信用 EventEmitter 轻量且解耦，Vue 2 的 `$on/$emit/$off` 底层就是类似的实现。需要类型安全的场景可以用 mitt（3KB）或手写一个带 TypeScript 泛型的版本。

---
## 柯里化（Curry）

柯里化将**多参数函数**转换为**一系列单参数函数**的链式调用。核心思想：收集参数，参数够了就执行原函数，不够就返回新函数继续收集。

### curry 函数实现

```js
function curry(fn, ...preArgs) {
  if (preArgs.length >= fn.length) {
    // 参数够了，直接执行
    return fn(...preArgs)
  }
  // 参数不够，返回新函数继续收集
  return (...args) => curry(fn, ...preArgs, ...args)
}

// 示例：add(1)(2)(3)
function add(a, b, c) {
  return a + b + c
}
const curriedAdd = curry(add)
console.log(curriedAdd(1)(2)(3))   // 6
console.log(curriedAdd(1, 2)(3))   // 6
console.log(curriedAdd(1)(2, 3))   // 6
console.log(curriedAdd(1, 2, 3))   // 6
```

### 占位符增强版

支持用占位符跳过参数，在后续调用中填充：

```js
const _ = Symbol('placeholder')

function curryWithPlaceholder(fn, ...preArgs) {
  const validArgs = preArgs.slice(0, fn.length)
  const hasPlaceholder = validArgs.slice(0, fn.length).some(arg => arg === _)
  const enoughArgs = validArgs.filter(arg => arg !== _).length >= fn.length

  if (!hasPlaceholder && validArgs.length >= fn.length) {
    return fn(...validArgs)
  }

  return (...args) => {
    // 用新参数填充占位符
    const merged = []
    let argIndex = 0
    for (const pre of validArgs) {
      if (pre === _ && argIndex < args.length) {
        merged.push(args[argIndex++])
      } else {
        merged.push(pre)
      }
    }
    // 剩余新参数追加
    while (argIndex < args.length) {
      merged.push(args[argIndex++])
    }
    return curryWithPlaceholder(fn, ...merged)
  }
}
```

---


### 💬 面试深度

- **标准回答**：柯里化把多参数函数转成单参数链式调用——参数够了就执行，不够就返回新函数继续收。核心是判断 `preArgs.length >= fn.length`，fn.length 就是函数的形参个数。这个模式在前端最实用的场景是函数式编程中的"部分应用"：比如写一个日志函数 `log(level, time, message)`，柯里化后可以预设 `const errorLog = curriedLog('ERROR')`，后续只需要传时间和消息。

- **追问预判**：
  1. **"fn.length 有什么局限？如果函数用了 rest 参数或默认参数怎么办"**：fn.length 只统计第一个默认参数之前的形参个数，rest 参数不计入。比如 `function(a, b = 1, c) {}` 的 fn.length 是 1。这种情况下 curry 的"参数够了"判断会失效，需要在设计时约定固定的参数个数。
  2. **"柯里化和偏函数（partial application）的区别"**：柯里化每次只传一个参数，链式调用 `curry(fn)(a)(b)(c)`。偏函数是一次性预设多个参数：`partial(fn, a, b)` 返回只需传剩余参数的函数。本质相关但粒度不同——curry 是对函数的一种变换，partial 是直接应用。

- **踩过的坑**：用 `preArgs.length >= fn.length` 判断时，如果原函数 fn 的形参数为 0（如 `() => 42` 或 `function(...args) {}`），第一次调用 curry 就会直接执行，后续链式调用会报错。兼容写法是拿到 curry 后至少调用一次空参 `curriedFn()` 再传参，或在 curry 内部对 fn.length === 0 做特殊处理。

- **项目选型**：Redux 中间件就是柯里化的经典应用——`store => next => action => {}` 三层嵌套，让每个中间件可以独立配置 store、访问 next、处理 action。前端项目里如果经常复用部分参数的函数，用 lodash.curry 即可，不需要手写。

---
## 大数相加

JavaScript 的 `Number` 类型使用 IEEE 754 双精度浮点数，安全整数范围为 `-(2^53 - 1)` 到 `2^53 - 1`（即 `Number.MIN_SAFE_INTEGER` 到 `Number.MAX_SAFE_INTEGER`）。超出此范围的整数运算会丢失精度，需用**字符串逐位相加**模拟。

### 完整实现

```js
function addBigNumbers(num1, num2) {
  let i = num1.length - 1   // 从个位开始
  let j = num2.length - 1
  let carry = 0             // 进位
  const result = []

  while (i >= 0 || j >= 0 || carry) {
    const digit1 = i >= 0 ? +num1[i] : 0
    const digit2 = j >= 0 ? +num2[j] : 0
    const sum = digit1 + digit2 + carry

    result.push(sum % 10)   // 当前位
    carry = Math.floor(sum / 10) // 进位

    i--
    j--
  }

  return result.reverse().join('')
}

// 示例
console.log(addBigNumbers('99999999999999999999', '1'))
// "100000000000000000000"

console.log(addBigNumbers('12345678901234567890', '98765432109876543210'))
// "111111111011111111100"

// 验证：普通加法会溢出
console.log(99999999999999999999 + 1) // 100000000000000000000（碰巧 OK）
console.log(9007199254740992 + 1)     // 9007199254740992（丢失精度！）
```

### 原理说明

1. 从两个字符串的末尾（个位）开始，逐位转为数字相加。
2. `sum % 10` 得到当前位的值，`Math.floor(sum / 10)` 得到进位。
3. 只要还有未处理完的位数或进位不为 0，循环继续。
4. 最后将结果数组反转并连接成字符串。

| 方案           | 适用场景              | 限制                         |
|----------------|----------------------|------------------------------|
| `Number` 直接加 | 日常中小数值          | 超出 `2^53` 精度丢失          |
| `BigInt`       | ES2020+ 环境          | 旧浏览器不支持，不能混用 Number |
| 字符串逐位相加  | 任意长度、全兼容       | 仅支持整数加法               |

---


### 💬 面试深度

- **标准回答**：JS 的 Number 安全整数范围是 ±2^53，超出会丢精度。大数相加的思路是模拟小学数学竖式加法：从两个字符串末尾开始逐位相加，sum % 10 是当前位，Math.floor(sum / 10) 是进位。循环条件是还有未处理位或进位不为 0。最后结果数组 reverse 再 join。现在 ES2020 有 BigInt 可以直接用，但手写题考的是字符串操作和进位思维。

- **追问预判**：
  1. **"如果改成大数相乘怎么实现"**：大数相乘也是竖式模拟，但更复杂：num1 每位和 num2 每位相乘，结果存入 `result[i + j + 1]` 位置，最后统一处理进位。时间复杂度 O(n*m)。
  2. **"BigInt 能和 Number 混用吗？有什么限制"**：不能直接混用——`1n + 1` 会报 TypeError，必须显式转换。但 `BigInt(2^53)` 已经是 Number 的近似值，要用 `BigInt('9007199254740992')` 字符串构造才精确。BigInt 也不支持 Math 对象的方法。

- **踩过的坑**：用 `+num1[i]` 把字符转数字没问题，但用 `parseInt` 要注意——`parseInt` 对单个数字一样，但如果后面改成了 `parseInt(num1.slice(i, i+2))`（想一次取两位加速计算），进制和空字符串陷阱都来了。保持逐位取最稳妥。

- **项目选型**：涉及金额计算优先用第三方库（如 big.js、decimal.js），它们支持小数和四舍五入。BigInt 适合整数场景且不需要兼容旧浏览器时直接用。手写字符串相加主要用于面试和了解底层原理。

---
## 总结

本文覆盖的手写题是前端面试的**核心基础**，每个方法都要求能在白板/编辑器中独立完成。建议按以下优先级练习：

1. **必会**：call/apply/bind、new、深拷贝、数组去重、快排
2. **高频**：LRU、EventEmitter、柯里化、树遍历
3. **进阶**：占位符柯里化、原地快排、大数相加

掌握这些代码的同时，理解其**设计思想**（分治、缓存、发布-订阅、函数式）会更有助于在面试中灵活应变。
