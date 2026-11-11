# 主站接入 EdgeOne（flows.xin）

> 状态：待执行（2026-11-12）
> 目的：把 `flows.xin` 的静态资源收到边缘节点，解决两件事——
> ① 源站只有约 6 Mbps 出口，首访要拉 352 KB；② 公网链路偶发丢包会触发 TCP
> 超时重传，单次卡顿约 1.3 秒。

## 0. 为什么要做

实测基线（2026-11-12，直连源站）：

| 指标 | 值 |
|---|---|
| 首页 TTFB | 0.20 s |
| 18 个静态资源 | 原始 1149 KB → gzip 332 KB |
| 单流下载 | ≈700 KB/s（约 5.6 Mbps，套餐上限） |
| 服务器内部处理 | 9–13 ms |
| 公网丢包 | 10 次请求里 1 次 TTFB 1.37 s，期间 `TCPRetransSegs` +73 |

服务器本身不慢，瓶颈是出口带宽与链路质量。静态资源一旦落到边缘，回源请求
接近零，这两个问题同时消失。

## 1. 架构

```
访客 ──► EdgeOne 边缘（缓存 /_next/static、图片）
              │  未命中才回源
              ▼
        源站 Nginx :443（flows.xin 证书）
              │
              ▼
        Next standalone :3000（仅回环）
```

`www.flows.xin` **保持直连源站**，不做接入：它只需要回一个 301，走 CDN 没有收益，
反而多一层依赖。前提是不要给源站 443 做「只允许 EO 回源 IP」的防火墙收紧，
否则 www 会被一起拦掉（见第 6 节）。

## 2. 前置检查（已完成）

| 项 | 结论 |
|---|---|
| `flows.xin` 是否有 MX 记录 | ❌ 无。根域名做 CNAME 不会影响邮件 |
| 是否已有 CAA | ❌ 无，不限制证书签发方 |
| EO 站点配额 | 免费版 1 个站点 / 200 个子域名，`media` 与 `flows.xin` 可共用一个站点 |
| EO 免费版流量 | 不限流量、不限请求；但明确不覆盖视频与大型文件分发 |

⚠️ 免费版条款里写着「不提供视频或大型文件业务，包括高比例图片」。博客配图属于
正常网页内容，不在限制目标内；但不要拿这个域名做图床批量分发大图。

## 3. 控制台配置

路径：EdgeOne 控制台 → 站点（与 `media.flows.xin` 同一个）→ 域名管理 → 添加域名

| 项 | 填什么 |
|---|---|
| 加速域名 | `flows.xin` |
| 加速区域 | 中国大陆（备案已通过） |
| 接入方式 | CNAME |
| 源站类型 | **IP/域名** |
| 源站地址 | 服务器公网 IP |
| 回源协议 / 端口 | **HTTPS / 443** |
| 回源 HOST | **使用加速域名**（即 `flows.xin`） |
| IPv6 访问 | 遵循站点配置 |
| 推荐模板 | 不使用模板 |

**「回源 HOST 选使用加速域名」是关键**，不是可选项：

- 源站 Nginx 的 443 server 块 `server_name flows.xin`，Host 不对会落到默认站点
- TLS SNI 也必须是 `flows.xin`，否则拿不到那张 Let's Encrypt 证书，回源握手直接失败

**回源协议必须 HTTPS**。80 端口在源站是「ACME 放行 + 其余 301」，EO 若用 HTTP 回源，
非 ACME 请求会拿到 301 跳到 `https://flows.xin`，而那个域名又指向 EO —— 无限重定向。

## 4. 缓存规则

EO 默认「遵循源站 Cache-Control」。源站已经返回了正确的头，所以大部分不用改，
但必须显式加两条「不缓存」，否则会把后台和接口一起缓存住。

| 优先级（从上到下） | 匹配 | 缓存行为 |
|---|---|---|
| 1 | `HOST` = `flows.xin` 且 `URL 路径` 前缀 `/_next/static/` | **节点缓存 TTL** → 自定义 30 天 |
| 2 | `HOST` = `flows.xin`（兜底，放最后） | **节点缓存 TTL** → 不缓存 |

为什么只有两条：第 2 条是兜底，命中即不缓存，于是 `/api/`、`/admin/`、`/login`、
`/.well-known/` 全部天然落在里面，不需要再单独列。只有静态资源被第 1 条提前截走。

**必须带 `HOST is flows.xin` 这个条件**。站点里还有 `media.flows.xin`，它的图片
需要正常缓存；不限定 HOST 的兜底规则会把它一起打成「不缓存」，每次看图都回源 R2。

## 4.1 具体在控制台哪里

```
站点列表 → 点站点 → 左侧「站点加速」→ 顶部 Tab「规则引擎」
→ 创建规则 → 新增空白规则
```

一条规则的构成：

| 位置 | 填什么 |
|---|---|
| 规则名称 | 例如 `flows-静态资源-缓存30天` |
| IF 匹配类型 | `HOST`，运算符「等于」，值 `flows.xin`，点「添加 IF」再加下一层 |
| IF 第二层 | `URL 路径`，运算符「前缀」，值 `/_next/static/` |
| 操作 | `节点缓存 TTL` → 「自定义时间」→ 30 天 |

