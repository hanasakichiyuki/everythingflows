# 万物流转 · 迁移到腾讯云自托管方案

> 目标：把 `flows.xin` 从 Vercel 搬到自己的腾讯云服务器；**Supabase（数据库/鉴权）与 Cloudflare R2（图片）保持云端不动**，本次不迁移。
>
> 状态：**方案已定稿，进入执行阶段（2026-11-11 更新）**。
>
> ⚠️ **本仓库是公开仓库。** 服务器公网 IP、SSH 私钥、各类密钥一律不写进文档和代码；IP 只以占位说法提及，真实值放 GitHub Secrets 与服务器 `/etc/everythingflows/env.production`。

## 进度快照（2026-11-11）

原设计阶段提出的 10 个待定问题，已确认如下：

| 项 | 结论 |
| --- | --- |
| ICP 备案 | ✅ **已通过**，§2 的阻塞项解除，不再有 1–3 周的等待窗口 |
| 域名注册商 | ✅ **已转入境内**，备案主体一致 |
| 服务器规格 | **2 核 2G**，§3 / §7 的调参方案（4G swap + 堆上限 640M + RSS 硬顶 1200M）全部适用，无需上调配 |
| DNS 托管 | 腾讯云 DNSPod（`pdns.dnspod.cn`），`flows.xin` 的 A 记录已指向服务器公网 IP（腾讯云·上海） |
| Vercel 旧站 | 已停止服务，**不做恢复**；切换期不再有"双跑回滚到 Vercel"这层保险，回滚只能靠 releases 软链 |

**待补项：`media.flows.xin` 解析已丢失（方案已定）。**
`R2_PUBLIC_BASE_URL` 指向这个自定义域名，但它在域名转移重建解析记录时没有一并迁移。
用 Google / 阿里 / 腾讯 DNSPod 三个解析器交叉验证，均返回 NXDOMAIN（同期 `flows.xin`、`www.flows.xin` 正常），
说明是记录缺失而非解析器差异。**不补回这条记录，迁移后全站图片 404。**

恢复方案已定为 **EdgeOne 加速域名 + S3 兼容源站回源 R2**：只在 DNSPod 加一条 CNAME，NS、备案、主域 A 记录全部不动，对象一个都不用搬，免费版够用。
`r2.dev` 被排除（官方标注 unsupported access path）、R2 Custom Domain 被排除（要求 NS 回 Cloudflare）、
Cloudflare for SaaS 因缺少一个已激活的 CF zone 暂不可用。
完整配置表、五个坑、验证命令与遗留风险见 **[`R2_MEDIA_SETUP.md`](./R2_MEDIA_SETUP.md)** 第 3 节。

---

## 0. 结论摘要

| 项目      | 结论                                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 阻塞项     | **ICP 备案**。服务器在腾讯云大陆地域，域名未备案则不能用 80/443 对外提供服务。备案周期 1–3 周，是整条链路唯一的不可压缩项                                                                                |
| 备案可行性   | ✅ `.xin` 后缀工信部已批复（工信部信管函〔2016〕87 号，2016-03-04），且**在腾讯云可备案后缀名单内**                                                                                       |
| 服务器规格   | **2 核 2G**。运行期够用（生产 `next start` 常驻约 200–400MB），但**构建期不够**——Next 16 构建峰值 2–3G，在 2G 内存上直接构建会 OOM 或严重 swap 抖动                                            |
| 结论性对策   | **把构建挪出服务器**：用 GitHub Actions（ubuntu runner，7G 内存）构建 `standalone` 产物，推送到服务器只跑 `node server.js`。见 §7.1 方案 A                                             |
| 技术迁移工作量 | 环境 + 验证约 1 天；正式切换窗口约 30 分钟（构建在 CI，不占服务器时间）                                                                                                             |
| 能否继续用 Vercel 构建 | ❌ **不行**。Vercel 产出的是平台专用的 Build Output API v3（`.vercel/output`，serverless 函数形态），搬不到自托管服务器；而 `output: "standalone"` 又会让 Vercel 构建直接失败。改用 GitHub Actions，见 §7.0 |
| 必需代码改动  | 方案 A：**1 处**（`next.config.mjs` 的 `output` 写成 `process.env.VERCEL ? undefined : "standalone"`，同时兼容 Vercel 双跑）；方案 B：0 处但要忍受服务器上 20+ 分钟的高 swap 构建                                                             |
| 强制运维项   | 无论走哪个方案，**必须配 swap**（2G 内存无 swap 是运维事故的常见起点），并给 Node 设堆上限                                                                                              |
| 最大技术风险  | ① `x-vercel-forwarded-for` 请求头必须由 Nginx 补上，否则生产环境匿名 `/chat` 全部 503；② 生产环境强制依赖 Upstash Redis，不配则 `/chat` 对**所有人**（含登录用户）503；③ 海外 AI provider 从大陆服务器不可直连 |
| 建议主域名   | 统一为 `https://flows.xin`（apex），`www` 做 301 跳 apex，与 `site.config.json` 和 `metadataBase` 保持一致                                                            |

---

## 1. 现状盘点

**线上现状（已实测）**

- `flows.xin` 解析到 Cloudflare（`104.21.17.29` / `172.67.219.201`），上游是 Vercel（响应头 `x-vercel-id: pdx1::...`，即美国波特兰节点）。
- apex 域名返回 `308 Permanent Redirect` → `https://www.flows.xin/`。该跳转由 Vercel 侧配置，仓库代码里没有。

**应用架构（决定迁移方案的关键约束）**

| 层   | 现状                                                              | 迁移影响                                      |
| --- | --------------------------------------------------------------- | ----------------------------------------- |
| 运行时 | Next.js 16 App Router，`next build` + `next start`，Node 22       | 自托管友好，`pnpm start` 即可                     |
| 渲染  | 内容页 `revalidate = 3600`（ISR），`/admin`、`/chat` 为 `force-dynamic` | 构建期需要能访问 Supabase 预取数据                    |
| 数据库 | Supabase 云端（`posts` / `fragments` / `chat_*`）                   | 不动。但**构建期与运行期均需跨洋访问**                     |
| 鉴权  | Supabase Auth（email/password）                                   | 需改 Supabase 控制台的 Site URL / Redirect URLs |
| 图片  | Cloudflare R2，经同源 `/api/post-image` 代理                          | 不动，沿用现有 5 项 R2 变量                         |
| AI  | `ai-models.json` 共 9 个模型，其中 4 个 `isFree: true`                  | 海外 provider 在大陆服务器不可直连，见 §5.3             |
| 限流  | Upstash Redis（`lib/upstash/client.ts`）                          | **生产环境为硬依赖**                              |
| CI  | GitHub Actions：lint + typecheck + test + build                  | 可保留，与部署解耦                                 |

