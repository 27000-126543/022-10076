const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logPath = path.join(__dirname, '..', 'launcher.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log('[launcher]', msg);
  try {
    fs.appendFileSync(logPath, line);
  } catch (e) {}
}

log('========================================');
log('Launcher starting...');
log(`Original ELECTRON_RUN_AS_NODE: ${process.env.ELECTRON_RUN_AS_NODE}`);

delete process.env.ELECTRON_RUN_AS_NODE;
process.env.ELECTRON_RUN_AS_NODE = undefined;

log(`After delete ELECTRON_RUN_AS_NODE: ${process.env.ELECTRON_RUN_AS_NODE}`);

const envKeys = Object.keys(process.env).filter(k => k.toUpperCase().includes('ELECTRON'));
log(`ELECTRON-related env vars: ${envKeys.join(', ')}`);
envKeys.forEach(k => {
  if (k.toUpperCase().includes('ELECTRON_RUN_AS_NODE')) {
    log(`  ${k} = ${process.env[k]} -> deleting`);
    delete process.env[k];
    process.env[k] = undefined;
  } else {
    log(`  ${k} = ${process.env[k]}`);
  }
});

let electronPath;
try {
  electronPath = require('electron');
} catch (e) {
  log(`Failed to require('electron'): ${e.message}`);
  try {
    const distPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
    if (fs.existsSync(distPath)) {
      electronPath = distPath;
      log(`Fallback to direct path: ${electronPath}`);
    } else {
      log('Cannot find electron executable');
      process.exit(1);
    }
  } catch (e2) {
    log(`Fallback also failed: ${e2.message}`);
    process.exit(1);
  }
}

log(`electronPath: ${electronPath}`);
log(`typeof electronPath: ${typeof electronPath}`);

if (typeof electronPath !== 'string' || !fs.existsSync(electronPath)) {
  log('ERROR: electronPath is not a valid string or file does not exist');
  console.error('[launcher] 错误：无法找到 Electron 可执行文件。请检查 node_modules/electron 是否正确安装。');
  process.exit(1);
}

const args = process.argv.slice(2);
log(`spawn args: ${JSON.stringify(args)}`);

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  windowsHide: false,
  env: process.env
});

child.on('spawn', () => {
  log(`Electron spawned successfully, PID: ${child.pid}`);
});

child.on('error', (err) => {
  log(`Electron error: ${err.message}`);
  console.error('[launcher] Electron 启动失败：', err.message);
  process.exit(1);
});

child.on('close', (code, signal) => {
  log(`Electron closed, code: ${code}, signal: ${signal}`);
  if (code === null) {
    console.error(`[launcher] Electron 异常退出，信号：${signal}`);
    process.exit(1);
  }
  process.exit(code);
});

const handleTerminationSignal = (signal) => {
  log(`Received ${signal}, forwarding to electron...`);
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
};

handleTerminationSignal('SIGINT');
handleTerminationSignal('SIGTERM');
