const electron = require('electron');
const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'test-debug.log');
const lines = [];
lines.push('=== test start ===');
lines.push('typeof electron: ' + typeof electron);
lines.push('electron is: ' + (typeof electron === 'string' ? '"' + electron + '"' : 'object'));
lines.push('Object.keys: ' + (typeof electron === 'object' ? Object.keys(electron).join(', ') : 'N/A'));
lines.push('process.type: ' + process.type);
lines.push('process.versions.electron: ' + (process.versions.electron || 'undefined'));
lines.push('process.argv: ' + process.argv.join(', '));

try {
  fs.writeFileSync(logPath, lines.join('\n'));
} catch(e) {
  console.error('write log error:', e);
}

if (typeof electron === 'object' && electron.app) {
  const { app } = electron;
  app.whenReady().then(() => {
    fs.appendFileSync(logPath, '\napp is ready');
    app.quit();
  });
} else {
  process.exit(1);
}
