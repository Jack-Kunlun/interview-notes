---
title: 工程化
description: Vite、Webpack、Monorepo、Tree Shaking 工程化复习
---

# 工程化（Vite / Webpack / Monorepo）

## 必会基础 ⭐⭐⭐

### Vite：开发环境 ESBuild + 浏览器原生 ESM，生产环境 Rollup

Vite 开发环境利用 ESBuild（Go 编写，极快）进行依赖预构建，同时基于浏览器原生 ESM 实现按需编译——只有被实际 import 的模块才会被编译返回，无需全量打包即可启动。生产构建则切换为 Rollup，以获得成熟的 Tree Shaking、代码分割和插件生态。

```
开发模式：
  浏览器请求 import → Vite Server 按需编译 → 返回 ESM
  → 只编译实际用到的模块，无需全量打包

vs Webpack：
  启动时递归遍历所有 import → 全部打包成 bundle → 再开 server
```

| 对比项 | Vite（开发环境） | Webpack |
|---|---|---|
| 冷启动 | 毫秒级（无需打包） | 数十秒 ~ 数分钟 |
| 模块处理 | 浏览器原生 ESM，按需编译 | 全量打包 |
| 预构建 | ESBuild（Go，极快） | Babel（JS） |
| HMR | 只重新请求变更模块 | 重新构建依赖链 |
| 生产构建 | Rollup | 自身打包器 |

### Webpack 核心：entry / output / loader / plugin / module resolution

Webpack 从 entry 入口文件出发，递归解析模块依赖图，通过各类 loader 将非 JS 资源（CSS、TS、图片等）转换为有效模块，再交由 plugin 在构建生命周期各阶段（打包优化、资源管理、环境变量注入等）执行定制任务，最终输出到 output 目录。module resolution 决定了 `import` 时如何找到模块文件（enhanced-resolve 算法，支持 alias、extensions 等配置）。

| 核心概念 | 作用 | 示例配置 |
|---|---|---|
| entry | 构建入口起点 | `entry: './src/index.ts'` |
| output | 输出文件路径与命名 | `output: { path, filename: '[name].[contenthash].js' }` |
| loader | 转换非 JS 文件为模块 | `{ test: /\.css$/, use: ['style-loader','css-loader'] }` |
| plugin | 构建流程钩子，功能扩展 | `new HtmlWebpackPlugin()` |
| resolve | 模块解析规则 | `resolve: { extensions: ['.ts','.js'], alias: { '@': './src' } }` |

### 常用 loader：`babel-loader` / `css-loader` / `ts-loader`

Loader 是 Webpack 的"翻译器"，将非 JS 资源转为 webpack 可处理的模块。`babel-loader` 负责将 ES6+ 语法降级为兼容代码（配合 `@babel/preset-env`）；`ts-loader` 编译 TypeScript（内部调用 tsc，速度较慢，常用 `esbuild-loader` 替代）；`css-loader` 解析 CSS 中的 `@import` / `url()` 依赖关系，通常与 `style-loader`（注入 `<style>` 标签）或 `MiniCssExtractPlugin.loader`（抽离独立 CSS 文件）配合使用。

### ESLint + Prettier + Husky + lint-staged 配置链路

典型的前端工程化"代码质量流水线"：ESLint 负责代码逻辑规则校验（如禁止未使用变量），Prettier 负责代码格式统一（缩进、引号、分号等），二者通过 `eslint-config-prettier` 关掉 ESLint 中与 Prettier 冲突的规则。Husky 利用 Git hooks（`pre-commit`）触发 lint-staged，lint-staged 只对 `git add` 的暂存文件执行 ESLint/Prettier，避免全量扫描，保障提交到仓库的代码始终符合规范。

```bash
# 典型初始化命令
npm i -D eslint prettier husky lint-staged
npx husky init
```

```json
// .lintstagedrc.json
{
  "*.{ts,tsx,vue}": ["eslint --fix", "prettier --write"],
  "*.{css,scss,json,md}": ["prettier --write"]
}
```

## 进阶考点 ⭐⭐

### Webpack 构建优化：`splitChunks` / `cache`（filesystem）/ thread-loader

