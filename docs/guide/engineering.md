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

### Vite 配置详解 ⭐⭐

`vite.config.ts` 是 Vite 项目的核心配置文件，它基于 Rollup 的配置体系并做了大量简化。配置文件结构清晰，涵盖插件系统、模块解析、开发服务器、生产构建和 CSS 处理五大核心域。Vite 开箱即用地支持 TypeScript 配置，IDE 自动补全体验良好。

```ts
// vite.config.ts — 完整结构示例
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  // ========== 1. 插件 ==========
  plugins: [vue()],

  // ========== 2. 模块解析 ==========
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },

  // ========== 3. 开发服务器 ==========
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // ========== 4. 生产构建 ==========
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],  // 拆包
        },
      },
    },
    chunkSizeWarningLimit: 500,           // chunk 大小警告阈值 (KB)
  },

  // ========== 5. CSS ==========
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
    modules: {
      localsConvention: 'camelCaseOnly',   // CSS Modules 命名风格
    },
  },
})
```

**常用插件一览**：

| 插件 | 作用 | 典型场景 |
|---|---|---|
| `@vitejs/plugin-vue` | 提供 Vue 3 SFC（单文件组件）编译支持 | Vue 3 项目必备 |
| `@vitejs/plugin-react` | 提供 React Fast Refresh + JSX 编译 | React 项目必备 |
| `vite-plugin-compression` | 构建时生成 `.gz` / `.br` 压缩文件，配合 Nginx 静态压缩 | 优化首屏加载 |
| `vite-plugin-imagemin` | 压缩图片资源（png/jpg/svg/gif），减小构建产物体积 | 图片较多的站点 |
| `unplugin-auto-import` | 自动导入 Vue/React API，无需手动 `import { ref } from 'vue'` | 减少样板导入代码 |
| `unplugin-vue-components` | 按需自动导入组件库（Element Plus / Ant Design 等） | 组件库 Tree Shaking |
| `vite-plugin-pwa` | 基于 Workbox 生成 Service Worker，实现离线缓存 | PWA 应用 |

```ts
// 常用插件组合示例
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression'
import viteImagemin from 'vite-plugin-imagemin'

export default defineConfig({
  plugins: [
    vue(),
    // Gzip 压缩 —— 配合 Nginx gzip_static on
    viteCompression({ algorithm: 'gzip', threshold: 10240 }),
    // 图片压缩
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
    }),
  ],
})
```


### 💬 面试深度

**标准回答**：Vite 为什么快？开发环境用 esbuild（Go 编写）做依赖预构建，速度是 JS 工具链的 10~100 倍；同时基于浏览器原生 ESM 实现按需编译——只有被实际 import 的模块才会被编译返回，无需全量打包即可启动 dev server，冷启动毫秒级。生产构建切换为 Rollup，因为 Rollup 的 Tree Shaking、代码分割和插件生态比 esbuild 更成熟，能输出更优的生产包。这种"开发 esbuild + 生产 Rollup"的双引擎架构是 Vite 最大的设计亮点。

**追问预判**：
- Q: "Vite 开发这么快，为什么生产不用 esbuild 一把梭？" → esbuild 虽然快，但设计目标是打包工具而非优化工具，对 ES 新语法支持不完整（如装饰器），且 Tree Shaking 能力不如 Rollup 精细。生产构建的首要是产物质量，速度次之。
- Q: "proxy 配了但请求不通怎么办？" → 检查 `changeOrigin: true` 是否设置（后端按 Host 头校验时必开），检查 `rewrite` 规则是否把路径改写正确，确认后端服务是否在目标端口运行。

**源码在哪**：
- Vite 插件的 PluginContainer 实现：`packages/vite/src/node/server/pluginContainer.ts` — 管理 Rollup 兼容钩子的调度
- esbuild 预构建逻辑：`packages/vite/src/node/optimizer/index.ts` — `optimizeDeps` 函数入口
- 开发服务器 ESM 按需编译：`packages/vite/src/node/server/transformRequest.ts` — 核心转换逻辑

