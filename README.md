# Frontend Interview Notes

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/Jack-Kunlun/interview-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/Jack-Kunlun/interview-notes/actions/workflows/ci.yml)
[![GitHub Pages](https://img.shields.io/badge/docs-online-brightgreen.svg)](https://www.kunlunmarket.work/)
[![Latest Release](https://img.shields.io/github/v/release/Jack-Kunlun/interview-notes)](https://github.com/Jack-Kunlun/interview-notes/releases)

> 面向现代前端开发者的开源面试知识库

系统整理 JavaScript、TypeScript、Vue、React、跨端开发、工程化、性能优化、浏览器、网络、Node.js 与架构设计等核心领域，并持续维护面试题、知识总结与实践经验。

项目基于 VitePress 构建，欢迎通过 Issue 和 Pull Request 参与内容修正、知识补充与技术更新。

> 7 年前端经验 · Vue + React 双栈 · 企业级中后台 & 跨端 · 工程化 & 全栈

---

## 在线访问

**https://www.kunlunmarket.work/**

---

## 为什么有这个项目？

前端面试知识散落在各处——博客、视频、碎片笔记——但缺少一个结构化、持续维护、社区可贡献的集中知识库。

Frontend Interview Notes 希望解决这个问题：

- **结构化**：按领域分层组织，不是无序的笔记堆砌
- **持续维护**：随技术生态演进定期更新，标注过时内容
- **社区驱动**：开放的 Issue 和 PR 流程，任何人可以修正错误或补充知识
- **中文优先**：覆盖中文前端社区关注的技术栈，包括 uni-app、Taro 等跨端框架

---

## 知识覆盖

| 方向 | 文件 | 分组 |
|---|---|---|
| JavaScript 基础 | `docs/core/javascript.md` | 编程语言 |
| TypeScript | `docs/core/typescript.md` | 编程语言 |
| 前端算法 | `docs/core/algorithms.md` | 编程语言 |
| CSS 基础 & 组件库 | `docs/core/css.md` | 编程语言 |
| CSS 深入（BFC / 层叠） | `docs/core/css-deep.md` | 编程语言 |
| Vue（2 & 3） | `docs/framework/vue.md` | 框架生态 |
| React | `docs/framework/react.md` | 框架生态 |
| 数据可视化（ECharts） | `docs/framework/visualization.md` | 框架生态 |
| SSR 服务端渲染 | `docs/framework/ssr.md` | 框架生态 |
| 跨端开发概览 | `docs/framework/cross-platform.md` | 跨端开发 |
| uni-app 跨端 | `docs/framework/uni-app.md` | 跨端开发 |
| Taro 跨端 | `docs/framework/taro.md` | 跨端开发 |
| React Native | `docs/framework/rn.md` | 跨端开发 |
| 工程化概述 | `docs/engineering/engineering.md` | 工程体系 |
| 构建工具（Vite / Webpack） | `docs/engineering/build-tools.md` | 工程体系 |
| 性能优化 | `docs/engineering/performance.md` | 工程体系 |
| 调试与监控 | `docs/engineering/debugging.md` | 工程体系 |
| DevOps（Nginx / Docker） | `docs/engineering/devops.md` | 工程体系 |
| 浏览器原理 | `docs/fullstack/browser.md` | 网络与服务端 |
| 网络通信 | `docs/fullstack/networking.md` | 网络与服务端 |
| Node.js & 数据库 | `docs/fullstack/nodejs.md` | 网络与服务端 |
| 权限控制 & 架构设计 | `docs/fullstack/permission.md` | 网络与服务端 |
| 模拟面试题 | `docs/interview/practice.md` | 面试实战 |
| 行为面试题（STAR） | `docs/interview/behavioral.md` | 面试实战 |
| 常见问题 & 自我介绍 | `docs/preparation/common-questions.md` | 面试准备 |
| 面试前检查清单 | `docs/preparation/checklist.md` | 面试准备 |
| 面试后跟进模板 | `docs/preparation/follow-up.md` | 面试准备 |

---

## 项目结构

```
interview-notes/
│
├── .github/
│   ├── ISSUE_TEMPLATE/          # Issue 模板
│   ├── workflows/
│   │   ├── ci.yml               # PR 质量门禁
│   │   └── deploy.yml           # Pages 自动部署
│   └── pull_request_template.md # PR 模板
│
├── docs/
│   ├── core/                    # 编程语言（JS / TS / CSS / 算法）
│   ├── framework/               # 框架生态（Vue / React / 可视化 / SSR / 跨端）
│   ├── engineering/             # 工程体系（构建工具 / 性能 / 调试 / DevOps）
│   ├── fullstack/               # 网络与服务端（浏览器 / 网络 / Node.js / 权限）
│   ├── interview/               # 模拟面试题
│   ├── preparation/             # 面试准备（自我介绍 / 检查清单 / 跟进模板）
│   └── .vitepress/              # VitePress 配置与主题
│
├── scripts/                     # 主题审计脚本
├── tests/                       # 主题审计单元测试
│
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── ROADMAP.md
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

---

## 本地启动

```bash
# 安装依赖
pnpm install

# 启动开发服务器（热更新）
pnpm run dev

# 构建生产版本
pnpm run build

# 预览构建结果
pnpm run preview

# 运行主题审计测试
pnpm run test:theme:unit
```

本地访问地址：`http://localhost:5173/`

---

## 贡献

欢迎通过 Issue 报告内容错误或提出知识补充建议，也欢迎通过 Pull Request 直接贡献内容。

- 报告内容错误 → [Content Error Issue](https://github.com/Jack-Kunlun/interview-notes/issues/new?template=content-error.yml)
- 请求新增知识 → [Content Request Issue](https://github.com/Jack-Kunlun/interview-notes/issues/new?template=content-request.yml)
- 贡献流程与内容质量标准 → [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Roadmap

- **内容质量**：持续审查过时知识，提升技术准确性，补充实践示例
- **知识覆盖**：Modern React 生态、Vue 生态新特性、测试、安全、SSR / Server Components
- **社区**：完善贡献流程，增加质量检查，维持定期 Release

详见 [ROADMAP.md](./ROADMAP.md)。

---

## 发布

所有版本记录在 [CHANGELOG.md](./CHANGELOG.md) 中，GitHub Releases 页面查看 [Releases](https://github.com/Jack-Kunlun/interview-notes/releases)。

---

## 技术栈

- [VitePress](https://vitepress.dev/) ^1.6.0
- GitHub Actions（CI + 自动部署）
- GitHub Pages（免费托管）
- pnpm（包管理）

---

## License

[MIT](./LICENSE) © Jack-Kunlun
