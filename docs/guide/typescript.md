---
title: TypeScript
description: TS 泛型、工具类型、类型体操、tsconfig 配置
---

# TypeScript

## 必会基础 ⭐⭐⭐

### 基础类型 / 联合类型 / 交叉类型 / 字面量类型

TypeScript 在 JS 基础类型之上增加了 `void`、`never`、`unknown`、`enum`、`tuple` 等。联合类型（`|`）表示值可为多种类型之一，交叉类型（`&`）将多个类型合并为一个。字面量类型将具体值作为类型约束，常与联合类型配合实现"枚举式"入参校验。

```ts
// 基础类型
let str: string = "hello"
let num: number = 42
let flag: boolean = true
let arr: number[] = [1, 2, 3]
let tuple: [string, number] = ["age", 18]

// 联合类型 & 字面量类型
type Direction = "left" | "right" | "up" | "down"
function move(dir: Direction) { /* ... */ }

// 交叉类型
type A = { name: string }
type B = { age: number }
type C = A & B // { name: string; age: number }
```

### `interface` vs `type` 的区别与选择

二者都能描述对象形状，核心差异在于：`interface` 支持声明合并（同名 interface 自动合并），适合对外暴露的公共 API；`type` 支持联合/交叉/映射类型，更灵活，适合工具类型和复杂类型组合。日常开发优先 `interface`，需要联合类型或映射类型时用 `type`。

| 对比项 | `interface` | `type` |
|---|---|---|
| 声明合并 | ✅ 支持 | ❌ 不支持 |
| 联合/交叉类型 | ❌ | ✅ |
| 映射类型 | ❌ | ✅ |
| 扩展方式 | `extends` | `&` 交叉类型 |
| 推荐场景 | 对象形状、对外 API | 联合类型、工具类型 |

```ts
// interface 声明合并
interface User { name: string }
interface User { age: number }
// 最终 User = { name: string; age: number }

// type 联合 & 映射
type Status = "loading" | "success" | "error"
type Readonly<T> = { readonly [K in keyof T]: T[K] }
```

### 泛型：函数泛型 / 接口泛型 / `extends` 约束 / 条件类型

泛型让函数、接口、类在定义时不指定具体类型，调用时再传入，实现"类型参数化"。`extends` 可约束泛型参数必须满足某个形状；条件类型 `T extends U ? X : Y` 则根据类型关系分发，是工具类型的底层基石。

```ts
// 函数泛型
function identity<T>(arg: T): T { return arg }

// extends 约束
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length
}

// 接口泛型
interface ApiResponse<T> {
  code: number
  data: T
}

// 条件类型：根据 T 是否 extends U 来决定类型
type IsString<T> = T extends string ? true : false
type A = IsString<"hello"> // true
type B = IsString<42>      // false
```

### `as const` / `satisfies`（TS 4.9+）

`as const`（const 断言）将对象/数组所有字段收窄为只读字面量类型，避免类型拓宽。`satisfies`（TS 4.9）在确保满足某类型的同时保留最精确的字面量推导，解决了"既要约束又要精确类型"的痛点。

```ts
// as const：类型收窄为字面量
const config = { mode: "dark", version: 1 } as const
// config 类型: { readonly mode: "dark"; readonly version: 1 }

// satisfies：校验类型但保留精确推导
type Theme = { mode: "dark" | "light" }
const theme = { mode: "dark" } satisfies Theme
// theme.mode 类型仍是 "dark"，而非 "dark" | "light"
```

### 工具类型：`Partial` / `Required` / `Pick` / `Omit` / `Record`

内置工具类型基于映射类型 + 条件类型实现，用于批量转换对象类型。`Partial` 将所有属性变可选，`Required` 变必填，`Pick`/`Omit` 按需选取或排除键，`Record` 以联合类型为键构建新对象类型。

```ts
type MyPartial<T>    = { [K in keyof T]?: T[K] }
type MyRequired<T>   = { [K in keyof T]-?: T[K] }
type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
type MyOmit<T, K extends keyof T> = { [P in Exclude<keyof T, K>]: T[P] }
type MyRecord<K extends string | number | symbol, V> = { [P in K]: V }

// 使用示例
interface User {
  id: number
  name: string
  email: string
}
type PartialUser = Partial<User>       // 全部可选
type UserPreview = Pick<User, "id" | "name"> // 只取 id + name
type Role = "admin" | "user" | "guest"
type RoleMap = Record<Role, string>    // { admin: string; user: string; guest: string }
```

## 进阶考点 ⭐⭐

### `infer` 类型推断：函数返回值、Promise 内部类型

`infer` 只能在条件类型的 `extends` 子句中使用，用于在模式匹配中"捕获"某个位置的类型变量。常见场景：提取函数返回值（`ReturnType`）、Promise 内部类型（`Awaited`）、数组元素类型、函数参数类型等。

```ts
// 提取 Promise 的 resolved 类型
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T

// 提取函数第一个参数
type FirstArg<T extends (...args: any) => any> =
  T extends (first: infer F, ...rest: any) => any ? F : never

// 提取数组元素类型
type ElementType<T> = T extends (infer E)[] ? E : never

// 提取函数返回值
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never
```

### 声明文件：`.d.ts` / `declare module` / `declare global`

`.d.ts` 文件为 JS 库提供类型描述，不包含可执行代码。`declare module` 可为第三方模块或无类型模块声明类型；`declare global` 在模块化文件中扩展全局作用域（如给 `Window`、`String` 挂载方法）。

```ts
// 为无类型的 npm 包声明模块
declare module "*.css" {
  const content: Record<string, string>
  export default content
}

// 扩展全局类型（需在模块文件内）
declare global {
  interface Window {
    __APP_VERSION__: string
  }
}

// 扩展已有模块的类型
declare module "vue" {
  interface ComponentCustomProperties {
    $formatDate: (date: Date) => string
  }
}
```

### `tsconfig.json` 核心：`strict` / `paths` / `moduleResolution`

`strict: true` 一次性开启全部严格检查（`strictNullChecks`、`noImplicitAny` 等），是类型安全的基础保障。`paths` 配合 `baseUrl` 实现路径别名映射（如 `@/utils` → `src/utils`）。`moduleResolution` 控制模块解析策略：`node` 模拟 Node.js 查找，`bundler` 适配 Vite/Webpack 等打包器。

```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

> `strict: true` 包含的子选项：`strictNullChecks`、`strictFunctionTypes`、`strictBindCallApply`、`strictPropertyInitialization`、`noImplicitAny`、`noImplicitThis`、`alwaysStrict`。

### 类型守卫：`is` / `typeof` / `instanceof` / `in`

类型守卫在运行时缩小类型范围，让 TS 在后续分支中自动推导更精确的类型。`typeof` 用于原始类型判断，`instanceof` 用于类实例，`in` 检查属性存在，`is` 关键字定义自定义类型谓词函数。

```ts
// typeof 守卫
function pad(value: string | number) {
  if (typeof value === "number") {
    return value.toFixed(2) // 此处 value: number
  }
  return value.padStart(5)  // 此处 value: string
}

// instanceof 守卫
function handleError(err: Error | string) {
  if (err instanceof Error) {
    console.log(err.message)
  }
}

// 自定义 is 守卫
interface Cat { meow(): void }
interface Dog { bark(): void }
function isCat(animal: Cat | Dog): animal is Cat {
  return "meow" in animal
}
```