**踩过的坑**：Vite 的 `resolve.alias` 配置用了相对路径 `'@': './src'` 而不是 `resolve(__dirname, 'src')`，结果在某些深层子目录下 `import` 解析失败，报 "Could not resolve" 错误。原因：alias 的相对路径是相对于当前文件而非项目根目录。修复：始终用 `path.resolve(__dirname, 'src')` 获取绝对路径。

**项目选型**：新项目选 Vite 而非 Webpack —— 冷启动毫秒级、HMR <100ms、配置简洁（无需 loader 链），开发体验碾压；但 Webpack 存量项目不强行迁移，用 Rspack 做渐进式替换成本更低。


### Webpack 配置详解 ⭐⭐

Webpack 的配置文件（`webpack.config.js`）围绕五大核心概念构建完整的构建流水线：从 entry 入口出发，经由 loader 管道转换各类资源，通过 plugin 在构建各阶段注入自定义行为，最终按照 output 规则输出产物，而 resolve 决定了模块如何被定位和解析。

```js
// webpack.config.js — 完整生产配置示例
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { DefinePlugin } = require('webpack')

module.exports = {
  // ========== 1. 入口 ==========
  entry: './src/main.ts',

  // ========== 2. 输出 ==========
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].chunk.js',
    clean: true,              // 构建前清空 output.path
    publicPath: '/',
  },

  // ========== 3. Loader ==========
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-typescript'],
          },
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { modules: true } },
          'postcss-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.(png|jpe?g|gif|webp)$/,
        type: 'asset',               // Webpack 5 资源模块
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
        generator: { filename: 'img/[name].[hash:8][ext]' },
      },
    ],
  },

  // ========== 4. Plugin ==========
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: true,
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
    }),
    new DefinePlugin({
      'process.env.APP_NAME': JSON.stringify('MyApp'),
    }),
  ],

  // ========== 5. 解析 ==========
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: { '@': path.resolve(__dirname, 'src') },
  },
}
```

**常用 Loader 速查表**：

| Loader | 功能 | 关键配置 |
|---|---|---|
| `babel-loader` | ES6+ / TS → ES5，兼容低版本浏览器 | `presets: ['@babel/preset-env']`，配合 `browserslist` |
| `ts-loader` | TypeScript 编译（内部调用 tsc，含类型检查） | `transpileOnly: true` 跳过类型检查以提速 |
| `css-loader` | 解析 CSS 中的 `@import` / `url()` 为 JS 模块 | `modules: true` 开启 CSS Modules |
| `postcss-loader` | CSS 后处理器：autoprefixer 自动加前缀、px→rem 等 | 根目录 `postcss.config.js` 管理插件 |
| `style-loader` | 将 CSS 以 `<style>` 标签注入 DOM | 开发环境与 HMR 配合良好 |
| `sass-loader` | 编译 SCSS → CSS | 依赖 `sass`（Dart Sass） |
| `esbuild-loader` | JS/TS 超高速编译（替代 babel-loader + ts-loader） | 速度是 babel-loader 的 10~100 倍 |

**常用 Plugin 速查表**：

| Plugin | 功能 | 关键配置 |
|---|---|---|
| `HtmlWebpackPlugin` | 生成 HTML 入口文件，自动注入打包后的 JS/CSS | `template` / `inject` |
| `MiniCssExtractPlugin` | 将 CSS 从 JS 中抽离为独立文件（生产环境必备） | `filename` / `chunkFilename` |
| `DefinePlugin` | 编译时注入全局常量（如 `process.env.API_URL`） | 值必须 `JSON.stringify()` 包裹 |
| `CopyWebpackPlugin` | 复制静态文件（favicon / robots.txt 等）到 `dist` | `patterns: [{ from, to }]` |
| `CompressionWebpackPlugin` | 生成 `.gz` 压缩文件 | `algorithm: 'gzip'` |
| `BundleAnalyzerPlugin` | 可视化分析 bundle 体积，定位大模块 | 构建后自动打开分析页面 |
| `ForkTsCheckerWebpackPlugin` | 将 TS 类型检查放到独立进程，不阻塞构建 | 配合 `ts-loader` 的 `transpileOnly` 使用 |

