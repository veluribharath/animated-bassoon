const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const exifParser = require('exif-parser');
const sharp = require('sharp');

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

// ====================
// Perceptual Hashing Functions
// ====================

// Compute DCT-based perceptual hash
function computeDCTHash(pixels, width, height) {
  // Simple average hash approach (simplified from full DCT for performance)
  // This creates a 64-bit hash by comparing each pixel to average
  const total = pixels.reduce((sum, val) => sum + val, 0);
  const average = total / pixels.length;

  let hash = '';
  for (let i = 0; i < pixels.length; i++) {
    hash += pixels[i] > average ? '1' : '0';
  }

  return hash;
}

// Compute perceptual hash for an image file
async function computePerceptualHash(filePath) {
  try {
    const buffer = await sharp(filePath)
      .resize(8, 8, { fit: 'fill' })  // 8x8 for 64-bit hash
      .greyscale()
      .raw()
      .toBuffer();

    const pixels = Array.from(buffer);
    return computeDCTHash(pixels, 8, 8);
  } catch (error) {
    console.error(`Failed to compute hash for ${filePath}:`, error.message);
    return null;
  }
}

// Calculate Hamming distance between two hashes
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return 64; // Maximum distance
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }

  return distance;
}

// Calculate similarity score (0-1, higher = more similar)
function hashSimilarity(hash1, hash2) {
  const distance = hammingDistance(hash1, hash2);
  return 1 - (distance / 64);
}

// Get image dimensions using sharp
async function getImageDimensions(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  } catch (error) {
    console.error(`Failed to get dimensions for ${filePath}:`, error.message);
    return null;
  }
}

// ====================
// Quality Scoring Functions
// ====================

// Compute quality score for "best" photo selection (0-100 scale)
function computeQualityScore(image, dimensions) {
  let score = 0;

  // Factor 1: Resolution (40% weight) - Higher megapixels = better
  if (dimensions && dimensions.width && dimensions.height) {
    const megapixels = (dimensions.width * dimensions.height) / 1000000;
    score += Math.min(megapixels / 24, 1) * 40; // Normalize to 24MP max
  }

  // Factor 2: File size as proxy for quality/compression (30% weight)
  // Larger file = less compression = better quality (generally)
  const sizeMB = image.size / (1024 * 1024);
  score += Math.min(sizeMB / 10, 1) * 30; // Normalize to 10MB max

  // Factor 3: Filename heuristics (30% weight)
  // Penalize files with "edit", "copy", "duplicate" in name
  const nameLower = image.name.toLowerCase();
  let nameScore = 30;
  if (nameLower.includes('edit') || nameLower.includes('copy') ||
      nameLower.includes('duplicate') || nameLower.includes('(1)') ||
      nameLower.includes('(2)')) {
    nameScore = 10;
  }
  score += nameScore;

  return Math.round(score); // 0-100
}

// ====================
// Photo Grouping IPC Handler
// ====================

// Group photos by temporal proximity and visual similarity
ipcMain.handle('group-photos', async (_event, { images, settings }) => {
  const { timeThresholdSeconds, similarityThreshold, minGroupSize } = settings;

  try {
    // Step 1: Compute hashes and quality scores (with batching for performance)
    const batchSize = 10;
    const enrichedImages = [];

    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (img) => {
          const hash = await computePerceptualHash(img.path);
          const dimensions = await getImageDimensions(img.path);
          const qualityScore = computeQualityScore(img, dimensions);

          return {
            ...img,
            perceptualHash: hash,
            dimensions,
            qualityScore,
            groupId: null,
            isGroupLeader: false
          };
        })
      );

      enrichedImages.push(...batchResults);
    }

    // Step 2: Sort by timestamp for temporal grouping
    enrichedImages.sort((a, b) => a.mtime - b.mtime);

    // Step 3: Temporal clustering with visual verification
    const groups = [];
    let currentGroup = [];

    for (const img of enrichedImages) {
      if (currentGroup.length === 0) {
        currentGroup.push(img);
        continue;
      }

      const lastImg = currentGroup[currentGroup.length - 1];
      const timeDiffSec = (img.mtime - lastImg.mtime) / 1000;

      if (timeDiffSec <= timeThresholdSeconds) {
        // Check visual similarity with any member of current group
        const isSimilar = currentGroup.some(member => {
          if (!member.perceptualHash || !img.perceptualHash) return false;
          return hashSimilarity(img.perceptualHash, member.perceptualHash) >= similarityThreshold;
        });

        if (isSimilar) {
          currentGroup.push(img);
        } else {
          // Visual mismatch, finalize current group
          if (currentGroup.length >= minGroupSize) {
            groups.push([...currentGroup]);
          }
          currentGroup = [img];
        }
      } else {
        // Time gap too large, finalize current group
        if (currentGroup.length >= minGroupSize) {
          groups.push([...currentGroup]);
        }
        currentGroup = [img];
      }
    }

    // Finalize last group
    if (currentGroup.length >= minGroupSize) {
      groups.push(currentGroup);
    }

    // Step 4: Select "best" (leader) from each group
    const groupsWithLeaders = groups.map((group, idx) => {
      // Sort by quality score descending
      group.sort((a, b) => b.qualityScore - a.qualityScore);
      const leader = group[0];

      const groupId = `group-${Date.now()}-${idx}`;

      // Mark group membership and leadership
      group.forEach((img, i) => {
        img.groupId = groupId;
        img.isGroupLeader = (i === 0);
      });

      return {
        id: groupId,
        members: group.map(img => img.path),
        leaderId: leader.path
      };
    });

    return {
      ok: true,
      enrichedImages,
      groups: groupsWithLeaders
    };
  } catch (error) {
    console.error('Grouping failed:', error);
    return {
      ok: false,
      error: error.message
    };
  }
});

// Delete non-selected photos from a group
ipcMain.handle('delete-group-rejects', async (_event, { keepPath, deletePaths }) => {
  if (!Array.isArray(deletePaths) || deletePaths.length === 0) {
    return { ok: false, error: 'No files to delete.' };
  }

  try {
    for (const filePath of deletePaths) {
      await shell.trashItem(filePath);
    }
    return { ok: true, deleted: deletePaths.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
