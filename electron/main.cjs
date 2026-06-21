const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let logFilePath = '';

function initLog() {
  try {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    logFilePath = path.join(logDir, `main-${dateStr}.log`);
  } catch (e) {
    console.error('Failed to init log:', e);
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(line.trim());
  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, line);
    } catch (e) {}
  }
}

function resolvePath(...args) {
  let basePath = __dirname;
  if (basePath.includes('.asar')) {
    basePath = path.join(basePath, '..', '..');
  } else {
    basePath = path.join(basePath, '..');
  }
  return path.join(basePath, ...args);
}

function resolveAppPath(...args) {
  let basePath = __dirname;
  if (basePath.includes('.asar')) {
    basePath = path.join(basePath, '..');
  }
  return path.join(basePath, ...args);
}

function createWindow() {
  log('Creating main window...');
  log(`process.type: ${process.type}`);
  log(`__dirname: ${__dirname}`);
  log(`app.isPackaged: ${app.isPackaged}`);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: '质量实测实量系统',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    log('Window shown');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('Page finished loading');
    mainWindow.setTitle('质量实测实量系统');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
    log(`Page failed to load: ${errorCode} - ${errorDesc} (${validatedURL})`);
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>启动失败</title>
  <style>
    body { font-family: "Microsoft YaHei", sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); max-width: 500px; text-align: center; }
    h1 { color: #ff4d4f; margin: 0 0 16px; font-size: 20px; }
    p { color: #666; margin: 8px 0; font-size: 14px; line-height: 1.6; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: Consolas, monospace; font-size: 12px; }
    .error { background: #fff2f0; padding: 12px; border-radius: 4px; margin: 16px 0; text-align: left; }
  </style>
</head>
<body>
  <div class="box">
    <h1>页面加载失败</h1>
    <div class="error">
      <p><strong>错误代码：</strong>${errorCode}</p>
      <p><strong>错误描述：</strong>${errorDesc}</p>
      <p><strong>页面地址：</strong><code>${validatedURL}</code></p>
    </div>
    <p>请检查程序是否完整安装，或联系技术支持。</p>
    <p>日志文件位置：<br><code>${logFilePath}</code></p>
  </div>
</body>
</html>`;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    mainWindow.show();
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (message.includes('Failed to load resource') || message.includes('ERR_FILE_NOT_FOUND')) {
      log(`[Console] ${message}`);
    }
  });

  mainWindow.on('closed', () => {
    log('Window closed');
    mainWindow = null;
  });

  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  log(`isDev: ${isDev}`);

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    log(`Loading dev server: ${devUrl}`);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const distPath = resolveAppPath('dist', 'index.html');
    log(`Loading dist file: ${distPath}`);
    log(`dist exists: ${fs.existsSync(distPath)}`);
    
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      const appPath = resolvePath('dist', 'index.html');
      log(`Trying alt path: ${appPath}`);
      log(`alt exists: ${fs.existsSync(appPath)}`);
      if (fs.existsSync(appPath)) {
        mainWindow.loadFile(appPath);
      } else {
        log('Both paths failed, searching for index.html...');
        const searchPaths = [
          path.join(__dirname, '..', 'dist', 'index.html'),
          path.join(__dirname, '..', '..', 'dist', 'index.html'),
          path.join(process.resourcesPath, 'app', 'dist', 'index.html'),
          path.join(process.resourcesPath, 'dist', 'index.html'),
        ];
        let found = false;
        for (const p of searchPaths) {
          log(`  check: ${p} exists=${fs.existsSync(p)}`);
          if (fs.existsSync(p)) {
            mainWindow.loadFile(p);
            found = true;
            break;
          }
        }
        if (!found) {
          log('All paths failed, showing error');
          mainWindow.webContents.emit('did-fail-load', {}, -1, `找不到 index.html 文件，请检查 dist 目录是否存在。已搜索: ${searchPaths.join(', ')}`, '');
        }
      }
    }
  }
}

app.whenReady().then(() => {
  initLog();
  log('========================================');
  log('App starting...');
  log(`app.name: ${app.name}`);
  log(`app.version: ${app.getVersion()}`);
  log(`app.getPath(userData): ${app.getPath('userData')}`);
  log(`process.resourcesPath: ${process.resourcesPath}`);
  log('========================================');
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log('App before-quit');
});

process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}\n${err.stack}`);
  dialog.showErrorBox('程序异常', `发生未捕获的异常：${err.message}\n\n请查看日志：${logFilePath}`);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection: ${reason}`);
});