```js
// postcss.config.js — 典型配置
module.exports = {
  plugins: [
    require('autoprefixer'),            // 自动添加浏览器前缀
    require('postcss-pxtorem')({        // px → rem
      rootValue: 16,
      propList: ['*'],
    }),
  ],
}
```

| 对比项 | babel-loader | ts-loader | esbuild-loader |
|---|---|---|---|
| 速度 | 慢（JS 实现） | 较慢（调用 tsc） | **极快**（Go 实现） |
| 类型检查 | 不包含 | 包含（可关闭） | 不包含 |
| 适用场景 | 经典方案，生态完善 | 需要编译期类型检查 | 追求构建速度 |


### 💬 面试深度

**标准回答**：Webpack 的核心是一条 entry → loader → plugin → output 的构建流水线。Loader 是"翻译器"，将 TypeScript、CSS、图片等非 JS 资源转为 Webpack 可处理的模块；Plugin 是"功能扩展器"，通过 Tapable 事件体系在构建生命周期的各个阶段（编译、优化、输出）注入自定义行为。Webpack 5 内置了 filesystem cache，将中间结果写入磁盘，二次构建速度提升 60%~80%。

**追问预判**：
- Q: "Loader 和 Plugin 的本质区别？能不能用 Plugin 替代 Loader？" → Loader 处理的是文件内容转换（输入源文件，输出 JS 模块），工作在模块解析阶段；Plugin 可以访问整个构建生命周期（compiler + compilation hooks），能做 Loader 做不到的事：生成额外文件、修改输出资源、注入环境变量。不能互相替代——Loader 管"翻译"，Plugin 管"编排"。
- Q: "Webpack 构建太慢怎么排查和优化？" → 先用 `speed-measure-webpack-plugin` 定位慢 loader；然后三板斧：(1) `ts-loader` 加 `transpileOnly: true` + `ForkTsCheckerWebpackPlugin` 独立类型检查；(2) 用 `esbuild-loader` 替换 `babel-loader`；(3) 开启 `cache: { type: 'filesystem' }`。

**源码在哪**：
- Webpack 编译引擎入口：`lib/Compiler.js` — `Compiler` 类，管理整个构建生命周期
- 单次编译对象：`lib/Compilation.js` — `Compilation` 类，管理模块图、chunk、资源
- 模块解析算法：`enhanced-resolve` 包 — 实现 `resolve.alias`、`resolve.extensions` 等
- Tapable 事件系统：`tapable` 包 — 所有 hooks 的底层实现

**踩过的坑**：`ts-loader` 默认开启类型检查（调用 tsc），忘了加 `transpileOnly: true`，每次构建多花 30s+。正确做法是 `ts-loader` 配置 `transpileOnly: true` 只做转译，另配 `ForkTsCheckerWebpackPlugin` 在独立进程中做类型检查，构建 + 检查互不阻塞。

**项目选型**：Webpack 存量项目多、生态最成熟、复杂场景兼容性最好；但新项目不再推荐从零搭建 Webpack，用 Vite（中小型）或 Rspack（大型且需要 Webpack 兼容）更划算。


### 自定义插件开发 ⭐⭐⭐

前端构建工具的插件机制允许开发者在构建生命周期的特定节点注入自定义行为。Webpack 基于 Tapable 事件体系，通过 `compiler.hooks` 挂载到构建全流程；Vite 的插件体系兼容 Rollup 插件接口，并提供 Vite 独有的钩子（如 `configResolved`、`transformIndexHtml`），二者都遵循"声明 name + 实现钩子"的模式。

**Webpack Plugin 开发**：

Webpack 插件是一个包含 `apply(compiler)` 方法的类。`compiler` 对象暴露了完整的构建生命周期 hooks（基于 Tapable），常用 hooks 包括 `done`（构建完成）、`emit`（输出资源到目录前）、`compilation`（每次重新编译时）、`afterEmit`（资源输出后）。通过 `compilation.hooks` 还可操作模块和资源。

