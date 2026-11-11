# R2 图片存储与图片域名接入

项目的文章编辑器和碎片墙图片均只使用 Cloudflare R2；Supabase 继续保存文章、碎片、认证等业务数据，不承担图片对象存储。

> 现状（2026-11-11）：`R2_PUBLIC_BASE_URL` 指向 `https://media.flows.xin`，但该子域名的解析在域名转移过程中丢失，公网查询返回 NXDOMAIN。**图片域名必须先恢复，否则全站图片 404。** 本文第 3 节是恢复方案。



---

## 1. 变量

密钥只能放在服务端环境变量中，绝不能以 `NEXT_PUBLIC_` 开头，也不要提交到仓库。

| 变量                     | 值 / 用途                           |
| ---------------------- | -------------------------------- |
| `R2_ACCOUNT_ID`        | Cloudflare 账户 ID，同时用于拼接 S3 端点    |
| `R2_ACCESS_KEY_ID`     | R2 API Token 的 Access Key ID     |
| `R2_SECRET_ACCESS_KEY` | R2 API Token 的 Secret Access Key |
| `R2_BUCKET`            | `flows-media`                    |
| `R2_PUBLIC_BASE_URL`   | `https://media.flows.xin`        |

**需要两把不同的 Token，不要复用：**

| Token            | 权限                                 | 用在哪              |
| ---------------- | ---------------------------------- | ---------------- |
| 应用 Token         | 该 bucket 的 **Object Read & Write** | 服务端上传、删除         |
| EdgeOne 回源 Token | 该 bucket 的 **Object Read only**    | 填进 EdgeOne 的源站鉴权 |

回源 Token 只给读，且限定到 `flows-media` 单个 bucket。即使它泄露，攻击面也只是一个只读桶。

---

## 2. 对象约定

一次上传会写**两个对象**（2026-11 起的「展示图 + 原图」两阶段管线）：

| 用途 | key | 谁写入 |
| --- | --- | --- |
| 展示图 | `posts/<时间戳>-<uuid>.<扩展名>` | 浏览器压缩后直传 |
| 原图 | `posts/<时间戳>-<uuid>.orig.<扩展名>` | 读者点「查看原图」时才会被请求 |

- 上传方式是**浏览器直传 R2**：`POST /api/upload/presign` 只用登录态签发一个 **5 分钟有效的 PUT 地址**，服务器不碰字节流。这绕开了请求体上限，也让 2 核 2G 的机器不必为传图承担内存和带宽。
- 因为不经过服务器，服务端的魔数校验没有了，改由浏览器在上传前做（验文件头 + `createImageBitmap` 真解码）。
- **对象本身不带 `Cache-Control`**。签名只覆盖 `Content-Type`，而桶的 CORS 也只放行这一个请求头。缓存头由同源代理 `/api/post-image` 下发（`max-age=300, s-maxage=3600`）。若想让对象自身也带 immutable 缓存，得先在 R2 的 CORS 里加 `cache-control`，再改签发代码。
- 更新或删除文章、碎片时，只删除 `R2_PUBLIC_BASE_URL` 下 `posts/` 前缀的对象；外部 URL 永远不会被删除。
- **key 每次上传都是新的**（时间戳 + UUID），所以换图不会命中旧缓存，不需要手动刷 EdgeOne 缓存。

### 2.1 R2 桶必须配 CORS（直传的硬前提）

浏览器从 `https://flows.xin` 往 `r2.cloudflarestorage.com` 发 PUT，属于跨域请求，桶上没有 CORS 规则就会被浏览器直接拦掉——表现为上传按钮转圈后失败，控制台里一条 CORS 报错，服务器日志里**什么都没有**（请求根本没到你这里）。

Cloudflare 控制台 → R2 → `flows-media` → Settings → CORS Policy：

