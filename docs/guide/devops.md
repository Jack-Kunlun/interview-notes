---
title: DevOps 部署
description: Nginx 配置、Docker 容器化、CI/CD 流水线及常见面试题
---

# DevOps 部署（Nginx / Docker / CI/CD）

## 必会基础 ⭐⭐⭐

### Nginx 是什么？正向代理 vs 反向代理

Nginx 是一个高性能的 HTTP 和反向代理服务器，以事件驱动（epoll）模型处理请求，单机可支撑数万并发连接。正向代理位于客户端一侧，代表客户端访问外部资源；反向代理位于服务端一侧，代表服务端接收请求并转发给内部服务。

| 对比项 | 正向代理 | 反向代理 |
|---|---|---|
| 代理对象 | 客户端 | 服务端 |
| 客户端感知 | 需手动配置代理地址 | 无感知，只访问代理地址 |
| 典型用途 | 翻墙、访问内网资源 | 负载均衡、安全防护、缓存 |
| 配置位置 | 客户端浏览器/系统设置 | 服务端 Nginx 配置 |

### Nginx 配置：静态资源服务器

最基础的使用方式——托管前端构建产物。

```nginx
server {
    listen       80;
    server_name  example.com;
    root         /usr/share/nginx/html;
    index        index.html;

    location / {
        try_files $uri $uri/ /index.html;  # SPA history 模式回退
    }

    # 静态资源强缓存
    location ~* \.(js|css|png|jpg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Nginx 配置：反向代理

将请求转发给后端服务，解决跨域并隐藏后端真实地址。

```nginx
location /api/ {
    proxy_pass         http://backend:3000/;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;

    # 超时配置
    proxy_connect_timeout 30s;
    proxy_read_timeout    60s;
}
```

### Nginx 配置：HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # HSTS：强制浏览器使用 HTTPS
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        root /usr/share/nginx/html;
    }
}

# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

### Nginx 配置：负载均衡

```nginx
upstream backend {
    # 加权轮询（默认）
    server backend1:3000 weight=3;
    server backend2:3000 weight=1;

    # IP Hash：同一客户端始终路由到同一服务器
    # ip_hash;

    # 最少连接
    # least_conn;
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://backend;
    }
}
```

| 算法 | 原理 | 适用场景 |
|---|---|---|
| 轮询（默认） | 依次分配 | 服务器性能相近 |
| weight | 按权重比例分配 | 服务器性能差异大 |
| ip_hash | 按客户端 IP hash | 需要 session 保持 |
| least_conn | 分配给连接数最少的 | 长连接场景 |

### Gzip 压缩

```nginx
http {
    gzip on;
    gzip_comp_level 6;                    # 压缩级别 1-9
    gzip_min_length 256;                  # 小于此值不压缩
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_vary on;                         # 响应头加 Vary: Accept-Encoding
    gzip_proxied any;
}
```

### 缓存策略

```nginx
# 静态资源强缓存（带版本 hash 的文件）
location ~* \.[a-f0-9]{8,}\.(js|css)$ {
    expires 1y;
}