```js
// webpack-plugin-file-stats.js — 打包后输出文件大小统计
class FileStatsPlugin {
  constructor(options = {}) {
    this.options = { showDetails: false, ...options }
  }

  apply(compiler) {
    // 在资源输出到目录前介入
    compiler.hooks.emit.tapAsync('FileStatsPlugin', (compilation, callback) => {
      const assets = compilation.assets
      let totalSize = 0
      const details = []

      for (const [filename, asset] of Object.entries(assets)) {
        const size = asset.size()
        totalSize += size
        const sizeKB = (size / 1024).toFixed(2)
        details.push({ filename, size: sizeKB })
      }

      // 按体积降序排列
      details.sort((a, b) => parseFloat(b.size) - parseFloat(a.size))

      console.log('\n📦 [FileStats] 构建产物分析 ──────────────────')
      console.log(`   总文件数: ${details.length}`)
      console.log(`   总体积:   ${(totalSize / 1024).toFixed(2)} KB`)

      if (this.options.showDetails) {
        console.log('\n   文件明细:')
        details.forEach(({ filename, size }) => {
          const bar = '█'.repeat(Math.round(size / 5))
          console.log(`   ${size.padStart(7)} KB  ${bar}  ${filename}`)
        })
      }
      console.log('─────────────────────────────────────────────\n')

      callback()
    })
  }
}

module.exports = FileStatsPlugin

// 使用：webpack.config.js
// const FileStatsPlugin = require('./webpack-plugin-file-stats')
// plugins: [new FileStatsPlugin({ showDetails: true })]
```

| Hook | 触发时机 | 典型用途 |
|---|---|---|
| `compiler.hooks.done` | 编译完成（无论成功或失败） | 构建通知、打包时间统计 |
| `compiler.hooks.emit` | 生成资源到 output 目录之前 | 修改输出资源、添加额外文件 |
| `compiler.hooks.compilation` | 每次创建新 compilation 对象时 | 访问模块图、资源操作 |
| `compiler.hooks.afterEmit` | 资源输出到目录之后 | 上传 CDN、部署通知 |
| `compilation.hooks.optimizeModules` | 模块优化阶段 | 自定义模块级别优化 |

**Vite Plugin 开发**：

Vite 插件是一个包含 `name` 属性和钩子函数的对象。Vite 完全兼容 Rollup 插件格式，同时扩展了 Vite 专属钩子：`config`（修改配置）、`configResolved`（配置确定后）、`transformIndexHtml`（转换 HTML）、`handleHotUpdate`（自定义 HMR 行为）等。

```ts
// vite-plugin-file-stats.ts — Vite 版打包文件大小统计
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

export function fileStatsPlugin(options?: { showDetails?: boolean }): Plugin {
  const { showDetails = false } = options ?? {}

  return {
    name: 'vite-plugin-file-stats',

    // 构建完成后统计产物
    closeBundle() {
      const outDir = 'dist'
      if (!fs.existsSync(outDir)) return

      const walkDir = (dir: string, list: { name: string; size: number }[] = []) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walkDir(fullPath, list)
          } else {
            list.push({ name: path.relative(outDir, fullPath), size: fs.statSync(fullPath).size })
          }
        }
        return list
      }

      const files = walkDir(outDir)
      files.sort((a, b) => b.size - a.size)

      const totalSize = files.reduce((sum, f) => sum + f.size, 0)
      console.log('\n📦 [FileStats] 构建产物分析 ──────────────────')
      console.log(`   总文件数: ${files.length}`)
      console.log(`   总体积:   ${(totalSize / 1024).toFixed(2)} KB`)

      if (showDetails) {
        files.slice(0, 15).forEach(({ name, size }) => {
          console.log(`   ${(size / 1024).toFixed(2).padStart(7)} KB  ${name}`)
        })
      }
      console.log('─────────────────────────────────────────────\n')
    },

    // 自定义代码转换（示例：移除 console.log）
    transform(code, id) {
      if (id.includes('node_modules')) return
      // 仅在生产构建时移除
      if (process.env.NODE_ENV === 'production') {
        return {
          code: code.replace(/console\.(log|debug|info)\(.*?\);?/g, ''),
          map: null,
        }
      }
    },
  }
}

// 使用：vite.config.ts
// import { fileStatsPlugin } from './vite-plugin-file-stats'
// plugins: [fileStatsPlugin({ showDetails: true })]
```

