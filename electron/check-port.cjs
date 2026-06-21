const net = require('net');
const port = parseInt(process.argv[2]) || 5173;

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

(async () => {
  console.log(`[port-check] 正在检查端口 ${port} 是否可用...`);
  const available = await checkPort(port);
  
  if (!available) {
    console.error(`
========================================
[ERROR] 端口 ${port} 已被占用！
========================================

请先关闭占用端口 ${port} 的程序，或手动指定其他端口：

  查看占用进程：
    netstat -ano | findstr :${port}

  然后结束对应进程（PID）：
    taskkill /F /PID <PID>

或者修改启动命令中的端口号（不推荐，会导致 Electron 找不到入口）：
    npm run dev -- --port 5174

注意：修改端口后，需要同时修改 dev:electron 脚本中的 VITE_DEV_SERVER_URL
环境变量，否则 Electron 会加载错误的地址！
========================================
`);
    process.exit(1);
  }
  
  console.log(`[port-check] 端口 ${port} 可用 ✓`);
  process.exit(0);
})();
