# 万物流转 · 自托管部署件

配合 `docs/DEPLOY_TENCENT_CLOUD.md` 使用。本目录是**可执行的部分**，那份文档是**决策与原理**。

```
deploy/
  nginx/flows.conf              反向代理（含 x-vercel-forwarded-for 等关键配置）
  systemd/flows.service         进程守护 + 2G 内存护栏
  sudoers/flows-deploy          部署用户的最小 sudo 权限
  scripts/bootstrap.sh          服务器一次性初始化（幂等，可重复执行）
  scripts/activate-release.sh   服务器侧激活脚本（含冒烟与自动回滚）
```

CI 工作流：`.github/workflows/deploy.yml`

整体链路：

```
git push main
  → GitHub Actions（ubuntu runner，7G 内存）：lint / typecheck / test / build
  → 打 standalone 产物包 flows-<sha>.tar.gz
  → scp 到服务器 /tmp
  → ssh 执行 activate-release.sh
       → 解压到 releases/<sha>
       → current 软链切换
       → systemctl restart flows
       → 冒烟检查 → 失败自动回滚
       → 清理旧 release（保留 5 个）
```

服务器上**没有** `git clone`、没有 `pnpm install`、没有 `node_modules`、没有构建过程。只有 Node 和一个解压好的产物目录。

---

## 一、服务器一次性准备

> **可以一次跑完**：把 `deploy/scripts/bootstrap.sh` 传到服务器，`sudo bash bootstrap.sh` 即覆盖下面 1–7 步。
> 脚本是幂等的，重复执行不会覆盖已有的 `env.production`、密钥和正式 Nginx 配置；有一步失败会停下并报出原因。
>
> ```bash
> scp deploy/scripts/bootstrap.sh root@<服务器IP>:/root/
> ssh root@<服务器IP> 'bash /root/bootstrap.sh'
> ```
>
> 下面的分步命令保留作**说明与排障参考**——脚本做的是同一件事，出问题时可以对着它逐条查。

### 1. 用户与目录

```bash
sudo adduser deploy
sudo mkdir -p /srv/everythingflows/releases
sudo mkdir -p /etc/everythingflows
sudo chown -R deploy:deploy /srv/everythingflows
sudo chmod 700 /etc/everythingflows
```

### 2. SSH 密钥（CI 用）

在**本地**生成一对专用部署密钥（不要复用你日常登录的密钥）：

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./flows_deploy_key -N ""
```

- 公钥追加到服务器 `/home/deploy/.ssh/authorized_keys`（权限 `600`，目录 `700`）
- 私钥内容 → GitHub Secret `DEPLOY_SSH_KEY`
- 记录主机指纹 → GitHub Secret `DEPLOY_KNOWN_HOSTS`：

```bash
ssh-keyscan -p 22 <服务器IP> > known_hosts
```

> 用 `ssh-keyscan` 的产物做 pinning，比在 CI 里临时 keyscan 安全（避免 TOFU 中间人）。
> 若服务器换 IP 或重装，记得重新生成这个 secret。

### 3. 部署用户的 sudo 权限

```bash
sudo cp deploy/sudoers/flows-deploy /etc/sudoers.d/flows-deploy
sudo chmod 440 /etc/sudoers.d/flows-deploy
sudo visudo -c        # 校验语法，必须成功
```

只放开 `flows` 这一个 unit 的重启/查看和它的日志，不给全量 sudo。

### 4. swap（2G 机器必做）

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

sudo tee /etc/sysctl.d/99-flows.conf >/dev/null <<'EOF'
vm.swappiness = 10
vm.vfs_cache_pressure = 50
EOF
sudo sysctl --system

free -m && swapon --show      # Swap 应显示 4096
```

### 5. Node 与 Nginx

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx

node -v      # 应为 v22.x
```

> 注意：**不需要装 pnpm**。构建在 CI 完成。

### 6. 环境变量

```bash
sudo tee /etc/everythingflows/env.production >/dev/null <<'EOF'
# ---- Supabase（沿用现有值）----
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ---- 站点 ----
NEXT_PUBLIC_SITE_URL=https://flows.xin

# ---- Upstash（生产环境硬依赖，不配 /chat 会对所有人 503）----
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ---- Cloudflare R2（图片不迁移，沿用现有值）----
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=