第二条同理，只有 `HOST` 一层，操作为 `节点缓存 TTL` → 「不缓存」。
**排到列表最后**——规则引擎从上到下匹配，兜底规则放前面会把静态资源规则吃掉。

改完必须点「保存并发布」，只点保存不发布不生效。

左侧「站点加速 → 缓存配置」里的全局「节点缓存 TTL」「浏览器缓存 TTL」保持默认
（遵循源站）不要动，那是站点级设置，会把 `media` 一起改掉。

> 如果界面上找不到「规则引擎」Tab，说明你的套餐只开放了「缓存配置」里的按文件后缀
> 设置。那种情况下把 `js/css/woff2/webp` 等后缀设为缓存 30 天即可，HTML 按后缀
> 设 `html/htm` 不缓存——但无后缀路径（`/zh/blog` 这类）仍会遵循源站被缓存 1 小时，
> 部署后要手动刷缓存。遇到这种限制告诉我，我们改成部署后调刷新接口。

第 5 条为什么不是「遵循源站」而是「不缓存」，原因不在内容新鲜度，而在**部署的原子性**：

Next 的静态资源文件名带内容哈希，每次构建全变。如果边缘缓存了 HTML，部署后
它还在吐上一次构建的 HTML，里面引用的 `/_next/static/chunks/<旧哈希>.js` 在新
release 里并不存在 —— 源站返回 404，页面白屏或样式全丢，最长要等缓存过期。

保留 `/_next/static/` 的 30 天缓存就够了：352 KB 首访里有 332 KB 是它，HTML 只有
19 KB，每次回源的代价可以忽略。

如果确实想缓存 HTML，就必须在部署后调 EO 的「刷新缓存」接口，把 `flows.xin/*`
刷掉——那需要在 GitHub Secrets 里放腾讯云 API 密钥，属于额外维护成本。

「强制 HTTPS 跳转」可以开。续期链路是这样的：

```
LE 校验 → http://flows.xin/.well-known/acme-challenge/<token>
        → EO 返回 301 到 https://
        → EO 以 HTTPS 回源到源站 443
        → Nginx 443 块里的 ACME location 直接吐文件
```

因为 `deploy/nginx/flows.conf` 的 443 server 块里已经埋了
`location ^~ /.well-known/acme-challenge/`，所以开跳转不影响续期。

## 5. DNS 切换（DNSPod）

| 操作 | 记录 |
|---|---|
| **删除** | `flows.xin` 的 A 记录（指向服务器 IP） |
| **新增** | `flows.xin` 的 CNAME → EO 控制台给出的加速域名（形如 `flows.xin.eo.dnse0.com`） |
| 不动 | `www` 的 A 记录 |
| 不动 | `media` 的 CNAME |
| 不动 | NS 记录（仍是 `kelp/peak.dnspod.net`） |

TTL 建议先设 600，确认稳定后再调回默认。

⚠️ 根域名 CNAME 会与 MX 冲突，DNSPod 会弹提示。已确认本域**没有 MX**，可以忽略。
以后若要接企业邮箱，必须先把根域名改回 A 记录，改用别的接入方式。

## 6. 源站防护（切换稳定后再做）

`deploy/nginx/flows.conf` 里的 realip 目前写的是 `set_real_ip_from 0.0.0.0/0`，
即信任任何来源的 `EO-Connecting-IP` 头。副作用：直连源站 IP 并伪造该头，可以绕过
`/api/chat` 的按 IP 限流。

收紧步骤：

1. EO 控制台 → 安全防护 → **源站防护** → 启用，复制回源 IP 段
2. 把这些网段填进 `flows.conf` 的 `set_real_ip_from`，删掉 `0.0.0.0/0`
3. 腾讯云轻量防火墙里 443 只放行这些网段（此时 `www` 也会被拦，需要一并接入 EO 或单独放行）
4. EO 每 3–6 个月会调整回源网段，控制台会提前 14/7/3/1 天通知，务必处理

## 7. 切换后验证

```bash
# 解析是否已指向 EO
dig +short flows.xin            # 应返回 EO 的节点 IP，不再是 43.142.90.48

# 静态资源是否命中边缘
curl -sI https://flows.xin/_next/static/chunks/<某个js> | grep -i "x-cache\|eagleid"

# 接口不被缓存
curl -sI https://flows.xin/api/post-image?key=x | grep -i "x-cache"

# 真实 IP 是否还原（服务端日志里应出现访客 IP，而不是 EO 节点 IP）
ssh deploy@<host> "tail -5 /var/log/nginx/flows.access.log"

# ACME 路径仍然通（应返回 404 而不是 301/403）
curl -sI https://flows.xin/.well-known/acme-challenge/ping | head -1
```

## 8. 回滚

把 DNSPod 里 `flows.xin` 的 CNAME 删掉，改回 A 记录指向服务器 IP 即可。
EO 侧配置可以保留不动，DNS 不指过去就不生效。证书、源站、应用都不受影响。

## 9. 与 media 的关系

`media.flows.xin` 已经通过 CNAME 接入同一个 EO 站点，源站是 R2 的 S3 兼容端点
（配置见 `docs/R2_MEDIA_SETUP.md`）。主站接入后两者共用站点配额，互不影响。
