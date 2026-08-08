---
title: 工程化
description: Vite、Webpack、Monorepo、Tree Shaking 工程化复习
---

# 工程化

## 一、构建工具基础认知

### Vite 为什么快？

Vite 开发环境基于浏览器原生 ESM，**只编译被实际 import 的模块**，无需全量打包即可启动 dev server。依赖预构建用 ESBuild（Go 编写，速度是 JS 工具链的 10~100 倍），生产构建切换为 Rollup（Tree Shaking 和代码分割更成熟）。

```
开发模式：
  浏览器请求 import → Vite Server 按需编译 → 返回 ESM
  → 只编译实际用到的模块

vs Webpack：
  启动时递归遍历所有 import → 全部打包成 bundle → 再开 server
```

| 对比项 | Vite（开发环境） | Webpack |
|---|---|---|
| 冷启动 | 毫秒级 | 数十秒 ~ 数分钟 |
| 模块处理 | 浏览器原生 ESM，按需编译 | 全量打包 |
| 预构建 | ESBuild（Go） | Babel（JS） |
| HMR | 只重新请求变更模块 | 重新构建依赖链 |
| 生产构建 | Rollup | 自身打包器 |

### Webpack 核心五概念

Webpack 从 entry 出发递归构建依赖图，loader 将非 JS 资源转为模块，plugin 在构建生命周期各阶段注入自定义行为，最终输出到 output。

| 概念 | 作用 | 关键配置 |
|---|---|---|
| entry | 构建入口 | `entry: './src/index.ts'` |
| output | 输出路径与命名 | `filename: '[name].[contenthash].js'` |
| loader | 转换非 JS 文件 | `{ test: /\.css$/, use: ['style-loader','css-loader'] }` |
| plugin | 构建流程钩子 | `new HtmlWebpackPlugin()` |
| resolve | 模块解析规则 | `extensions: ['.ts','.js'], alias: { '@': './src' }` |

**Loader 本质是"翻译器"**，将 TypeScript、CSS、图片等转为 Webpack 可处理的 JS 模块。**Plugin 是"编排器"**，通过 Tapable 事件体系访问整个构建生命周期，能做 Loader 做不到的事（生成额外文件、注入环境变量、修改输出资源）。

### 常用 Loader 速查

| Loader | 功能 | 关键配置 |
|---|---|---|
| `babel-loader` | ES6+/TS → ES5 | `presets: ['@babel/preset-env']` |
| `ts-loader` | TypeScript 编译（含类型检查） | `transpileOnly: true` 跳过类型检查提速 |
| `esbuild-loader` | JS/TS 超高速编译 | 速度是 babel-loader 的 10~100 倍 |
| `css-loader` | 解析 CSS `@import`/`url()` | `modules: true` 开启 CSS Modules |
| `postcss-loader` | CSS 后处理（autoprefixer 等） | 根目录 `postcss.config.js` |
| `sass-loader` | SCSS → CSS | 依赖 `sass`（Dart Sass） |

### 代码质量工具链

ESLint 校验代码逻辑规则，Prettier 统一格式，Husky 在 `pre-commit` 触发 lint-staged 只扫描暂存文件：

```json
// .lintstagedrc.json
{
  "*.{ts,tsx,vue}": ["eslint --fix", "prettier --write"],
  "*.{css,scss,json,md}": ["prettier --write"]
}
```

> **面试追问**：Loader 和 Plugin 的本质区别？Loader 管"翻译"（文件内容转换，工作在模块解析阶段），Plugin 管"编排"（访问 compiler + compilation hooks，能做 Loader 做不到的事）。两者不可互相替代。Webpack 构建太慢怎么排查？先 `speed-measure-webpack-plugin` 定位慢 loader → `ts-loader` 加 `transpileOnly: true` + `ForkTsCheckerWebpackPlugin` 独立类型检查 → `esbuild-loader` 替换 `babel-loader` → 开启 `cache: { type: 'filesystem' }`。

---

## 二、构建性能优化

### splitChunks / cache / 并行构建

