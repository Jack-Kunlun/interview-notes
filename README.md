# 前端面试笔记

> 7 年前端经验 · Vue + React 双栈 · 企业级中后台 & 跨端 · 工程化 & 全栈

基于 VitePress 构建的个人前端面试知识库，涵盖知识点复习、模拟面试题和面试准备清单，部署于 GitHub Pages + 自定义域名，支持全文搜索。

🔗 **在线访问**：[https://www.kunlunmarket.work/](https://www.kunlunmarket.work/)

📦 **GitHub 仓库**：[Jack-Kunlun/interview-notes](https://github.com/Jack-Kunlun/interview-notes)

---

## 内容结构

```
docs/
├── guide/          # 知识点复习（21 个技术方向）
├── interview/      # 模拟面试题（4 组）
└── preparation/    # 面试准备（自我介绍 / 检查清单 / 跟进模板）
```

### 知识点覆盖

| 方向 | 文件 | 分组 |
|---|---|---|
| JavaScript 基础 | `guide/javascript.md` | 语言基础 |
| TypeScript | `guide/typescript.md` | 语言基础 |
| 前端算法 | `guide/algorithms.md` | 语言基础 |
| CSS 基础 & 组件库 | `guide/css.md` | CSS |
| CSS 深入（BFC / 层叠） | `guide/css-deep.md` | CSS |
| Vue（2 & 3） | `guide/vue.md` | 框架 |
| React | `guide/react.md` | 框架 |
| 浏览器原理 | `guide/browser.md` | 浏览器与网络 |
| 网络通信 | `guide/networking.md` | 浏览器与网络 |
| 跨端开发概览 | `guide/cross-platform.md` | 跨端开发 |
| 移动端通用知识 | `guide/mobile-common.md` | 跨端开发 |
| uni-app 跨端 | `guide/uni-app.md` | 跨端开发 |
| Taro 跨端 | `guide/taro.md` | 跨端开发 |
| React Native | `guide/rn.md` | 跨端开发 |
| 工程化（Vite / Webpack） | `guide/engineering.md` | 工程化 |
| 性能优化 | `guide/performance.md` | 工程化 |
| 调试与监控 | `guide/debugging.md` | 工程化 |
| 数据可视化（ECharts） | `guide/visualization.md` | 工程化 |
| DevOps（Nginx / Docker） | `guide/devops.md` | 工程化 |
| 权限控制 & 架构设计 | `guide/permission.md` | 架构与后端 |
| Node.js & 数据库 | `guide/nodejs.md` | 架构与后端 |

---

## 本地启动

```bash
# 安装依赖
npm install

# 启动开发服务器（热更新）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

本地访问地址：`http://localhost:5173/`

---

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages（自定义域名 `kunlunmarket.work`），约 2 分钟生效。

> **说明**：仓库通过 GitHub Pages 的 Custom Domain 功能绑定自定义域名，VitePress 的 `base` 已配置为 `/`，确保静态资源路径正确。

---

## 贡献笔记

欢迎提 PR 补充知识点或面试题，详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 技术栈

- [VitePress](https://vitepress.dev/) ^1.6.0
- GitHub Actions（自动 CI/CD）
- GitHub Pages（免费托管）
