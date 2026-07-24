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

### 💬 面试深度

**标准回答**：RBAC 核心是用户→角色→权限三层模型，角色是权限的集合，用户通过角色间接获得权限，这样管理员只需要调整角色就能批量生效。前端落地上，路由层面通过接口拉菜单数据，用 `router.addRoute` 动态注册，按钮层面用自定义指令 `v-permission` 控制显隐，路由守卫 `beforeEach` 统一做 Token 校验和权限路由加载，整条链路从"能不能进页面"到"能不能点按钮"全覆盖。

**追问预判**：

1. **「`addRoute` 注册的动态路由，用户刷新页面后路由就丢了，怎么处理？」** —— 核心思路是路由持久化 + 守卫恢复。刷新后 Vue Router 实例重置，但 pinia store 可以从 localStorage 恢复 token 和 roles；在 `beforeEach` 里检查 `rolesLoaded` 标记，如果为 false 就重新调接口拉菜单、重新 `addRoute`，然后再 `next(to.fullPath)` 回到目标页，用户无感知。

2. **「`v-permission` 用 `el.remove()` 移除 DOM，如果用户权限变化了怎么恢复？」** —— `mounted` 只执行一次，remove 后就真没了。改进方案：要么用 `el.style.display = 'none'` 保留节点，要么把权限判断逻辑放在 `updated` 钩子里，配合响应式权限列表做动态切换；或者干脆不用指令，改封装一个 `<PermissionGuard>` 组件用 `v-if`，更符合 Vue 响应式心智。

**源码在哪**：Vue Router 的 `addRoute` 实现在 `src/router.ts` 的 `addRoute` 方法中，底层调用 `matcher.addRoute` 将路由记录插入 matcher 的路由映射表；`removeRoute` 对应 `matcher.removeRoute`，通过 name 查找并删除。权限指令在 Vue 源码中没有内置实现，完全由业务侧封装，核心依赖 Vue 的 `app.directive` API（源码 `packages/runtime-core/src/directives.ts`）。

**踩过的坑**：早期项目里把 `v-permission` 指令只写在 `mounted` 钩子，用 `el.remove()` 移除按钮；后来加了"切换角色"功能，用户切到高权限角色后按钮没回来，因为 DOM 节点已经被物理删除了。修复方式是把 `el.remove()` 改成 `el.style.display = 'none'`，并在 `updated` 里根据最新 permissions 恢复 `display`，同时配合角色切换时强制重新渲染路由页面。

**项目选型**：RBAC 适合绝大多数后台管理系统，够用且实现简单；如果业务需要"用户只能看自己部门 + 创建时间在 30 天内"这种带属性的规则，就得升级到 ABAC（Attribute-Based Access Control），但复杂度高很多，小项目慎入。

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

### 💬 面试深度

**标准回答**：Token 无感刷新的核心是双 Token —— Access Token 短期有效（15-30 分钟）用于日常请求，Refresh Token 长期有效（7-30 天）专门用来换新 Access Token。落地时在 axios 响应拦截器里统一捕获 401，拿 Refresh Token 调刷新接口，成功后更新本地存储，再把刚才失败的那个请求重放出去，用户完全无感知。多租户方面，前端主要解决"怎么识别当前是哪个租户"——要么看子域名 `{tenant}.example.com`，要么看路径前缀 `/tenant-a/dashboard`，然后把这个租户 ID 注入到所有请求头里，后端据此做数据隔离。

**追问预判**：

1. **「同一时间有 5 个并发请求全部返回 401，会不会触发 5 次刷新接口？」** —— 这就是经典的并发刷新问题。解决方式是加一把"刷新锁"：拦截器里用一个 `isRefreshing` 标记 + Promise 等待队列。第一个 401 进来时，设置 `isRefreshing = true` 并发起刷新请求；后续 401 进来发现锁已存在，不重复发刷新请求，而是把自己的 resolve/reject 塞进队列，等刷新完成后统一 `queue.forEach(resolve)` 批量重放。代码层面就是一个 pending 的 Promise 数组，刷新成功后全部 resolve。

2. **「Refresh Token 也过期了怎么办？用户按 F5 刷新页面时怎么判断？」** —— Refresh Token 过期说明用户已经长期不活跃，直接清空本地存储并跳转登录页。前端无法直接解析 Token 的过期时间（JWT 的 exp 是 UTC 时间戳），一般做法是在 `beforeEach` 里加一层判断：如果 token 解码后发现 exp < Date.now()/1000，说明已过期，直接清空 state 跳登录，避免发一个必然 401 的无意义请求。

**源码在哪**：axios 拦截器链的核心实现在 `lib/core/Axios.ts` 的 `request` 方法中，拦截器通过 `InterceptorManager`（`lib/core/InterceptorManager.ts`）以栈的形式管理 —— 请求拦截器用 `unshift` 插到栈顶（后注册先执行），响应拦截器用 `push` 追加到栈底（先注册先执行）。刷新锁属于业务层装修，不是 axios 内置能力。

**踩过的坑**：最早做 Token 刷新时，偷懒用 `setTimeout(fn, 25 * 60 * 1000)` 每 25 分钟定时刷新。结果用户在浏览器切到别的 tab 再切回来时，Chrome 对后台 tab 的定时器做了节流（最小间隔 1 秒甚至更长），定时器完全不准，导致 Token 静默过期。正确做法是抛弃定时器方案，完全依赖 axios 响应拦截器被动判断 401 状态码 + 刷新锁机制，不管用户切不切后台、什么时候回来，只要请求发出去了就能兜底。

**项目选型**：多租户数据隔离三选一 —— 独立数据库最安全但运维成本高，适合金融/医疗等强合规场景；共享数据库 + 独立 Schema 折中，一个实例多套 schema，成本适中；共享表 + `tenant_id` 字段最省钱，但代码里必须 100% 覆盖 WHERE 条件，漏一个就是跨租户数据泄露事故，适合内部工具或小体量 SaaS 起步阶段。
