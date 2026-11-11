#!/usr/bin/env bash
#
# 在服务器上激活一个已上传到 /tmp 的 release 包。
# 由 .github/workflows/deploy.yml 远程调用，也可以手工执行。
#
# 用法：
#   bash activate-release.sh <git-sha> [bundle-path]
#
# 行为：
#   1. 解压到 releases/<sha>/
#   2. 把 current 软链指向新目录
#   3. 重启 systemd 服务 flows
#   4. 冒烟检查 127.0.0.1:3000，失败则自动回滚到上一个 release
#   5. 清理旧 release，只保留最近 KEEP_RELEASES 个
#
set -euo pipefail

SHA="${1:?用法: activate-release.sh <git-sha> [bundle-path]}"
BUNDLE="${2:-/tmp/flows-${SHA}.tar.gz}"

APP_ROOT="/srv/everythingflows"
RELEASES_DIR="${APP_ROOT}/releases"
RELEASE_DIR="${RELEASES_DIR}/${SHA}"
CURRENT_LINK="${APP_ROOT}/current"
SERVICE="flows"
HEALTH_URL="http://127.0.0.1:3000/"
KEEP_RELEASES=5

log()  { printf '[deploy] %s\n' "$*"; }
fail() { printf '[deploy] 错误: %s\n' "$*" >&2; }

[ -f "${BUNDLE}" ] || { fail "找不到部署包: ${BUNDLE}"; exit 1; }

mkdir -p "${RELEASES_DIR}"

if [ -d "${RELEASE_DIR}" ]; then
  log "release 目录已存在，先清空: ${RELEASE_DIR}"
  rm -rf -- "${RELEASE_DIR}"
fi
mkdir -p "${RELEASE_DIR}"

log "解压 ${BUNDLE} -> ${RELEASE_DIR}"
tar -xzf "${BUNDLE}" -C "${RELEASE_DIR}"

if [ ! -f "${RELEASE_DIR}/server.js" ]; then
  fail "产物缺少 server.js，可能是打包环节出错"
  rm -rf -- "${RELEASE_DIR}"
  exit 1
fi

# 记录当前指向，供回滚使用
PREVIOUS=""
if [ -L "${CURRENT_LINK}" ]; then
  PREVIOUS="$(readlink -f "${CURRENT_LINK}")"
fi

log "切换软链 -> ${RELEASE_DIR}"
ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

log "重启服务 ${SERVICE}"
sudo systemctl restart "${SERVICE}"

# 冒烟检查：最多等 30 秒
log "冒烟检查 ${HEALTH_URL}"
healthy=0
for _ in $(seq 1 15); do
  if curl -sf -o /dev/null --max-time 5 "${HEALTH_URL}"; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "${healthy}" -ne 1 ]; then
  fail "冒烟检查失败，准备回滚"
  log "--- systemctl status ---"
  sudo systemctl status "${SERVICE}" --no-pager -l | tail -n 30 >&2 || true
  log "--- 最近日志 ---"
  sudo journalctl -u "${SERVICE}" -n 50 --no-pager >&2 || true

  if [ -n "${PREVIOUS}" ] && [ -d "${PREVIOUS}" ]; then
    log "回滚: current -> ${PREVIOUS}"
    ln -sfn "${PREVIOUS}" "${CURRENT_LINK}"
    sudo systemctl restart "${SERVICE}"
    fail "已回滚到 ${PREVIOUS}，本次部署失败"
  else
    fail "没有可回滚的上一个 release，请人工介入"
  fi
  exit 1
fi

log "冒烟检查通过"

# 清理旧 release，避免磁盘被历史版本堆满
cd "${RELEASES_DIR}"
ls -1dt -- */ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
  log "清理旧 release: ${old}"
  rm -rf -- "${RELEASES_DIR}/${old}"
done

rm -f -- "${BUNDLE}"

log "完成: ${SHA}"
log "如需回滚: ln -sfn ${PREVIOUS:-<上一个 release>} ${CURRENT_LINK} && sudo systemctl restart ${SERVICE}"
