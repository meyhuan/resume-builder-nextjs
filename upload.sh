#!/bin/bash
# ==========================================
# Next.js 本地打包与上传部署脚本 (Git Bash / WSL)
# 用法:
#   ./upload.sh              # 构建 + 打包 + 上传 + 远端执行
#   ./upload.sh --skip-build # 跳过构建，直接打包上传
#   ./upload.sh --remote-only # 仅上传 deploy.sh 并远端执行（不打包）
# ==========================================

set -e

# Ensure Windows Node.js and pnpm are available in Git Bash
export PATH="/d/Soft/nodejs:/c/Users/62765/AppData/Roaming/npm:$PATH"

SERVER_IP="47.120.35.34"
SERVER_USER="root"
SERVER_DIR="/home/webapp/aijianli-nextjs/resume-builder-nextjs"

SKIP_BUILD=false
REMOTE_ONLY=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --remote-only) REMOTE_ONLY=true ;;
  esac
done

if [ "$REMOTE_ONLY" = false ]; then
  if [ "$SKIP_BUILD" = false ]; then
    echo "[1/3] Building..."
    pnpm run build
    echo "[1/3] Build done."
  else
    echo "[1/3] Skipping build."
  fi

  echo "[2/3] Packaging..."
  rm -f deploy.zip
  STAGE=$(mktemp -d)
  cp -r .next "$STAGE/.next"
  # Remove cache to keep zip small
  rm -rf "$STAGE/.next/cache"
  cp -r public "$STAGE/public"
  cp -r prisma "$STAGE/prisma"
  cp package.json pnpm-lock.yaml next.config.ts "$STAGE/"
  DEPLOY_ZIP="$(pwd)/deploy.zip"
  STAGE_WIN=$(cygpath -w "$STAGE")
  DEST_WIN=$(cygpath -w "$DEPLOY_ZIP")
  powershell.exe -NoProfile -Command "Compress-Archive -Path '$STAGE_WIN\*' -DestinationPath '$DEST_WIN' -Force"
  rm -rf "$STAGE"
  echo "[2/3] Packaged: $DEPLOY_ZIP"

  echo "[3/3] Uploading deploy.zip..."
  scp "$DEPLOY_ZIP" "${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}/deploy.zip"
  echo "[3/3] Upload done."
fi

if [ "$REMOTE_ONLY" = true ]; then
  echo "Uploading deploy.sh..."
  scp deploy.sh "${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}/deploy.sh"
fi

echo "Running remote deploy..."
ssh "${SERVER_USER}@${SERVER_IP}" \
  "sed -i 's/\r\$//' ${SERVER_DIR}/deploy.sh && chmod +x ${SERVER_DIR}/deploy.sh && bash -x ${SERVER_DIR}/deploy.sh"

echo "Done."
