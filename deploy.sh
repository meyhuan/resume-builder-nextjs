#!/bin/bash
set -euo pipefail

APP_NAME="${APP_NAME:-aijianli-nextjs}"
LEGACY_DIR="${LEGACY_DIR:-/home/webapp/aijianli-nextjs/resume-builder-nextjs}"
RELEASE_ROOT="${RELEASE_ROOT:-/home/releases/aijianli-nextjs}"
RELEASE_ID="${RELEASE_ID:-$(date +%Y%m%d-%H%M%S)}"
PACKAGE_PATH="${PACKAGE_PATH:-$RELEASE_ROOT/.incoming/$RELEASE_ID.zip}"
CURRENT_LINK="$RELEASE_ROOT/current"
RELEASE_DIR="$RELEASE_ROOT/$RELEASE_ID"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

PREV_TARGET=""

deploy_paths=(
  ".next"
  "public"
  "prisma"
  "package.json"
  "pnpm-lock.yaml"
  "pnpm-workspace.yaml"
  "next.config.ts"
  "next.config.mjs"
  "next.config.js"
  "RELEASE"
)

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

extract_zip() {
  local package_path="$1"
  local target_dir="$2"

  PACKAGE_PATH="$package_path" TARGET_DIR="$target_dir" python3 - <<'PY'
import os
import pathlib
import zipfile

package_path = pathlib.Path(os.environ["PACKAGE_PATH"])
target_dir = pathlib.Path(os.environ["TARGET_DIR"])

with zipfile.ZipFile(package_path, "r") as archive:
    for member in archive.infolist():
        normalized_name = member.filename.replace("\\", "/")
        if not normalized_name:
            continue
        pure_path = pathlib.PurePosixPath(normalized_name)
        if normalized_name.startswith("/") or ".." in pure_path.parts:
            raise RuntimeError(f"unsafe zip member: {member.filename}")
        if normalized_name.endswith("/"):
            (target_dir / normalized_name).mkdir(parents=True, exist_ok=True)
            continue
        destination = target_dir / normalized_name
        destination.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(member, "r") as source, open(destination, "wb") as output:
            output.write(source.read())
PY
}

capture_legacy_baseline() {
  if [ -n "$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)" ]; then
    return
  fi

  if [ -e "$LEGACY_DIR" ] && [ ! -L "$LEGACY_DIR" ]; then
    local baseline_dir="$RELEASE_ROOT/legacy-before-$(date +%Y%m%d-%H%M%S)"
    echo "Capturing existing app directory as baseline: $baseline_dir"
    cp -a "$LEGACY_DIR" "$baseline_dir"
    ln -sfn "$baseline_dir" "$CURRENT_LINK"
  fi
}

copy_runtime_env() {
  local source_dir=""

  if [ -e "$CURRENT_LINK" ]; then
    source_dir="$CURRENT_LINK"
  elif [ -e "$LEGACY_DIR" ]; then
    source_dir="$LEGACY_DIR"
  fi

  if [ -z "$source_dir" ]; then
    return
  fi

  for file in .env .env.local .env.production .env.production.local; do
    if [ -f "$source_dir/$file" ] && [ ! -f "$RELEASE_DIR/$file" ]; then
      cp -a "$source_dir/$file" "$RELEASE_DIR/$file"
    fi
  done
}

point_legacy_dir_to_current() {
  mkdir -p "$(dirname "$LEGACY_DIR")"

  if [ -e "$LEGACY_DIR" ] && [ ! -L "$LEGACY_DIR" ]; then
    local backup_dir="$LEGACY_DIR.pre-releases.$(date +%Y%m%d-%H%M%S)"
    echo "Moving legacy directory to $backup_dir"
    mv "$LEGACY_DIR" "$backup_dir"
  fi

  ln -sfn "$CURRENT_LINK" "$LEGACY_DIR"
}

restart_app() {
  pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
  cd "$LEGACY_DIR"
  pm2 start pnpm --name "$APP_NAME" -- run start
  pm2 save
}

health_check() {
  local url="$1"
  local attempts="${2:-20}"
  local delay="${3:-2}"

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS -o /dev/null --max-time 5 "$url"; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

rollback() {
  if [ -z "$PREV_TARGET" ] || [ ! -d "$PREV_TARGET" ]; then
    fail "health check failed and no previous release is available"
  fi

  echo "Health check failed. Rolling back to $PREV_TARGET"
  ln -sfn "$PREV_TARGET" "$CURRENT_LINK"
  point_legacy_dir_to_current
  restart_app
  health_check "$HEALTH_URL" 20 2 || fail "rollback health check failed"
  fail "deploy failed; rollback completed"
}

cleanup_old_releases() {
  local current_target
  current_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

  find "$RELEASE_ROOT" -mindepth 1 -maxdepth 1 -type d ! -name ".incoming" -printf "%T@ %p\n" |
    sort -rn |
    awk -v keep="$KEEP_RELEASES" -v current="$current_target" '
      $2 == current { next }
      seen++ >= keep { print $2 }
    ' |
    while IFS= read -r old_dir; do
      if [ -n "$old_dir" ] && [ "$old_dir" != "$current_target" ]; then
        rm -rf "$old_dir"
      fi
    done
}

mkdir -p "$RELEASE_ROOT" "$(dirname "$PACKAGE_PATH")"

[ -f "$PACKAGE_PATH" ] || fail "missing package: $PACKAGE_PATH"

echo "Deploying $APP_NAME release $RELEASE_ID"
capture_legacy_baseline
PREV_TARGET="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
extract_zip "$PACKAGE_PATH" "$RELEASE_DIR"
copy_runtime_env

cd "$RELEASE_DIR"
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec prisma generate

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
point_legacy_dir_to_current

restart_app

if ! health_check "$HEALTH_URL" 20 2; then
  rollback
fi

rm -f "$PACKAGE_PATH"
cleanup_old_releases

echo "Deploy completed: $RELEASE_DIR"
