# 前端面试笔记

> 7 年前端经验 · Vue + React 双栈 · 企业级中后台 & 跨端 · 工程化 & 全栈

基于 VitePress 构建的个人前端面试知识库，涵盖知识点复习、模拟面试题和面试准备清单，部署于 GitHub Pages，支持全文搜索。

🔗 **在线访问**：[https://YOUR_USERNAME.github.io/interview-notes/](https://YOUR_USERNAME.github.io/interview-notes/)

---

## 内容结构

```
docs/
├── guide/          # 知识点复习（11 个技术方向）
├── interview/      # 模拟面试题（22 题，A/B/C 组 + 行为题）
└── preparation/    # 面试准备（自我介绍 / 检查清单 / 跟进模板）
```

### 知识点覆盖

| 方向 | 文件 |
|---|---|
| Vue（2 & 3） | `guide/vue.md` |
| React | `guide/react.md` |
| TypeScript | `guide/typescript.md` |
| 跨端开发（uni-app / RN） | `guide/cross-platform.md` |
| 工程化（Vite / Webpack） | `guide/engineering.md` |
| CSS 基础 & 组件库 | `guide/css.md` |
| CSS 深入（BFC / 层叠） | `guide/css-deep.md` |
| 浏览器原理 | `guide/browser.md` |
| 权限控制 & 架构设计 | `guide/permission.md` |
| Node.js & 数据库 | `guide/nodejs.md` |
| 数据可视化（ECharts） | `guide/visualization.md` |

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

本地访问地址：`http://localhost:5173/interview-notes/`

---

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages，约 2 分钟生效。

**首次部署步骤**：

1. 在 GitHub 新建名为 `interview-notes` 的空仓库（不要勾选初始化文件）
2. 将 `docs/.vitepress/config.mts` 中的两处 `YOUR_USERNAME` 替换为你的 GitHub 用户名
3. 推送代码：
   ```bash
   git init
   git add .
   git commit -m "init: VitePress interview notes"
   git remote add origin https://github.com/YOUR_USERNAME/interview-notes.git
   git branch -M main
   git push -u origin main
   ```
4. 仓库 Settings → Pages → Source 选 **GitHub Actions**

---

## 贡献笔记

欢迎提 PR 补充知识点或面试题，详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 技术栈

- [VitePress](https://vitepress.dev/) ^1.6.0
- GitHub Actions（自动 CI/CD）
- GitHub Pages（免费托管）
