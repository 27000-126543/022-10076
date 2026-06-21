const path = require('path');
const fs = require('fs');
const { builtinModules } = require('module');

const logPath = path.join(__dirname, '..', 'test2-debug.log');
const lines = [];

lines.push('=== test2 start ===');
lines.push('process.versions.electron: ' + (process.versions.electron || 'undefined'));
lines.push('process.type: ' + process.type);
lines.push('builtinModules includes electron: ' + builtinModules.includes('electron'));
lines.push('process.builtinModules: ' + (process.builtinModules ? process.builtinModules.includes('electron') : 'no'));

try {
  const resolved = require.resolve('electron');
  lines.push('require.resolve(electron): ' + resolved);
} catch(e) {
  lines.push('require.resolve error: ' + e.message);
}

try {
  lines.push('Object.keys(process): ' + Object.keys(process).filter(k => k.toLowerCase().includes('electron') || k.includes('atom')).join(', '));
} catch(e) {}

try {
  lines.push('Object.keys(global): ' + Object.keys(global).filter(k => k.toLowerCase().includes('electron') || k.includes('atom')).join(', '));
} catch(e) {}

try {
  const electronPath = require('electron');
  lines.push('require(electron) type: ' + typeof electronPath);
  lines.push('require(electron) value: ' + String(electronPath));
} catch(e) {
  lines.push('require(electron) error: ' + e.message);
}

try {
  const Module = require('module');
  lines.push('Module._builtinModuleNames includes electron: ' + (Module._builtinModuleNames ? Module._builtinModuleNames.includes('electron') : 'N/A'));
} catch(e) {
  lines.push('Module check error: ' + e.message);
}

try {
  const mod = require('module');
  const origLoad = mod._load;
  lines.push('Module._load is a function: ' + (typeof origLoad === 'function'));
} catch(e) {}

fs.writeFileSync(logPath, lines.join('\n'));
process.exit(0);
