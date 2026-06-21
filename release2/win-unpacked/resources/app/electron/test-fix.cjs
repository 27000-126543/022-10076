const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '..', 'test-fix.log');
const log = [];

log.push('=== test fix ===');
log.push('versions.electron: ' + process.versions.electron);

log.push('\n1. original require("electron"):');
try {
  const e1 = require('electron');
  log.push('   typeof: ' + typeof e1);
  log.push('   value: ' + String(e1).substring(0, 80));
} catch(e) {
  log.push('   error: ' + e.message);
}

log.push('\n2. Clear module.paths and try again:');
try {
  const origPaths = module.paths.slice();
  module.paths = [];
  
  delete require.cache[require.resolve('electron')];
  
  const Module = require('module');
  delete Module._cache[require.resolve('electron')];
  
  try {
    const e2 = require('electron');
    log.push('   typeof: ' + typeof e2);
    log.push('   value: ' + String(e2).substring(0, 80));
    if (typeof e2 === 'object' && e2.app) {
      log.push('   SUCCESS! app is available');
    }
  } catch(e2) {
    log.push('   error: ' + e2.message);
  }
  
  module.paths = origPaths;
} catch(e) {
  log.push('   error: ' + e.message);
}

log.push('\n3. Try Module._load with empty paths:');
try {
  const Module = require('module');
  
  delete require.cache[require.resolve('electron')];
  delete Module._cache[require.resolve('electron')];
  
  const fakeModule = new Module('electron-fix', module);
  fakeModule.paths = [];
  
  try {
    const e3 = fakeModule.require('electron');
    log.push('   typeof: ' + typeof e3);
    log.push('   value: ' + String(e3).substring(0, 80));
  } catch(e3) {
    log.push('   error: ' + e3.message);
  }
} catch(e) {
  log.push('   error: ' + e.message);
}

fs.writeFileSync(logPath, log.join('\n') + '\n');
process.exit(0);
