#!/bin/bash
set -e

SERVER_DIR="/home/webapp/aijianli-nextjs/resume-builder-nextjs"

trap 'echo "❌ 部署失败，出错行号: $LINENO"' ERR

cd "$SERVER_DIR"

echo "[1/4] 📦 解压部署包..."
python3 - <<'PY'
import pathlib
import zipfile

target_dir = pathlib.Path(".")
with zipfile.ZipFile("deploy.zip", "r") as archive:
    for member in archive.infolist():
        normalized_name = member.filename.replace('\\', '/')
        if not normalized_name:
            continue
        destination = target_dir / normalized_name
        if normalized_name.endswith('/'):
            destination.mkdir(parents=True, exist_ok=True)
            continue
        destination.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(member, 'r') as source, open(destination, 'wb') as output:
            output.write(source.read())
PY
rm -f deploy.zip

echo "[2/4] 📦 安装生产依赖..."
pnpm install --no-frozen-lockfile --ignore-scripts

echo "[3/4] 🔧 生成 Prisma Client..."
pnpm exec prisma generate

echo "[4/4] 🔄 重启服务..."
pm2 restart aijianli-nextjs || pm2 start pnpm --name "aijianli-nextjs" -- run start
pm2 save

echo "✅ 部署完成！"
