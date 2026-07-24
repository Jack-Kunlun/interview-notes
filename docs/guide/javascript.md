---
title: JavaScript 基础
description: 原型链、闭包、this、Promise、ES6+ 核心复习
---

# JavaScript 基础

## 必会基础 ⭐⭐⭐

### 数据类型：基本类型（7种）vs 引用类型，`typeof` 判断，`null` 是 `object` 的历史原因

JavaScript 共有 7 种基本类型：`string`、`number`、`boolean`、`null`、`undefined`、`symbol`、`bigint`，按值存储于栈内存。引用类型（`Object`、`Array`、`Function` 等）按引用存储于堆内存，变量持有其地址。`typeof` 是判断基本类型的首选方式，但 `typeof null === 'object'` 是第一版 JS 遗留的著名 bug——`null` 在二进制标记中被识别为对象类型前缀 `000`。

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

### 作用域与闭包：全局/函数/块级作用域，闭包的定义与内存影响

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

### this 指向：默认绑定/隐式绑定/显式绑定/new 绑定的优先级

`this` 的值由**调用方式**决定，不是定义时决定。优先级从高到低：`new` 绑定 > 显式绑定（`call`/`apply`/`bind`）> 隐式绑定（对象方法调用）> 默认绑定（严格模式 `undefined`，非严格 `window`）。箭头函数没有自己的 `this`，直接继承外层词法作用域的 `this`。

| 绑定方式 | 规则 | 示例 |
|---|---|---|
| 默认绑定 | 非严格模式 → `window`，严格模式 → `undefined` | `fn()` |
| 隐式绑定 | 谁调用指向谁 | `obj.fn()` → `this` = `obj` |
| 显式绑定 | `call` / `apply` / `bind` | `fn.call(ctx)` |
| new 绑定 | `new Fn()` → 新创建的对象 | `new Person()` |
| 箭头函数 | 没有自己的 `this`，继承外层词法作用域 | `() => this` |

```js
const obj = {
  name: 'obj',
  fn() { console.log(this.name) },
  arrow: () => console.log(this.name)  // 定义时外层 this（此处为 window）
}
obj.fn()     // 'obj'
obj.arrow()  // undefined（window.name，箭头函数继承外层）
```

### 原型链：`__proto__` → `prototype` → `Object.prototype` → `null`

每个 JavaScript 对象都有一个内部属性 `[[Prototype]]`（通过 `__proto__` 或 `Object.getPrototypeOf()` 访问），指向其构造函数的 `prototype` 对象。原型链就是沿 `__proto__` 向上查找直到 `null` 的机制——这是 JS 实现继承的基础。

```js
function Person(name) { this.name = name }
Person.prototype.say = function() { return `I'm ${this.name}` }

const p = new Person('fenglan')

