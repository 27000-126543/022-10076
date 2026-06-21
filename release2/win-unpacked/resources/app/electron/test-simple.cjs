const { app, BrowserWindow } = require('electron');

let win;
app.whenReady().then(() => {
  win = new BrowserWindow({ width: 800, height: 600 });
  win.loadURL('data:text/html,<h1>Electron Works!</h1>');
  setTimeout(() => app.quit(), 2000);
});