# HTML 协商缓存（确保更新及时生效）
location / {
    add_header Cache-Control "no-cache";  # 每次验证
}
```

| 缓存类型 | 响应头 | 状态码 | 请求是否发送 |
|---|---|---|---|
| 强缓存 | Cache-Control: max-age | 200 (from disk/memory cache) | 否 |
| 协商缓存 | ETag / Last-Modified | 304 Not Modified | 是 |

### 💬 面试深度

**标准回答**：反向代理 + 负载均衡是 Nginx 最核心的两个能力。反向代理用 `proxy_pass` 把 `/api/` 请求转发到内部后端服务，同时通过 `proxy_set_header` 把真实客户端 IP 和协议传过去，这样后端日志里看到的不是 Nginx 的 IP 而是用户真实 IP。负载均衡用 `upstream` 块定义一组后端服务器，默认加权轮询——服务器配置高的 weight 调大一点，配置低的 weight 调小。如果业务有 session 需求但没做分布式 session，就用 `ip_hash` 保证同一客户端始终打到同一台机器。静态资源用 `expires 1y` 做强缓存，HTML 用 `no-cache` 做协商缓存，避免版本更新后用户还看到旧页面。

**追问预判**：
- *"proxy_pass 末尾加不加 `/` 有什么区别？"* → 加了 `/` 会把 location 匹配的前缀剥离再转发（`/api/user` → `/user`），不加 `/` 原样转发（`/api/user` → `/api/user`）。这是个经典坑，配错后端路由直接 404。
- *"ip_hash 有什么坑？"* → 后端服务器增减会导致 hash 重新分配，已有用户的 session 可能丢失；另外如果用户在 NAT 网络后面，多个用户共享同一个出口 IP，全都打到同一台机器，负载就偏了。

**源码在哪**：`src/http/ngx_http_upstream_round_robin.c`（加权轮询实现）、`src/http/ngx_http_upstream_ip_hash_module.c`（IP Hash）、`src/http/ngx_http_proxy_module.c`（proxy_pass 核心逻辑）。

**踩过的坑**：生产环境 Nginx 反向代理后，后端日志里所有请求来源都是 `127.0.0.1`，完全没法做 IP 级别的限流和风控。原因是只配了 `proxy_pass` 没配 `X-Real-IP` 和 `X-Forwarded-For`。修复是在 location 里加上 `proxy_set_header X-Real-IP $remote_addr` 和 `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`，同时后端框架（Express/Spring）要信任 `X-Forwarded-For` 头才能真正拿到客户端 IP。

**项目选型**：为什么用 Nginx 而不是 Traefik / Caddy？——Nginx 生态最成熟，文档和故障案例最多，团队所有人都会配；Traefik 虽然自动发现服务很香，但出问题时排查门槛高。对于中小团队静态代理 + 反向代理场景，Nginx 足够且风险最低。

## Docker 配置 ⭐⭐⭐

### Dockerfile 核心指令

| 指令 | 用途 | 示例 |
|---|---|---|
| FROM | 基础镜像 | `FROM node:20-alpine` |
| WORKDIR | 工作目录 | `WORKDIR /app` |
| COPY | 复制文件 | `COPY package*.json ./` |
| RUN | 构建时执行命令 | `RUN npm ci --production` |
| EXPOSE | 声明端口 | `EXPOSE 3000` |
| CMD | 容器启动默认命令 | `CMD ["node", "server.js"]` |

### 前端多阶段构建 Dockerfile

```dockerfile
# 阶段 1：构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# 阶段 2：运行（仅含 Nginx + 构建产物）
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### .dockerignore

```txt
# 依赖
node_modules
.pnpm-store

# 构建产物
dist
.vitepress/dist

# 环境 & 配置
.env
.env.local
.git

# IDE
.vscode
.idea
```

### docker-compose.yml（前端 + 后端 + Nginx）

```yaml
version: '3.8'
services:
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"

  backend:
    build:
      context: ./backend
    ports:
      - "3001:3000"
    environment:
      - DB_HOST=db
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

### 常用 Docker 命令速查

```bash
# 构建
docker build -t my-app .                # 从 Dockerfile 构建
docker build --no-cache -t my-app .     # 无缓存构建

# 运行
docker run -d -p 3000:80 --name app my-app   # 后台运行 + 端口映射
docker run -e DB_HOST=localhost my-app        # 传环境变量

# 管理
docker ps                          # 运行中的容器
docker logs -f app                 # 实时日志
docker exec -it app sh             # 进入容器
docker stop app && docker rm app   # 停止并删除容器

