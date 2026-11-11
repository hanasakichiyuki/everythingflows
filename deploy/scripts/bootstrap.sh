#!/usr/bin/env bash
#
# 万物流转 · 服务器一次性初始化（幂等，可重复执行）
#
# 用法：
#   scp deploy/scripts/bootstrap.sh root@<服务器IP>:/root/
#   ssh root@<服务器IP> 'bash /root/bootstrap.sh'
#
# 做的事（对应 deploy/README.md 第一节）：
#   1. 基础包、时区
#   2. 4G swap + swappiness
#   3. deploy 用户与 /srv/everythingflows 目录
#   4. sudoers（只放开 flows 这一个 unit）
#   5. Node 22（NodeSource）与 Nginx
#   6. /etc/everythingflows/env.production 模板
#   7. systemd unit
#   8. Nginx 引导配置（仅 80 端口，供 ACME 签发用）
#
# 设计原则：
#   - 重复执行安全：任何一步已满足就跳过，不覆盖已有配置和密钥。
#   - 不做不可逆操作：不删用户、不重建已有 swap、不动已有 env 文件。
#   - 结束时打印"接下来要做什么"，不在脚本里做需要人工判断的事。
#
# 注意：本脚本内嵌了 flows.service / sudoers / nginx 引导配置的副本。
# 若 deploy/ 下对应文件有改动，记得同步这里（脚本会提示比对）。

set -euo pipefail

APP_USER="deploy"
APP_ROOT="/srv/everythingflows"
ETC_DIR="/etc/everythingflows"
SWAP_FILE="/swapfile"
SWAP_SIZE="4G"
NODE_MAJOR="22"
ACME_WEBROOT="/var/www/html"
NGINX_CONF="/etc/nginx/conf.d/flows.conf"
UNIT_FILE="/etc/systemd/system/flows.service"
SUDOERS_FILE="/etc/sudoers.d/flows-deploy"
ENV_FILE="${ETC_DIR}/env.production"