| 钩子 | 类型 | 说明 |
|---|---|---|
| `name` | 属性 | 插件唯一标识，必填 |
| `config(config, env)` | Vite 专属 | 修改用户配置，返回部分配置对象 |
| `configResolved(config)` | Vite 专属 | 获取最终解析后的配置（只读） |
| `resolveId(source)` | Rollup 通用 | 自定义模块解析逻辑 |
| `load(id)` | Rollup 通用 | 自定义模块加载，返回源码 |
| `transform(code, id)` | Rollup 通用 | 代码转换，最常用钩子 |
| `transformIndexHtml` | Vite 专属 | 转换 `index.html`，可注入脚本/标签 |
| `handleHotUpdate(ctx)` | Vite 专属 | 自定义 HMR 更新逻辑 |
| `closeBundle` | Rollup 通用 | 构建完成后，适合做统计/部署 |

| 对比项 | Webpack Plugin | Vite Plugin |
|---|---|---|
| 实现形式 | 类，`apply(compiler)` | 对象，`{ name, hooks }` |
| 钩子体系 | Tapable（sync/async/promise） | Rollup hooks + Vite 专属 hooks |
| 配置方式 | `new Plugin(options)` | `plugin(options)` 工厂函数 |
| 代码转换 | compilation hooks 操作 source | `transform(code, id)` 返回 code |
| 适用版本 | Webpack 4/5 | Vite 2+ |


### 💬 面试深度

**标准回答**：构建工具插件的本质是在构建生命周期的特定节点注入自定义行为。Webpack 插件是一个带 `apply(compiler)` 方法的类，通过 `compiler.hooks`（Tapable 事件）挂载到构建全流程；Vite 插件是一个带 `name` 和钩子函数的对象，兼容 Rollup 插件接口，同时扩展了 Vite 专属钩子如 `transformIndexHtml`。最常用的钩子是 `transform`（代码转换）和 `emit`/`closeBundle`（产物处理）。开发插件关键是选对 hook：想改源码用 `transform`，想改产物用 `emit`/`generateBundle`。

**追问预判**：
- Q: "给一个实际开发插件的场景？" → 开发一个检查未翻译文案的 Webpack 插件：在 `compiler.hooks.emit` 阶段遍历 `compilation.assets` 中的 JS 文件，用正则匹配中文文案（`/[\\u4e00-\\u9fa5]+/g`），将匹配结果生成一份未翻译文案报告（JSON/Markdown），并可选地让构建失败（`callback(new Error(...))`）。这种插件在出海/i18n 项目中非常实用。
- Q: "`compiler.hooks.emit` 和 `compilation.hooks.processAssets` 什么时候用哪个？" → `emit` 在资源即将写入磁盘前触发，适合做最终检查和添加额外资源；`processAssets` 是 Webpack 5 新增的更精细的钩子，可以指定处理阶段（`PROCESS_ASSETS_STAGE_*`），适合需要与其他插件协调执行顺序的场景。

**实战：检查未翻译文案的 Webpack 插件**：

```js
// webpack-plugin-i18n-check.js — 检查源码中的中文字符串
class I18nCheckPlugin {
  constructor(options = {}) {
    this.options = { failOnError: false, outputFile: 'i18n-report.md', ...options }
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('I18nCheckPlugin', (compilation, callback) => {
      const chineseRegex = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]+/g
      const report = []

      for (const [filename, asset] of Object.entries(compilation.assets)) {
        if (!filename.endsWith('.js')) continue
        const source = asset.source()
        const matches = [...source.matchAll(chineseRegex)]

        for (const match of matches) {
          // 排除注释中的中文（简化版）
          report.push({
            file: filename,
            text: match[0].slice(0, 40),
            // 粗略定位：截取前后 20 字符作为上下文
            context: source.slice(
              Math.max(0, match.index - 20),
              match.index + match[0].length + 20
            ).replace(/\n/g, '\\n'),
          })
        }
      }

      if (report.length > 0) {
        const md = [
          '# 未翻译文案报告',
          `> 共 ${report.length} 处中文文案需要翻译`,
          '',
          '| 文件 | 文案 | 上下文 |',
          '|------|------|--------|',
          ...report.map(r => `| ${r.file} | \`${r.text}\` | \`${r.context}\` |`),
        ].join('\\n')

        // 将报告作为新资源输出
        compilation.assets[this.options.outputFile] = {
          source: () => md,
          size: () => md.length,
        }

        console.warn(`\\n⚠️  [I18nCheck] 发现 ${report.length} 处未翻译文案，详见 ${this.options.outputFile}`)

        if (this.options.failOnError) {
          return callback(new Error(`构建中止：存在 ${report.length} 处未翻译文案`))
        }
      } else {
        console.log('\\n✅ [I18nCheck] 未发现未翻译文案')
      }

      callback()
    })
  }
}

