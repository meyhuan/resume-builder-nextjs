# ==========================================
# Next.js 自动化本地打包与上传部署脚本 (Windows)
# ==========================================

# 服务器配置
$SERVER_IP = "47.120.35.34"
$SERVER_USER = "root"
$SERVER_DIR = "/home/webapp/aijianli-nextjs/resume-builder-nextjs"

Write-Host "🚀 开始进行本地构建..." -ForegroundColor Cyan
pnpm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败！请检查错误信息。" -ForegroundColor Red
    exit
}
Write-Host "✅ 构建成功！" -ForegroundColor Green

Write-Host "📦 准备打包需要上传的文件..." -ForegroundColor Cyan
# 每次打包前先清理旧包
if (Test-Path "deploy.zip") {
    Remove-Item "deploy.zip" -Force
}

# 压缩必要的文件和文件夹
Compress-Archive -Path ".next", "public", "prisma", "package.json", "next.config.ts" -DestinationPath "deploy.zip" -Force

Write-Host "✅ 打包完成：deploy.zip" -ForegroundColor Green

Write-Host "🚀 开始上传文件到服务器: $SERVER_IP ..." -ForegroundColor Cyan
# 确保目标文件夹存在
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p $SERVER_DIR"

# 上传 zip 文件
scp deploy.zip ${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}/deploy.zip

Write-Host "✅ 上传完成！" -ForegroundColor Green

Write-Host "⚙️  开始在服务器上执行部署..." -ForegroundColor Cyan
# SSH 登录并执行解压、安装依赖、重启服务的操作
$REMOTE_COMMANDS = @"
cd $SERVER_DIR
# 解压覆盖
unzip -o deploy.zip
rm deploy.zip

# 只安装生产环境依赖 (使用 pnpm)
pnpm install --prod

# 重新生成 prisma client
npx prisma generate

# 重启 PM2 服务 (如果不存在则启动)
pm2 restart aijianli-nextjs || pm2 start pnpm --name `"aijianli-nextjs`" -- run start

# 保存 PM2 状态
pm2 save
"@

ssh ${SERVER_USER}@${SERVER_IP} $REMOTE_COMMANDS

Write-Host "🎉 部署脚本执行完毕！" -ForegroundColor Green

# 清理本地的部署包
if (Test-Path "deploy.zip") {
    Remove-Item "deploy.zip" -Force
}