---

## 2. 阻塞项：ICP 备案（先办，可与技术准备并行）

### 2.1 备案前必须自查的 4 件事（最常见的驳回原因）

1. **域名注册商必须是工信部批复的境内注册服务机构**（阿里云 / 腾讯云 / 新网等）。  
   若 `flows.xin` 注册在境外注册商（Cloudflare Registrar、Namecheap、GoDaddy 等），**备案会被直接驳回**，需先办理域名转移（转入约 5–7 天）。  
   → 请先确认 `flows.xin` 当前的注册商是谁。这是备案可行性的第一道门槛。
2. **域名实名认证主体必须与备案主体完全一致**：个人备案 = 身份证；单位备案 = 营业执照 + 法人信息。域名 whois 所有者、实名信息、备案主体三者必须一致。
3. 域名在有效期内，剩余有效期建议 > 3 个月。
4. 腾讯云账号已完成实名认证，且账号类型（个人/企业）与备案主体一致。

### 2.2 流程与耗时

```
腾讯云备案控制台提交资料
  → 腾讯云初审        1–2 个工作日
  → 工信部短信核验     24 小时内完成
  → 省管局审核         1–20 个工作日（多数省份 5–15 天）
  → 备案通过，下发备案号
```

- 备案省份建议选择**服务器所在地省份**（如服务器在南京则选江苏），跨省备案可能被要求补充材料。
- 管局审核期间保持手机畅通，可能有电话核验；网站内容需合规（本站为个人博客，风险低）。

### 2.3 备案期间的并行工作

| 可以现在做                            | 不能现在做                                    |
| -------------------------------- | ---------------------------------------- |
| 服务器初始化、装 Node/pnpm               | 用 `flows.xin` 解析到大陆 IP 走 80/443（会被腾讯云拦截） |
| 拉代码、`pnpm build`、跑通 `next start` | —                                        |
| 用 `http://<公网IP>:3000` 验证功能      | —                                        |
| 验证 Supabase / Upstash / R2 连通性   | —                                        |
| 改 Supabase Auth 的 Site URL       | —                                        |

### 2.4 DNS 处理建议

备案要求域名解析接入在腾讯云（DNSPod）。建议备案期间把 NS 从 Cloudflare 改为 DNSPod，**先把当前 Cloudflare 的 DNS 记录截图留档**，便于回滚。

---

## 3. 服务器规划（按 2 核 2G 定稿）

| 项               | 配置 / 建议                           | 说明                                           |
| --------------- | --------------------------------- | -------------------------------------------- |
| 规格              | **2 核 2G / 40G+ SSD**（已定）         | 运行期够用；构建期不够，靠 §7.1 方案 A 绕开                   |
| 系统              | Ubuntu 24.04 LTS 或 Debian 12      | 与 CI runner 的 glibc 版本对齐，standalone 产物可直接运行  |
| **swap**        | **固定 4G，必配**                      | 2G 内存下这是防 OOM 的安全垫。运行时用不到，但 ISR 再生成或流量突增时能救命 |
| `vm.swappiness` | `10`                              | 让 swap 只做兜底，不主动换出，避免日常访问被拖慢                  |
| 安全组入站           | `22`（**限制来源为你自己的 IP**）、`80`、`443` | 3000 端口**不对公网开放**                            |
| 出站              | 全部放行                              | 需访问 Supabase / Upstash / R2 / AI 端点          |
| 时区              | `Asia/Shanghai`                   | 限流按 UTC 日切不受影响，但日志可读性更好                      |
| 监控告警            | 内存 > 85%、磁盘 > 80%、1 分钟负载 > 4      | 腾讯云云监控，2G 机器必须配内存告警                          |

**2 核 2G 的资源预算（运行期实测预期）**

| 进程                   | 常驻内存        | 说明                            |
| -------------------- | ----------- | ----------------------------- |
| 系统 + sshd + fail2ban | ~200–300 MB | —                             |
| Nginx                | ~20–40 MB   | 2 个 worker 足够                 |
| `next start`（node）   | ~200–400 MB | 单实例，个人站规模                     |
| 可用余量                 | ~1.2–1.5 GB | 留给 ISR 再生成、AI 流式响应、page cache |

> 结论：**运行时没问题**。真正会压垮 2G 的是 `pnpm install` 与 `pnpm build`——`pnpm install` 尚可（主要在磁盘 IO），`next build` 会吃掉 2–3G 内存。所以不要让服务器承担构建。

**初始化清单**

```bash
# 1. 创建部署用户（不要用 root 跑应用）
adduser deploy && usermod -aG sudo deploy

# 2. SSH 加固：仅密钥登录，禁用密码与 root 直登
#    /etc/ssh/sshd_config: PasswordAuthentication no / PermitRootLogin no

# 3. 防火墙 + 防爆破 + 自动安全更新
ufw allow 22,80,443/tcp && ufw enable
apt install -y fail2ban unattended-upgrades

# 4. 【2G 机器必做】4G swap + 降低 swappiness
fallocate -l 4G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

cat >/etc/sysctl.d/99-flows.conf <<'EOF'
vm.swappiness = 10
vm.vfs_cache_pressure = 50
EOF
sysctl --system

timedatectl set-timezone Asia/Shanghai

# 5. 验证
free -m          # Swap 一行应显示 4096
swapon --show
```

---

## 4. 运行时环境

**2G 机器的环境精简原则**：能不在服务器上装的就别装。方案 A 下服务器**只需要 Node 22 + PM2**，不需要 pnpm、不需要源代码完整仓库、不需要 `node_modules`——省内存也省磁盘。

```bash
# Node 22 LTS（与 GitHub Actions CI 保持一致）
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 进程守护
sudo npm i -g pm2

# 【仅方案 B 需要】pnpm 11.5.3（package.json 的 packageManager 字段锁定）
# sudo corepack enable
# corepack prepare pnpm@11.5.3 --activate
```

**如果走方案 B（服务器本地构建），必须注意 `pnpm-workspace.yaml` 的两个配置**（Linux 上能否跑起来的关键）：