C_OK="\033[32m"; C_WARN="\033[33m"; C_ERR="\033[31m"; C_DIM="\033[2m"; C_OFF="\033[0m"
step() { printf "\n${C_OK}==>${C_OFF} %s\n" "$*"; }
info() { printf "    %s\n" "$*"; }
warn() { printf "${C_WARN}    ! %s${C_OFF}\n" "$*"; }
die()  { printf "\n${C_ERR}错误: %s${C_OFF}\n" "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 0. 前置检查

[ "$(id -u)" -eq 0 ] || die "请用 root 执行：sudo bash $0"

[ -r /etc/os-release ] || die "无法识别系统版本"
# shellcheck disable=SC1091
. /etc/os-release
if [ "${ID:-}" != "ubuntu" ] && [ "${ID:-}" != "debian" ]; then
  warn "本脚本在 Ubuntu 22.04 / Debian 12 上验证；当前为 ${PRETTY_NAME:-未知}，继续但请留意差异"
fi

MEM_MB=$(awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo)
info "系统：${PRETTY_NAME:-unknown}  内存：${MEM_MB}MB  架构：$(uname -m)"
if [ "${MEM_MB}" -lt 1900 ]; then
  warn "内存低于 2G，Next 进程可能反复触发 MemoryMax，建议升配"
fi

export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------- 1. 基础包

step "1/8 基础包与时区"

apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg lsb-release rsync >/dev/null

if [ "$(timedatectl show -p Timezone --value 2>/dev/null || echo '')" != "Asia/Shanghai" ]; then
  timedatectl set-timezone Asia/Shanghai 2>/dev/null || ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
  info "时区已设为 Asia/Shanghai"
else
  info "时区已是 Asia/Shanghai"
fi

# ---------------------------------------------------------------- 2. swap

step "2/8 swap（${SWAP_SIZE}）"

if grep -qE "^${SWAP_FILE}\s" /proc/swaps 2>/dev/null; then
  # /proc/swaps 的 Size 列单位是 KB，且字段格式比 swapon --show 稳定，不依赖 util-linux 版本
  info "${SWAP_FILE} 已启用，跳过：$(awk -v f="${SWAP_FILE}" '$1==f{printf "%dMB", $3/1024}' /proc/swaps)"
else
  if [ -f "${SWAP_FILE}" ]; then
    info "${SWAP_FILE} 已存在但未启用，直接启用"
  else
    info "创建 ${SWAP_SIZE} 交换文件"
    fallocate -l "${SWAP_SIZE}" "${SWAP_FILE}" 2>/dev/null \
      || dd if=/dev/zero of="${SWAP_FILE}" bs=1M count=4096 status=none
    chmod 600 "${SWAP_FILE}"
    mkswap "${SWAP_FILE}" >/dev/null
  fi
  swapon "${SWAP_FILE}"
fi

grep -q "^${SWAP_FILE}" /etc/fstab || echo "${SWAP_FILE} none swap sw 0 0" >> /etc/fstab

cat > /etc/sysctl.d/99-flows.conf <<'EOF'
vm.swappiness = 10
vm.vfs_cache_pressure = 50
EOF
sysctl -q --system

info "swap: $(free -m | awk '/Swap/{print $2"MB"}')   swappiness: $(cat /proc/sys/vm/swappiness)"

# ---------------------------------------------------------------- 3. 用户与目录

step "3/8 deploy 用户与目录"

if id -u "${APP_USER}" >/dev/null 2>&1; then
  info "用户 ${APP_USER} 已存在"
else
  adduser --disabled-password --gecos "" "${APP_USER}" >/dev/null
  info "已创建用户 ${APP_USER}（禁用密码登录，仅密钥）"
fi

install -d -m 700 -o "${APP_USER}" -g "${APP_USER}" "/home/${APP_USER}/.ssh"
if [ ! -f "/home/${APP_USER}/.ssh/authorized_keys" ]; then
  touch "/home/${APP_USER}/.ssh/authorized_keys"
  chown "${APP_USER}:${APP_USER}" "/home/${APP_USER}/.ssh/authorized_keys"
  chmod 600 "/home/${APP_USER}/.ssh/authorized_keys"
  warn "authorized_keys 为空，请把 CI 部署公钥追加进去"
fi

# APP_ROOT 必须归 deploy 所有：activate-release.sh 要在这一层创建/替换 current 软链
# （ln -sfn "${RELEASE_DIR}" /srv/everythingflows/current），
# 目录若是 root:root 755，deploy 建软链会直接 Permission denied，首个部署必失败。
install -d -m 755 -o "${APP_USER}" -g "${APP_USER}" "${APP_ROOT}"
install -d -m 755 -o "${APP_USER}" -g "${APP_USER}" "${APP_ROOT}/releases"
install -d -m 700 "${ETC_DIR}"
install -d -m 755 "${ACME_WEBROOT}"

info "${APP_ROOT}/releases  $(stat -c '%U:%G %a' "${APP_ROOT}/releases")"
info "${ETC_DIR}            $(stat -c '%U:%G %a' "${ETC_DIR}")"

# ---------------------------------------------------------------- 4. sudoers

step "4/8 sudoers（最小权限）"

TMP_SUDOERS="$(mktemp)"
cat > "${TMP_SUDOERS}" <<'EOF'
# 万物流转 · 部署用户的最小 sudo 权限
# 只放开 flows 这一个 unit 的重启与状态查看，以及它的日志读取。
# 不要改成 `deploy ALL=(ALL) NOPASSWD: ALL` —— 那等于把 root 交给 CI。

deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart flows
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl status flows
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl status flows *
deploy ALL=(root) NOPASSWD: /usr/bin/journalctl -u flows *
EOF

if ! visudo -cf "${TMP_SUDOERS}" >/dev/null 2>&1; then
  rm -f "${TMP_SUDOERS}"
  die "sudoers 语法校验失败，未安装"
fi

if [ -f "${SUDOERS_FILE}" ] && cmp -s "${TMP_SUDOERS}" "${SUDOERS_FILE}"; then
  info "sudoers 已是目标内容，跳过"
  rm -f "${TMP_SUDOERS}"
else
  install -m 440 -o root -g root "${TMP_SUDOERS}" "${SUDOERS_FILE}"
  rm -f "${TMP_SUDOERS}"
  info "已安装 ${SUDOERS_FILE}（440）并通过 visudo 校验"
fi

# ---------------------------------------------------------------- 5. Node 与 Nginx

step "5/8 Node ${NODE_MAJOR} 与 Nginx"

if command -v node >/dev/null 2>&1 && node -v | grep -q "^v${NODE_MAJOR}\."; then
  info "Node $(node -v) 已安装，跳过"
else
  info "通过 NodeSource 安装 Node ${NODE_MAJOR}.x"
  # 只吞 stdout，保留 stderr：NodeSource 的 GPG 报错要能看见，否则只得到一句"失败"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null \
    || die "NodeSource 仓库配置失败（检查网络或代理）"
  apt-get install -y -qq nodejs >/dev/null
  info "已安装 Node $(node -v) / npm $(npm -v)"
fi

if ! command -v node >/dev/null 2>&1; then
  die "Node 安装后仍不可用，请检查 PATH"
fi

if command -v nginx >/dev/null 2>&1; then
  info "Nginx $(nginx -v 2>&1 | sed 's|.*/||') 已安装，跳过"
else
  apt-get install -y -qq nginx >/dev/null
  info "已安装 Nginx $(nginx -v 2>&1 | sed 's|.*/||')"
fi

# ---------------------------------------------------------------- 6. 环境变量模板

step "6/8 运行期环境变量"

if [ -f "${ENV_FILE}" ]; then
  info "${ENV_FILE} 已存在，不覆盖（避免冲掉密钥）"
  EMPTY_KEYS=$(grep -cE '^[A-Z_]+=$' "${ENV_FILE}" || true)
  if [ "${EMPTY_KEYS}" -gt 0 ]; then
    warn "仍有 ${EMPTY_KEYS} 个键为空，部署前必须填完："
    grep -E '^[A-Z_]+=$' "${ENV_FILE}" | cut -d= -f1 | sed 's/^/      /'
  fi
else
  cat > "${ENV_FILE}" <<'EOF'
# 万物流转 · 生产环境变量
# 权限 600、属主 deploy。填完再部署，留空的项会让对应功能 500/503。

# ---- Supabase（数据库与鉴权，沿用现有值）----
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ---- 站点 ----
NEXT_PUBLIC_SITE_URL=https://flows.xin

# ---- Upstash（生产环境硬依赖，不配则 /chat 对所有人 503）----
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ---- Cloudflare R2（图片，经 EdgeOne 对外）----
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=

# ---- AI（至少配一个境内可直连的 provider）----
# 智谱 / DeepSeek 在大陆可直连；Gemini / OpenAI / Anthropic 直连会超时
ZHIPU_API_KEY=
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
EOF
  chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
  info "已生成模板 ${ENV_FILE}（600 deploy:deploy）"
  warn "现在必须填完里面的空值，否则首个 release 起不来"
fi

# ---------------------------------------------------------------- 7. systemd

step "7/8 systemd unit"

# 与 deploy/systemd/flows.service 保持一致；改一处要同步另一处。
NEW_UNIT="$(mktemp)"
cat > "${NEW_UNIT}" <<'EOF'
[Unit]
Description=Everything Flows (Next.js standalone)
Documentation=https://github.com/hanasakichiyuki/everythingflows
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=deploy
Group=deploy

WorkingDirectory=/srv/everythingflows/current

EnvironmentFile=/etc/everythingflows/env.production

Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
Environment=NODE_OPTIONS=--max-old-space-size=640

ExecStart=/usr/bin/node server.js

Restart=always
RestartSec=3

KillSignal=SIGTERM
TimeoutStopSec=20

MemoryHigh=800M
MemoryMax=1200M

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/srv/everythingflows/current

LimitNOFILE=16384

[Install]
WantedBy=multi-user.target
EOF

if [ -f "${UNIT_FILE}" ] && cmp -s "${NEW_UNIT}" "${UNIT_FILE}"; then
  info "unit 已是目标内容，跳过"
  rm -f "${NEW_UNIT}"
else
  [ -f "${UNIT_FILE}" ] && cp "${UNIT_FILE}" "${UNIT_FILE}.bak.$(date +%s)"
  install -m 644 "${NEW_UNIT}" "${UNIT_FILE}"
  rm -f "${NEW_UNIT}"
  systemctl daemon-reload
  info "已安装 ${UNIT_FILE}"
fi

# 只 enable，不 start —— 第一个 release 还没上线，此时启动必然失败
systemctl enable flows >/dev/null 2>&1 || true
info "已 enable flows（开机自启），当前未 start"

# ---------------------------------------------------------------- 8. Nginx 引导配置

step "8/8 Nginx 引导配置（仅 80 端口）"

# 关掉默认站点，否则它占用 80 并抢 server_name
if [ -e /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
  info "已移除 sites-enabled/default"
fi

# 引导期配置只监听 80：此时还没有证书，直接上 443 会 nginx -t 失败。
# 签完证书后，用 deploy/nginx/flows.conf 替换本文件。
BOOTSTRAP_CONF="$(mktemp)"
cat > "${BOOTSTRAP_CONF}" <<'EOF'
# 引导阶段配置（bootstrap.sh 生成）
# 只监听 80，放行 ACME 校验，其余返回占位文本。
# 证书签发完成后，替换为 deploy/nginx/flows.conf（含 443 与反代配置）。

server {
    listen 80;
    listen [::]:80;
    server_name flows.xin www.flows.xin;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        default_type "text/plain";
    }

    location = /healthz {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    location / {
        return 200 "bootstrap ok - waiting for first release and TLS certificate\n";
        add_header Content-Type text/plain;
    }
}
EOF

if [ -f "${NGINX_CONF}" ] && cmp -s "${BOOTSTRAP_CONF}" "${NGINX_CONF}"; then
  info "nginx 引导配置已是目标内容，跳过"
  rm -f "${BOOTSTRAP_CONF}"
else
  if [ -f "${NGINX_CONF}" ]; then
    # 已有配置可能是正式版（含 443），备份后不覆盖
    if grep -q "listen 443" "${NGINX_CONF}"; then
      info "检测到正式配置（含 443），保留不动"
      rm -f "${BOOTSTRAP_CONF}"
      BOOTSTRAP_CONF=""
    else
      cp "${NGINX_CONF}" "${NGINX_CONF}.bak.$(date +%s)"
    fi
  fi
  if [ -n "${BOOTSTRAP_CONF}" ]; then
    install -m 644 "${BOOTSTRAP_CONF}" "${NGINX_CONF}"
    rm -f "${BOOTSTRAP_CONF}"
    info "已安装引导配置 ${NGINX_CONF}"
  fi
fi

# 保留 nginx 自己的报错输出，配置有问题时能直接看到是哪一行
nginx -t || die "nginx -t 失败，配置有误，未 reload"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx 2>/dev/null || systemctl restart nginx
info "Nginx 配置校验通过并已 reload"

# 若启用了 ufw，补放行规则（不主动 enable，避免把 SSH 锁在外面）
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  info "ufw 已放行 22/80/443"
fi

# ---------------------------------------------------------------- 自检

step "自检"

printf "    %-22s %s\n" "Node"        "$(node -v)"
printf "    %-22s %s\n" "Nginx"       "$(nginx -v 2>&1 | sed 's|.*/||')"
printf "    %-22s %s\n" "swap"        "$(free -m | awk '/Swap/{print $2"MB"}')"
printf "    %-22s %s\n" "时区"        "$(timedatectl show -p Timezone --value 2>/dev/null || echo '?')"
printf "    %-22s %s\n" "deploy 用户" "$(id -u "${APP_USER}" >/dev/null 2>&1 && echo 存在 || echo 缺失)"
printf "    %-22s %s\n" "releases"    "$(ls -1 "${APP_ROOT}/releases" 2>/dev/null | wc -l) 个版本"
printf "    %-22s %s\n" "flows 服务"  "$(systemctl is-enabled flows 2>/dev/null || echo 未启用)/$(systemctl is-active flows 2>/dev/null || echo inactive)"
printf "    %-22s %s\n" "80 端口"     "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1/healthz || echo 无响应)"

# ---------------------------------------------------------------- 下一步

cat <<EOF

${C_OK}服务器地基完成。${C_OFF}接下来按顺序做：

  ${C_DIM}1.${C_OFF} 填环境变量（必须有值，否则首个 release 起不来）
       vi ${ENV_FILE}

  ${C_DIM}2.${C_OFF} 腾讯云控制台 → 轻量服务器 → 防火墙，放行 80 / 443
       （22 应已开放。3000 不要对公网开放：服务只监听 127.0.0.1）

  ${C_DIM}3.${C_OFF} 本地生成部署密钥，公钥追加到服务器
       ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./flows_deploy_key -N ""
       ssh root@<服务器IP> "cat >> /home/${APP_USER}/.ssh/authorized_keys" < ./flows_deploy_key.pub
       ssh root@<服务器IP> "chown ${APP_USER}:${APP_USER} /home/${APP_USER}/.ssh/authorized_keys && chmod 600 /home/${APP_USER}/.ssh/authorized_keys"
       ssh-keyscan -p 22 -t ed25519,rsa <服务器IP> > known_hosts

  ${C_DIM}4.${C_OFF} 配 GitHub Secrets：DEPLOY_HOST / PORT / USER / SSH_KEY / KNOWN_HOSTS
       加构建期三个：NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / R2_PUBLIC_BASE_URL

  ${C_DIM}5.${C_OFF} 推送代码触发首个 release，用 SSH 隧道在本地浏览器验收
       （服务只监听 127.0.0.1，公网打 IP:3000 连不上，也不需要开那个端口）
       ssh -N -L 3000:127.0.0.1:3000 ${APP_USER}@<服务器IP>
       然后本机打开 http://localhost:3000

  ${C_DIM}6.${C_OFF} 签证书（二选一），再替换正式 Nginx 配置
       acme.sh --issue -d flows.xin -d www.flows.xin --webroot ${ACME_WEBROOT}
       或：腾讯云控制台申请免费证书，放到 /etc/nginx/certs/
       然后：cp deploy/nginx/flows.conf ${NGINX_CONF} && nginx -t && systemctl reload nginx

  ${C_DIM}7.${C_OFF} DNSPod 把 A 记录切到本机 IP，观察冒烟

提示：本脚本内嵌了 flows.service / sudoers / nginx 引导配置的副本。
      deploy/ 下对应文件若有改动，记得同步本脚本。

EOF
