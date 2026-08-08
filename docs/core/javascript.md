---
title: JavaScript 基础
description: 数据类型、类型转换、模块化、作用域闭包、this、原型链、new操作符、继承、深浅拷贝、防抖节流、柯里化、组合、记忆化、Promise、async/await、Proxy、大文件上传、手写实现
---

# JavaScript 基础

> 语言基础 → 核心机制 → 实用技巧 → 异步编程 → 进阶特性 → 综合实战 → 文件处理实战

---

## 一、语言基础

先从最基础的说起——数据类型、变量声明、日常必用的 ES6+ 语法。

### 1.1 数据类型

JavaScript 共有 **7 种基本类型**：`string`、`number`、`boolean`、`null`、`undefined`、`symbol`、`bigint`，按值存储于栈内存。引用类型（`Object`、`Array`、`Function` 等）按引用存储于堆内存，变量持有其地址。`typeof` 是判断基本类型的首选方式，但 `typeof null === 'object'` 是第一版 JS 遗留的著名 bug——`null` 在二进制标记中被识别为对象类型前缀 `000`。

```js
// 基本类型
typeof 'hello'     // 'string'
typeof 42          // 'number'
typeof true        // 'boolean'
typeof undefined   // 'undefined'
typeof Symbol()    // 'symbol'
typeof 123n        // 'bigint'
typeof null        // 'object' ← 历史 bug，JS 从未修复以避免破坏现有代码

// 引用类型
typeof {}          // 'object'
typeof []          // 'object'（须用 Array.isArray 区分）
typeof function(){}// 'function'（函数是特殊的对象）

// 精确判断
Object.prototype.toString.call([])   // '[object Array]'
Object.prototype.toString.call(null) // '[object Null]'
```

### 1.2 变量声明与暂时性死区（TDZ）

`var` 声明的变量会被提升到作用域顶部并初始化为 `undefined`，所以声明前访问不会报错。`let`/`const` 同样有提升，但进入**暂时性死区**（TDZ）——从块开始到声明行之间，变量存在但不可访问，访问会抛出 `ReferenceError`。`const` 额外要求声明时必须初始化且不能重新赋值（引用不可变，但对象属性仍可修改）。

```js
console.log(a)  // undefined（var 提升，初始化为 undefined）
var a = 1

console.log(b)  // ❌ ReferenceError（let 在 TDZ 中，不能访问）
let b = 2

// const 同样有 TDZ，且声明时必须初始化
const c = 3     // ✅
// c = 4        // ❌ TypeError: Assignment to constant variable
const obj = { x: 1 }
obj.x = 2       // ✅ const 限制的是变量绑定，不是值本身
```

### 1.3 ES6+ 常用语法