// 原型链查找路径：
// p → Person.prototype → Object.prototype → null
p.say()           // 先在 p 自身找 → 没找到 → 沿 __proto__ 找到 Person.prototype
p.toString()      // p → Person.prototype → Object.prototype（找到）
p.xxx             // 沿链到头返回 undefined
```

**`instanceof` 原理**：沿 `__proto__` 链向上找构造函数的 `prototype`。

```js
p instanceof Person  // p.__proto__ === Person.prototype → true
p instanceof Object  // p.__proto__.__proto__ === Object.prototype → true
```

### ES6+：解构、模板字符串、箭头函数、可选链 `?.`、空值合并 `??`

ES6（ES2015）及后续版本引入了大量语法糖和实用特性。解构让从对象/数组中提取值变得简洁；模板字符串支持多行和 `${}` 插值；箭头函数简化了函数表达式且不绑定自己的 `this`；可选链 `?.` 安全访问深层属性；空值合并 `??` 只在 `null`/`undefined` 时使用默认值，比 `||` 更精确。

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

## 进阶考点 ⭐⭐

### 深浅拷贝：`JSON.parse(JSON.stringify())` 的局限，手写递归深拷贝

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

### 防抖（debounce）vs 节流（throttle）的实现与场景

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

### Promise 链式调用、`Promise.all/race/allSettled/any`、错误传播

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

### `async/await` 的生成器本质与错误捕获

`async/await` 是 Generator + Promise 的语法糖，让异步代码看起来像同步代码。`async` 函数始终返回 Promise；`await` 暂停执行直到 Promise settled。错误处理用 `try/catch` 包裹 `await` 表达式，比 `.catch()` 更符合直觉。

```js
async function load() {
  try {
    const user = await fetchUser()      // 等待 Promise resolve
    const orders = await fetchOrders(user.id)
    return orders
  } catch (err) {
    // 捕获 await 中任意 reject
    console.error(err)
  }
}
// async 函数始终返回 Promise
```

**生成器本质**：`async/await` 可以手动用 Generator 模拟——`yield` 代替 `await`，通过自动执行器递归调用 `next()` 并将 value（Promise）resolve 后传回，实现暂停-恢复的执行流。

### 变量提升与暂时性死区（TDZ）：`var` / `let` / `const` 的区别

`var` 声明的变量会被提升到作用域顶部并初始化为 `undefined`，所以声明前访问不会报错。`let`/`const` 同样有提升，但进入"暂时性死区"（TDZ）——从块开始到声明行之间，变量存在但不可访问，访问会抛出 `ReferenceError`。`const` 额外要求声明时必须初始化且不能重新赋值（引用不可变，但对象属性仍可修改）。

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

## 深入理解 ⭐

### 迭代器与生成器：`Symbol.iterator`、`yield`、`next()` 双向通信

实现了 `Symbol.iterator` 方法的对象就是可迭代对象（iterable），可被 `for...of`、展开运算符等消费。生成器函数（`function*`）返回一个迭代器对象，通过 `yield` 暂停执行，`next()` 恢复并传值——实现双向通信：`yield` 向外输出值，`next(arg)` 将参数作为上一个 `yield` 的返回值传入。

```js
// 迭代器协议
const iterable = {
  *[Symbol.iterator]() {
    yield 1
    yield 2
    yield 3
  }
}
for (const v of iterable) console.log(v)   // 1, 2, 3
console.log([...iterable])                 // [1, 2, 3]

