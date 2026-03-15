const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

function hasFlag(name) {
  return process.argv.includes(name);
}

function getArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  const v = process.argv[idx + 1];
  if (v == null) return fallback;
  return String(v);
}

const ROOT = path.join(__dirname, '..');
const watch = hasFlag('--watch');
const open = hasFlag('--open');
const requestedPort = Number(getArg('--port', process.env.PORT || '3000')) || 3000;

function resolveNpmCommand() {
  if (process.platform !== 'win32') return 'npm';
  const nodeDir = path.dirname(process.execPath);
  const npmCmd = path.join(nodeDir, 'npm.cmd');
  if (fs.existsSync(npmCmd)) return npmCmd;
  return 'npm';
}

const NPM = resolveNpmCommand();

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort, maxAttempts = 30) {
  const start = Number(startPort) || 3000;
  for (let i = 0; i <= maxAttempts; i += 1) {
    const p = start + i;
    if (await isPortFree(p)) return p;
  }
  return start;
}

function spawnCmd(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
    windowsHide: false
  });
}

function runCmd(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCmd(cmd, args, opts);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function ensureDeps() {
  const nodeModulesDir = path.join(ROOT, 'node_modules');
  if (fs.existsSync(nodeModulesDir)) return;
  process.stdout.write('[本地启动] 首次运行：正在安装依赖（npm install）...\n');
  await runCmd(NPM, ['install']);
}

function openBrowser(url) {
  if (!open) return;
  try {
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', url], { stdio: 'ignore', windowsHide: true });
      return;
    }
    if (process.platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore' });
      return;
    }
    spawn('xdg-open', [url], { stdio: 'ignore' });
  } catch {
  }
}

async function main() {
  await ensureDeps();

  const port = await findAvailablePort(requestedPort);
  const url = `http://localhost:${port}/`;
  if (port !== requestedPort) {
    process.stdout.write(`[本地启动] 端口 ${requestedPort} 已被占用，已自动切换到 ${port}\n`);
  }
  process.stdout.write(`[本地启动] 访问地址：${url}\n`);
  openBrowser(url);

  if (watch) {
    process.stdout.write('[本地启动] 监听模式：启动中（node scripts/dev-server.cjs --watch）...\n');
    const child = spawnCmd(process.execPath, [path.join(ROOT, 'scripts', 'dev-server.cjs'), '--watch'], { env: { PORT: String(port) } });
    child.on('exit', (code) => process.exit(code || 0));
    return;
  }

  process.stdout.write('[本地启动] 正在构建（node scripts/generate-static.cjs）...\n');
  await runCmd(process.execPath, [path.join(ROOT, 'scripts', 'generate-static.cjs')]);
  process.stdout.write('[本地启动] 启动服务（node scripts/dev-server.cjs）...\n');
  const child = spawnCmd(process.execPath, [path.join(ROOT, 'scripts', 'dev-server.cjs')], { env: { PORT: String(port) } });
  child.on('exit', (code) => process.exit(code || 0));
}

main().catch((err) => {
  process.stderr.write(`[本地启动] 启动失败：${String(err && err.message ? err.message : err)}\n`);
  process.exit(1);
});