ES6（ES2015）及后续版本引入了大量实用特性。解构让从对象/数组中提取值变得简洁；模板字符串支持多行和 `${}` 插值；箭头函数简化了函数表达式且不绑定自己的 `this`（详见 [this 指向](#_2-2-this-指向)）；可选链 `?.` 安全访问深层属性；空值合并 `??` 只在 `null`/`undefined` 时使用默认值，比 `||` 更精确。

```js
// 解构
const { name, age } = user
const [first, ...rest] = [1, 2, 3, 4]   // first=1, rest=[2,3,4]

// 模板字符串
const msg = `Hello, ${name}. You are ${age} years old.`

// 箭头函数
const add = (a, b) => a + b
const greet = name => `Hi ${name}`

// 可选链 ?.
const city = user?.address?.city          // 任一中间值为 null/undefined 返回 undefined
const method = obj?.method?.()            // 安全调用可能不存在的方法

// 空值合并 ??
const val = input ?? 'default'            // input 为 null 或 undefined 时才用默认值
// vs ||
console.log(0 || 'fallback')             // 'fallback' —— 0 是 falsy
console.log(0 ?? 'fallback')             // 0 —— ?? 只拦截 null/undefined
```

---

## 二、核心机制

闭包、`this`、原型链——JS 的三大核心机制，每个前端都绕不开。

### 2.1 作用域与闭包

**定义**：闭包 = 函数 + 其引用的外层词法环境，即使外层函数已执行完毕，内层函数仍能访问外层变量。ES6 之前只有全局作用域和函数作用域，`let`/`const` 引入了块级作用域。闭包的核心价值在于让变量私有化并保持存活。

```js
function createCounter() {
  let count = 0  // 被内部函数引用，不会被 GC
  return {
    increment: () => ++count,
    get: () => count
  }
}
const c = createCounter()
c.increment()  // 1
c.increment()  // 2
```

**应用**：模块化（IIFE）、柯里化、防抖节流、React 的 `useState` / Vue 的 `ref` 本质都是闭包。

**内存注意**：闭包会让被引用的外层变量无法被 GC 回收，不需要时置 `null` 释放引用。

---

## 三、实用技巧

基础语法和核心机制都通了，现在来看看实际开发中最常用的两种工具函数——面试必问，日常必写。

### 3.1 深浅拷贝

浅拷贝只复制对象第一层属性，嵌套引用仍共享；深拷贝递归复制所有层级。`JSON.parse(JSON.stringify(obj))` 最简单但丢失 `undefined`、函数、`Symbol`、`Date`、`RegExp`，且无法处理循环引用。面试中需能手写递归深拷贝，借助 `WeakMap` 解决循环引用。

```js
// 浅拷贝：只复制一层
const shallow = { ...obj }          // 展开运算符
const shallow2 = Object.assign({}, obj)

// 深拷贝：JSON 方式（简单但有局限）
const deep = JSON.parse(JSON.stringify(obj))
// ❌ 丢失：函数、undefined、Symbol、Date、RegExp、循环引用

// 手写递归深拷贝（处理常见类型）
function deepClone(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj
  if (map.has(obj)) return map.get(obj)           // 循环引用
  const clone = Array.isArray(obj) ? [] : {}
  map.set(obj, clone)
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key], map)
  }
  return clone
}
```

### 3.2 防抖（debounce）vs 节流（throttle）

防抖和节流都是高频事件性能优化手段。防抖在连续触发时只执行最后一次（适合搜索框输入、窗口 resize）；节流固定时间间隔执行一次（适合滚动加载、按钮防重复点击）。

| | 防抖（debounce） | 节流（throttle） |
|---|---|---|
| 行为 | 连续触发只执行最后一次 | 固定间隔执行一次 |
| 场景 | 搜索框输入、窗口 resize | 滚动事件、按钮点击 |

```js
// 防抖：n 秒内再次触发则重新计时
function debounce(fn, delay = 300) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 节流：每 n 秒最多执行一次
function throttle(fn, delay = 300) {
  let last = 0
  return function (...args) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(this, args)
    }
  }
}
```

---

## 四、异步编程

JS 是单线程的，但前端 90% 的复杂问题都跟异步有关。从 Promise 入门，到 Generator 理解暂停-恢复，最后到 async/await——这是 JS 异步的三层递进。

### 4.1 Promise

Promise 有三种状态：pending → fulfilled / rejected，状态不可逆。`.then()` 返回新 Promise 实现链式调用。`.catch()` 能捕获链上任意位置的错误。四个并发静态方法各有适用场景，面试高频。

```js
// 链式调用：then 返回新 Promise
fetchUser(id)
  .then(user => fetchOrders(user.id))
  .then(orders => render(orders))
  .catch(err => console.error(err))    // 任一环节出错都会进入 catch

// 并发控制
Promise.all([p1, p2, p3])              // 全部成功 → 结果数组；一个失败 → reject
Promise.allSettled([p1, p2, p3])       // 全部完成（无论成败）→ [{status, value/reason}]
Promise.race([p1, p2, p3])             // 第一个 settle 的结果
Promise.any([p1, p2, p3])              // 第一个 fulfilled；全 reject → AggregateError
```

---

## 五、进阶特性

基础扎实了，来看看 JS 中两个高级但实用的特性——Proxy 是 Vue 3 响应式的底层，WeakMap 是避免内存泄漏的利器。

### 5.1 Proxy 与 Reflect

`Proxy` 可拦截对目标对象的 13 种底层操作，包括 `get`、`set`、`has`、`deleteProperty`、`apply`、`construct` 等，是 Vue 3 响应式系统的底层基础。`Reflect` 提供与 Proxy trap 一一对应的默认行为方法，让代理内部转发操作更优雅，同时将命令式操作（如 `delete obj[key]`）转为函数式（`Reflect.deleteProperty(obj, key)`）。

```js
// Proxy 常见拦截
const handler = {
  get(target, key, receiver) {
    console.log(`读取 ${String(key)}`)
    return Reflect.get(target, key, receiver)   // 推荐用 Reflect 转发默认行为
  },
  set(target, key, value, receiver) {
    if (key === 'age' && typeof value !== 'number') {
      throw new TypeError('age 必须是数字')
    }
    return Reflect.set(target, key, value, receiver)
  }
}
const user = new Proxy({ name: 'fenglan', age: 18 }, handler)
user.name     // 触发 get → 输出 "读取 name"
user.age = 20 // 触发 set → 校验通过
// user.age = 'x' // ❌ TypeError

// 13 种 trap 一览：get, set, has, deleteProperty, ownKeys, getOwnPropertyDescriptor,
// defineProperty, preventExtensions, getPrototypeOf, setPrototypeOf, isExtensible,
// apply, construct
```

### 5.2 WeakMap 与 WeakSet

`WeakMap` 的键必须是对象，且对键的引用是**弱引用**——不计入 GC 引用计数。当键对象没有其他引用时，GC 可以回收它，`WeakMap` 中对应条目自动移除。这使其成为存储对象私有数据、缓存元信息的理想选择。`WeakSet` 同理，只能存对象且是弱引用。

```js
// WeakMap：键弱引用 → GC 友好
const wm = new WeakMap()
let obj = { id: 1 }
wm.set(obj, 'metadata')
obj = null  // 没有其他引用指向 { id: 1 } → GC 可回收，wm 中条目自动消失

// 典型场景：DOM 节点关联数据
// const nodeData = new WeakMap()
// nodeData.set(domElement, { clicks: 0 })
// 当 DOM 元素被移除且没有其他引用 → 数据自动 GC，无内存泄漏

// WeakSet：存对象引用，防重复 + 弱引用
const ws = new WeakSet()
let a = {}
ws.add(a)
ws.has(a)   // true
a = null    // GC 可回收
```

| 特性 | Map / Set | WeakMap / WeakSet |
|---|---|---|
| 键类型 | 任意值 | 仅对象 |
| 引用类型 | 强引用 | 弱引用（不影响 GC） |
| 可迭代 | ✅ `forEach`、`for...of` | ❌ 不可迭代（条目可能随时消失） |
| `size` 属性 | ✅ | ❌ |
| 典型场景 | 通用键值存储 | 对象元数据、私有属性、DOM 关联 |

---

## 六、综合实战

前面所有知识点的终点——手写 Promise 和 async/await。这是面试的终极考题，考察你是否真正理解了异步、状态机、链式调用和 Generator。

### 6.1 手写 MyPromise

手写 Promise 是面试极高频考点，考察对异步流程、状态管理、链式调用和微任务机制的深层理解。完整的 MyPromise 需要实现：三种状态管理、`then` 链式调用（then 必须返回新 Promise 以支持链式）、`catch`、异步执行（用 setTimeout 模拟微任务）、以及 `Promise.resolve` / `Promise.reject` / `Promise.all` / `Promise.race` 四个静态方法。

#### 三种状态（pending / fulfilled / rejected）

Promise 的核心是状态机：初始为 `pending`，成功调用 `resolve` 转为 `fulfilled`，失败调用 `reject` 转为 `rejected`。**状态一旦转换就不可逆**（pending → fulfilled 或 pending → rejected），这是 Promise 可靠性的基础。`resolve` 和 `reject` 内部需要判断当前状态是否为 `pending`，防止重复调用改变结果。

#### then 链式调用（返回新 Promise）

`.then(onFulfilled, onRejected)` 必须返回一个**新的 Promise**，这正是链式调用的根基——每个 `.then()` 返回新 Promise，下一个 `.then()` 注册在新 Promise 上。`then` 的回调返回值有三种情况需要处理：返回普通值（直接 resolve）、返回 Promise（等待其 settled 再 resolve/reject）、抛出异常（reject）。

#### 异步执行（setTimeout 模拟微任务）

规范要求 `onFulfilled` / `onRejected` 在微任务中执行，但手写实现无法直接创建微任务（`queueMicrotask` 在旧环境不可用），通常用 `setTimeout(fn, 0)` 模拟。核心思路：在 `then` 中将所有回调延迟到下一轮事件循环执行，保证即使 Promise 已 settled，回调也异步执行。

#### catch

`catch(onRejected)` 本质是 `.then(null, onRejected)` 的语法糖——只注册失败回调，不处理成功。实现时直接复用 `then` 方法即可。

#### Promise.resolve / Promise.reject

`Promise.resolve(value)` 将任意值包装为 resolved 的 Promise；如果传入的已经是 Promise 则直接返回。`Promise.reject(reason)` 返回一个 rejected 的 Promise，不管传入什么值都作为拒绝原因。

#### Promise.all / Promise.race

`Promise.all`：接收可迭代对象，全部 fulfilled 时 resolve 结果数组（保持输入顺序），任一 rejected 则立即 reject 第一个错误。`Promise.race`：接收可迭代对象，第一个 settled 的 Promise 直接决定最终状态。

| 静态方法 | 触发 resolve | 触发 reject | 适用场景 |
|---|---|---|---|
| `Promise.all` | 全部 fulfilled | 任一 rejected | 并行请求，全部成功才继续 |
| `Promise.race` | 第一个 settled | 第一个 settled | 超时竞速、多个数据源取最快 |
| `Promise.allSettled` | 全部 settled（不论成败） | 永不 reject | 批量请求不因个别失败中断 |
| `Promise.any` | 第一个 fulfilled | 全部 rejected | 多个备用源取第一个成功 |

#### 完整实现代码

```js
// ========== 状态常量 ==========
const PENDING   = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED  = 'rejected'

class MyPromise {
  constructor(executor) {
    this.state = PENDING          // 当前状态
    this.value = undefined        // resolve 值 / reject 原因
    this.onFulfilledCallbacks = [] // 成功回调队列
    this.onRejectedCallbacks  = [] // 失败回调队列

    const resolve = (value) => {
      // 只有 pending 才可转换状态（状态不可逆）
      if (this.state !== PENDING) return
      this.state = FULFILLED
      this.value = value
      // 依次执行所有已注册的成功回调
      this.onFulfilledCallbacks.forEach(fn => fn())
    }

    const reject = (reason) => {
      if (this.state !== PENDING) return
      this.state = REJECTED
      this.value = reason
      this.onRejectedCallbacks.forEach(fn => fn())
    }

    try {
      executor(resolve, reject)   // 立即执行 executor
    } catch (err) {
      reject(err)                 // executor 同步抛错 → reject
    }
  }

  // ----- then：返回新 Promise，实现链式调用 -----
  then(onFulfilled, onRejected) {
    // 值穿透：如果未传回调，提供默认透传函数
    onFulfilled = typeof onFulfilled === 'function'
      ? onFulfilled
      : value => value
    onRejected = typeof onRejected === 'function'
      ? onRejected
      : reason => { throw reason }

    // then 必须返回新 Promise
    const promise2 = new MyPromise((resolve, reject) => {

      // 包装回调：根据返回值 x 决定 promise2 的状态
      const handleFulfilled = () => {
        // setTimeout 模拟微任务异步执行
        setTimeout(() => {
          try {
            const x = onFulfilled(this.value)
            // 根据 x 的类型决定如何 settle promise2
            resolvePromise(promise2, x, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }, 0)
      }

      const handleRejected = () => {
        setTimeout(() => {
          try {
            const x = onRejected(this.value)
            resolvePromise(promise2, x, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }, 0)
      }

      // 根据当前状态决定注册还是立即执行
      if (this.state === FULFILLED) {
        handleFulfilled()
      } else if (this.state === REJECTED) {
        handleRejected()
      } else {
        // pending：将回调入队，等 resolve/reject 时再执行
        this.onFulfilledCallbacks.push(handleFulfilled)
        this.onRejectedCallbacks.push(handleRejected)
      }
    })

    return promise2
  }

  // ----- catch：语法糖，等同于 then(null, onRejected) -----
  catch(onRejected) {
    return this.then(null, onRejected)
  }

  // ----- finally：无论成功失败都执行（ES2018）-----
  finally(onFinally) {
    return this.then(
      value  => MyPromise.resolve(onFinally()).then(() => value),
      reason => MyPromise.resolve(onFinally()).then(() => { throw reason })
    )
  }

  // ========== 静态方法 ==========

  static resolve(value) {
    // 如果已经是 MyPromise 实例，直接返回
    if (value instanceof MyPromise) return value
    return new MyPromise(resolve => resolve(value))
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason))
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = []
      let count = 0
      const arr = Array.from(promises) // 兼容可迭代对象

      if (arr.length === 0) return resolve([]) // 空数组直接 resolve

      arr.forEach((p, index) => {
        // 非 Promise 值用 resolve 包裹
        MyPromise.resolve(p).then(
          value => {
            results[index] = value // 按原顺序存放
            count++
            if (count === arr.length) resolve(results)
          },
          reason => reject(reason) // 任一失败立即 reject
        )
      })
    })
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      Array.from(promises).forEach(p => {
        MyPromise.resolve(p).then(resolve, reject)
        // 第一个 settled 的 Promise 直接调用 resolve/reject
        // 后续调用无效（状态已锁定）
      })
    })
  }

  static allSettled(promises) {
    return new MyPromise((resolve) => {
      const results = []
      let count = 0
      const arr = Array.from(promises)
      if (arr.length === 0) return resolve([])

      arr.forEach((p, index) => {
        MyPromise.resolve(p).then(
          value => { results[index] = { status: 'fulfilled', value };   count++; if (count === arr.length) resolve(results) },
          reason => { results[index] = { status: 'rejected', reason }; count++; if (count === arr.length) resolve(results) }
        )
      })
    })
  }
}

// ========== Promise 解析过程（then 回调返回值的处理）==========
function resolvePromise(promise2, x, resolve, reject) {
  // 如果 x 和 promise2 是同一个引用 → 循环引用错误
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected'))
  }

  // 如果 x 是 MyPromise 实例，沿用其状态
  if (x instanceof MyPromise) {
    return x.then(resolve, reject)
  }

  // 如果 x 是对象或函数（thenable 检测）
  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let called = false // 防止 resolve/reject 被多次调用
    try {
      const then = x.then
      if (typeof then === 'function') {
        then.call(x,
          y => {
            if (called) return
            called = true
            resolvePromise(promise2, y, resolve, reject) // 递归解析
          },
          r => {
            if (called) return
            called = true
            reject(r)
          }
        )
      } else {
        resolve(x) // 普通对象，直接 resolve
      }
    } catch (err) {
      if (called) return
      called = true
      reject(err)
    }
  } else {
    // 普通值：直接 resolve
    resolve(x)
  }
}
```

#### 关键设计要点

| 设计点 | 说明 |
|---|---|
| 状态不可逆 | `resolve` / `reject` 内部先检查 `state === PENDING` |
| 回调队列 | pending 时 `.then()` 的回调存入数组，状态变更后批量执行 |
| then 返回新 Promise | 链式调用的根基，每个 `.then()` 都创建新的 MyPromise |
| `resolvePromise` | 处理 then 回调返回值 x 的完整逻辑：循环引用检测 → MyPromise 识别 → thenable 识别 → 普通值 |
| `called` 防重入 | thenable 中防止 `resolve` / `reject` 被调用多次 |
| 值穿透 | `then()` 未传回调时提供默认函数，值沿链透传 |
| 异步执行 | `setTimeout(fn, 0)` 模拟微任务，保证回调异步执行 |

---

## 七、文件处理实战

### 7.1 大文件上传

面试高频场景题，考察 File API、并发控制、错误恢复的全局设计能力。核心流程：

```
用户选文件 → 计算文件 hash → 询问服务端已传分片（秒传/断点）
→ 只传未完成的分片 → 全部传完 → 通知服务端合并
```

**分片切割**：用 `Blob.slice()` 切成固定大小块（通常 1-5MB）：

```js
function createChunks(file, chunkSize = 2 * 1024 * 1024) {
  const chunks = []
  let start = 0
  while (start < file.size) {
    chunks.push(file.slice(start, start + chunkSize))
    start += chunkSize
  }
  return chunks
}
```

**文件 Hash**（秒传和断点续传的根基）：用 `SparkMD5` 或 Web Crypto API 算文件指纹：

```js
const chunk = file.slice(start, end)
const buffer = await chunk.arrayBuffer()
const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
const hash = Array.from(new Uint8Array(hashBuffer))
  .map(b => b.toString(16).padStart(2, '0')).join('')
```

**并发上传 + 断点续传**：

```js
async function uploadChunks(chunks, fileHash, onProgress) {
  // 1. 询问服务端已传了哪些分片（断点续传）
  const uploaded = await fetch(`/api/check?hash=${fileHash}`).then(r => r.json())
  // 2. 只构建未传分片的上传任务
  const tasks = chunks.map((chunk, i) => {
    if (uploaded.includes(i)) return null
    const form = new FormData()
    form.append('chunk', chunk)
    form.append('hash', fileHash)
    form.append('index', i)
    form.append('total', chunks.length)
    return () => fetch('/api/upload', { method: 'POST', body: form })
  })
  // 3. 并发控制（3 个并行，避免浏览器连接数耗尽）
  await parallelLimit(tasks.filter(Boolean), 3, onProgress)
  // 4. 通知服务端合并分片
  await fetch('/api/merge', {
    method: 'POST',
    body: JSON.stringify({ hash: fileHash, total: chunks.length }),
    headers: { 'Content-Type': 'application/json' }
  })
}
```

**并发控制工具函数**：

```js
async function parallelLimit(tasks, limit, onProgress) {
  let completed = 0
  const running = new Set()
  for (const task of tasks) {
    const p = task().then(res => {
      running.delete(p); completed++; onProgress?.(completed, tasks.length); return res
    })
    running.add(p)
    if (running.size >= limit) await Promise.race(running) // 等最快完成再推下一个
  }
  await Promise.all(running) // 等剩余的全部完成
}
```

| 关键点 | 方案 |
|--------|------|
| 秒传 | 文件 hash 命中 → 直接返回成功，零流量 |
| 断点续传 | 从服务端拿已传分片列表，跳过已完成的 |
| 并发控制 | 限制 3-5 个并行，避免浏览器连接数耗尽（同域 6 个上限） |
| 进度 | `(已完成 / 总分片) * 100`，分片粒度即进度粒度 |
| 失败重试 | 单分片失败重试 3 次，整体失败则降级串行 |
| 大文件 hash | Web Worker 中计算，避免卡主线程；或用 `file.stream()` 增量 hash |
| 内存 | `Blob.slice()` 不复制数据，零额外内存开销 |

### 7.2 文件下载与 Blob

```js
// 下载后端返回的二进制数据
async function download(url, filename) {
  const res = await fetch(url)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)  // ⚠️ 必须释放，否则 blob: URL 常驻内存
}

// 纯前端生成并下载
const csv = 'name,age\nfenglan,18'
const blob = new Blob([csv], { type: 'text/csv' })
const url = URL.createObjectURL(blob)
// 同上：创建 <a> 触发下载 → revokeObjectURL
```

`URL.createObjectURL()` 创建指向 Blob/File 的临时 URL（格式 `blob:https://...`），**用完必须 `revokeObjectURL()`**，否则 Blob 不会被 GC，持续泄漏内存。
