// preload.cjs — runs in a privileged context with access to Node/Electron APIs.
// contextBridge exposes a safe subset to the renderer (no full Node access).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Save a file via the main process.
   * @param {ArrayBuffer} buffer  - raw file bytes
   * @param {string}      filename - suggested file name (e.g. "financial-report.xlsx")
   * @returns {Promise<{ success: boolean; filePath?: string; reason?: string }>}
   */
  saveFile: (buffer, filename) =>
    ipcRenderer.invoke('save-file', { buffer, filename }),

  /** True when running inside Electron (packaged or dev) */
  isElectron: true,
});