```json
[
  {
    "AllowedOrigins": ["https://flows.xin", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

> `localhost:3000` 是给本地开发用的，不需要可以删。`AllowedHeaders` 只能有 `content-type`，多写不会更安全；少写则预检失败。`MaxAgeSeconds` 决定预检结果缓存多久。

### 2.2 图片在页面上怎么加载

`src/lib/post-image-proxy.ts` 会把本站 R2 图片重写成 `/api/post-image?src=<编码后的绝对地址>`，由 Node 服务端流式回源后转发字节（不把整张图读进内存，上限 30 MB）。

```
浏览器 → https://flows.xin/api/post-image?src=...  →  应用服务器  →  media.flows.xin  →  R2
```

这条代理带来一个后果：**访客的图片字节全部从自己的服务器出去**，受服务器出网带宽限制。给 `media.flows.xin` 挂 CDN 只优化「服务器 → 图床」这一跳，不改善访客侧首屏。详见第 6 节。

代理存在的理由是避免客户端代理 / DNS 干扰对 R2 公共域名的影响——等图床域名换到境内节点后，这个理由会消失。

> `R2_PUBLIC_BASE_URL` 未配置时，`isR2PostImageUrl` 恒为 `false`，所有图片都不会被代理（直连原地址），而不是被判为非法。这个分支是为「本地没配 R2 也能看文章」准备的，生产环境必须配上。

---

## 3. 恢复 `media.flows.xin`：EdgeOne + S3 兼容源站

### 3.1 为什么选这条

R2 对外公开只有三种方式，逐个排除后只剩这一条能同时满足「不改 NS、不搬对象、零成本」：

| 方式                      | 结论                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **`r2.dev`**            | ❌ 官方明确标注仅限开发。原文：*Avoid creating a CNAME record pointing to the r2.dev subdomain. This is an unsupported access path.* 带宽会被限速，超限返回 429 |
| **R2 Custom Domain**    | ❌ 要求该域名所在 zone 在 Cloudflare 账号内且已激活。partial（CNAME 接入，不动 NS）官方标注仅 Business / Enterprise 可用，Free 套餐不显示                                  |
| **Cloudflare for SaaS** | ⚠️ 技术上可行，Free 套餐含 100 个 custom hostname、$0。但必须挂在一个**已在 Cloudflare 激活的 zone** 下，`flows.xin` 的 NS 在 DNSPod，不能自己当 SaaS zone              |
| **EdgeOne + S3 兼容源站**   | ✅ 用它                                                                                                                                  |

EdgeOne 官方源站文档原文：「对象存储源站：腾讯云 COS 或者**兼容 AWS S3 的其他对象存储桶**」。R2 完全兼容 S3，走 S3 API 签名回源，绕开 `r2.dev` 的限速，且 bucket 不需要开公共访问。

### 3.2 配置表

| 项                                 | 填什么                                                    |
| --------------------------------- | ------------------------------------------------------ |
| 加速域名                              | `media`（即 `media.flows.xin`）                           |
| 加速区域                              | 中国大陆（需要备案，已具备）                                         |
| 接入方式                              | CNAME                                                  |
| 源站类型                              | 对象存储源站 → S3 兼容                                         |
| 源站地址                              | `flows-media.<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` |
| 回源协议 / 端口                         | HTTPS / 443                                            |
| 鉴权版本                              | AWS Signature v4                                       |
| 地域                                | `auto`                                                 |
| 私有访问授权                            | 开启                                                     |
| Access Key ID / Secret Access Key | 3.1 里那把**只读**回源 Token                                  |
| 回源 HOST                           | 只能选「使用源站域名」，不可改                                        |

### 3.3 五个坑

**① 源站地址是虚拟主机风格，且不带协议。**  
S3 端点本体是 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`，要**把 bucket 名挪到最前面**：

```
<ACCOUNT_ID>.r2.cloudflarestorage.com          ← S3 端点本体
flows-media.<ACCOUNT_ID>.r2.cloudflarestorage.com   ← 填这一行
```

填成路径风格（`.../r2.cloudflarestorage.com/flows-media`）会 404；填成带 `https://` 的会报源站地址非法。

**② 地域填 `auto`。** R2 的 region 恒为 `auto`。按桶的物理位置填 `apac` 有时也能通，但先试 `auto`。

**③ 回源 HOST 选不了是正常的。** 对象存储源站只能使用源站域名作 Host——这恰好是 R2 需要的：它靠 Host 里的 bucket 名路由，SNI 也要匹配 `r2.cloudflarestorage.com` 的证书。

**④ 缓存规则要单独配。** 在「规则引擎」里加一条：匹配 `jpg/jpeg/png/webp/gif/avif` 后缀 → 边缘缓存 30 天。不配的话默认缓存策略对图片不友好，回源次数会明显偏高。

**⑤ 只需要在 DNSPod 加一条 CNAME。** EdgeOne 会给一个加速域名，在 DNSPod 添加 `media` 的 CNAME 记录指向它即可。NS、备案、主域 A 记录全部不动。

### 3.4 DNS 现状提醒

`flows.xin` 与 `www` 是 A 记录指向服务器公网 IP（腾讯云轻量，上海），`media` 这条**不存在**。补记录时只加 `media`，不要动另外两条。

