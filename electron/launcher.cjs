const { spawn } = require('child_process');
const path = require('path');

delete process.env.ELECTRON_RUN_AS_NODE;

const electronPath = require('electron');
const args = process.argv.slice(2);

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  windowsHide: false,
  env: process.env
});

child.on('close', (code, signal) => {
  if (code === null) {
    console.error(electronPath, 'exited with signal', signal);
    process.exit(1);
  }
  process.exit(code);
});

const handleTerminationSignal = (signal) => {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
};

handleTerminationSignal('SIGINT');
handleTerminationSignal('SIGTERM');
