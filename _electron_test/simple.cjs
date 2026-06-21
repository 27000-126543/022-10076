const fs = require('fs');
const path = require('path');

const logPath = path.join('D:\\', 'electron-test.log');
try {
  fs.writeFileSync(logPath, 'test file loaded\n');
  fs.appendFileSync(logPath, 'process.versions.electron: ' + process.versions.electron + '\n');
  
  try {
    const electron = require('electron');
    fs.appendFileSync(logPath, 'typeof electron: ' + typeof electron + '\n');
    fs.appendFileSync(logPath, 'electron value: ' + String(electron) + '\n');
  } catch(e) {
    fs.appendFileSync(logPath, 'require electron error: ' + e.message + '\n');
  }
  
  fs.appendFileSync(logPath, 'process.type: ' + process.type + '\n');
  fs.appendFileSync(logPath, 'process.argv: ' + process.argv.join(', ') + '\n');
  
} catch(e) {
  console.error('test error:', e);
}

process.exit(0);