# Compose
docker compose up -d               # 启动所有服务
docker compose logs -f backend     # 查看后端日志
docker compose down                # 停止并清理
docker compose restart backend     # 重启单服务
```

### 💬 面试深度

**标准回答**：多阶段构建是 Docker 优化镜像体积的核心手段。第一阶段用完整 Node.js 镜像装依赖、跑 `pnpm build`，编译出 dist；第二阶段从一个干净的 Nginx alpine 镜像起步，只把 dist 拷进去。这样最终镜像只有 Nginx + 静态文件，大概 20~50MB，而构建工具链（node_modules 几百 MB、TypeScript 编译器）全部留在第一阶段，不进最终镜像。另外 `COPY package*.json ./` 放在 `COPY . .` 之前，这样只要依赖没变，Docker 的层缓存就能命中，不用重新 npm install。

**追问预判**：
- *"多阶段构建为什么能减小镜像？构建依赖不进最终层是什么原理？"* → 每个 `FROM` 启动一个独立的构建阶段，只有通过 `COPY --from=builder` 显式拷贝的内容才会进入最终镜像。第一阶段装的 node_modules、devDependencies、中间产物（藏在 `/app/node_modules/.cache` 之类）如果没有被 `COPY --from` 引用，就直接被 Docker 丢弃。本质上是一个选择性搬运的过程，不是"删除"而是"不带走"。
- *"Alpine 镜像为什么这么小？有什么坑？"* → Alpine 用 musl libc 替代 glibc，用 busybox 替代 GNU coreutils，基础镜像只有 ~5MB。坑在于 musl 和 glibc 行为不完全一致——比如某些 native 模块（node-gyp 编译的 C++ addon）在 Alpine 上可能编不过；另外 Alpine 的 DNS 解析默认不走 `search domain`，容器间用服务名通信偶尔出问题。

**源码在哪**：Docker BuildKit 源码 `github.com/moby/buildkit`，其中 `frontend/dockerfile/dockerfile2llb/convert.go` 负责解析 `COPY --from` 指令并生成 LLB（低级构建图），`solver/` 目录处理阶段间依赖和缓存。

**踩过的坑**：`docker-compose.yml` 里 backend 配了 `depends_on: - db`，以为数据库就绪了后端才启动——结果 backend 起得比 db 快，连接池初始化时 PostgreSQL 还在做 fsync 恢复，直接报 `ECONNREFUSED` 导致容器 crash-loop。根因是 `depends_on` 只等容器启动（状态变为 running），不等服务就绪（端口监听 + 能接受连接）。修复是给 backend 加 `restart: unless-stopped` 保底，同时在 backend 的 entrypoint 脚本里加 `wait-for-it.sh db:5432`，或者给 db 加 `healthcheck: {test: ["CMD-SHELL", "pg_isready -U postgres"], interval: 5s}` 再配合 `depends_on: db: {condition: service_healthy}`（Compose v3.9+ 不再支持 condition，需要改用 v2 格式或外部工具）。

**项目选型**：为什么用 Docker Compose 而不是 Kubernetes？——小团队 2~5 台机器，服务不超过 10 个，Compose 单机部署足够了，YAML 语法简洁、新人上手快；K8s 的 Pod/Service/Ingress/ConfigMap 概念堆叠太重，维护成本远超收益。等需要多机编排、自动扩缩容的时候再迁 K8s，Compose 到 K8s 的迁移（用 Kompose 一键转）成本很低。

## CI/CD 基础 ⭐⭐

### GitHub Actions 部署 frontend

```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install & Build
        run: |
          pnpm install --frozen-lockfile
          pnpm build

      - name: Deploy to Server
        uses: easingthemes/ssh-deploy@v5
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_KEY }}
          SOURCE: 'dist/'
          REMOTE_HOST: ${{ secrets.HOST }}
          REMOTE_USER: ${{ secrets.USER }}
          TARGET: '/var/www/html'
```

### 部署流程

```
PR 提交 → CI: lint + test → Code Review → 合并 main
                                              ↓
                                       CI: build + docker push
                                              ↓
                                       CD: docker compose pull
                                              ↓
                                          冒烟测试
                                           ↓       ↘ 失败
                                      生产上线     → 回滚
