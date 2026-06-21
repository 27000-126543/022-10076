const fs = require('fs');
const path = require('path');
const Module = require('module');

const logPath = path.join(__dirname, '..', 'cache-inspect.log');
const log = [];

log.push('=== cache inspection ===');
log.push('versions.electron: ' + process.versions.electron);
log.push('process.type: ' + process.type);

log.push('\n1. Direct require("electron"):');
try {
  const e = require('electron');
  log.push('   typeof: ' + typeof e);
  log.push('   value: ' + String(e).substring(0, 100));
} catch(err) { log.push('   error: ' + err.message); }

log.push('\n2. Module._cache electron keys:');
try {
  const keys = Object.keys(Module._cache).filter(k => 
    k === 'electron' || k.startsWith('electron/')
  );
  log.push('   keys: ' + keys.join(', '));
  keys.forEach(k => {
    const cached = Module._cache[k];
    log.push('   [' + k + '] typeof: ' + typeof cached);
    if (cached && cached.exports) {
      log.push('   [' + k + '] exports typeof: ' + typeof cached.exports);
      log.push('   [' + k + '] exports: ' + String(cached.exports).substring(0, 100));
    }
  });
} catch(err) { log.push('   error: ' + err.message); }

log.push('\n3. require.resolve("electron"):');
try {
  log.push('   ' + require.resolve('electron'));
} catch(err) { log.push('   error: ' + err.message); }

log.push('\n4. module.paths:');
try {
  module.paths.forEach(p => log.push('   ' + p));
} catch(err) { log.push('   error: ' + err.message); }

log.push('\n5. Check if process.mainModule exists:');
try {
  log.push('   process.mainModule: ' + (process.mainModule ? 'exists' : 'null'));
  if (process.mainModule) {
    log.push('   mainModule.filename: ' + process.mainModule.filename);
  }
} catch(err) { log.push('   error: ' + err.message); }

log.push('\n6. Global.require:');
try {
  if (global.require) {
    const e = global.require('electron');
    log.push('   typeof: ' + typeof e);
    log.push('   value: ' + String(e).substring(0, 100));
  } else {
    log.push('   global.require does not exist');
  }
} catch(err) { log.push('   error: ' + err.message); }

fs.writeFileSync(logPath, log.join('\n') + '\n');
process.exit(0);
