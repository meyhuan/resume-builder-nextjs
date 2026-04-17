# ==========================================
# Next.js 自动化本地打包与上传部署脚本 (Windows)
# ==========================================

param(
    [switch]$SkipBuild,
    [switch]$RemoteOnly
)

# 服务器配置
$SERVER_IP = "47.120.35.34"
$SERVER_USER = "root"
$SERVER_DIR = "/home/webapp/aijianli-nextjs/resume-builder-nextjs"

if ($RemoteOnly) {
    Write-Host "⏭️ 跳过本地构建和 deploy.zip 上传，仅上传 deploy.sh 并执行远端部署..." -ForegroundColor Yellow
} elseif (-not $SkipBuild) {
    Write-Host "🚀 开始进行本地构建..." -ForegroundColor Cyan
    pnpm run build

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 构建失败！请检查错误信息。" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ 构建成功！" -ForegroundColor Green
} else {
    Write-Host "⏭️ 跳过本地构建，直接使用现有产物部署..." -ForegroundColor Yellow
}

if (-not $RemoteOnly) {
    Write-Host "📦 准备打包需要上传的文件..." -ForegroundColor Cyan
    # 每次打包前先清理旧包
    if (Test-Path "deploy.zip") {
        Remove-Item "deploy.zip" -Force
    }

    # 用临时目录暂存需要打包的文件，排除 .next/cache
    $STAGE_DIR = ".\deploy_stage"
    if (Test-Path $STAGE_DIR) { Remove-Item $STAGE_DIR -Recurse -Force }
    New-Item -ItemType Directory -Path $STAGE_DIR | Out-Null

    # 复制 .next（排除 cache 子目录）
    robocopy ".next" "$STAGE_DIR\.next" /E /XD "cache" | Out-Null
    # 复制其余文件
    robocopy "public"  "$STAGE_DIR\public"  /E | Out-Null
    robocopy "prisma"  "$STAGE_DIR\prisma"  /E | Out-Null
    Copy-Item "package.json"   "$STAGE_DIR\package.json"
    Copy-Item "pnpm-lock.yaml" "$STAGE_DIR\pnpm-lock.yaml"
    Copy-Item "next.config.ts" "$STAGE_DIR\next.config.ts"

    # 整体压缩，保留目录结构
    Compress-Archive -Path "$STAGE_DIR\*" -DestinationPath "deploy.zip" -Force

    # 清理临时目录
    Remove-Item $STAGE_DIR -Recurse -Force

    Write-Host "✅ 打包完成：deploy.zip" -ForegroundColor Green

    Write-Host "🚀 开始上传文件到服务器: $SERVER_IP ..." -ForegroundColor Cyan
    # 确保目标文件夹存在
    # ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p $SERVER_DIR"
    # if ($LASTEXITCODE -ne 0) {
    #     Write-Host "❌ 创建远端目录失败。" -ForegroundColor Red
    #     exit 1
    # }

    # 上传 zip 文件
    scp deploy.zip ${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}/deploy.zip
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 上传 deploy.zip 失败。" -ForegroundColor Red
        exit 1
    }
    # 上传部署脚本
    # scp deploy.sh ${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}/deploy.sh
    # if ($LASTEXITCODE -ne 0) {
    #     Write-Host "❌ 上传 deploy.sh 失败。" -ForegroundColor Red
    #     exit 1
    # }

    Write-Host "✅ 上传完成！" -ForegroundColor Green
}

if ($RemoteOnly) {
    Write-Host "🚀 开始上传最新部署脚本到服务器: $SERVER_IP ..." -ForegroundColor Cyan
    scp deploy.sh ${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}/deploy.sh
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 上传 deploy.sh 失败。" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ deploy.sh 上传完成！" -ForegroundColor Green
}

Write-Host "⚙️  开始在服务器上执行部署..." -ForegroundColor Cyan
# 转换 deploy.sh 为 LF 并执行，避免 Windows CRLF 在 Linux 上报错
ssh ${SERVER_USER}@${SERVER_IP} "sed -i 's/\r$//' $SERVER_DIR/deploy.sh && chmod +x $SERVER_DIR/deploy.sh && bash -x $SERVER_DIR/deploy.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 远端部署失败，请检查上方日志。" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 部署脚本执行完毕！" -ForegroundColor Green

# 清理本地的部署包
if ((-not $RemoteOnly) -and (Test-Path "deploy.zip")) {
    Remove-Item "deploy.zip" -Force
}
