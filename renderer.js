// DOM Elements
const openFolderBtn = document.getElementById('openFolderBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playBtn = document.getElementById('playBtn');
const viewToggleBtn = document.getElementById('viewToggleBtn');
const toggleSelectBtn = document.getElementById('toggleSelectBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const invertSelectionBtn = document.getElementById('invertSelectionBtn');
const copyBtn = document.getElementById('copyBtn');
const moveBtn = document.getElementById('moveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const helpBtn = document.getElementById('helpBtn');

const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomLevel = document.getElementById('zoomLevel');
const rotateLeftBtn = document.getElementById('rotateLeftBtn');
const rotateRightBtn = document.getElementById('rotateRightBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const sortSelect = document.getElementById('sortSelect');

const photoEl = document.getElementById('photo');
const photoContainer = document.getElementById('photoContainer');
const emptyState = document.getElementById('emptyState');
const fileInfo = document.getElementById('fileInfo');
const selectionCount = document.getElementById('selectionCount');
const statusEl = document.getElementById('status');
const stage = document.getElementById('stage');
const gridView = document.getElementById('gridView');
const metadataPanel = document.getElementById('metadataPanel');
const metadataContent = document.getElementById('metadataContent');
const helpOverlay = document.getElementById('helpOverlay');

// Settings key for localStorage
const SETTINGS_KEY = 'photoSelectorSettings';

// Load settings from localStorage
function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return {
    slideShowSpeed: 2500,
    sortBy: 'name',
    lastFolder: null
  };
}

// Save settings to localStorage
function saveSettings() {
  try {
    const settings = {
      slideShowSpeed,
      sortBy: sortSelect.value,
      lastFolder: images.length > 0 ? images[0].path.split('/').slice(0, -1).join('/') : null
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// State
const settings = loadSettings();
let images = [];
let currentIndex = 0;
let isPlaying = false;
let playTimer = null;
let slideShowSpeed = settings.slideShowSpeed;
const selected = new Set();
const preloadPrev = new Image();
const preloadNext = new Image();

// Zoom & Pan state
let scale = 1;
let rotation = 0;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

// View state
let isGridView = false;
let isMetadataVisible = false;

// Helper Functions
function setStatus(message) {
  statusEl.textContent = message || '';
}

function updateControls() {
  const hasImages = images.length > 0;
  prevBtn.disabled = !hasImages;
  nextBtn.disabled = !hasImages;
  playBtn.disabled = !hasImages;
  viewToggleBtn.disabled = !hasImages;
  toggleSelectBtn.disabled = !hasImages;
  selectAllBtn.disabled = !hasImages;
  clearSelectionBtn.disabled = selected.size === 0;
  invertSelectionBtn.disabled = !hasImages;
  copyBtn.disabled = selected.size === 0;
  moveBtn.disabled = selected.size === 0;
  deleteBtn.disabled = !hasImages && selected.size === 0;
  
  zoomInBtn.disabled = !hasImages;
  zoomOutBtn.disabled = !hasImages;
  zoomResetBtn.disabled = !hasImages;
  rotateLeftBtn.disabled = !hasImages;
  rotateRightBtn.disabled = !hasImages;
  fullscreenBtn.disabled = !hasImages;
  
  speedSlider.disabled = !hasImages;
  sortSelect.disabled = !hasImages;
}

function updateSelectionUI() {
  selectionCount.textContent = `Selected: ${selected.size}`;
  if (images.length === 0) {
    toggleSelectBtn.textContent = 'Select';
    return;
  }

  const currentPath = images[currentIndex].path;
  const isSelected = selected.has(currentPath);
  toggleSelectBtn.textContent = isSelected ? 'Unselect' : 'Select';
  
  // Update visual indicator
  if (isSelected) {
    photoContainer.classList.add('selected');
  } else {
    photoContainer.classList.remove('selected');
  }
}

function preloadNeighbors() {
  if (images.length === 0) return;

  const prevIndex = (currentIndex - 1 + images.length) % images.length;
  const nextIndex = (currentIndex + 1) % images.length;
  preloadPrev.src = images[prevIndex].url;
  preloadNext.src = images[nextIndex].url;
}

function applyTransform() {
  photoEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotation}deg)`;
}

function resetTransform() {
  scale = 1;
  rotation = 0;
  translateX = 0;
  translateY = 0;
  applyTransform();
  zoomLevel.textContent = '100%';
}

async function loadMetadata() {
  if (images.length === 0 || !isMetadataVisible) return;
  
  const currentPath = images[currentIndex].path;
  const metadata = await window.photoApi.getMetadata(currentPath);
  
  if (metadata.error) {
    metadataContent.innerHTML = `<p>Error loading metadata: ${metadata.error}</p>`;
    return;
  }
  
  let html = '<table>';
  const labels = {
    fileName: 'File Name',
    fileSize: 'File Size',
    dimensions: 'Dimensions',
    modified: 'Modified',
    created: 'Created',
    dateTaken: 'Date Taken',
    cameraMake: 'Camera Make',
    cameraModel: 'Camera Model',
    iso: 'ISO',
    aperture: 'Aperture',
    shutter: 'Shutter Speed',
    focalLength: 'Focal Length',
    gps: 'GPS Location'
  };
  
  for (const [key, label] of Object.entries(labels)) {
    if (metadata[key]) {
      html += `<tr><td>${label}:</td><td>${metadata[key]}</td></tr>`;
    }
  }
  
  html += '</table>';
  metadataContent.innerHTML = html;
}

function renderImage() {
  if (images.length === 0) {
    photoEl.classList.remove('visible');
    emptyState.style.display = 'block';
    photoContainer.style.display = 'none';
    fileInfo.textContent = 'No images found in folder';
    updateSelectionUI();
    updateControls();
    return;
  }

  const item = images[currentIndex];
  photoEl.classList.remove('visible');
  photoContainer.style.display = 'flex';
  photoEl.src = item.url;
  photoEl.onload = () => {
    photoEl.classList.add('visible');
  };

  emptyState.style.display = 'none';
  fileInfo.textContent = `${item.name} (${currentIndex + 1}/${images.length})`;

  resetTransform();
  preloadNeighbors();
  updateSelectionUI();
  updateControls();
  loadMetadata();
}

function renderGrid() {
  gridView.innerHTML = '';
  
  images.forEach((item, index) => {
    const gridItem = document.createElement('div');
    gridItem.className = 'grid-item';
    if (selected.has(item.path)) gridItem.classList.add('selected');
    if (index === currentIndex) gridItem.classList.add('current');
    
    const img = document.createElement('img');
    img.src = item.url;
    img.loading = 'lazy';
    
    gridItem.appendChild(img);
    gridItem.addEventListener('click', () => {
      currentIndex = index;
      toggleView();
    });
    
    gridView.appendChild(gridItem);
  });
}

function toggleView() {
  isGridView = !isGridView;
  
  if (isGridView) {
    photoContainer.style.display = 'none';
    gridView.classList.add('active');
    viewToggleBtn.textContent = 'Photo View';
    renderGrid();
    
    if (isPlaying) {
      togglePlay(); // Stop slideshow in grid view
    }
  } else {
    photoContainer.style.display = 'flex';
    gridView.classList.remove('active');
    viewToggleBtn.textContent = 'Grid View';
    renderImage();
  }
}

function nextImage() {
  if (images.length === 0) return;
  currentIndex = (currentIndex + 1) % images.length;
  renderImage();
}

function prevImage() {
  if (images.length === 0) return;
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  renderImage();
}

function togglePlay() {
  if (!isPlaying) {
    isPlaying = true;
    playBtn.textContent = 'Pause';
    playTimer = setInterval(nextImage, slideShowSpeed);
  } else {
    isPlaying = false;
    playBtn.textContent = 'Play';
    clearInterval(playTimer);
    playTimer = null;
  }
}

function updateSlideShowSpeed() {
  slideShowSpeed = parseInt(speedSlider.value);
  speedValue.textContent = (slideShowSpeed / 1000).toFixed(1) + 's';
  
  if (isPlaying) {
    clearInterval(playTimer);
    playTimer = setInterval(nextImage, slideShowSpeed);
  }
  
  saveSettings();
}

function toggleSelect() {
  if (images.length === 0) return;
  const currentPath = images[currentIndex].path;
  if (selected.has(currentPath)) {
    selected.delete(currentPath);
  } else {
    selected.add(currentPath);
  }
  updateSelectionUI();
  updateControls();
}

function selectAll() {
  images.forEach(item => selected.add(item.path));
  updateSelectionUI();
  updateControls();
  if (isGridView) renderGrid();
}

function clearSelection() {
  selected.clear();
  updateSelectionUI();
  updateControls();
  if (isGridView) renderGrid();
}

function invertSelection() {
  const newSelection = new Set();
  images.forEach(item => {
    if (!selected.has(item.path)) {
      newSelection.add(item.path);
    }
  });
  selected.clear();
  newSelection.forEach(path => selected.add(path));
  updateSelectionUI();
  updateControls();
  if (isGridView) renderGrid();
}

async function chooseFolder() {
  const result = await window.photoApi.openFolder();
  if (result.canceled) return;

  images = result.images || [];
  currentIndex = 0;
  selected.clear();
  setStatus(`Loaded ${images.length} image(s) from ${result.folderPath}`);
  
  // Apply saved sort preference
  if (settings.sortBy) {
    sortSelect.value = settings.sortBy;
    sortImages(settings.sortBy);
  }
  
  renderImage();
  saveSettings();
}

async function runFileOperation(mode) {
  if (selected.size === 0) return;

  const destinationResult = await window.photoApi.chooseDestination();
  if (destinationResult.canceled) return;

  const files = Array.from(selected);
  setStatus(`${mode === 'copy' ? 'Copying' : 'Moving'} ${files.length} file(s)...`);

  const response = await window.photoApi.processFiles({
    files,
    destination: destinationResult.destination,
    mode
  });

  if (response.ok) {
    setStatus(`${mode === 'copy' ? 'Copied' : 'Moved'} ${files.length} file(s).`);
    if (mode === 'move') {
      images = images.filter((item) => !selected.has(item.path));
      selected.clear();
      if (currentIndex >= images.length) {
        currentIndex = 0;
      }
      if (isGridView) {
        renderGrid();
      } else {
        renderImage();
      }
    }
  } else {
    setStatus(`Operation failed: ${response.error}`);
  }

  updateSelectionUI();
  updateControls();
}

async function deleteFiles() {
  const filesToDelete = selected.size > 0 ? Array.from(selected) : [images[currentIndex].path];
  const count = filesToDelete.length;
  
  if (!confirm(`Move ${count} file(s) to trash?`)) return;
  
  setStatus(`Deleting ${count} file(s)...`);
  
  const response = await window.photoApi.deleteFiles(filesToDelete);
  
  if (response.ok) {
    setStatus(`Moved ${count} file(s) to trash.`);
    images = images.filter((item) => !filesToDelete.includes(item.path));
    selected.clear();
    if (currentIndex >= images.length) {
      currentIndex = Math.max(0, images.length - 1);
    }
    if (isGridView) {
      renderGrid();
    } else {
      renderImage();
    }
  } else {
    setStatus(`Delete failed: ${response.error}`);
  }
  
  updateSelectionUI();
  updateControls();
}

// Zoom functions
function zoomIn() {
  scale = Math.min(scale + 0.25, 5);
  applyTransform();
  zoomLevel.textContent = Math.round(scale * 100) + '%';
}

function zoomOut() {
  scale = Math.max(scale - 0.25, 0.25);
  applyTransform();
  zoomLevel.textContent = Math.round(scale * 100) + '%';
}

function resetZoom() {
  resetTransform();
}

// Rotation functions
function rotateLeft() {
  rotation = (rotation - 90) % 360;
  applyTransform();
}

function rotateRight() {
  rotation = (rotation + 90) % 360;
  applyTransform();
}

// Fullscreen
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.body.requestFullscreen();
    document.body.classList.add('fullscreen');
    fullscreenBtn.textContent = '⛶ Exit';
  } else {
    document.exitFullscreen();
    document.body.classList.remove('fullscreen');
    fullscreenBtn.textContent = '⛶';
  }
}

// Metadata panel
function toggleMetadata() {
  isMetadataVisible = !isMetadataVisible;
  if (isMetadataVisible) {
    metadataPanel.classList.add('active');
    loadMetadata();
  } else {
    metadataPanel.classList.remove('active');
  }
}

// Help overlay
function toggleHelp() {
  helpOverlay.classList.toggle('active');
}

// Sorting
function sortImages(sortBy) {
  if (sortBy === 'name') {
    images.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'date') {
    images.sort((a, b) => b.mtime - a.mtime);
  } else if (sortBy === 'size') {
    images.sort((a, b) => b.size - a.size);
  }
  
  // Find current image in new sort order
  const currentPath = images[currentIndex]?.path;
  if (currentPath) {
    currentIndex = images.findIndex(img => img.path === currentPath);
  }
  
  if (isGridView) {
    renderGrid();
  } else {
    renderImage();
  }
  
  setStatus(`Sorted by ${sortBy}`);
  saveSettings();
}

// Pan functionality
photoContainer.addEventListener('mousedown', (e) => {
  if (scale <= 1) return;
  isPanning = true;
  startX = e.clientX - translateX;
  startY = e.clientY - translateY;
  photoContainer.classList.add('panning');
});

document.addEventListener('mousemove', (e) => {
  if (!isPanning) return;
  translateX = e.clientX - startX;
  translateY = e.clientY - startY;
  applyTransform();
});

document.addEventListener('mouseup', () => {
  isPanning = false;
  photoContainer.classList.remove('panning');
});

// Wheel zoom
photoContainer.addEventListener('wheel', (e) => {
  if (images.length === 0) return;
  e.preventDefault();
  
  if (e.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
});

// Drag & Drop
stage.addEventListener('dragover', (e) => {
  e.preventDefault();
  stage.classList.add('dragging');
});

stage.addEventListener('dragleave', () => {
  stage.classList.remove('dragging');
});

stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  stage.classList.remove('dragging');
  
  const items = e.dataTransfer.items;
  if (!items || items.length === 0) return;
  
  const item = items[0];
  if (item.kind === 'file') {
    const entry = item.webkitGetAsEntry?.();
    if (entry && entry.isDirectory) {
      // Note: For security reasons, we can't directly access dropped folder paths
      // User must use the Open Folder button instead
      setStatus('Please use the "Open Folder" button to select a folder.');
    }
  }
});

// Event Listeners
openFolderBtn.addEventListener('click', chooseFolder);
prevBtn.addEventListener('click', prevImage);
nextBtn.addEventListener('click', nextImage);
playBtn.addEventListener('click', togglePlay);
viewToggleBtn.addEventListener('click', toggleView);
toggleSelectBtn.addEventListener('click', toggleSelect);
selectAllBtn.addEventListener('click', selectAll);
clearSelectionBtn.addEventListener('click', clearSelection);
invertSelectionBtn.addEventListener('click', invertSelection);
copyBtn.addEventListener('click', () => runFileOperation('copy'));
moveBtn.addEventListener('click', () => runFileOperation('move'));
deleteBtn.addEventListener('click', deleteFiles);
helpBtn.addEventListener('click', toggleHelp);

zoomInBtn.addEventListener('click', zoomIn);
zoomOutBtn.addEventListener('click', zoomOut);
zoomResetBtn.addEventListener('click', resetZoom);
rotateLeftBtn.addEventListener('click', rotateLeft);
rotateRightBtn.addEventListener('click', rotateRight);
fullscreenBtn.addEventListener('click', toggleFullscreen);

speedSlider.addEventListener('input', updateSlideShowSpeed);
sortSelect.addEventListener('change', (e) => sortImages(e.target.value));

helpOverlay.addEventListener('click', (e) => {
  if (e.target === helpOverlay) {
    toggleHelp();
  }
});

// Keyboard Shortcuts
window.addEventListener('keydown', (event) => {
  // Don't trigger shortcuts when typing in inputs
  if (event.target.tagName === 'INPUT') return;
  
  switch(event.key) {
    case 'ArrowRight':
      nextImage();
      break;
    case 'ArrowLeft':
      prevImage();
      break;
    case ' ':
      event.preventDefault();
      togglePlay();
      break;
    case 's':
    case 'S':
      toggleSelect();
      break;
    case 'a':
    case 'A':
      selectAll();
      break;
    case 'c':
    case 'C':
      clearSelection();
      break;
    case 'i':
    case 'I':
      invertSelection();
      break;
    case 'Delete':
    case 'Backspace':
      event.preventDefault();
      deleteFiles();
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    case 'g':
    case 'G':
      toggleView();
      break;
    case '[':
      rotateLeft();
      break;
    case ']':
      rotateRight();
      break;
    case '+':
    case '=':
      zoomIn();
      break;
    case '-':
    case '_':
      zoomOut();
      break;
    case '0':
      resetZoom();
      break;
    case 'm':
    case 'M':
      toggleMetadata();
      break;
    case '?':
      toggleHelp();
      break;
    case 'Escape':
      if (helpOverlay.classList.contains('active')) {
        toggleHelp();
      } else if (document.fullscreenElement) {
        toggleFullscreen();
      }
      break;
  }
});

// Fullscreen change event
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove('fullscreen');
    fullscreenBtn.textContent = '⛶';
  }
});

// Initialize
updateControls();
updateSelectionUI();

// Apply saved settings on startup
speedSlider.value = slideShowSpeed;
speedValue.textContent = (slideShowSpeed / 1000).toFixed(1) + 's';
sortSelect.value = settings.sortBy || 'name';