- **`splitChunks`**：将公共依赖提取为独立 vendor chunk，业务代码变更时 vendor 无需重新下载。配合 `cacheGroups` 按体积、使用频率分组。
- **`cache`（filesystem）**：Webpack 5 内置，将构建中间结果写入 `node_modules/.cache`，二次构建速度提升 60%~80%。
- **`thread-loader` / `esbuild-loader`**：将耗时 loader 放入 worker 池并行执行。更推荐直接换 `esbuild-loader`，速度提升数十倍。

```js
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

### Tree Shaking

依赖 ESM 的静态 `import`/`export`，打包时分析模块依赖图，删除未被引用的"死代码"。`sideEffects: false` 告知打包器所有模块无副作用，可安全删除未使用导出。有副作用的文件（全局 CSS、polyfill）需在 `sideEffects` 数组中明确列出。

```json
{ "sideEffects": ["*.css", "./src/polyfills.js"] }
```

### Monorepo：pnpm + Turborepo

pnpm 通过硬链接 + 符号链接保证依赖隔离，**严格禁止幽灵依赖**（项目访问未声明在 `package.json` 中的包）。Turborepo 在此基础上提供增量构建、缓存和并行任务编排。

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

| 幽灵依赖示例 | npm/yarn（扁平化） | pnpm（严格隔离） |
|---|---|---|
| `package.json` 只声明了 A | 能 `require('express')`（B 依赖了它） | ❌ 报错，必须显式声明 |
| 风险 | 升级 B 版本后依赖消失，项目崩溃 | 依赖关系明确 |

> **面试追问**：splitChunks 的 `chunks: 'all'` vs `'async'` vs `'initial'`？`all` 对所有 chunk 生效（推荐），`async` 只拆分异步 chunk，`initial` 只拆分入口 chunk。Vite 开发这么快为什么生产不用 esbuild？esbuild 的 Tree Shaking 不如 Rollup 精细，且对 ES 新语法支持不完整。生产构建首选产物质量。

---

## 三、构建工具深度配置

### Vite 配置核心

`vite.config.ts` 涵盖插件、模块解析、开发服务器、生产构建和 CSS 处理五大域：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
    extensions: ['.ts', '.tsx', '.js', '.json'],
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
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['vue', 'vue-router'] },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  css: {
    preprocessorOptions: {
      scss: { additionalData: `@import "@/styles/variables.scss";` },
    },
  },
})
```

**常用插件**：`@vitejs/plugin-vue` / `@vitejs/plugin-react`（框架编译）、`vite-plugin-compression`（生成 .gz/.br）、`unplugin-auto-import`（自动导入 API）、`unplugin-vue-components`（按需导入组件库）。

### Webpack 配置核心

```js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
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
        use: { loader: 'babel-loader', options: { presets: ['@babel/preset-env', '@babel/preset-typescript'] } },
      },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'] },
      { test: /\.(png|jpe?g|gif|webp)$/, type: 'asset', parser: { dataUrlCondition: { maxSize: 8 * 1024 } } },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    new MiniCssExtractPlugin({ filename: 'css/[name].[contenthash:8].css' }),
  ],
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: { '@': path.resolve(__dirname, 'src') },
  },
}
```

**常用 Plugin**：`HtmlWebpackPlugin`（生成 HTML）、`MiniCssExtractPlugin`（抽离 CSS）、`DefinePlugin`（注入全局常量）、`BundleAnalyzerPlugin`（分析 bundle 体积）、`ForkTsCheckerWebpackPlugin`（独立进程做 TS 类型检查）。

### 下一代构建工具对比

| | Webpack | Vite | Rspack | Turbopack |
|---|---|---|---|---|
| 语言 | JS | Go + JS | **Rust** | **Rust** |
| 冷启动 | 慢 | 毫秒级 | 快 | 快 |
| HMR | 秒级 | <100ms | <100ms | <100ms |
| 兼容性 | 最成熟 | 好 | Webpack 高兼容 | Next.js 专属 |
| 选型 | 存量项目 | 新项目首选 | Webpack 迁移首选 | Next.js 项目 |

