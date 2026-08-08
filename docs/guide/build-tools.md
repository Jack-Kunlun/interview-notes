---
title: 构建工具
description: Webpack、Vite、esbuild、Turbopack、Rspack 构建工具全解析
---

# 构建工具

## 一、构建工具演进

前端项目从可以直接在浏览器运行，到必须经过构建才能上线——背后是模块化、兼容性和性能的共同推动。

```
2012    2014         2018      2021       2022
Grunt → Gulp        Webpack   Vite      Turbopack/Rspack
(任务)  (流式)      (打包)    (ESM)     (Rust 时代)
```

本质需求：**把开发者写的代码（ES6+/TS/SCSS/JSX/Vue SFC）变成浏览器能高效运行的产物（ES5/CSS/JS Bundle）**。在此基础上，构建工具还要做 Tree Shaking、代码分割、HMR、压缩混淆。

| 时代 | 代表 | 核心理念 | 瓶颈 |
|------|------|---------|------|
| 任务运行器 | Grunt / Gulp | 定义任务流水线 | 配置繁重，插件质量参差 |
| 打包器 | Webpack | 一切皆模块，依赖图分析 | 全量打包，项目大了就慢 |
| ESM 开发 | Vite | 浏览器原生 ESM + 按需编译 | 对老旧浏览器支持有限 |
| Rust 新生代 | Rspack / Turbopack | 高性能语言重写 | 生态成熟度不够 |

---

## 二、Webpack

### 核心五概念

Webpack 从 `entry` 出发递归构建依赖图，`loader` 将非 JS 资源转为模块，`plugin` 在构建生命周期各阶段注入行为，最终输出到 `output`。

| 概念 | 作用 | 示例 |
|------|------|------|
| **entry** | 构建入口 | `entry: './src/index.ts'` |
| **output** | 输出路径与命名 | `filename: '[name].[contenthash:8].js'` |
| **loader** | 翻译非 JS 文件 | `babel-loader`、`css-loader`、`vue-loader` |
| **plugin** | 构建流程钩子 | `HtmlWebpackPlugin`、`DefinePlugin` |
| **resolve** | 模块解析规则 | `alias`、`extensions` |

**Loader 本质是"翻译器"**——将 TypeScript、CSS、图片等转为 Webpack 可处理的 JS 模块。**Plugin 是"编排器"**——通过 Tapable 事件体系访问整个构建生命周期，能做 Loader 做不到的事（生成额外文件、注入环境变量、修改输出资源）。

### 常用 Loader

| Loader | 功能 | 性能提示 |
|--------|------|---------|
| `babel-loader` | ES6+/TS → ES5 | 开启 `cacheDirectory: true` |
| `ts-loader` | TypeScript 编译 | `transpileOnly: true` 跳过类型检查提速 |
| `esbuild-loader` | JS/TS 超高速编译 | 比 babel-loader 快 10~100 倍 |
| `css-loader` | 解析 `@import`/`url()` | 配合 `style-loader` 或 `MiniCssExtractPlugin.loader` |
| `postcss-loader` | autoprefixer/tailwindcss | 根目录 `postcss.config.js` |
| `sass-loader` | SCSS → CSS | 依赖 `sass`（Dart Sass，不装 `node-sass`） |

### 常用 Plugin

| Plugin | 作用 |
|--------|------|
| `HtmlWebpackPlugin` | 生成 HTML，自动注入 bundle |
| `MiniCssExtractPlugin` | 将 CSS 抽离为独立文件（替代 `style-loader`） |
| `DefinePlugin` | 编译时注入全局常量（`process.env.NODE_ENV`） |
| `BundleAnalyzerPlugin` | 可视化分析 bundle 体积 |
| `ForkTsCheckerWebpackPlugin` | 独立进程做 TS 类型检查，不影响构建速度 |
| `CompressionPlugin` | 生成 .gz/.br 静态资源 |

### 性能优化

```
慢 → speed-measure-webpack-plugin 定位瓶颈
  → ts-loader 加 transpileOnly + ForkTsCheckerWebpackPlugin
  → esbuild-loader 替换 babel-loader
  → cache: { type: 'filesystem' }（Wepback 5）
  → splitChunks 提取 vendor
  → thread-loader 或 parallel-webpack
```

**splitChunks**：将公共依赖提取为独立 vendor chunk。核心配置项：`chunks: 'all'`（所有 chunk）、`cacheGroups` 按体积和使用频率分组、`minSize` 最小提取体积阈值。

```js
optimization: {
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10,         // 优先级，越大越先匹配
        minChunks: 2,         // 至少被 2 个 chunk 引用
      },
    },
  },
  cache: { type: 'filesystem' },  // 磁盘缓存，二次构建提速 60%~80%
}
```