module.exports = I18nCheckPlugin
```

**源码在哪**：
- Webpack Tapable 体系：`tapable` 包 — `SyncHook` / `AsyncSeriesHook` 等全部 hook 类型
- Webpack Compiler：`lib/Compiler.js` — `hooks` 属性定义所有 compiler 级别 hooks
- Webpack Compilation：`lib/Compilation.js` — `hooks` 属性定义所有 compilation 级别 hooks
- Vite Plugin 类型定义：`packages/vite/src/node/plugin.ts` — `Plugin` 接口完整定义

**踩过的坑**：写了一个 Vite 插件，在 `transform` 钩子里对每个文件做正则替换，忘了加 `if (id.includes('node_modules')) return` 判断，导致 `node_modules` 下所有依赖都被遍历和正则匹配，构建直接卡了 5 分钟。修复：所有 `transform` / `load` 钩子第一行先排除 `node_modules`，除非明确需要处理依赖。

**项目选型**：自定义插件优先考虑通用性 —— 用 Rollup 兼容格式可同时给 Vite 和 Rollup 项目使用；如果只面向 Webpack，用 Tapable hooks 可做更深度的构建流程控制。


### 大文件上传 ⭐⭐⭐

大文件上传是前端高频工程实践场景，核心思路是将大文件在前端切分为小分片（Chunk），逐片上传到服务端，最后合并为完整文件。主要涉及三个关键技术点：前端分片与 hash 计算（用于唯一标识文件）、断点续传（已上传分片不再重复上传）、并发控制（Promise 池限制同时上传的分片数，避免浏览器连接数耗尽）。

#### 1. 前端分片 + Hash 计算

分片使用 `Blob.prototype.slice()`，每片通常设为 1~5MB。文件唯一标识（hash）使用 `spark-md5` 增量计算，逐个读取分片并送入 hash 引擎，最终得到整个文件的指纹。hash 值用于服务端判断文件是否已上传（秒传）以及分片是否已存在（断点续传）。

```ts
// chunk-upload.ts — 分片 + Hash 计算
import SparkMD5 from 'spark-md5'

const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB 每片

interface Chunk {
  blob: Blob
  index: number
  hash: string
}

/**
 * 将文件切分为分片，并计算整个文件的 MD5
 */
async function sliceFile(file: File): Promise<{
  chunks: Chunk[]
  fileHash: string
}> {
  const spark = new SparkMD5.ArrayBuffer()
  const chunks: Chunk[] = []
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const blob = file.slice(start, end)

    // 增量计算 hash：读取分片 → 送入 spark → 暂存分片
    const buffer = await blob.arrayBuffer()
    spark.append(buffer)

    chunks.push({ blob, index: i, hash: '' })
  }

  const fileHash = spark.end() // 最终 MD5

  // 每个分片 hash = 文件 hash + 分片索引（简化方案）
  chunks.forEach((chunk) => {
    chunk.hash = `${fileHash}-${chunk.index}`
  })

  return { chunks, fileHash }
}
```

#### 2. 断点续传

上传前先调用 `checkChunk` 接口，传入文件 hash 和分片列表，服务端返回已存在的分片索引数组。前端据此过滤掉已上传的分片，仅上传缺失部分，避免重复传输。

```ts
/**
 * 查询服务端已上传的分片索引
 */