# ---- AI（至少配一个境内可直连的 provider）----
# 智谱 GLM 在大陆可直连；Gemini / OpenAI / Anthropic 不可直连，配了也会超时
ZHIPU_API_KEY=
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
EOF

sudo chown deploy:deploy /etc/everythingflows/env.production
sudo chmod 600 /etc/everythingflows/env.production
```

部署前先验证三个外部依赖从这台机器可达：

```bash
set -a; . /etc/everythingflows/env.production; set +a

# Upstash（最关键，不通则 /chat 全 503）
curl -sS -m 5 "$UPSTASH_REDIS_REST_URL/ping" -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
# 期望：{"result":"PONG"}

# Supabase
curl -sS -o /dev/null -w '%{http_code}\n' -m 10 "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# R2 公共域名
curl -sS -o /dev/null -w '%{http_code}\n' -m 10 "$R2_PUBLIC_BASE_URL/"
```

### 7. Nginx / 证书 / systemd

```bash
# 证书（acme.sh 自动续期；也可换成腾讯云免费证书手动放置）
sudo mkdir -p /etc/nginx/certs
# acme.sh --issue -d flows.xin -d www.flows.xin --webroot /var/www/html
# acme.sh --install-cert -d flows.xin \
#   --key-file      /etc/nginx/certs/flows.xin.key \
#   --fullchain-file /etc/nginx/certs/flows.xin.pem \
#   --reloadcmd     "systemctl reload nginx"

sudo cp deploy/nginx/flows.conf /etc/nginx/conf.d/flows.conf
sudo nginx -t && sudo systemctl reload nginx

sudo cp deploy/systemd/flows.service /etc/systemd/system/flows.service
sudo systemctl daemon-reload
sudo systemctl enable flows        # 先不 start，等第一个 release 上线
```

---

## 二、GitHub Secrets 清单

仓库 → Settings → Secrets and variables → Actions → **New repository secret**。

**部署用**

| Secret | 说明 | 示例 |
|---|---|---|
| `DEPLOY_HOST` | 服务器公网 IP 或域名 | `1.2.3.4` |
| `DEPLOY_PORT` | SSH 端口 | `22` |
| `DEPLOY_USER` | 部署用户 | `deploy` |
| `DEPLOY_SSH_KEY` | 上一步生成的**私钥**全文 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_KNOWN_HOSTS` | `ssh-keyscan` 的输出 | `1.2.3.4 ssh-ed25519 AAAA...` |

**构建期需要**

| Secret | 为什么构建期要 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_*` 在构建时被内联进客户端 bundle |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上；且 ISR 页面在构建期预取数据 |
| `R2_PUBLIC_BASE_URL` | 预渲染文章时用于重写 `<img>` 地址 |

> `NEXT_PUBLIC_SITE_URL` 直接写在工作流里（`https://flows.xin`），不用配。
>
> **运行期密钥**（`SUPABASE_SERVICE_ROLE_KEY` / `UPSTASH_*` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / AI Key）
> 只放在服务器的 `/etc/everythingflows/env.production`，**不放 GitHub**，缩小密钥暴露面。

---

## 三、首次部署

```bash
git add .
git commit -m "chore: 自托管部署（standalone + GitHub Actions）"
git push origin main
```

工作流跑完后：

```bash
# 服务器上确认
ls -la /srv/everythingflows/          # 应有 releases/ 和 current 软链
readlink -f /srv/everythingflows/current
systemctl status flows
curl -sI http://127.0.0.1:3000/ | head -1

# 从外网验证（备案通过、Nginx 生效后）
curl -sI https://flows.xin/ | head -3
```

**首次上线、证书还没签之前**：服务只监听 `127.0.0.1:3000`（`flows.service` 里 `HOSTNAME=127.0.0.1`），
所以**公网打 `http://<公网IP>:3000` 是连不上的，也不需要为此开端口**。要在浏览器里做全功能验收，用 SSH 隧道：

```bash
ssh -N -L 3000:127.0.0.1:3000 deploy@<公网IP>
# 另开一个终端，浏览器访问 http://localhost:3000
```

这样等同于在本机访问那台服务器，登录、发文章、传图、`/chat` 都能测，且不需要向公网暴露任何额外端口。

---

## 四、日常发布与回滚

**发布**：推到 `main` 即自动部署。冒烟失败会自动回滚并把日志打到 Actions 输出里。

**手工回滚**（秒级）：