```

### 💬 面试深度

**标准回答**：一条完整的 CI/CD 流水线是：push 代码到 main 分支 → GitHub Actions 自动触发 → lint + test 先跑，不让有问题的代码进入构建 → 然后 `docker build` 并 `docker push` 到镜像仓库 → SSH 到服务器执行 `docker compose pull && docker compose up -d` → 最后跑冒烟测试，curl 一下关键接口确认返回 200。如果冒烟失败，立刻 `docker compose up -d` 回滚到上一版镜像（因为旧容器还在，只是停掉了）。

**追问预判**：
- *"CI 和 CD 的分界线在哪？"* → CI 止于"产物就绪且通过测试"——代码编译通过、lint 无报错、单元测试全绿、Docker 镜像已推送。CD 从"把产物部署到目标环境"开始——拉镜像、重启容器、验证健康。实际项目里两者通常在同一个 workflow 文件里，但逻辑边界清晰：CI 回答"代码对不对"，CD 回答"服务能不能用"。
- *"怎么处理数据库迁移？"* → CI/CD 流水线里永远不要自动跑 `migrate`。DDL 变更（加列、改类型、删表）可能锁表导致生产故障。正确做法是：CI 只检查 migration 文件是否存在且语法正确（`prisma migrate status`），CD 在部署后发通知给人工触发迁移，或者用 feature flag 让新代码兼容新旧 schema 共存一段时间。

**源码在哪**：GitHub Actions runner 源码 `github.com/actions/runner`，`src/Runner.Worker/` 目录下是 job 执行引擎，`src/Runner.Common/` 处理 secrets 解密和环境注入。easingthemes/ssh-deploy 核心就是 `rsync -avz --delete` 封装，源码在 `github.com/easingthemes/ssh-deploy`。

**踩过的坑**：GitHub Actions 里用了 `actions/setup-node@v4` 的 `cache: 'pnpm'`，但忘了先跑 `pnpm/action-setup@v4`，结果 cache 一直 miss，每次 CI 都重新下载全部依赖，跑 8 分钟。原因是 setup-node 的 cache 功能依赖 lockfile（`pnpm-lock.yaml`）来算 hash，但 lockfile 解析需要对应包管理器的 action 先执行。修复就是把 `pnpm/action-setup` 放在 `setup-node` 之前，或者干脆用 `actions/cache` 手动控制缓存键。

**项目选型**：为什么用 GitHub Actions 而不是 Jenkins？——零运维成本。Jenkins 需要自己搭 master、配 agent、装插件、升级版本，至少吃掉一个人 20% 的时间；GitHub Actions 只要一个 YAML 文件，ubuntu 环境开箱即用，和 GitHub 的 PR、Issue、Secrets 深度集成。除非公司有合规要求必须私有化部署 CI 服务端，否则 GitHub Actions 是更省心的选择。

## 常见面试题 ⭐⭐⭐

### 1. Nginx 如何做反向代理和负载均衡？

反向代理通过 `proxy_pass` 将请求转发给内部服务，对客户端完全透明。负载均衡通过 `upstream` 块定义多台服务器，Nginx 默认使用加权轮询算法分配请求。配合 `proxy_set_header` 传递真实客户端信息。

### 2. Docker 多阶段构建有什么优点？

- **镜像体积小**：构建依赖（node_modules、编译器）不进入最终镜像
- **安全性高**：不携带构建工具链，减少攻击面
- **构建缓存**：每阶段独立缓存，未变更层直接复用

| 对比 | 单阶段 | 多阶段 |
|---|---|---|
| Node.js 应用镜像 | ~900MB | ~150MB |
| 含构建工具 | ✅ | ❌ |
| 分层复用 | 全部 | 每阶段独立 |

### 3. 描述一个完整的部署流程

① **触发**：代码推送到 main 分支 → GitHub Actions 自动执行
② **CI**：lint → test → build → 构建 Docker 镜像并推送到镜像仓库
③ **CD**：服务器拉取最新镜像 → docker compose up -d 启动
④ **验证**：冒烟测试（健康检查 / 关键页面可访问）
⑤ **监控**：Sentry + Grafana 监控错误和资源

### 4. Nginx `try_files` 指令的作用？

`try_files` 按顺序检查文件是否存在。SPA history 模式下直接访问 `/about`，Nginx 找不到对应静态文件会 404；`try_files $uri $uri/ /index.html` 让所有未匹配路由回退到 `index.html`，由前端路由接管。

```nginx
location / {
    root   /usr/share/nginx/html;
    index  index.html;
    try_files $uri $uri/ /index.html;
}
```

### 💬 面试深度

**标准回答**：这四道题基本覆盖了 DevOps 岗位初级到中级的核心知识面。Nginx 反向代理+负载均衡是必问，重点说清楚 `proxy_pass` 的转发逻辑和 `upstream` 的三种算法选择场景。Docker 多阶段构建不仅要说出"镜像变小"，还要能解释原理——只有 `COPY --from` 的内容进最终层，构建工具链全丢弃。完整部署流程考查你对 CI/CD 全链路的理解，建议从 git push 讲到冒烟测试兜底，展示端到端视角。`try_files` 抓的是 SPA history 模式这个具体场景，面试官想看你知不知道前端路由和 Nginx 路由的协作关系。

**追问预判**：
- *"如果 upstream 里某台后端挂了，Nginx 怎么处理？"* → Nginx 默认会检测到连接失败并自动重试下一台（`proxy_next_upstream error timeout`），同时把这台标记为 `down` 一段时间（`fail_timeout`），不再分配新请求。但探测默认是被动的——只有等请求失败才感知，不会主动做健康检查。生产环境一般会在 upstream 外部加一个第三方的 health check 探活，或者用 Nginx Plus 的商业版 `health_check` 指令。
- *"多阶段构建能减少安全漏洞扫描的告警吗？"* → 能，而且效果很明显。最终镜像只有 Nginx alpine，CVE 扫描范围从几百个 npm 包的安全漏洞缩小到 Nginx 二进制 + musl libc 的几十个。这就是"减少攻击面"的具体体现——不是修漏洞，而是直接不把带漏洞的东西装进镜像。

**源码在哪**：Nginx 核心模块在 `src/http/` 下，`ngx_http_core_module.c`（server/location 解析）、`ngx_http_upstream.c`（upstream 通用逻辑）、`ngx_http_proxy_module.c`（proxy_pass）；Docker BuildKit 在 `github.com/moby/buildkit`，`dockerfile2llb/` 包负责 Dockerfile → LLB 图的转换。

**踩过的坑**：面试被问到"Docker 镜像有多大"，我脱口而出"100MB 左右"——但面试官追问"具体怎么优化的"，我答不上来。后来发现我们项目的 Node 后端镜像有 1.2GB，因为把 `node_modules`、`.git`、测试报告全打进去了，而且用的是 `node:20`（700MB 基础镜像）而不是 `node:20-alpine`（120MB）。修复是加 `.dockerignore` 排除不必要文件、换成 alpine 基础镜像、用多阶段构建分离 build 和 runtime，最终从 1.2GB 降到 180MB。教训：面试前一定要 `docker images` 看一眼自己项目的镜像实际大小。

**项目选型**：为什么选 Docker 作为部署载体而不是直接 rsync 到服务器？——环境一致性。rsync 必须保证目标服务器 Node 版本、系统库、全局工具和 CI 环境一模一样，稍有偏差就"我本地能跑"。Docker 把 OS、运行时、依赖全打包在一起，CI 里能跑，服务器上就能跑，彻底消灭"环境问题"这个最耗时的故障来源。

## 补充知识 ⭐

### Nginx 全局性能配置

```nginx
worker_processes   auto;           # 按 CPU 核数自动设置
worker_rlimit_nofile 65535;        # worker 最大文件打开数

