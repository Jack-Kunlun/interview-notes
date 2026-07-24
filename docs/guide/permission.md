---
title: 权限控制 & 架构设计
description: RBAC、动态路由、多租户、Token 无感刷新
---

# 权限控制 & 架构设计

## 必会基础 ⭐⭐⭐

### RBAC 模型：User → Role → Permission 三层映射

RBAC（Role-Based Access Control）通过用户、角色、权限三层解耦实现灵活授权：用户不直接关联权限，而是通过中间角色进行桥接，管理员只需调整角色的权限集合即可批量生效。典型关系如下：

| 层 | 说明 | 示例 |
|---|---|---|
| User（用户） | 系统使用者 | 张三、李四 |
| Role（角色） | 权限的集合 | admin、editor、viewer |
| Permission（权限） | 最小操作单元 | `user:create`、`user:delete` |

前端通常从接口获取用户所属角色列表，再由角色推导出扁平化的权限标识数组，用于路由过滤和按钮显隐判断。

### 前端动态路由：从接口获取权限菜单 → `router.addRoute` 动态注册

登录成功后，前端请求当前用户的菜单路由表，通过 `router.addRoute` 逐条注入路由实例。动态路由的关键在于：初始化只注册公共路由（login、404），权限路由全部在登录后按需挂载。

```ts
// router/index.ts
const router = createRouter({ ... })

// 登录后从接口获取菜单，动态注册路由
async function setupPermissions(roles: string[]) {
  const menuRoutes = await fetchMenuRoutes(roles)
  menuRoutes.forEach(route => router.addRoute(route))
}
```

注意 `addRoute` 不会覆盖同名路由，若页面需要支持动态路由的更新（如切换角色），应先调用 `removeRoute` 清除旧路由再重新注册。

### 路由守卫：`beforeEach` 中验证 Token + 权限检查

路由守卫是前端权限的入口防线，在 `beforeEach` 中依次完成：① Token 是否存在（否则跳登录）；② 权限路由是否已加载（否则先拉取再重定向回目标路径）。`return next(to.fullPath)` 的写法确保权限加载完成后不会丢失用户最初访问的页面：

```ts
// 路由守卫
router.beforeEach(async (to, _, next) => {
  const token = useUserStore().token
  if (!token) return next('/login')
  if (!store.rolesLoaded) {
    await setupPermissions(store.roles)
    return next(to.fullPath)  // 重定向到原目标
  }
  next()
})
```

### 按钮级权限：自定义指令 `v-permission` / `v-has-role`

按钮级权限用于控制页面内具体操作的显隐，通常封装为 Vue 自定义指令。核心逻辑是：在元素挂载时比对当前用户的权限列表，无权限则直接移除 DOM 节点（或隐藏）。相比 `v-if`，指令方案更解耦，不需要在每个组件中引入权限 store：

```ts
// directives/permission.ts
app.directive('permission', {
  mounted(el, binding) {
    const userPermissions = useUserStore().permissions
    if (!userPermissions.includes(binding.value)) {
      el.remove()  // 或 el.style.display = 'none'
    }
  }
})
```

```html
<button v-permission="'user:delete'">删除</button>
```

## 进阶考点 ⭐⭐

### Token 无感刷新：双 Token 方案（Access Token + Refresh Token）

Access Token 设置较短过期时间（15-30 分钟）降低泄露风险，Refresh Token 有效期更长（7-30 天）用于续期。核心流程：axios 响应拦截器捕获 401 → 用 Refresh Token 换取新 Access Token → 更新本地存储 → 重放失败请求队列。

```
1. 请求 API → 收到 401（Access Token 过期）
2. axios 拦截器：暂停其他请求，用 Refresh Token 换新 Access Token
3. 更新本地 Token，重新发送刚才失败的请求
4. 若 Refresh Token 也过期 → 强制登出
```

实现层面需注意：① 使用 Promise 队列缓存并发请求，避免多次同时刷新；② Refresh Token 建议存 httpOnly cookie 而非 localStorage。

### 多租户架构：子域名隔离 / 路径前缀隔离 / 数据库 Schema 隔离

多租户架构让同一套系统服务于多个客户（租户），核心差异在于**隔离粒度**和**数据区分方式**。前端需根据域名或路径前缀识别租户身份，并在所有 API 请求中携带租户标识：

| 隔离策略 | 前端体现 | 适用场景 |
|---|---|---|
| 子域名隔离 | `{tenant}.example.com`，前端解析 `location.host` | SaaS 平台，需独立域名 |
| 路径前缀隔离 | `example.com/{tenant}/*`，路由 base 动态设定 | 中小型系统，部署简单 |
| Schema 隔离 | 前端无感知，后端按请求头分流 | 强数据隔离需求 |

前端通常定义 `TENANT_KEY` 常量注入 axios 请求头，或通过 `router.beforeEach` 从 URL 提取租户 ID 存入 store。

### 微前端权限隔离：主应用统一鉴权，子应用接收权限上下文

微前端场景下，主应用（基座）负责登录、Token 管理和权限数据获取，子应用不重复实现鉴权逻辑。主应用通过 props 或全局状态（如 qiankun 的 `initGlobalState`）将 token、roles、permissions 下发给子应用。子应用在 `mount` 生命周期中接收权限上下文，再独立执行自己的路由守卫和按钮权限判断，保持各子应用权限逻辑自治。

