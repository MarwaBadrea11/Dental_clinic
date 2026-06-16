const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs   = require('fs');

const isDev = !app.isPackaged;

// ── IPC: Save file from renderer ──────────────────────────────────────────────
// The renderer sends { buffer: ArrayBuffer, filename: string } via ipcRenderer.invoke('save-file', …).
// We show a native Save dialog so the user can pick the destination.
ipcMain.handle('save-file', async (_event, { buffer, filename }) => {
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: filename,
    filters: [
      { name: 'Excel Files', extensions: ['xlsx'] },
      { name: 'PDF Files',   extensions: ['pdf'] },
      { name: 'All Files',   extensions: ['*'] },
    ],
  });
  if (canceled || !filePath) return { success: false, reason: 'cancelled' };

  try {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  } catch (err) {
    return { success: false, reason: err.message };
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // preload exposes ipcRenderer.invoke to the renderer via contextBridge
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // ── Allow fetch() to reach the local backend + Google Fonts ─────────────
  // Electron sets a strict CSP that can block localhost requests and external
  // stylesheets in packaged builds. We override it here to allow:
  //   • http://localhost:* and http://127.0.0.1:* for the backend API
  //   • https://fonts.googleapis.com and https://fonts.gstatic.com for fonts
  //   • https: broadly for style-src-elem so @import font links work
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
            "http://localhost:* http://127.0.0.1:*",
            "connect-src 'self' http://localhost:* http://127.0.0.1:*",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: http://localhost:* http://127.0.0.1:*",
          ].join('; ')
        ],
      },
    });
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));

    // F12 toggles DevTools in the packaged build so you can debug issues
    win.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'F12' && input.type === 'keyDown') {
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools();
        } else {
          win.webContents.openDevTools();
        }
      }
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
