@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo 🚀 Hexo 一键双部署脚本（GitHub Pages + Vercel）
echo =======================================================
echo 当前目录：%cd%
echo.

:: Step 1: 检查是否在 Hexo 项目根目录
if not exist _config.yml (
  echo ❌ 错误：请在 Hexo 博客项目根目录下运行此脚本。
  pause
  exit /b
)

:: Step 2: 检查 Node 与 Hexo 环境
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ❌ Node.js 未安装，请先安装 Node.js。
  pause
  exit /b
)

where hexo >nul 2>nul
if %errorlevel% neq 0 (
  echo ❌ 未检测到 Hexo，请执行 npm install -g hexo-cli 后重试。
  pause
  exit /b
)

:: Step 3: 检查 SSH 连接状态
echo 🔍 检查 GitHub SSH 连接中...
ssh -T git@github.com
if %errorlevel% neq 1 (
  echo ❌ SSH 未正确配置或认证失败。
  echo 请先执行以下命令生成并添加公钥到 GitHub：
  echo     ssh-keygen -t ed25519 -C "你的GitHub邮箱"
  echo     cat ~/.ssh/id_ed25519.pub
  echo 然后复制到 https://github.com/settings/keys
  pause
  exit /b
)

echo ✅ SSH 连接成功！
echo.

:: Step 4: 开始计时
set start=%time%

echo 🧹 清理旧缓存中...
hexo clean

echo ⚙️ 生成静态文件中...
hexo g

echo 🚀 正在部署到 GitHub Pages 与 Vercel...
hexo d

echo -------------------------------------------------------
set end=%time%
echo ✅ 部署完成！
echo 🕓 开始时间: %start%
echo 🕓 结束时间: %end%
echo 🌐 访问地址：
echo   🔹 GitHub Pages: https://Sun1105.github.io
echo   🔹 Vercel: https://blog-source-lime.vercel.app
echo -------------------------------------------------------
pause
