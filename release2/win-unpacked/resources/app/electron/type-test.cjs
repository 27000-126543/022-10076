const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '..', 'type-test.log');

let log = [];
log.push('=== process.type test ===');
log.push('BEFORE require - process.type: ' + process.type);
log.push('BEFORE require - process.versions.electron: ' + process.versions.electron);
log.push('BEFORE require - typeof process.type: ' + typeof process.type);

log.push('\nprocess.argv: ' + JSON.stringify(process.argv));
log.push('process.cwd(): ' + process.cwd());
log.push('__dirname: ' + __dirname);

log.push('\nprocess.env keys with ELECTRON:');
Object.keys(process.env).forEach(k => {
  if (k.toUpperCase().includes('ELECTRON') || k.toUpperCase().includes('NODE')) {
    log.push('  ' + k + ' = ' + process.env[k]);
  }
});

try {
  const electron = require('electron');
  log.push('\nAFTER require - typeof electron: ' + typeof electron);
  log.push('AFTER require - process.type: ' + process.type);
} catch(e) {
  log.push('\nrequire error: ' + e.message);
}

fs.writeFileSync(logPath, log.join('\n') + '\n');
process.exit(0);
