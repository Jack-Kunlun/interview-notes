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