- `nodeLinker: hoisted`：扁平目录布局，保持与开发环境一致，不要改。
- `allowBuilds` 白名单里的 `sharp` / `@swc/core` / `@parcel/watcher` / `unrs-resolver` 是原生依赖。pnpm v11 默认**不执行**依赖安装脚本，项目已用白名单解决——迁移时保持该文件原样，不要删除或精简，否则 `sharp` 不编译，Next 图片优化会直接报错。

`sharp` 在 Linux 上会拉取 `linux-x64` 预编译二进制，通常无需额外装 `libvips`。如构建报缺 `libvips`，再 `apt install -y libvips42`。

---

## 5. 环境变量清单

> 服务器上放 `/etc/everythingflows/env.production`（权限 `600`，属主 `deploy`），由 systemd 的 `EnvironmentFile=` 注入（用 PM2 则是 `env_file`）。
>
> ⚠️ **安全提醒**：`.gitignore` 目前只忽略了 `.env*.local`，**`.env.production` 不在忽略列表内**——如果直接放在项目根目录，有被误提交的风险。请放在项目目录之外，或先补一条 `.gitignore` 规则。

### 5.1 必填（沿用现有值）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 站点
NEXT_PUBLIC_SITE_URL=https://flows.xin

# R2（图片不迁移，沿用现有 5 项）
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

### 5.2 必填（生产环境硬依赖，漏配会 503）

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**为什么是硬依赖**：`src/app/api/chat/route.ts` 与 `src/app/api/editor/ai/route.ts` 的逻辑是——若 Upstash 客户端不可用，且 `NODE_ENV === "production"`，直接返回 `503 聊天服务限流暂不可用`。也就是说：

- 不配 Upstash → `/chat` 对**匿名用户和登录用户全部 503**；
- 配了 Upstash 但**大陆服务器访问不通** `upstash.io` → `incr` 抛异常 → 同样落到 503 分支。

所以这一项必须配，且在服务器上实测连通：

```bash
curl -sS -m 5 "$UPSTASH_REDIS_REST_URL/ping" -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
# 期望返回 {"result":"PONG"}
```

> 备注：项目 `.env.example` 与 README 里写的「未配置时退化为滑窗截断」描述与当前代码不一致，**以代码为准**。若长期不想依赖境外 Upstash，后续可在 `lib/upstash/client.ts` 增加一个本机 Redis 分支（本次不改代码）。

### 5.3 AI provider：大陆服务器最大的坑

`ai-models.json` 现有 9 个模型，其中 `isFree: true` 的有 4 个：

| 顺序  | 模型 id                                   | provider           | 端点                                  | 大陆服务器可行性                                  |
| --- | --------------------------------------- | ------------------ | ----------------------------------- | ----------------------------------------- |
| 1   | `opencode-deepseek-chat`                | openai 兼容          | `OPENCODE_BASE_URL`                 | ⚠️ 取决于该端点是否在境内。**匿名用户默认用第一个 `isFree` 模型** |
| 2   | `glm-4.7-flash`                         | openai 兼容          | 智谱 `open.bigmodel.cn`               | ✅ 境内直连                                    |
| 3–4 | `gemini-2.0-flash` / `gemini-2.5-flash` | google             | `generativelanguage.googleapis.com` | ❌ 不可直连                                    |
| —   | `gpt-4o*` / `claude-*`                  | openai / anthropic | `api.openai.com` 等                  | ❌ 不可直连                                    |

**结论与建议**：

1. **匿名用户默认走第一个免费模型**。若 `OPENCODE_BASE_URL` 是海外端点，迁移后匿名 `/chat` 会直接超时。请确认该端点归属；若在海外，建议把 `glm-4.7-flash` 调整到 `models` 数组的第一位（配置改动，非代码改动）。
2. `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` 在服务器上**配了也没用**。它们会出现在登录用户的 ModelPicker 里，用户一点就超时。建议暂时从 `ai-models.json` 移除，或给服务器配外网出口代理（自行评估合规风险）。
3. 注意 `ai-models.json` 里 `opencode-deepseek-chat` 的字段名是 **`OEPNCODE_API_KEY`**（`OPEN` 拼成了 `OEPN`，是既有拼写）。配置环境变量时必须严格照抄这个名字，否则该模型会被判定为「未配置」。

### 5.4 可选

```env
ADMIN_SECRET=            # vestigial，代码中 verifyAdminSecret() 无引用，可留空
NEXT_PUBLIC_GISCUS_REPO=
NEXT_PUBLIC_GISCUS_REPO_ID=
NEXT_PUBLIC_GISCUS_CATEGORY_ID=
```

---

## 6. Nginx 反向代理（本方案的技术核心）

### 6.1 三个必须解决的坑

**坑 1：`x-vercel-forwarded-for`（不解决 = 匿名聊天全挂）**

`src/app/api/chat/route.ts` 的 `clientIp()` 只读一个头：

```ts
// 仅接受 Vercel 覆盖写入的请求头；X-Forwarded-For 和 X-Real-IP 可由客户端伪造。
return req.headers.get("x-vercel-forwarded-for")?.trim() || null;
```

而生产环境下拿不到 IP 会直接 503。所以 Nginx 必须补上这个头，**用 `$remote_addr` 而不是 `$proxy_add_x_forwarded_for`**（后者会带上客户端可伪造的值，等于放开限流绕过）：

```nginx
proxy_set_header x-vercel-forwarded-for $remote_addr;
```

**坑 2：AI 流式输出被缓冲**

`/api/chat` 是 SSE 流式响应。Nginx 默认会缓冲，导致回答卡住或一次性吐出。必须 `proxy_buffering off` 并放宽读超时。

**坑 3：上传图片 5MB**

编辑器上传走 `/api/upload`（上限 5MB，非 Server Action，所以不受 1MB body 限制影响），但 Nginx 默认 `client_max_body_size 1m` 会先拦下来，需放宽到 `10m`。

### 6.2 配置骨架

```nginx
# /etc/nginx/conf.d/flows.conf

# 80 -> 443
server {
    listen 80;
    listen [::]:80;
    server_name flows.xin www.flows.xin;
    return 301 https://flows.xin$request_uri;   # 统一收敛到 apex
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name www.flows.xin;
    ssl_certificate     /etc/nginx/certs/flows.xin.pem;
    ssl_certificate_key /etc/nginx/certs/flows.xin.key;
    return 301 https://flows.xin$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name flows.xin;

    ssl_certificate     /etc/nginx/certs/flows.xin.pem;
    ssl_certificate_key /etc/nginx/certs/flows.xin.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    # 编辑器上传图片上限 5MB，留出余量
    client_max_body_size 10m;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;
    # gzip_proxied 保持默认 off —— Next 自身已压缩响应，避免重复压缩

    # Next 静态资源：长缓存（不要同时用 expires，否则会输出两个 Cache-Control 头）
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "";

        # 【关键】补齐应用唯一认可的客户端 IP 头
        proxy_set_header x-vercel-forwarded-for $remote_addr;

        # SSE 流式聊天：关闭缓冲、放宽超时
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```


