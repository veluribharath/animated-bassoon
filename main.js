const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const folderPath = result.filePaths[0];
  const dirEntries = await fs.promises.readdir(folderPath, { withFileTypes: true });

  const images = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const filePath = path.join(folderPath, name);
      return {
        path: filePath,
        url: pathToFileURL(filePath).toString(),
        name
      };
    });

  return {
    canceled: false,
    folderPath,
    images
  };
});

ipcMain.handle('choose-destination', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  return {
    canceled: false,
    destination: result.filePaths[0]
  };
});

function getUniquePath(dir, fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = path.join(dir, fileName);
  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${counter})${ext}`);
    counter += 1;
  }

  return candidate;
}

async function moveFile(src, dest) {
  try {
    await fs.promises.rename(src, dest);
  } catch (err) {
    if (err.code === 'EXDEV') {
      await fs.promises.copyFile(src, dest);
      await fs.promises.unlink(src);
    } else {
      throw err;
    }
  }
}

async function processFiles(files, destination, mode) {
  await fs.promises.mkdir(destination, { recursive: true });

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const target = getUniquePath(destination, fileName);

    if (mode === 'copy') {
      await fs.promises.copyFile(filePath, target);
    } else {
      await moveFile(filePath, target);
    }
  }
}

ipcMain.handle('process-files', async (_event, payload) => {
  const { files, destination, mode } = payload || {};

  if (!Array.isArray(files) || files.length === 0 || !destination) {
    return { ok: false, error: 'No files or destination provided.' };
  }

  try {
    await processFiles(files, destination, mode);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
