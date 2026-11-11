#!/usr/bin/env bash
#
# 首次签发 Let's Encrypt 证书，并把 Nginx 从「bootstrap 引导配置」切换到正式站点配置。
#
# 用法（必须 root）：
#   sudo bash /tmp/setup-tls.sh you@example.com
#
# 幂等：证书已存在则跳过签发；配置会先备份再覆盖，nginx -t 失败自动回滚。
#
# 前置：/tmp/flows.conf.new 已存在（由部署方 scp 上去，即仓库 deploy/nginx/flows.conf）。

set -euo pipefail

DOMAIN="flows.xin"
ALT="www.flows.xin"
WEBROOT="/var/www/html"
CERT_DIR="/etc/nginx/certs"
LE_LIVE="/etc/letsencrypt/live/${DOMAIN}"
CONF_NEW="/tmp/flows.conf.new"
CONF_DST="/etc/nginx/conf.d/flows.conf"
EMAIL="${1:-}"

[ "$(id -u)" -eq 0 ] || { echo "请用 sudo 执行" >&2; exit 1; }
[ -f "${CONF_NEW}" ] || { echo "缺少 ${CONF_NEW}，先从仓库 scp 上去" >&2; exit 1; }
if [ -z "${EMAIL}" ]; then
  echo "用法: sudo bash $0 you@example.com" >&2
  exit 1
fi

echo "==> 1/5 安装 certbot"
if ! command -v certbot >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y certbot
fi
certbot --version

echo "==> 2/5 准备 ACME webroot"
install -d -m 755 "${WEBROOT}/.well-known/acme-challenge"

echo "==> 3/5 签发证书"
if [ -f "${LE_LIVE}/fullchain.pem" ]; then
  echo "    证书已存在，跳过签发（需要重签请先 certbot delete --cert-name ${DOMAIN}）"
else
  # --webroot：校验文件落到 /var/www/html，由 80 端口 server 块的 ACME location 提供。
  # 不要用 --nginx，那会去改我们手写的配置。
  certbot certonly \
    --webroot -w "${WEBROOT}" \
    -d "${DOMAIN}" -d "${ALT}" \
    --email "${EMAIL}" --agree-tos --no-eff-email \
    --non-interactive
fi

echo "==> 4/5 建立固定路径的证书软链"
# 站点配置里写死 /etc/nginx/certs/flows.xin.{pem,key}；
# 软链指向 letsencrypt/live/，续期后路径不变，无需再次改配置。
install -d -m 755 "${CERT_DIR}"
ln -sfn "${LE_LIVE}/fullchain.pem" "${CERT_DIR}/${DOMAIN}.pem"
ln -sfn "${LE_LIVE}/privkey.pem" "${CERT_DIR}/${DOMAIN}.key"
ls -l "${CERT_DIR}"

echo "==> 5/5 安装站点配置并 reload"
if [ -f "${CONF_DST}" ]; then
  BAK="${CONF_DST}.bak.$(date +%Y%m%d%H%M%S)"
  cp -a "${CONF_DST}" "${BAK}"
  echo "    已备份原配置 -> ${BAK}"
fi
install -m 644 "${CONF_NEW}" "${CONF_DST}"

if ! nginx -t; then
  echo "配置校验失败，回滚到原配置" >&2
  LATEST=$(ls -t "${CONF_DST}".bak.* 2>/dev/null | head -1 || true)
  if [ -n "${LATEST}" ]; then
    cp -a "${LATEST}" "${CONF_DST}"
    nginx -t && systemctl reload nginx
  fi
  exit 1
fi
systemctl reload nginx

# 续期后自动 reload，否则新证书不会被加载
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/bin/sh
systemctl reload nginx
HOOK
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

systemctl enable --now certbot.timer >/dev/null 2>&1 || true
systemctl list-timers certbot.timer --no-pager 2>/dev/null | head -3 || true

echo
echo "完成。验证："
echo "  curl -I https://${DOMAIN}/"
echo "  curl -I https://${ALT}/   （应 301 到 apex）"