### 6.3 2 核 2G 的 Nginx 调优

Nginx 在 2G 机器上是「省内存的帮手」，配好能替 Node 分担不少：

**① 把 gzip 从 Node 挪到 Nginx（推荐）**

Next.js 默认 `compress: true`，即由 Node 进程用 zlib 压缩每个响应——这在 2C2G 上会额外吃 CPU 和内存。建议改为 Nginx 压缩：

```js
// next.config.mjs（需改代码，1 行）
const nextConfig = {
  compress: false,   // 改由 Nginx 负责压缩
  // ...
};
```

Nginx 侧同步打开 gzip（见 §6.2 配置）。**两者必须二选一**，同时开会重复压缩、浪费 CPU。

**② 限制 worker 数量与连接数**

`/etc/nginx/nginx.conf`：

```nginx
worker_processes 2;                    # 与 2 核对齐，不要用 auto 之外的值乱猜
worker_rlimit_nofile 16384;

events {
    worker_connections 1024;
    multi_accept on;
    use epoll;
}

http {
    types_hash_max_size 2048;
    server_tokens off;

    # 静态资源缓存描述符，减少文件 stat 开销
    open_file_cache max=2000 inactive=60s;
    open_file_cache_valid 120s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
}
```

**③ 让 Nginx 直接吐预压缩静态文件（可选，进一步省 CPU）**

Next 构建产物里的静态资源体积不小，可对 `/_next/static/` 开 `gzip_static`（需 `ngx_http_gzip_static_module`，Ubuntu 的 `nginx-full` 已含）：

```nginx
location /_next/static/ {
    gzip_static on;
    proxy_pass http://127.0.0.1:3000;
    # ...
}
```

**④ 关掉不需要的模块开销**

不需要的 module 不用管，但要确保**没有额外装 WAF / 大量正则 location**——2 核 CPU 经不起复杂正则匹配带来的延迟抖动。

### 6.4 关于是否保留 Cloudflare

**建议：不套 Cloudflare 橙云代理。** 原因：

- <u>若服务器前挂 CF 代理，`$remote_addr` 会变成 CF 边缘节点 IP，所有访客被算成同一个 IP → </u>**<u>匿名聊天限流直接失效</u>**<u>（要么全站共用一个 30 次/天的额度，要么形同虚设）。</u>
- 真要保留，必须配置 `ngx_http_realip_module`，且**只允许 Cloudflare 官方 IP 段回源**（否则 `CF-Connecting-IP` 可被伪造），复杂度明显上升。
- 大陆访问 Cloudflare 免费节点质量一般，对国内访客没有收益。

备案期间 DNS 需在 DNSPod；备案通过后建议直接 DNSPod 解析到服务器 IP，把 CF 去掉。CF 只用于**管理 DNS**（灰云）也可以接受。

> 2G 内存额外理由：CF 免费版回源质量一般，容易触发超时重试，对单实例小机器是额外压力。直连反而更稳。

### 6.5 HTTPS 证书

两条路线任选：

- **acme.sh + Let's Encrypt**（自动续期，推荐）：`acme.sh --issue` 后 `--install-cert` 到 `/etc/nginx/certs/`，配 `--reloadcmd "systemctl reload nginx"`。
- **腾讯云免费 SSL 证书**（一年期，需手动续）：下载 Nginx 格式证书放到 `/etc/nginx/certs/`。

---

## 7. 构建与进程守护（2 核 2G 专用）

### 7.0 核心结论

**2G 内存跑得动站点，跑不动 `next build`。**