// 生成器双向通信
function* gen() {
  const a = yield 'first'     // 先 yield 'first'，next('A') 将 'A' 赋给 a
  const b = yield a + ' second'
  return b
}
const g = gen()
console.log(g.next())         // { value: 'first', done: false }
console.log(g.next('A'))      // { value: 'A second', done: false }
console.log(g.next('B'))      // { value: 'B', done: true }
```

### `Proxy` 13 种拦截操作，`Reflect` 的用途

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

### `WeakMap` / `WeakSet` 的弱引用与内存优势

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

## 手写 MyPromise ⭐⭐⭐

手写 Promise 是面试极高频考点，考察对异步流程、状态管理、链式调用和微任务机制的深层理解。完整的 MyPromise 需要实现：三种状态管理、`then` 链式调用（then 必须返回新 Promise 以支持链式）、`catch`、异步执行（用 setTimeout 模拟微任务）、以及 `Promise.resolve` / `Promise.reject` / `Promise.all` / `Promise.race` 四个静态方法。

### 三种状态（pending / fulfilled / rejected）

Promise 的核心是状态机：初始为 `pending`，成功调用 `resolve` 转为 `fulfilled`，失败调用 `reject` 转为 `rejected`。**状态一旦转换就不可逆**（pending → fulfilled 或 pending → rejected），这是 Promise 可靠性的基础。`resolve` 和 `reject` 内部需要判断当前状态是否为 `pending`，防止重复调用改变结果。

### then 链式调用（返回新 Promise）

`.then(onFulfilled, onRejected)` 必须返回一个**新的 Promise**，这正是链式调用的根基——每个 `.then()` 返回新 Promise，下一个 `.then()` 注册在新 Promise 上。`then` 的回调返回值有三种情况需要处理：返回普通值（直接 resolve）、返回 Promise（等待其 settled 再 resolve/reject）、抛出异常（reject）。

### 异步执行（setTimeout 模拟微任务）

规范要求 `onFulfilled` / `onRejected` 在微任务中执行，但手写实现无法直接创建微任务（`queueMicrotask` 在旧环境不可用），通常用 `setTimeout(fn, 0)` 模拟。核心思路：在 `then` 中将所有回调延迟到下一轮事件循环执行，保证即使 Promise 已 settled，回调也异步执行。

### catch

`catch(onRejected)` 本质是 `.then(null, onRejected)` 的语法糖——只注册失败回调，不处理成功。实现时直接复用 `then` 方法即可。

### Promise.resolve / Promise.reject

`Promise.resolve(value)` 将任意值包装为 resolved 的 Promise；如果传入的已经是 Promise 则直接返回。`Promise.reject(reason)` 返回一个 rejected 的 Promise，不管传入什么值都作为拒绝原因。

### Promise.all / Promise.race

`Promise.all`：接收可迭代对象，全部 fulfilled 时 resolve 结果数组（保持输入顺序），任一 rejected 则立即 reject 第一个错误。`Promise.race`：接收可迭代对象，第一个 settled 的 Promise 直接决定最终状态。

| 静态方法 | 触发 resolve | 触发 reject | 适用场景 |
|---|---|---|---|
| `Promise.all` | 全部 fulfilled | 任一 rejected | 并行请求，全部成功才继续 |
| `Promise.race` | 第一个 settled | 第一个 settled | 超时竞速、多个数据源取最快 |
| `Promise.allSettled` | 全部 settled（不论成败） | 永不 reject | 批量请求不因个别失败中断 |
| `Promise.any` | 第一个 fulfilled | 全部 rejected | 多个备用源取第一个成功 |

### 完整实现代码

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

### 关键设计要点

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

## 手写 async/await ⭐⭐⭐

`async/await` 是 JavaScript 异步编程的终极方案，本质是 **Generator + 自动执行器** 的语法糖。理解其原理需要掌握三块知识：Generator 函数的暂停/恢复机制、自动执行器（co）如何递归驱动 Generator、以及 async/await 如何在这两者之上提供更简洁的语法。

### Generator 函数基础

Generator（`function*`）是能中途暂停并恢复执行的函数。调用 `function*` 不执行函数体，而是返回一个迭代器对象。调用迭代器的 `.next()` 执行到下一个 `yield` 并暂停，返回 `{ value, done }`；再次 `.next(arg)` 恢复执行，`arg` 会成为上一个 `yield` 的返回值——这是双向通信的关键。

Generator 天然适合描述异步流程：用 `yield` 暂停等异步结果，拿到结果后继续执行。但问题是：每次都要手动调用 `.next()`，如果有 10 个 `yield` 就要写 10 次 `.next()`——所以需要**自动执行器**。

### 自动执行器 co 实现

自动执行器的核心思路：递归调用 `.next()`，每次拿到 `{ value, done }`，如果 `value` 是 Promise 就等它 resolve 后再 `.next(result)` 把值传回去；如果 `done === true` 则结束。这个模式就是著名的 **co** 库的实现原理。

co 做了几件事：① 执行 Generator 拿到迭代器；② 递归调用 `next`，每次将 Promise 结果传回作为上一个 `yield` 的返回值；③ 遇到 reject 则抛出错误（Generator 内部可用 `try/catch` 捕获）。

### async/await = Generator + 自动执行器

`async function` 等价于 `co(function* () { ... })`。`async` 函数始终返回 Promise（co 返回 Promise）；`await xxx` 等价于 `yield xxx`（等待 Promise settle 后拿值继续）。区别在于 async/await 是语言级支持，内置微任务调度，而 Generator + co 是 polyfill 方案。

| 特性 | Generator + co | async/await |
|---|---|---|
| 暂停方式 | `yield promise` | `await promise` |
| 返回值 | co 返回 Promise | async 函数返回 Promise |
| 错误处理 | `try/catch` 捕获 `g.throw()` | `try/catch` 原生支持 |
| 执行器 | 手动引入 co 库 | JS 引擎内置 |
| 调度时机 | Promise.then 链 | 内置微任务队列，更精确 |

### 完整实现代码

```js
// ============================================================
// 第一部分：Generator 基础演示
// ============================================================
function* simpleGen() {
  console.log('1. 开始执行')
  const a = yield '第一次暂停'   // yield 向外输出，next(arg) 将 arg 赋给 a
  console.log(`2. 收到参数: ${a}`)
  const b = yield '第二次暂停'
  console.log(`3. 收到参数: ${b}`)
  return 'done'
}

const sg = simpleGen()
console.log(sg.next())         // { value: '第一次暂停', done: false }
console.log(sg.next('hello'))  // { value: '第二次暂停', done: false }
console.log(sg.next('world'))  // { value: 'done', done: true }


// ============================================================
// 第二部分：模拟异步场景 — Generator + 手动执行
// ============================================================
function fetchData(id) {
  return new Promise(resolve => {
    setTimeout(() => resolve(`数据-${id}`), 500)
  })
}