```bash
ls -1dt /srv/everythingflows/releases/*/     # 看有哪些版本
ln -sfn /srv/everythingflows/releases/<上一个sha> /srv/everythingflows/current
sudo systemctl restart flows
curl -sf -o /dev/null http://127.0.0.1:3000/ && echo OK
```

**重跑某次构建**：Actions → Deploy → 找到对应 run → Re-run jobs。
**只发布某个旧 commit**：Actions → Deploy → Run workflow（选分支）。

---

## 五、排障对照表

| 现象 | 原因 | 处理 |
|---|---|---|
| 站点 CSS/JS/图片全 404 | standalone 产物没带 `public/` 或 `.next/static/` | 工作流里 `Assemble release bundle` 步骤失败或漏拷，检查产物 |
| `next/image` 返回 500，日志报 `Could not load the "sharp" module` | standalone 缺 `@img/sharp-linux-x64` | 工作流已自动补；若仍失败，检查 `node_modules/@img/` 是否存在 |
| 匿名 `/chat` 全部 503，匿名用户和登录用户都一样 | ① Nginx 没设 `x-vercel-forwarded-for`；② Upstash 不可达 | ① 检查 `deploy/nginx/flows.conf`；② 跑上面的 Upstash ping |
| 只有匿名 `/chat` 503，登录用户正常 | 服务器拿不到客户端 IP | 同上第①条。注意若前面挂了 Cloudflare 橙云，`$remote_addr` 会变成 CF 节点 IP |
| AI 回答卡住、最后一次性吐出 | Nginx 缓冲了 SSE | 确认 `location /` 里有 `proxy_buffering off` |
| 上传图片报 413 | Nginx 默认 body 上限 1m | 确认 `client_max_body_size 10m` |
| 页面报 `EROFS` / 无法写入 | systemd `ProtectSystem=strict` 下没给写权限 | 确认 `ReadWritePaths=/srv/everythingflows/current` |
| 服务反复重启 | 触发 `MemoryMax` | `journalctl -u flows \| grep -i memory`；先按 `docs/DEPLOY_TENCENT_CLOUD.md` §7.4 调堆上限，仍不行就升配 2 核 4G |
| 部署后 502 | 应用没起来 | `systemctl status flows` + `journalctl -u flows -n 100` |
| `sudo: no tty present` | sudoers 没配对 | 检查 `/etc/sudoers.d/flows-deploy`，`sudo visudo -c` |

---

## 六、待办 / 后续

- **首次部署的第一个动作**：先跑一次 Actions 确认构建能过。
  本次交付时**没能完整本地验证构建产物**——开发机的网络访问不到 Supabase（连单次 REST 请求都 TLS 握手失败），
  `pnpm build` 稳定挂在 `/zh/blog` 的预渲染上。这是构建机的网络问题，不是代码或配置问题（现网 Vercel 构建正常即为反证）。
  CI 的 runner 在境外，访问 Supabase 更稳，但请在合并后第一时间确认 Actions 全绿，再继续服务器侧准备。
  其余已验证：Next 版本 16.2.9、standalone 配置可被识别、工作流 YAML 语法通过、`activate-release.sh` 通过 `bash -n`。
- **过渡期双跑**：`next.config.mjs` 里 `output: process.env.VERCEL ? undefined : "standalone"` 已就位，
  Vercel 旧站可以继续存在；DNS 切回即可回滚。
  （注：本项目当前是 Next 16.2.9，`standalone` 与 Vercel 的冲突在 16.3 才出现；升级前这个判断是你的保险。）
- **`.next/cache` 不跨版本保留**：每次部署是新目录，ISR 缓存会重建。
  若发现部署后首访偏慢，可把它移到版本目录之外并软链进来。
- **`ci.yml` 与 `deploy.yml` 有重叠的校验步骤**：可把 `ci.yml` 里的 build 步骤去掉，只留 PR 校验。
- **nginx `gzip_static`**：装上 `ngx_http_gzip_static_module` 并在产物里预压缩，可进一步省 2 核 CPU。
- **构建期并发**：Next 的静态生成 worker 数 = 构建机 CPU 核数（本机 20 核 → 19 并发打 Supabase）。
  若在 CI 上遇到 Supabase 侧限流，可用 `taskset` 限制构建可用核数来降低并发。
- **升配到 2 核 4G** 后，可考虑回到服务器本地构建或容器化（Docker Compose）。