| 阶段               | 2 核 2G 下的表现                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm install`   | 可行。主要吃磁盘 IO，内存峰值约 600MB–1G                                                                                   |
| `pnpm build`     | ⚠️ **危险**。Next 16 构建此项目的内存峰值约 2–3G（依赖里有 tiptap / novel / pixi / live2d / aws-sdk），2G 物理内存必然触发大量 swap 或直接 OOM |
| `next start` 运行期 | ✅ 完全够用，常驻约 200–400MB                                                                                         |

所以策略是：**把构建挪出服务器，服务器只负责运行。**

#### ❓「我原来用 Vercel 构建，现在继续用 Vercel 构建不行吗？」

**不行。但你的直觉是对的——你需要的是「一台云主机帮我构建」这个能力，换一家提供就行。**

**为什么 Vercel 的构建产物搬不过来**

Vercel 构建完成的不是「一个能自己跑的 Next.js 应用」，而是**专供 Vercel 自己运行时消费的部署包**：

| | Vercel 的产物 | 自托管需要的产物 |
|---|---|---|
| 格式 | Build Output API v3（`.vercel/output/`） | `next start` / `.next/standalone` |
| 形态 | `.vercel/output/functions/*.func`——被切成一个个 **serverless 函数** | **一个常驻的 Node 进程**（`server.js`） |
| 静态文件 | `.vercel/output/static/`，由 Vercel 边缘网络分发 | `.next/static/`，由你的 Nginx 分发 |
| ISR 缓存 | Vercel 的分布式缓存（跨区域共享） | 本机磁盘 `.next/cache` |

也就是说，产物是按「函数 + 边缘网络 + 分布式缓存」的模型切好的。你要把它跑到腾讯云上，等于**自己实现一遍 Vercel 的运行时**——不如直接从源码构建。而且 Vercel 也没有提供「下载可用构建产物」的出口，`vercel build` 生成的同样是这份平台专用格式。

**另外一个反直觉的点**：`output: "standalone"` 在 Vercel 上**会被忽略**——Vercel 有自己的 Next.js 适配层，直接读 `.next/` 目录。更麻烦的是 Next.js 16.3 上两者同时开启会**让 Vercel 构建直接失败**（`onBuildComplete` 阶段报 `ENOENT: .next/next-server.js.nft.json`，上游 issue #96646）。

> 版本备注：本项目当前用的是 **Next 16.2.9**，这个 ENOENT 问题在 16.3 才引入（16.2.11 及以前正常）。所以短期内即使加了 `standalone` 也不会把 Vercel 构建搞挂；但**升级到 16.3 时会踩到**，下面的 guards 写法现在就该加，属于零成本的保险。

所以如果你打算**过渡期双跑**（Vercel 保留 + 腾讯云新站并行），`next.config.mjs` 要这样写才两边都不炸：

```js
// Vercel 构建时 VERCEL=1，此时不用 standalone；CI/Docker 构建时自动启用
output: process.env.VERCEL ? undefined : "standalone",
```

#### ⚠️ 顺带发现的真实风险：构建期强依赖 Supabase

在本地试跑 `pnpm build` 时发现一个必须写进方案的事实：**构建会在预渲染阶段逐个页面读取 Supabase，因此构建机必须能稳定访问 Supabase，否则整个 build 失败。**

实测现象（构建 24 个页面，稳定挂在第 6 个）：

```
Collecting page data using 19 workers ...
Generating static pages using 19 workers (6/24)
Error occurred prerendering page "/zh/blog"
TypeError: fetch failed
Caused by: Error: read ECONNRESET
Export encountered an error on /[locale]/blog/page: /zh/blog, exiting the build.
```

单独诊断后确认：**开发机的网络当前完全无法访问 Supabase**（连单次 REST 请求都是 `curl: (35) schannel: failed to receive handshake`，`HTTP 000`）。所以这不是代码或配置问题，纯粹是构建机到 Supabase 的可达性问题——现网 Vercel 能正常构建就是反证。

三条结论：

1. **构建机必须能访问 Supabase。** GitHub Actions 的 runner 在境外，访问 Supabase 天然更稳，所以方案 A 在这一点上也优于服务器本地构建（大陆服务器要跨洋读 Supabase）。
   → 上线前务必先跑一次 Actions，确认构建能过。
2. **CI 里的构建步骤要带重试，且重试前清掉 `.next`。** 已按 3 次重试实现（半成品缓存会污染下一次构建，这一点 `QUICK_START.md` 里也提过）。
3. **并发数与 CPU 核数挂钩**：实测本机 20 核 → Next 起了 19 个静态生成 worker，同一时刻打 19 个并发请求到 Supabase。CI runner 核数少（通常 2–4），并发压力小得多。若在 CI 上仍遇到 Supabase 侧限流，可考虑用 cgroup/`taskset` 限制构建可用的核数来降低并发。

**那用什么构建？**

| 方案 | 内存 | 成本 | 产物可用 | 说明 |
|---|---|---|---|---|
| **GitHub Actions**（推荐） | 2 核 7G | 公开库免费；私有库 2000 分钟/月免费 | ✅ `node server.js` | 仓库已经在用它的 CI，扩展即可；实测本机编译 + 类型检查仅 ~20 秒，加上预渲染共约 1–2 分钟 |
| Vercel | 充裕 | 免费 | ❌ 平台专用格式 | 只能跑在 Vercel |
| 腾讯云 CODING / 云效 | 充裕 | 有免费额度 | ✅ | 境内 runner，拉 npm 包更快，但要另建流水线 |
| 本地 WSL2 + Docker | 看你机器 | 0 | ✅ | 本地已有 Docker Desktop 的话可行，产物与服务器同为 linux-x64 |
| 服务器本机 | 2G | 0 | ✅ | 就是 §7.2 方案 B，有 OOM 风险 |

> 一句话：**Vercel 卖的是「构建 + 托管」的组合，不单卖「构建」；GitHub Actions 免费提供更强的 runner，且产出的是标准 Node 产物。** 你要的其实是后者。

---

### 7.1 方案 A（推荐）：CI 构建 standalone 产物 → 推送到服务器

用 GitHub Actions 的 ubuntu runner（7G 内存）完成构建，服务器只解压 + 启动。仓库已经有 `.github/workflows/ci.yml` 在跑 `pnpm build`，扩展成「构建并产出部署包」是顺路的事。

**优点**：服务器零构建、零 `node_modules`、磁盘占用小、构建失败不污染线上、切换是「换目录」级别的原子操作。
**代价**：需要 1 处配置改动 + 一个部署工作流（见 §7.5 待办）。

#### 已落地的部署件

本方案的可执行部分已经写成文件，运维时照着 `deploy/README.md` 走即可：

| 文件 | 作用 | 部署到服务器 |
|---|---|---|
| `.github/workflows/deploy.yml` | 构建 → 打包 → scp → 远程激活（含 3 次重试） | — |
| `deploy/scripts/activate-release.sh` | 服务器侧激活：解压、切软链、重启、冒烟、失败回滚 | CI 每次推送 |
| `deploy/nginx/flows.conf` | 反向代理（含 `x-vercel-forwarded-for`、SSE、gzip） | `/etc/nginx/conf.d/flows.conf` |
| `deploy/systemd/flows.service` | 进程守护 + 内存护栏 | `/etc/systemd/system/flows.service` |
| `deploy/sudoers/flows-deploy` | 部署用户最小 sudo 权限 | `/etc/sudoers.d/flows-deploy` |
| `deploy/README.md` | 服务器一次性准备 + 排障对照表 | — |
| `next.config.mjs`（已改） | `output: standalone` + `compress: false` | — |
| `.gitignore`（已改） | 补上 `.env.production` 忽略规则 | — |

#### 需要的一处改动

```js
// next.config.mjs
const nextConfig = {
  // Vercel 构建时 VERCEL=1（Vercel 不需要也不支持 standalone，
  // 同时开启会让 Next 16.3 的 Vercel 构建报 ENOENT 而失败）
  output: process.env.VERCEL ? undefined : "standalone",
  compress: false,        // 见 §6.3，压缩交给 Nginx
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // ...其余保持不变
};
```

#### 产物结构（Next.js standalone 的已知行为，必须手工补两处）

`next build` 会生成 `.next/standalone/`，里面含 `server.js` 和**按需裁剪过的** `node_modules`（通常能把 1.2G 压到 200–300M）。但它**不会**自动带上这两样，必须手动搬：

```
.next/standalone/                 ← 部署包里要的东西
  server.js                       ← 启动入口
  node_modules/                   ← Next 自动裁剪
  .next/
    server/  static/  BUILD_ID

# 手工补齐（构建脚本里做）：
cp -r .next/static .next/standalone/.next/static
cp -r public       .next/standalone/public
```

最后打包：

```bash
tar -czf flows-${GITHUB_SHA}.tar.gz -C .next/standalone .
# 预计 100–200 MB（含 aws-sdk / sharp 等）
```

> **一个要验证的细节：`sharp` 的原生二进制。**  
> Next 的 file tracing 偶尔会漏掉 `sharp` 依赖的平台包（`node_modules/@img/sharp-linux-x64`）。第一次打完包后检查一下：
>
> ```bash
> ls .next/standalone/node_modules/@img/
> ```
>
> 若目录不存在，在 CI 打包前手工补一份：
>
> ```bash
> mkdir -p .next/standalone/node_modules/@img
> cp -r node_modules/@img/sharp-linux-x64 .next/standalone/node_modules/@img/
> ```
>
> 漏了的症状是：文章图片优化（`next/image`）在线上 500，日志报 `Could not load the "sharp" module`。
>
> 另外，本项目 `pnpm-workspace.yaml` 用的是 `nodeLinker: hoisted`（扁平目录），这对 Next 的 file tracing 是**有利**的——符号链接布局反而更容易漏文件。

#### 服务器侧的部署流程

```bash
# 目录结构：current 是软链，回滚 = 换软链指向
/srv/everythingflows/
  releases/
    20261014-abc1234/     ← 每个版本的解压产物
    20261015-def5678/
  current -> releases/20261015-def5678

# 部署（由 CI 通过 scp 推送 tar 包后触发，或手工执行）
tar -xzf /tmp/flows-abc1234.tar.gz -C /srv/everythingflows/releases/20261014-abc1234
ln -sfn /srv/everythingflows/releases/20261014-abc1234 /srv/everythingflows/current
sudo systemctl restart flows

# 冒烟检查，失败则切回上一个 release
curl -sf -o /dev/null http://127.0.0.1:3000/ || {
  ln -sfn /srv/everythingflows/releases/<上一个版本> /srv/everythingflows/current
  sudo systemctl restart flows
}
```

回滚 = 换软链 + restart，**秒级**，且不依赖 git 状态。

#### CI 构建环境变量（易错点）

standalone 产物在**构建期**会把 `NEXT_PUBLIC_*` 内联进客户端 bundle，并且 ISR 页面（`revalidate = 3600`）会在构建期预渲染、预取 Supabase 数据。所以这些变量**必须在 CI 里可用**（存为 GitHub Actions secrets）：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://flows.xin
R2_PUBLIC_BASE_URL=          # 预渲染文章时用它重写图片地址
```

而 `SUPABASE_SERVICE_ROLE_KEY`、`UPSTASH_*`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、AI 的 API Key **只用于运行期**，放在服务器即可，不必进 CI（缩小密钥暴露面）。

> 判定方法：本地临时把某个变量删掉再 `pnpm build`，如果报错说明它在构建期被读到，就必须进 CI。

---

### 7.2 方案 B（备选）：服务器本地构建 + 大 swap

如果你不想动 CI，也可以在服务器上构建，但必须接受这些代价：

```bash
cd /srv/everythingflows
pnpm install --frozen-lockfile

export $(grep -v '^#' /etc/everythingflows/env.production | xargs -d '\n')
NODE_OPTIONS="--max-old-space-size=1536" pnpm build
```

| 项    | 预期                                       |
| ---- | ---------------------------------------- |
| 前置条件 | **swap 必须有 4G**（§3），否则大概率被 OOM Killer 杀掉 |
| 构建时长 | 15–25 分钟（正常 4G 机器是 5–10 分钟，这里慢在 swap 抖动） |
| 失败风险 | ⚠️ 中高。构建期间整机响应会明显变慢，Nginx 上的线上请求也会受影响    |
| 影响面  | 如果你是「线上在跑 + 同时本地构建」，**构建会拖慢正在服务的站点**     |

> 如果最终只能走方案 B，建议把构建放到业务低峰期，并在构建前临时把 swap 提到 4G。  
> 容量不够时，腾讯云支持在线升配到 2 核 4G（需重启）——这是最省心的长期解。

---

### 7.3 为什么不用 Docker（针对 2G）

|               | 2 核 2G 下的实际问题                                    |
| ------------- | ------------------------------------------------ |
| Docker daemon | 常驻 100–150MB 内存，在 2G 机器上是 7% 的固定开销               |
| 镜像构建          | 构建仍要吃掉 2–3G 内存，问题没解决，只是换个壳                       |
| 磁盘            | 镜像分层 + 基础镜像额外占 1–2G                              |
| 结论            | ❌ 2G 机器上 docker 的收益（环境一致性）远小于成本；改用 systemd 或 PM2 |

容器化留到升配到 4G 之后再考虑。

---

### 7.4 进程守护

2G 内存下**优先选 systemd**：原生支持环境变量文件、开机自启、内存硬上限，且**不占额外内存**（PM2 的 daemon 常驻 40–60MB）。

#### 首选：systemd

```ini
# /etc/systemd/system/flows.service
[Unit]
Description=Everything Flows (Next.js)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/srv/everythingflows/current
EnvironmentFile=/etc/everythingflows/env.production
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=NODE_OPTIONS=--max-old-space-size=640
ExecStart=/usr/bin/node server.js

Restart=always
RestartSec=3

# 内存护栏：NODE_OPTIONS 管堆上限，这里管整个进程的 RSS
MemoryHigh=800M
MemoryMax=1200M

# 轻量加固
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/srv/everythingflows/current

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now flows
systemctl status flows
journalctl -u flows -f          # 看日志，不用额外配置轮转（journald 自带）
```

**内存参数怎么调**

- `NODE_OPTIONS=--max-old-space-size=640`：限制 V8 堆。看到 `JavaScript heap out of memory` 就逐步加到 768 / 896。
- `MemoryHigh=800M`：软上限，超了内核开始压制回收，不会杀进程。
- `MemoryMax=1200M`：硬上限，超了 SIGKILL，配合 `Restart=always` 自愈。若日志里出现反复重启，说明业务确实吃紧，升配比硬撑划算。

#### 次选：PM2（更习惯的话也能用）

```js
// ecosystem.config.js
module.exports = {
  apps: [{
    name: "flows",
    script: "server.js",              // 方案 A；方案 B 则用 next start
    cwd: "/srv/everythingflows/current",
    instances: 1,                     // 必须单实例
    exec_mode: "fork",
    node_args: "--max-old-space-size=640",
    max_memory_restart: "1000M",      // 超过自动重启，防内存泄漏拖垮整机
    env_file: "/etc/everythingflows/env.production",
    env: { NODE_ENV: "production", PORT: 3000, HOSTNAME: "127.0.0.1" },
    error_file: "/var/log/flows/err.log",
    out_file: "/var/log/flows/out.log",
    time: true,
  }]
};
```

```bash
pm2 start ecosystem.config.js
pm2 save && pm2 startup
pm2 install pm2-logrotate     # 配 max_size=10M、retain=7，别让日志写满磁盘
```

> ⚠️ 两套守护**只能启用一套**。若先用 PM2 试过再切 systemd，记得 `pm2 delete flows && pm2 save` 并关掉 PM2 的开机自启，否则会两个进程抢 3000 端口。

---

### 7.5 必须知道的约束

- **服务器上不要跑构建**（见 §7.0）。方案 A 下服务器连 `pnpm` 都不需要装。
- **必须单实例**。`next start` / standalone 的 ISR 缓存写在本地 `.next` 目录，多实例会各自持有一份、互相不一致；2G 内存也不可能开多实例。
- **构建期需要 Supabase 可达**。方案 A 在 CI 里访问（网络好，无问题）；方案 B 在服务器上访问，跨洋不通会导致 `pnpm build` 失败，务必先做连通性预检。
- **`.next/cache` 要可写**。ISR 再生成会写盘，systemd 的 `ReadWritePaths` 必须包含它，否则会报 EROFS。
- 不要设 `NODE_ENV=development` 去跑构建或启动。
- 静态资源（`public/`）更新后需要重新打包推送——模板里出现过的坑，standalone 不会自动带上 `public/`。

---

## 8. 切换顺序与回滚

### 阶段划分

| 阶段 | 时机           | 动作                                                                                                                                  |
| -- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| P0 | 备案等待期（现在就能做） | 服务器初始化（含 4G swap）、装 Node + systemd 服务、CI 打通产出部署包、推送第一个 release、`IP:3000` 全功能验证、Supabase/Upstash/R2 连通性实测、改 Supabase Auth 的 Site URL |
| P1 | 备案通过         | DNS 迁 DNSPod → 解析 `flows.xin` / `www` 到服务器 IP → Nginx 接管 80/443 → 签发证书                                                              |
| P2 | 切换后 3–7 天    | 按 §9 验收清单逐项过，重点看内存曲线与 Upstash 计数                                                                                                    |
| P3 | 稳定后 1 个月     | 再下线 Vercel 项目（先保留，随时可回滚）                                                                                                            |

### 切换前的准备

- **TTL 提前降低**：切换前 24 小时，把 `flows.xin` 的 TTL 从默认降到 `60`，让回滚生效快。
- **Supabase Auth 配置**（易漏，漏了会导致登录邮件里的链接跳到旧域名）：
  - Authentication → URL Configuration → **Site URL** 改为 `https://flows.xin`
  - **Redirect URLs** 白名单加入 `https://flows.xin/**`
  - 若 Supabase 项目开了 **Network Restrictions**，需把腾讯云服务器的**出口公网 IP** 加白，否则 service role 调用会被拒。

### 回滚方案

| 故障           | 回滚动作                                                    | 耗时               |
| ------------ | ------------------------------------------------------- | ---------------- |
| 站点整体异常       | DNS 解析切回原 Cloudflare / Vercel                           | 1–2 分钟（TTL=60 时） |
| 新版本产物有问题     | 换 `current` 软链指向上一个 release + `systemctl restart flows` | 秒级               |
| Nginx/证书问题   | `systemctl stop nginx` 后直接走 Vercel                      | 1 分钟             |
| 内存打满被反复 kill | 升配到 2 核 4G（腾讯云在线升配，需重启）                                 | 停机数分钟            |
| 数据侧异常        | 无需回滚（Supabase 从未改动）                                     | —                |

---

## 9. 上线验收清单

**功能**

- [ ] 首页 / 博客列表 / 文章详情 / 归档 / 标签 / 搜索 / 碎片墙 / 关于页正常
- [ ] 文章内图片正常显示（走 `/api/post-image` 从 R2 拉取）
- [ ] 暗色模式切换正常
- [ ] 网易云音乐播放在大陆服务器下正常（应比 Vercel 更快）
- [ ] Giscus 评论区能加载（依赖 GitHub，大陆访问不稳定，属既有问题）

**鉴权与管理**

- [ ] 登录 / 登出正常，会话跨刷新保持
- [ ] 密码重置邮件的链接指向 `https://flows.xin` 而非旧域名
- [ ] `/admin` 未登录访问被重定向到 `/login`
- [ ] 新建 / 编辑 / 发布文章成功，图片上传成功且返回 R2 URL
- [ ] 删除文章时 R2 对象同步清理（仅 `posts/` 前缀）

**AI 对话**

- [ ] 匿名 `/chat` 能正常对话（**不是 503**）——这一条同时验证了 Nginx 头 + Upstash 两项
- [ ] 登录用户能看到对话历史、能重命名 / 删除
- [ ] 限流真实生效：在 Upstash 里能看到 `chat:daily:anon:<真实IP>:<UTC日期>` 键
- [ ] 从服务器和从外网分别确认限流计数用的是真实客户端 IP，而非 127.0.0.1 或 Nginx 本机 IP

**基础设施**

- [ ] HTTPS 正常、HTTP 自动跳转、证书剩余有效期充足
- [ ] `www.flows.xin` 301 → `flows.xin`
- [ ] `sitemap.xml`、`robots.txt` 可访问且域名与 canonical 一致
- [ ] `/_next/static/*` 返回 `Cache-Control: public, immutable`
- [ ] 服务器安全组未开放 3000 端口
- [ ] `.env.production` 权限 600，且不在 git 仓库内


**2 核 2G 专项（必查）**

- [ ] `free -m` 显示 swap 为 4096MB 且已启用（`swapon --show`）
- [ ] `vm.swappiness` 为 10（`sysctl vm.swappiness`）
- [ ] Nginx 已开 gzip、Next 侧 `compress: false`，**确认没有重复压缩**
- [ ] `next` 进程 RSS 稳定在 400MB 以内（`systemctl status flows` 或 `ps -o rss= -C node`）
- [ ] 压测：连续刷新首页 + 发几条 AI 对话，观察 `free -m` 可用内存不跌破 300MB
- [ ] 连续运行 24 小时后，进程没有反复重启（`journalctl -u flows | grep -c Started`）
- [ ] 磁盘占用 < 60%（standalone 产物每版约 200–300MB，release 目录需定期清理旧版本）

**账号与监控**

- [ ] 进程守护开机自启已生效（systemd `enable`，或 PM2 `startup` + `save`）
- [ ] 日志可轮转、磁盘不会被写满（systemd 走 journald，或 PM2 装 `pm2-logrotate`）
- [ ] 腾讯云云监控已设告警：内存 > 85%、磁盘 > 80%、1 分钟负载 > 4
- [ ] 站点可用性监控（Uptime）指向 `https://flows.xin`
- [ ] release 目录清理策略已定（保留最近 3–5 个版本）

---

## 10. 迁移后观察项与后续优化

### 必须观察

1. **跨洋延迟**：Supabase 不动，`middleware`（`src/proxy.ts`）在**每次页面请求**都会调用一次 `supabase.auth.getUser()` 做网络校验。大陆服务器 → 海外 Supabase 的这一次往返会叠加到每个请求上。  
   → 优化方向（需改代码，本次不做）：仅在 `/admin` 路径才做鉴权校验，其余路径跳过，可省掉绝大多数请求的跨洋往返。
2. **`/api/post-image` 拉图速度**：服务器从 Cloudflare R2 取图并回源。首次访问可能 100–300ms。  
   → 优化方向：给 R2 自定义域名接腾讯云 CDN 回源，看实际数据再决定。
3. **Upstash 稳定性**：作为 `/chat` 的硬依赖，需长期观察其从大陆的可达性。若频繁掉线，考虑本机 Redis 分支（代码改动）。
4. **2G 内存水位**：这是本方案里最需要盯的指标。重点关注两个场景——① 单篇文章 ISR 过期后首次重生成；② 多个用户同时发 AI 对话。若出现 `MemoryMax` 触发重启，优先升配而不是继续压参数。  
   → 短期缓解：把内容页的 `revalidate = 3600` 适当调大（如 21600），减少同时重生成的页数。  
   → 根治：升配到 2 核 4G（腾讯云在线升配，重启生效）。

### 技术债记录（建议后续单独立项处理）

- `clientIp()` 硬编码 `x-vercel-forwarded-for`，依赖「Nginx 模拟 Vercel 头」这个隐式约定。长期应改为可配置的 `TRUSTED_IP_HEADER` 环境变量。
- `.gitignore` 未覆盖 `.env.production`。
- README 与 `.env.example` 里关于「未配 Upstash 会降级」的描述与代码不符，需修正。
- `pnpm-workspace.yaml` 里 `overrides` 锁了一批依赖版本（`@supabase/supabase-js` 锁 2.106.1 等），与 `package.json` 的 `^` 范围不一致——迁移时不要动，升级需单独评审。

---

## 11. 待你拍板的问题

| # | 问题                                                              | 为什么重要                                                                                   |
| - | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1 | `flows.xin` 的**注册商**是哪家？                                        | 若是境外注册商，备案会被驳回，需先转域名——这是整条链路上可能新增 1 周的地方                                                |
| 2 | **构建走方案 A（CI 构建 + 推产物）还是方案 B（服务器本地构建 + 大 swap）？**               | 2G 内存下的核心决策。方案 A 需改 1 处 `next.config.mjs` + 加部署工作流；方案 B 零改动但要忍受 15–25 分钟高 swap 构建且有失败风险 |
| 3 | 进程守护用 **systemd** 还是 **PM2**？                                   | 2G 内存下 systemd 省 40–60MB 常驻；PM2 的日志/监控体验更好                                              |
| 4 | 仓库目前是**私有还是公开**？                                                | 决定 GitHub Actions 部署产物能否直接走 artifact，以及服务器拉取代码的鉴权方式                                     |
| 5 | 备案通过后是否**保留 Cloudflare**？                                       | 若保留必须配 realip，否则限流失效                                                                    |
| 6 | 主域名定 **apex** 还是 **www**？                                       | 影响 canonical / sitemap / OG，建议统一 apex                                                   |
| 7 | 海外 AI provider（Gemini / GPT / Claude）是否从 `ai-models.json` 暂时移除？ | 大陆服务器不可直连，留着会让用户点击后超时                                                                   |
| 8 | 是否接受 `/chat` 长期依赖境外 Upstash Redis？                              | 若不接受，需要一处代码改动加本机 Redis 分支                                                               |
| 9 | 是否考虑直接升配到 **2 核 4G**？                                           | 2G 能跑，但无余量。若服务器还没买，升到 4G 是一次性消除本方案里 80% 的复杂度（可回到服务器本地构建、可考虑容器化）                         |
| 10 | 过渡期是否**保留 Vercel 双跑**？                                          | 保留则切换后仍可秒级回滚。注意 `next.config.mjs` 里的 `process.env.VERCEL` 判断要留着（见 §7.0），否则 Vercel 构建会直接失败          |

---

## 附：时间线估算（2 核 2G）

```
第 0 天      发起备案（前提：注册商在境内）+ 同步开始服务器环境准备
第 1 天      4G swap + Node + systemd 服务 + Nginx 装好
             打通 CI 产出部署包 → 推送第一个 release → IP:3000 全功能验证
             ← 技术迁移实际到此完成
第 1-15 天   等备案（管局审核，不可压缩）
备案通过当天  DNS 切换 + Nginx 接管 + 证书签发（约 30 分钟切换窗口）
+3~7 天      验收观察（重点盯内存水位）
+1 个月      下线 Vercel
```

---

## 附：2 核 2G 速查

| 场景                | 结论                                             |
| ----------------- | ---------------------------------------------- |
| 运行 `next start`   | ✅ 够用，常驻 200–400MB                              |
| 服务器上 `next build` | ❌ 别做，峰值 2–3G。改用 CI 构建                          |
| 用 Vercel 构建        | ❌ 产物是平台专用格式（Build Output API v3），搬不过来               |
| 双跑（Vercel + 腾讯云）   | ✅ 可行，但 `output` 要写成 `process.env.VERCEL ? undefined : "standalone"` |
| swap              | ⚠️ **4G 必配**，swappiness=10                     |
| Docker            | ❌ 不划算，daemon 白吃 100MB+ 且不解决构建内存问题              |
| 进程守护              | ✅ systemd（省内存），或 PM2（体验好）                      |
| Nginx 压缩          | ✅ Next `compress: false` + Nginx gzip，二选一      |
| 多实例               | ❌ 不可能，也没必要（ISR 缓存不共享）                          |
| 内存护栏              | `--max-old-space-size=640` + `MemoryMax=1200M` |
| 何时该升配             | 出现反复 `MemoryMax` 重启，或磁盘/内存长期 > 85%             |
