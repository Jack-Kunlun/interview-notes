import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '风岚 · 前端面试笔记',
  description: '7年前端经验 | Vue + React 双栈 | 知识复习 & 面试准备',
  base: '/',
  lang: 'zh-CN',

  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
  ],

  themeConfig: {
    logo: '📚',
    siteTitle: '前端面试笔记',

    // 顶部导航 —— 4 个独立栏目
    nav: [
      { text: '首页', link: '/' },
      {
        text: '编程语言',
        items: [
          { text: 'JavaScript 基础', link: '/core/javascript' },
          { text: 'TypeScript', link: '/core/typescript' },
          { text: '前端算法', link: '/core/algorithms' },
          { text: 'CSS 基础', link: '/core/css' },
          { text: 'CSS 深入', link: '/core/css-deep' },
        ]
      },
      {
        text: '框架生态',
        items: [
          { text: 'Vue（2 & 3）', link: '/framework/vue' },
          { text: 'React', link: '/framework/react' },
          { text: '数据可视化', link: '/framework/visualization' },
          { text: 'SSR 服务端渲染', link: '/framework/ssr' },
          {
            text: '跨端开发',
            items: [
              { text: '跨端开发概览', link: '/framework/cross-platform' },
              { text: 'uni-app', link: '/framework/uni-app' },
              { text: 'Taro', link: '/framework/taro' },
              { text: 'React Native', link: '/framework/rn' },
            ]
          },
        ]
      },
      {
        text: '工程体系',
        items: [
          { text: '工程化概述', link: '/engineering/engineering' },
          { text: '构建工具', link: '/engineering/build-tools' },
          { text: '性能优化', link: '/engineering/performance' },
          { text: '调试与监控', link: '/engineering/debugging' },
          { text: 'DevOps', link: '/engineering/devops' },
        ]
      },
      {
        text: '网络与服务端',
        items: [
          { text: '浏览器原理', link: '/fullstack/browser' },
          { text: '网络通信', link: '/fullstack/networking' },
          { text: 'Node.js & 数据库', link: '/fullstack/nodejs' },
          { text: '权限控制 & 架构', link: '/fullstack/permission' },
        ]
      },
      {
        text: '面试实战',
        items: [
          { text: '模拟面试题', link: '/interview/practice' },
          { text: '行为面试题（STAR）', link: '/interview/behavioral' },
          { text: '常见问题 & 自我介绍', link: '/preparation/common-questions' },
          { text: '面试前检查清单', link: '/preparation/checklist' },
          { text: '面试后跟进', link: '/preparation/follow-up' },
        ]
      },
      { text: '贡献笔记', link: '/contribute' },
    ],

    // 侧边栏 —— 按路径分别配置
    sidebar: {
      '/core/': [
        {
          text: '编程语言',
          collapsed: false,
          items: [
            { text: 'JavaScript 基础', link: '/core/javascript' },
            { text: 'TypeScript', link: '/core/typescript' },
            { text: '前端算法（手写核心方法）', link: '/core/algorithms' },
            { text: 'CSS 基础', link: '/core/css' },
            { text: 'CSS 深入（BFC / 层叠）', link: '/core/css-deep' },
          ]
        },
      ],

      '/framework/': [
        {
          text: '框架生态',
          collapsed: false,
          items: [
            { text: 'Vue（2 & 3）', link: '/framework/vue' },
            { text: 'React', link: '/framework/react' },
            { text: '数据可视化（ECharts）', link: '/framework/visualization' },
            { text: 'SSR 服务端渲染', link: '/framework/ssr' },
          ]
        },
        {
          text: '跨端开发',
          collapsed: false,
          items: [
            { text: '跨端开发概览', link: '/framework/cross-platform' },
            { text: 'uni-app 跨端', link: '/framework/uni-app' },
            { text: 'Taro 跨端', link: '/framework/taro' },
            { text: 'React Native', link: '/framework/rn' },
          ]
        },
      ],

      '/engineering/': [
        {
          text: '工程体系',
          collapsed: false,
          items: [
            { text: '工程化概述（规范 / Monorepo）', link: '/engineering/engineering' },
            { text: '构建工具（Webpack / Vite / esbuild）', link: '/engineering/build-tools' },
            { text: '性能优化', link: '/engineering/performance' },
            { text: '调试与监控', link: '/engineering/debugging' },
            { text: 'DevOps（Nginx / Docker）', link: '/engineering/devops' },
          ]
        },
      ],

      '/fullstack/': [
        {
          text: '网络与服务端',
          collapsed: false,
          items: [
            { text: '浏览器原理', link: '/fullstack/browser' },
            { text: '网络通信', link: '/fullstack/networking' },
            { text: 'Node.js & 数据库', link: '/fullstack/nodejs' },
            { text: '权限控制 & 架构设计', link: '/fullstack/permission' },
          ]
        },
      ],

      '/interview/': [
        {
          text: '面试实战',
          items: [
            { text: '模拟面试题', link: '/interview/practice' },
            { text: '行为面试题（STAR 法则）', link: '/interview/behavioral' },
            { text: '常见问题 & 自我介绍', link: '/preparation/common-questions' },
            { text: '面试前检查清单', link: '/preparation/checklist' },
            { text: '面试后跟进模板', link: '/preparation/follow-up' },
          ]
        }
      ],

      '/preparation/': [
        {
          text: '面试实战',
          items: [
            { text: '模拟面试题', link: '/interview/practice' },
            { text: '行为面试题（STAR 法则）', link: '/interview/behavioral' },
            { text: '常见问题 & 自我介绍', link: '/preparation/common-questions' },
            { text: '面试前检查清单', link: '/preparation/checklist' },
            { text: '面试后跟进模板', link: '/preparation/follow-up' },
          ]
        }
      ],
    },

    // 内置全局搜索（Ctrl+K）
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '未找到相关结果',
                resetButtonTitle: '清除搜索',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' }
              }
            }
          }
        }
      }
    },

    // 页面底部
    editLink: {
      pattern: 'https://github.com/Jack-Kunlun/interview-notes/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    lastUpdated: { text: '最后更新' },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Jack-Kunlun/interview-notes' }
    ],

    footer: {
      message: '基于 VitePress 构建 · 内容持续更新',
      copyright: '风岚 · 前端面试笔记'
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    outline: {
      label: '本页目录',
      level: [2, 3]
    },
  },

  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
})