- **`splitChunks`**：将公共依赖（如 `node_modules` 中的库）提取为独立的 vendor chunk，配合 `cacheGroups` 按使用频率、体积等维度分组。浏览器可独立缓存 vendor，业务代码变更时 vendor 无需重新下载。
- **`cache`（filesystem）**：Webpack 5 内置文件系统缓存，将构建中间结果写入 `node_modules/.cache`，二次构建时直接读取，大幅缩短冷构建时间。
- **`thread-loader` / `esbuild-loader`**：将耗时 loader（如 babel-loader）放入 worker 池并行执行，利用多核 CPU 加速。更推荐直接使用 `esbuild-loader` 替代 babel-loader，速度提升数十倍。

```js
// splitChunks 典型配置
optimization: {
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all'
      }
    }
  }
}
```

### Monorepo：pnpm workspace + Turborepo，幽灵依赖问题

Monorepo 将多个相关项目（apps + packages）放在同一仓库中管理。pnpm 通过硬链接 + 符号链接的 `node_modules` 结构保证依赖隔离，npm/yarn 的扁平化 `node_modules` 会引入"幽灵依赖"（项目可访问未在 `package.json` 中声明的包），pnpm 严格禁止这种行为，避免了隐式依赖问题。Turborepo 在此基础上提供增量构建、缓存和并行任务编排，大幅加速 CI/CD。

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```json
// apps/admin/package.json 引用内部包
{
  "dependencies": {
    "@repo/shared": "workspace:*"
  }
}
```

| 幽灵依赖示例 | npm/yarn（扁平化） | pnpm（严格隔离） |
|---|---|---|
| `package.json` 只声明了 A | 能 `require('express')`（因为 B 依赖了 express） | ❌ 报错，必须显式声明 |
| 风险 | 升级 B 版本后 express 消失，项目突然崩溃 | 依赖关系明确，不会意外丢失 |

### Tree Shaking：ESM 静态分析，`sideEffects: false` 配置

Tree Shaking 依赖 ESM 的静态 `import`/`export` 语法，在打包时分析模块依赖图，删除未被引用的"死代码"。Webpack/Rollup 通过 `sideEffects: false`（在 `package.json` 中声明）告知打包器所有模块均无副作用，可以安全删除未使用的导出。若某些文件有副作用（如全局 CSS 引入、polyfill），需在 `sideEffects` 数组中明确列出，避免被误删。

```json
// package.json — 声明所有模块无副作用
{
  "sideEffects": false
}

// 或指定有副作用的文件
{
  "sideEffects": ["*.css", "*.scss", "./src/polyfills.js"]
}
```

```js
// 只有 usedFunc 被打包，unusedFunc 被 Tree Shaking 移除
import { usedFunc } from './utils'
// import { unusedFunc } from './utils'  ← 不会被引入，也会被删除
```

## 深入理解 ⭐

### Module Federation（Webpack 5）

微前端主流方案，允许一个应用在运行时动态加载另一个应用的模块，真正实现"运行时共享"：

```js
// webpack.config.js — 远程应用（提供模块）
new ModuleFederationPlugin({
  name: 'remote_app',
  filename: 'remoteEntry.js',
  exposes: { './Header': './src/Header.vue' },
  shared: ['vue', 'react']           // 共享依赖，避免重复加载
})

// 宿主应用（消费模块）
new ModuleFederationPlugin({
  remotes: {
    remote: 'remote_app@http://xxx/remoteEntry.js'
  }
})
// 使用：import Header from 'remote/Header'
```

### 下一代构建工具对比

| | Webpack | Vite | Rspack | Turbopack |
|---|---|---|---|---|
| 语言 | JS | Go(ESBuild)+JS(Rollup) | **Rust** | **Rust** |
| 冷启动 | 慢（分钟级） | 快（毫秒级） | 快 | 快 |
| HMR | 秒级 | <100ms | <100ms | <100ms |
| 兼容性 | 最成熟 | 好 | Webpack 高兼容 | Next.js 专属 |
| 生产构建 | 自身 | Rollup | 自身（Rust） | 自身（Rust） |
| 适用 | 存量项目 | 新项目首选 | Webpack 迁移首选 | Next.js 项目 |

**选型建议**：新项目 → Vite | Webpack 存量→ Rspack（替换成本低） | Next.js → Turbopack
