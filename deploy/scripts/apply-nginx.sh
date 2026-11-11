#!/usr/bin/env bash
#
# 把仓库里的 deploy/nginx/flows.conf 应用到线上，带校验与自动回滚。
#
# 用法（必须 root）：
#   scp deploy/nginx/flows.conf deploy@<host>:/tmp/flows.conf.new
#   sudo bash /tmp/apply-nginx.sh
#
# 与 setup-tls.sh 的区别：那个只在首次签证书时用一次（含装 certbot、切配置）；
# 这个纯粹是「改完配置后安全生效」，日常改 nginx 都用它。
#
# 行为：备份 → 安装 → nginx -t → 成功 reload / 失败还原并保持旧配置在跑。

set -euo pipefail

SRC="${1:-/tmp/flows.conf.new}"
DST="/etc/nginx/conf.d/flows.conf"
NGINX="/usr/sbin/nginx"

[ "$(id -u)" -eq 0 ] || { echo "请用 sudo 执行" >&2; exit 1; }
[ -f "$SRC" ] || { echo "缺少 $SRC，先 scp 上去" >&2; exit 1; }

BAK="${DST}.bak.$(date +%s)"
cp -a "$DST" "$BAK"
echo "已备份旧配置 → $BAK"

install -m 644 "$SRC" "$DST"

if "$NGINX" -t 2>&1; then
  systemctl reload nginx
  echo "已生效"
else
  cp -a "$BAK" "$DST"
  echo "校验失败，已回滚；nginx 仍在跑旧配置" >&2
  exit 1
fi
