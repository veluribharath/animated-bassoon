const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const exifParser = require('exif-parser');

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif',
  '.heic', '.heif', '.avif', '.svg'
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
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

async function getImageMetadata(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    const metadata = {
      fileName: path.basename(filePath),
      fileSize: formatFileSize(stats.size),
      modified: stats.mtime.toLocaleString(),
      created: stats.birthtime.toLocaleString(),
    };

    // Try to extract EXIF data for JPEG images
    if (ext === '.jpg' || ext === '.jpeg') {
      try {
        const buffer = await fs.promises.readFile(filePath);
        const parser = exifParser.create(buffer);
        const result = parser.parse();
        
        if (result.tags) {
          if (result.tags.Make) metadata.cameraMake = result.tags.Make;
          if (result.tags.Model) metadata.cameraModel = result.tags.Model;
          if (result.tags.ISO) metadata.iso = result.tags.ISO;
          if (result.tags.FNumber) metadata.aperture = `f/${result.tags.FNumber}`;
          if (result.tags.ExposureTime) {
            const exposure = result.tags.ExposureTime;
            metadata.shutter = exposure < 1 ? `1/${Math.round(1/exposure)}` : `${exposure}s`;
          }
          if (result.tags.FocalLength) metadata.focalLength = `${result.tags.FocalLength}mm`;
          if (result.tags.DateTimeOriginal) {
            metadata.dateTaken = new Date(result.tags.DateTimeOriginal * 1000).toLocaleString();
          }
          if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
            metadata.gps = `${result.tags.GPSLatitude.toFixed(6)}, ${result.tags.GPSLongitude.toFixed(6)}`;
          }
        }
        
        if (result.imageSize) {
          metadata.dimensions = `${result.imageSize.width} × ${result.imageSize.height}`;
        }
      } catch (exifError) {
        // EXIF parsing failed, continue without it
      }
    }

    return metadata;
  } catch (error) {
    return { error: error.message };
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const folderPath = result.filePaths[0];
  const dirEntries = await fs.promises.readdir(folderPath, { withFileTypes: true });

  const images = [];
  
  for (const entry of dirEntries) {
    if (entry.isFile()) {
      const name = entry.name;
      const ext = path.extname(name).toLowerCase();
      
      if (IMAGE_EXTENSIONS.has(ext)) {
        const filePath = path.join(folderPath, name);
        const stats = await fs.promises.stat(filePath);
        
        images.push({
          path: filePath,
          url: pathToFileURL(filePath).toString(),
          name,
          size: stats.size,
          mtime: stats.mtime.getTime()
        });
      }
    }
  }

  // Default sort by name
  images.sort((a, b) => a.name.localeCompare(b.name));

  return {
    canceled: false,
    folderPath,
    images
  };
});

ipcMain.handle('get-metadata', async (_event, filePath) => {
  return await getImageMetadata(filePath);
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

ipcMain.handle('delete-files', async (_event, files) => {
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, error: 'No files provided.' };
  }

  try {
    // Move to trash instead of permanent deletion
    for (const filePath of files) {
      await shell.trashItem(filePath);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('validate-folder', async (_event, folderPath) => {
  try {
    const stats = await fs.promises.stat(folderPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
});