events {
    worker_connections  4096;      # 每个 worker 最大连接数
    use                 epoll;
    multi_accept        on;
}

http {
    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    client_max_body_size 20m;
    server_tokens       off;
}
```

### Docker 网络模式

| 网络模式 | 容器间通信 | 端口映射 | 适用场景 |
|---|---|---|---|
| bridge | ✅ 服务名 DNS | ✅ -p 映射 | 单机多容器 |
| host | ✅ localhost | 直接监听宿主机 | 高性能网络 |
| overlay | ✅ 跨主机 | — | Docker Swarm |
| none | ❌ | ❌ | 安全隔离 |

### 部署策略对比

| 策略 | 回滚速度 | 资源成本 | 风险 |
|---|---|---|---|
| 蓝绿部署 | 秒级（切换流量） | 2 倍 | 全量切换后暴露 |
| 滚动更新 | 逐步回滚 | 1.x 倍 | 过程中可发现 |
| 灰度发布 | 切回小流量 | 1.x 倍 | 小范围暴露 |

### 💬 面试深度

**标准回答**：Nginx 性能调优记住四个数——`worker_processes auto`（等于 CPU 核数，不多不少）、`worker_connections 4096`（每个 worker 能扛的连接数）、`sendfile on`（零拷贝，静态文件直接从磁盘到 socket，不经过用户态）、`keepalive_timeout 65`（长连接复用，减少 TCP 三次握手开销）。Docker 网络 99% 的场景用默认 bridge 模式就行，同一个 compose 里容器直接用服务名互访（`db:5432`），因为 Docker 内置了 DNS 解析。部署策略这块，小团队用滚动更新最实在——K8s 的 RollingUpdate 或 `docker compose up -d` 就能做，不需要额外基础设施；蓝绿部署要两套完整环境，成本翻倍，适合对 downtime 零容忍的金融系统。

**追问预判**：
- *"蓝绿部署和灰度发布的核心区别是什么？"* → 蓝绿是二选一：绿环境就绪后流量一把切过去，老蓝环境保留做回滚兜底；灰度是渐进式放量：先 5% 流量到新版，观察无异常再 20% → 50% → 100%，中间任何一步出问题立刻切回。蓝绿回滚最快（秒级切流量），灰度的风险最小（小范围暴露），但灰度需要更复杂的流量管理（Nginx `split_clients` 或网关层路由规则）。
- *"sendfile on 为什么能提升性能？"* → 正常读文件流程是 磁盘→内核缓冲区→用户态缓冲区→socket 缓冲区→网卡，四次拷贝两次上下文切换。`sendfile` 让内核直接把数据从内核缓冲区推到 socket 缓冲区，完全不过用户态，减少两次拷贝和两次上下文切换，大文件场景下 CPU 占用能降 50% 以上。

**源码在哪**：Nginx `sendfile` 调用链：`src/os/unix/ngx_linux_sendfile_chain.c`，最终调用 Linux 系统调用 `sendfile()`；`src/event/ngx_event.c` 的 `ngx_process_events_and_timers` 是事件循环主函数；Docker bridge 网络由 `github.com/docker/libnetwork` 实现，DNS 解析由内置的嵌入式 DNS server 提供（`libnetwork/network.go`）。

**踩过的坑**：Nginx `client_max_body_size` 忘配了，默认只有 1MB——用户上传一个 5MB 的图片直接 413 Request Entity Too Large，前端和后端日志都看不出问题在哪（前端只有 413，Nginx 在 413 之前就断了连接所以后端 access log 根本没这条记录）。排了半小时才发现是 Nginx 的锅，加了 `client_max_body_size 20m` 解决。教训是 Nginx 默认限制很保守，文件上传场景一定要检查 `client_max_body_size` 和 `proxy_read_timeout`。

**项目选型**：为什么用滚动更新而不是蓝绿部署？——我们不是金融级业务，允许秒级抖动。滚动更新 zero-downtime 已经够用（K8s 先起新 Pod 再停旧 Pod），蓝绿部署额外的一倍资源成本在 5 台机器的小集群里不划算。等业务量上来、SLA 要求 99.99% 的时候再考虑蓝绿。