**Tree Shaking**：依赖 ESM 的静态 `import`/`export` 特性，构建时分析模块依赖图，删除未被引用的死代码。`sideEffects: false` 告知打包器所有模块无副作用可安全删除。有副作用的文件（全局 CSS、polyfill）需在 `sideEffects` 数组中列出。

### 完整配置骨架

```js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  mode: 'production',
  entry: './src/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash:8].js',
    clean: true,
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: { loader: 'esbuild-loader', options: { target: 'es2015' } },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|webp)$/,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } },  // < 8KB base64
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    new MiniCssExtractPlugin({ filename: 'css/[name].[contenthash:8].css' }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  optimization: {
    splitChunks: { cacheGroups: { vendor: { test: /node_modules/, name: 'vendors', chunks: 'all' } } },
  },
}
```

> **面试追问**：splitChunks 的 `chunks: 'all'` vs `'async'` vs `'initial'`？`all` 对所有生效（推荐），`async` 只拆异步 chunk，`initial` 只拆入口 chunk。`contenthash` vs `chunkhash` vs `hash`？`hash` 整个项目统一（一处改全部失效），`chunkhash` 按 chunk 计算（entry 不同 hash 不同），`contenthash` 按文件内容计算（最精确，CSS 变了 JS 的 hash 不变）。生产模式 `css-loader` 不配合 `MiniCssExtractPlugin.loader` 而用 `style-loader` 会导致 CSS 全部塞 JS 中，无独立文件、首屏白屏。

---

## 三、Vite

### 为什么快

Vite 开发环境基于浏览器原生 ESM，**只编译被实际 import 的模块**，无需全量打包即可启动 dev server。依赖预构建用 esbuild（Go 编写，速度 10~100 倍于 JS 工具链），生产构建切换为 Rollup（Tree Shaking 和代码分割更成熟）。

```
Vite 开发模式：
  浏览器 import → Vite Server 按需编译单个模块 → 返回 ESM

Webpack 开发模式：
  递归遍历所有 import → 全部打包成 bundle → 开 dev server
```

| 对比 | Vite（开发） | Webpack |
|------|-------------|---------|
| 冷启动 | 毫秒级 | 数十秒 ~ 数分钟 |
| 模块处理 | 浏览器 ESM，按需编译 | 全量打包 |
| 预构建 | esbuild（Go） | Babel（JS） |
| HMR | 只重请求变更模块 | 重构建依赖链 |
| 生产构建 | Rollup | 自身打包器 |

### 核心配置

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
    extensions: ['.ts', '.tsx', '.js'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['vue', 'vue-router'] },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  css: {
    preprocessorOptions: {
      scss: { additionalData: `@use "@/styles/variables.scss" as *;` },
    },
  },
})
```

**常用插件**：`@vitejs/plugin-vue` / `@vitejs/plugin-react`（框架编译）、`vite-plugin-compression`（生成 .gz/.br）、`unplugin-auto-import`（自动导入 API）、`unplugin-vue-components`（按需导入组件）。

> **面试追问**：Vite 开发这么快为什么生产不用 esbuild？esbuild 的 Tree Shaking 不如 Rollup 精细，且对 ES 新语法支持不完整。生产构建首选产物质量。proxy 配了但请求不通？检查 `changeOrigin: true`（后端按 Host 头校验时必开）、`rewrite` 路径是否正确。`resolve.alias` 必须用 `resolve(__dirname, 'src')` 绝对路径，相对路径找不到。

---

## 四、新生代工具：esbuild / Turbopack / Rspack

### esbuild

esbuild 用 Go 语言编写，直接从源码编译为机器码，无需 JIT 预热，并行度高。速度是 babel/webpack 的 10~100 倍。在 Vite 中负责依赖预构建，也可以作为独立打包器使用。

```bash
esbuild src/index.ts --bundle --outfile=dist/bundle.js --minify
```

| 能力 | 成熟度 |
|------|--------|
| TS/JSX 编译 | ✅ 成熟 |
| CSS/图片 | ✅ 支持 |
| Code Splitting | ✅ 支持 |
| 插件生态 | ⚠️ 不如 Webpack |
| 完整替代 Webpack | ❌ 不适合复杂项目 |

**最佳实践**：不独立替代 Webpack，而是作为 Webpack/Vite 的编译加速器（`esbuild-loader`、Vite 预构建）。

### Turbopack

由 Webpack 作者 Tobias Koppers 领衔，用 Rust 编写，Vercel 出品。增量计算（函数级缓存）是核心亮点——只重计算变化的模块。

```
HMR 对比：
  Vite（1k 模块）：~50ms
  Turbopack（1k 模块）：~30ms
  Webpack（1k 模块）：~500ms
