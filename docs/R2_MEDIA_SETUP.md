# R2 图片存储配置

项目的文章编辑器和碎片墙图片均只使用 Cloudflare R2；Supabase 继续保存文章、碎片、认证等业务数据，不再承担图片对象存储。

## 一次性配置

在部署平台和本地开发环境中设置以下变量。密钥只能放在服务端环境变量中，绝不能以 `NEXT_PUBLIC_` 开头，也不要提交到仓库。

| 变量 | 用途 |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare 账户 ID |
| `R2_ACCESS_KEY_ID` | R2 API Token 的 Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API Token 的 Secret Access Key |
| `R2_BUCKET` | 已创建的 R2 bucket 名称 |
| `R2_PUBLIC_BASE_URL` | 已绑定 bucket 的 HTTPS 公共域名，例如 `https://media.example.com` |

R2 API Token 至少需要该 bucket 的 **Object Read & Write** 权限。建议将 `R2_PUBLIC_BASE_URL` 配成自定义域名；开发阶段也可使用 R2 的公开开发域名，但不要将其作为长期生产域名。

## 对象约定

- 新上传对象的 key：`posts/<时间戳>-<uuid>.<扩展名>`。
- 仅接受 JPEG、PNG、GIF、WebP，单文件最大 5 MB。
- 上传对象带一年不可变缓存；文章页面通过同源 `/api/post-image` 读取，避免客户端代理/DNS 对 R2 公共域名造成干扰。
- 更新或删除文章、碎片时，只删除 `R2_PUBLIC_BASE_URL` 下 `posts/` 前缀的对象；外部 URL 永远不会被删除。

## 切换与迁移

1. 在 Cloudflare 为 bucket 绑定 HTTPS 公共域名，并先确认该域名可直接打开一张测试图片。
2. 配置以上五个变量，重启开发或部署环境。
3. 在后台上传一张图片：返回 URL 应为 `R2_PUBLIC_BASE_URL/posts/...`，并能在文章和碎片墙显示。
4. 当前代码不会读取或写入 Supabase Storage。若数据库中还存在旧 Supabase 图片 URL，应先移除对应文章图片节点，并将带文字说明的图片碎片转为文字碎片；无文字说明的旧图片碎片可以删除。
5. 确认数据库不再引用旧 URL 后，删除旧 Supabase bucket 中的对象和 bucket 本身。当前站点已于 2026-07-27 完成这一步；不要重新创建 `post-images` bucket。

回退只需撤销本次代码变更；不要在未确认数据库引用前删除 R2 对象。