async function checkUploadedChunks(
  fileHash: string,
  totalChunks: number
): Promise<number[]> {
  const res = await fetch('/api/checkChunk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileHash, totalChunks }),
  })
  const { uploaded } = await res.json()
  return uploaded // 例如 [0, 2, 5] 表示索引 0/2/5 已上传
}
```

#### 3. 并发控制（Promise 池）

浏览器对同一域名的 TCP 连接数有限制（通常 6 个），直接 `Promise.all(allChunks)` 会同时发起数十甚至上百个请求，可能导致连接阻塞。使用 Promise 池模式，维护一个固定大小的"并发窗口"，每完成一个分片才推入下一个。

```ts
/**
 * Promise 池：限制最大并发数
 */
async function uploadWithConcurrency(
  tasks: (() => Promise<void>)[],
  concurrency: number = 4
): Promise<void> {
  const executing: Promise<void>[] = []

  for (const task of tasks) {
    const p = task().then(() => {
      // 完成一个，从 executing 中移除自己
      executing.splice(executing.indexOf(p), 1)
    })
    executing.push(p)

    if (executing.length >= concurrency) {
      // 达到上限，等待任一完成
      await Promise.race(executing)
    }
  }

  // 等待剩余所有任务完成
  await Promise.all(executing)
}

/**
 * 上传单个分片
 */
async function uploadChunk(
  chunk: Chunk,
  fileHash: string,
  fileName: string,
  onProgress?: (index: number, percent: number) => void
): Promise<void> {
  const formData = new FormData()
  formData.append('chunk', chunk.blob)
  formData.append('hash', chunk.hash)
  formData.append('fileHash', fileHash)
  formData.append('fileName', fileName)
  formData.append('chunkIndex', String(chunk.index))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploadChunk')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(chunk.index, Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) resolve()
      else reject(new Error(`分片 ${chunk.index} 上传失败`))
    }

    xhr.onerror = () => reject(new Error(`分片 ${chunk.index} 网络错误`))
    xhr.send(formData)
  })
}
```

#### 4. 完整上传流程

```ts
/**
 * 大文件完整上传入口
 */
async function uploadLargeFile(file: File, onOverallProgress?: (pct: number) => void) {
  // Step 1: 分片 + 计算 hash
  const { chunks, fileHash } = await sliceFile(file)

  // Step 2: 查询已上传分片（断点续传 / 秒传）
  const uploaded = await checkUploadedChunks(fileHash, chunks.length)

  // 秒传：所有分片已存在
  if (uploaded.length === chunks.length) {
    await mergeChunks(fileHash, file.name, chunks.length)
    console.log('⚡ 秒传成功')
    return
  }

  // Step 3: 过滤出待上传分片
  const pendingChunks = chunks.filter((c) => !uploaded.includes(c.index))
  const progressMap = new Map<number, number>()

  // Step 4: 创建上传任务列表
  const tasks = pendingChunks.map((chunk) => {
    return () =>
      uploadChunk(chunk, fileHash, file.name, (index, percent) => {
        progressMap.set(index, percent)
        const totalProgress =
          (uploaded.length * 100 +
            Array.from(progressMap.values()).reduce((s, v) => s + v, 0)) /
          chunks.length
        onOverallProgress?.(Math.round(totalProgress))
      })
  })

  // Step 5: 并发上传（限制 4 个并发）
  await uploadWithConcurrency(tasks, 4)

  // Step 6: 通知服务端合并分片
  await mergeChunks(fileHash, file.name, chunks.length)
  console.log('✅ 上传完成')
}

