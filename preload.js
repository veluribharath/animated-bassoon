const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('photoApi', {
  openFolder: () => ipcRenderer.invoke('open-folder'),
  chooseDestination: () => ipcRenderer.invoke('choose-destination'),
  processFiles: (payload) => ipcRenderer.invoke('process-files', payload),
  deleteFiles: (files) => ipcRenderer.invoke('delete-files', files),
  getMetadata: (filePath) => ipcRenderer.invoke('get-metadata', filePath),
  validateFolder: (folderPath) => ipcRenderer.invoke('validate-folder', folderPath),
  groupPhotos: (payload) => ipcRenderer.invoke('group-photos', payload),
  deleteGroupRejects: (payload) => ipcRenderer.invoke('delete-group-rejects', payload)
});