```

| 特点 | 说明 |
|------|------|
| 定位 | Next.js 专属构建工具 |
| 语言 | Rust，利用 SWC 做编译 |
| 增量计算 | 函数级缓存，只重算受影响模块 |
| 生态 | 目前只支持 Next.js，不如 Vite 通用 |

### Rspack

字节跳动出品，Rust 编写的 Webpack 兼容打包器。核心卖点：**API 兼容**——Webpack 的 loader 和配置大部分可直接复用，迁移成本极低。

| 特点 | 说明 |
|------|------|
| 兼容性 | Webpack loader/plugin 高兼容，配置文件结构一致 |
| 性能 | 冷启动和 HMR 比 Webpack 快 5~10 倍 |
| 选型 | Webpack 老旧项目迁移首选，新项目可直接用 |

### 选型决策

```
新项目（中小规模）→ Vite（体验碾压）
新项目（Next.js）  → Turbopack（原生集成）
老旧 Webpack 项目  → Rspack（渐进替换，成本最低）
单文件/库构建      → esbuild（极简够用）
企业级复杂项目     → Webpack / Rspack（生态最完整）
```

---

## 五、进阶实战

### 自定义插件开发

**Webpack 插件**：带 `apply(compiler)` 方法的类，通过 Tapable hooks 访问构建各个阶段。

```js
class FileStatsPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('FileStatsPlugin', (compilation, cb) => {
      let totalSize = 0
      for (const asset of Object.values(compilation.assets)) totalSize += asset.size()
      console.log(`Total: ${(totalSize / 1024).toFixed(2)} KB`)
      cb()
    })
  }
}
```

**Vite 插件**：带 `name` 和钩子函数的对象，兼容 Rollup hooks + Vite 专属钩子。

```ts
import type { Plugin } from 'vite'

export function removeConsolePlugin(): Plugin {
  return {
    name: 'vite-plugin-remove-console',
    enforce: 'pre',  // 在其他 transform 之前执行
    transform(code, id) {
      if (id.includes('node_modules')) return
      if (process.env.NODE_ENV === 'production') {
        return { code: code.replace(/console\.(log|debug|info)\(.*?\);?/g, ''), map: null }
      }
    },
  }
}
```

| 对比 | Webpack Plugin | Vite Plugin |
|------|---------------|-------------|
| 实现 | 类 → `apply(compiler)` | 对象 → `{ name, hooks }` |
| 钩子 | Tapable | Rollup hooks + Vite 专属 |
| `transform` | compilation hooks 中实现 | 直接声明 `transform(code, id)` |

> **开发注意事项**：所有 `transform` 钩子第一行先 `if (id.includes('node_modules')) return`，否则依赖遍历会让构建卡死。实用自定义插件场景：检查未翻译文案（正则匹配中文 + 阻断构建）、自动生成 sitemap、打包产物大小报告。

### Module Federation（Webpack 5）

微前端方案，运行时动态加载远程应用的模块：

```js
// 远程应用
new ModuleFederationPlugin({
  name: 'remote_app',
  filename: 'remoteEntry.js',
  exposes: { './Header': './src/Header.vue' },
  shared: ['vue', 'vue-router'],       // 共享依赖，避免重复加载
})

// 宿主应用
new ModuleFederationPlugin({
  name: 'host',
  remotes: { remote: 'remote_app@http://localhost:3001/remoteEntry.js' },
})
// import Header from 'remote/Header'
```

### 大文件上传

核心三板斧：**分片 + 断点续传 + 并发控制**。

**分片与 Hash**：`Blob.prototype.slice()` 切 1~5MB 分片，`spark-md5` 增量计算文件 hash（大文件不能一次性 `readAsArrayBuffer`，会 OOM——必须分片增量计算）。

**断点续传**：上传前调 `checkChunk` 接口获取已上传分片索引，过滤后只传缺失部分。秒传：hash 已存在则跳过全部流程。

**并发控制（Promise 池）**：浏览器同域名连接数有限（~6），用 Promise 池限流：

```ts
async function uploadWithConcurrency(tasks: (() => Promise<void>)[], concurrency = 4) {
  const executing: Promise<void>[] = []
  for (const task of tasks) {
    const p = task().then(() => { executing.splice(executing.indexOf(p), 1) })
    executing.push(p)
    if (executing.length >= concurrency) await Promise.race(executing)
  }
  await Promise.all(executing)
}
```

| 环节 | 方案 | 关键 API |
|------|------|---------|
| 文件分片 | `Blob.prototype.slice()` | 原生 File API |
| 文件 hash | 增量 MD5 | `spark-md5` |
| 断点续传 | `checkChunk` 返回已有分片索引 | 服务端维护分片状态 |
| 秒传 | hash 已存在则跳过全部 | 依赖文件唯一性 |
| 并发控制 | Promise 池，窗口 4~6 | `Promise.race` 做阀门 |

> **面试追问**：分片大小选多大？推荐 1~5MB，太小请求数爆炸（500MB 文件切 1MB = 500 个请求），太大失败重传成本高。`FileReader.readAsArrayBuffer(file)` 直接读大文件算 hash 会 OOM，必须分片 + `spark-md5` 增量计算，每次只读一片到内存。