> **面试追问**：Vite proxy 配了但请求不通？检查 `changeOrigin: true`（后端按 Host 头校验时必开）、`rewrite` 规则是否正确、后端服务端口是否在线。`resolve.alias` 必须用绝对路径 `path.resolve(__dirname, 'src')` 而非相对路径 `'./src'`。新项目选 Vite（体验碾压），Webpack 存量项目用 Rspack 渐进替换。

---

## 四、进阶实战

### 自定义插件开发

插件本质是在构建生命周期特定节点注入自定义行为。Webpack 用 Tapable hooks（`compiler.hooks.emit` 等），Vite 兼容 Rollup hooks 并扩展了 Vite 专属钩子。

**Webpack 插件**：一个带 `apply(compiler)` 方法的类。

```js
class FileStatsPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('FileStatsPlugin', (compilation, callback) => {
      let totalSize = 0
      for (const [name, asset] of Object.entries(compilation.assets)) {
        totalSize += asset.size()
      }
      console.log(`Total: ${(totalSize / 1024).toFixed(2)} KB`)
      callback()
    })
  }
}
```

**Vite 插件**：一个带 `name` 和钩子函数的对象。

```ts
export function myPlugin(): Plugin {
  return {
    name: 'vite-plugin-my',
    transform(code, id) {
      if (id.includes('node_modules')) return
      // 生产环境移除 console.log
      if (process.env.NODE_ENV === 'production') {
        return { code: code.replace(/console\.(log|debug|info)\(.*?\);?/g, ''), map: null }
      }
    },
  }
}
```

| 对比 | Webpack Plugin | Vite Plugin |
|---|---|---|
| 实现 | 类，`apply(compiler)` | 对象，`{ name, hooks }` |
| 钩子 | Tapable（sync/async/promise） | Rollup hooks + Vite 专属 |
| 代码转换 | compilation hooks | `transform(code, id)` |

> **经典场景**：检查未翻译文案的插件——在 `compiler.hooks.emit` 阶段遍历 `compilation.assets`，正则匹配中文，生成报告并可选阻断构建。所有 `transform` 钩子第一行先 `if (id.includes('node_modules')) return`，否则依赖遍历会让构建卡死。

### Module Federation（Webpack 5）

微前端方案，运行时动态加载远程应用的模块：

```js
// 远程应用（提供模块）
new ModuleFederationPlugin({
  name: 'remote_app',
  filename: 'remoteEntry.js',
  exposes: { './Header': './src/Header.vue' },
  shared: ['vue'],           // 共享依赖，避免重复加载
})

// 宿主应用（消费模块）
new ModuleFederationPlugin({
  remotes: { remote: 'remote_app@http://xxx/remoteEntry.js' }
})
// import Header from 'remote/Header'
```

### 大文件上传

核心三板斧：**分片 + 断点续传 + 并发控制**。

**1. 分片与 Hash**：`Blob.prototype.slice()` 切 1~5MB 分片，`spark-md5` 增量计算文件 hash，作为秒传和断点续传的判断依据。

**2. 断点续传**：上传前调 `checkChunk` 接口，服务端返回已存在分片索引，前端过滤后只传缺失部分。

**3. 并发控制（Promise 池）**：浏览器同域名连接数有限（~6 个），用 Promise 池限制 4~6 并发：

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

| 技术点 | 方案 | 关键 API |
|---|---|---|
| 文件分片 | `Blob.prototype.slice()` | 原生 File API |
| 文件 hash | 增量 MD5 | `spark-md5` |
| 断点续传 | `checkChunk` 返回已上传分片索引 | 服务端维护分片状态 |
| 秒传 | hash 已存在则跳过全部流程 | 依赖 hash 唯一性 |
| 并发控制 | Promise 池，窗口 4~6 | `Promise.race` 做阀门 |

> **面试追问**：秒传原理？文件选好后先算 hash → `checkFile` 接口查 hash 是否存在 → 存在则直接返回成功。分片大小选多大？推荐 1~5MB。太小请求数爆炸，太大失败重传成本高。`FileReader.readAsArrayBuffer(file)` 直接读大文件算 hash 会 OOM——必须用分片 + spark-md5 增量计算，每次只读一片到内存。