---

## 4. 验证

### 4.1 解析

```bash
nslookup -type=CNAME media.flows.xin 223.5.5.5
nslookup -type=CNAME media.flows.xin 119.29.29.29
```

两个解析器都应返回 EdgeOne 的 CNAME 目标。

### 4.2 内容与缓存

```bash
# 换成一个真实存在的 key
IMG=https://media.flows.xin/posts/<时间戳>-<uuid>.webp

# 状态码、Content-Type、缓存头
curl -sSI "$IMG" | head -20

# 首次 vs 二次：看 TTFB 是否下降（命中缓存后应显著变快）
for i in 1 2; do
  curl -o /dev/null -sS -w "第 $i 次  ttfb=%{time_starttransfer}s  total=%{time_total}s\n" "$IMG"
done
```

期望：`200`、`Content-Type: image/webp`、二次请求 TTFB 明显低于首次。缓存命中字段名随 EdgeOne 版本变化（`X-Cache-*` 系列），以实际响应头为准。

### 4.3 端到端

1. 后台上传一张图：应先看到「签发 → 直传」两步（浏览器开发者工具的 Network 里依次是 `POST /api/upload/presign` 和一条发往 `r2.cloudflarestorage.com` 的 `PUT`）
2. 返回的 URL 应为 `https://media.flows.xin/posts/<时间戳>-<uuid>.<ext>`
3. 直接打开该 URL，能显示；把扩展名前的部分加上 `.orig.`，原图地址也应能打开
4. 文章页能显示并被重写成 `/api/post-image?src=...`；点开图片有原图浮层

**若第 1 步的 `PUT` 失败且服务器日志无记录**，几乎一定是 2.1 的 CORS 没配或 `AllowedOrigins` 少了实际访问的域名。

> **注意**：应用服务器必须能解析并访问 `media.flows.xin`。图片走服务端代理，访客能否解析这个域名反而不重要。

---

## 5. 切换与迁移

1. 在 EdgeOne 添加 `media.flows.xin` 加速域名，按 3.2 配好，拿到 CNAME 目标。
2. 在 DNSPod 添加 `media` 的 CNAME 记录。
3. 用第 4 节验证通过后，再动其它部分。
4. 当前代码不会读取或写入 Supabase Storage。若数据库中还存在旧 Supabase 图片 URL，应先移除对应文章图片节点，并将带文字说明的图片碎片转为文字碎片；无文字说明的旧图片碎片可以删除。
5. 确认数据库不再引用旧 URL 后，删除旧 Supabase bucket 中的对象和 bucket 本身。当前站点已于 2026-07-27 完成这一步；不要重新创建 `post-images` bucket。

回退：删除 DNSPod 那条 CNAME，EdgeOne 侧保留配置不动。R2 对象不受影响，不要在未确认数据库引用前删除 R2 对象。

若要迁到腾讯云 COS（境内源站，回源彻底不跨境），对象 key 结构 `posts/xxx` 可原样保留，正文 URL 一个字都不用改，只需换源站——这一步现在不做。

---

## 6. 遗留问题

**① 访客侧带宽仍是瓶颈。**  
`/api/post-image` 代理没变，图片字节仍从应用服务器出。2 核 2G 轻量服务器常见出网带宽 3–6 Mbps（约 375–750 KB/s），一篇 5 图、共 1 MB 的文章，仅传输就要 1.4–2.7 秒，三人并发即开始排队。

这与图床放在 R2 还是 COS 无关。改善方式是把代理从「服务端转发」改成「302 跳转到原图」，让浏览器直连图床、服务器只出一条几十字节的响应。改动约十行，可随时回滚。**先用真实文章量测一次首屏，再决定做不做。**

**② EdgeOne 免费版对纯图片域名有条款风险。**  
官方免费版说明原文列的是「不提供视频或大型文件业务，包括**高比例图片**、音视频、游戏安装包」，未订阅付费「保留暂停或限制访问权限的权利」。`media.flows.xin` 是纯图片域，正好落在这一条。实际执行是软性的，个人博客普遍这么跑，但不构成保证。若被限流或图片量显著上升，迁移到 COS 是下一个动作。

**③ 缓存未命中时仍是跨境回源。**  
R2 在境外，EdgeOne 官方说明「加速区域为中国大陆时，源站位于境外将无法保障回源效果」。命中缓存后无此问题；冷启动或大量新增图片时首字节会慢。
