const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('photoApi', {
  openFolder: () => ipcRenderer.invoke('open-folder'),
  chooseDestination: () => ipcRenderer.invoke('choose-destination'),
  processFiles: (payload) => ipcRenderer.invoke('process-files', payload)
});