async function mergeChunks(fileHash: string, fileName: string, totalChunks: number) {
  await fetch('/api/mergeChunks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileHash, fileName, totalChunks }),
  })
}
```

#### 核心技术点总结

| 技术点 | 方案 | 关键 API / 库 |
|---|---|---|
| 文件分片 | `Blob.prototype.slice(start, end)` | 原生 File API |
| 文件 hash | 增量 MD5（逐片读取并送入 hash 引擎） | `spark-md5` |
| 断点续传 | `checkChunk` 接口返回已上传分片索引，前端过滤跳过 | 服务端需维护分片状态（Redis / 文件系统） |
| 秒传 | 上传前先查 hash，若已存在完整文件则跳过全部流程 | 依赖文件 hash 唯一性 |
| 并发控制 | Promise 池模式，维护固定大小的并发窗口（推荐 4~6） | 自定义 `uploadWithConcurrency` |
| 进度回调 | 每个分片通过 `xhr.upload.onprogress` 汇报，聚合为总体进度 | 分片进度加权平均 |
| 合并通知 | 所有分片上传完成后，调用 `mergeChunks` 接口服务端合并 | 合并接口需幂等 |

| 对比项 | 传统单文件上传 | 分片上传 |
|---|---|---|
| 适用文件大小 | < 100MB | > 100MB（或网络不稳定时） |
| 断点续传 | 不支持（失败需重头传） | 天然支持，只重传失败分片 |
| 并发控制 | N/A | Promise 池限制 4~6 并发 |
| 服务端复杂度 | 低 | 需维护分片状态 + 合并逻辑 |
| 进度感知 | 单次 `onprogress` | 分片粒度进度，更精确 |

### 💬 面试深度

**标准回答**：大文件上传的核心三板斧：分片 + 断点续传 + 并发控制。前端用 `Blob.prototype.slice()` 将文件切成 1~5MB 的分片，用 `spark-md5` 增量计算文件 hash（不把整个文件读进内存），然后通过 Promise 池控制 4~6 个并发上传。秒传的关键是复用 spark-md5 计算出的文件 hash —— 上传前先调 `checkFile` 接口查 hash 是否已存在，存在则直接返回成功，零流量完成"上传"。断点续传同样依赖 hash：`checkChunk` 接口返回已上传分片列表，前端只传缺失分片。

**追问预判**：
- Q: "秒传怎么实现的？如果两个不同文件 hash 碰撞了怎么办？" → 秒传流程：文件选好后，先算 spark-md5 → 调 `checkFile` 接口 → 服务端查 hash 是否已有完整文件 → 有则直接返回上传成功（可附加文件 URL）。MD5 碰撞在工程场景概率极低（< 1/2^128），可忽略；若对安全性要求极高（如金融合规），可追加文件大小（size）和文件名做联合校验，甚至用 SHA-256 替代 MD5。
- Q: "分片大小选多大最优？太大或太小有什么问题？" → 推荐 1~5MB。太小（<512KB）请求数爆炸，HTTP 握手开销占比高；太大（>10MB）单个分片失败重传成本高，且可能超过服务端 `maxRequestBodySize`。也要参考实际网络状况 —— 弱网环境适当缩小分片（如 1MB），以降低失败重传代价。

**源码在哪**：
- spark-md5 增量计算 API：`new SparkMD5.ArrayBuffer()` → `spark.append(chunkBuffer)` → `spark.end()` 拿到最终 MD5，核心是避免一次性 `readAsArrayBuffer` 整个大文件导致 OOM
- Blob 分片：`file.slice(start, end)` 返回 `Blob`，本质是引用而非拷贝，不会产生额外内存开销
- Promise 池模式：`Promise.race(executing)` 是并发窗口的"阀门"，完成一个才推进下一个

**踩过的坑**：用 `FileReader.readAsArrayBuffer(file)` 直接读 2GB 文件算 MD5，浏览器内存直接飙到 4GB+ 然后 OOM 崩溃（JS heap out of memory）。根因：`readAsArrayBuffer` 会把整个文件加载到内存。修复：改用 `file.slice()` 分片 + `spark-md5` 增量计算，每次只读一片（如 2MB）到内存，hash 计算完后 GC 回收，全程内存占用控制在分片大小级别。

**项目选型**：自研分片上传 vs 云服务 SDK（阿里云 OSS / 腾讯云 COS）—— 云厂商 SDK 自带分片 + 断点续传 + 秒传，服务端零开发，但费用按存储+流量计费；自研方案灵活度高（可自定义分片策略、存储后端），但服务端需自己维护分片状态（Redis）+ 合并逻辑，工作量翻倍。中小团队优先用云 SDK。