function* fetchFlow() {
  const data1 = yield fetchData(1)   // yield 一个 Promise
  console.log('拿到:', data1)
  const data2 = yield fetchData(2)
  console.log('拿到:', data2)
  return data1 + ' + ' + data2
}

// 手动执行（繁琐）
const ff = fetchFlow()
ff.next().value.then(d1 => {
  ff.next(d1).value.then(d2 => {
    console.log('手动执行结果:', ff.next(d2).value)
  })
})


// ============================================================
// 第三部分：自动执行器 co 实现
// ============================================================
function co(gen, ...args) {
  return new Promise((resolve, reject) => {
    const g = gen(...args) // 执行 Generator，拿到迭代器

    // 递归的 next 函数：驱动 Generator 自动前进
    function next(lastValue) {
      let result
      try {
        result = g.next(lastValue) // 推进到下一个 yield
      } catch (err) {
        return reject(err)
      }

      const { value, done } = result

      if (done) {
        // Generator 执行完毕，resolve 最终值
        return resolve(value)
      }

      // 否则 value 应该是一个 Promise（或 thenable）
      // 等它 resolve 后把结果传回 Generator
      Promise.resolve(value).then(
        res => next(res),  // 递归：用 Promise 结果驱动下一步
        err => g.throw(err) // Promise reject → 抛入 Generator 供 try/catch 捕获
      )
    }

    next() // 启动执行器
  })
}

// 使用 co 改写 fetchFlow
co(fetchFlow).then(result => {
  console.log('co 自动执行结果:', result)
  // 输出：
  // 拿到: 数据-1
  // 拿到: 数据-2
  // co 自动执行结果: 数据-1 + 数据-2
})


// ============================================================
// 第四部分：async/await — Generator + co 的语法糖
// ============================================================
// 上面的 fetchFlow + co(fetchFlow) 等价于：

async function asyncFlow() {
  const data1 = await fetchData(1)  // await ≡ yield
  console.log('async 拿到:', data1)
  const data2 = await fetchData(2)
  console.log('async 拿到:', data2)
  return data1 + ' + ' + data2      // async 函数自动返回 Promise
}

// asyncFlow() 等价于 co(fetchFlow)


// ============================================================
// 第五部分：带错误处理的完整示例
// ============================================================
function* flowWithError() {
  try {
    const data = yield Promise.reject(new Error('请求失败'))
    console.log(data) // 不会执行
  } catch (err) {
    console.log('Generator 内部捕获:', err.message)
    return '降级数据'
  }
}

co(flowWithError).then(console.log)
// 输出：
// Generator 内部捕获: 请求失败
// 降级数据

// async/await 等价写法
async function asyncWithError() {
  try {
    const data = await Promise.reject(new Error('请求失败'))
    console.log(data)
  } catch (err) {
    console.log('async 内部捕获:', err.message)
    return '降级数据'
  }
}
```

### co 执行流程图解

```
co(generator) 调用
  │
  ▼
const g = generator()          ← 拿到迭代器
  │
  ▼
next()                         ← 首次调用
  │
  ├─ g.next(undefined)         ← 推进到第一个 yield
  │    │
  │    ├─ done === true?  ───→ resolve(value)  ← Generator 结束
  │    │
  │    └─ done=== false  ← value 是 Promise
  │           │
  │           ▼
  │    Promise.resolve(value).then(
  │      res => next(res),      ← 递归，res 成为下一个 yield 的返回值
  │      err => g.throw(err)    ← Promise reject → Generator 内部抛错
  │    )
  │           │
  │           └──→ 回到 next() 循环
  ▼
```

### 核心理解总结

| 概念 | 角色 |
|---|---|
| Generator（`function*`） | 提供"暂停 + 恢复"的执行能力，`yield` 暂停，`next()` 恢复 |
| co 自动执行器 | 递归调用 `next()`，自动等待 Promise resolve 后传值回 Generator |
| async/await | Generator + co 的语言级实现，`await` = `yield`，引擎内置执行器 |
| 错误处理 | co 通过 `g.throw(err)` 将 Promise reject 抛入 Generator，`try/catch` 可捕获 |
| 返回值 | co 和 async 都返回 Promise，Generator `return` 的值成为 Promise resolve 值 |

**一句话总结**：`async/await` 让异步代码写起来像同步，底层是 Generator 暂停-恢复 + Promise 异步等待的融合——Generator 负责"同步感"（暂停等结果），自动执行器负责"自动推进"（不等你手动 next），Promise 负责"异步"（不阻塞主线程）。