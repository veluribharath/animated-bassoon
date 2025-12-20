const openFolderBtn = document.getElementById('openFolderBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playBtn = document.getElementById('playBtn');
const toggleSelectBtn = document.getElementById('toggleSelectBtn');
const copyBtn = document.getElementById('copyBtn');
const moveBtn = document.getElementById('moveBtn');

const photoEl = document.getElementById('photo');
const emptyState = document.getElementById('emptyState');
const fileInfo = document.getElementById('fileInfo');
const selectionCount = document.getElementById('selectionCount');
const statusEl = document.getElementById('status');

let images = [];
let currentIndex = 0;
let isPlaying = false;
let playTimer = null;
const selected = new Set();
const preloadPrev = new Image();
const preloadNext = new Image();

function setStatus(message) {
  statusEl.textContent = message || '';
}

function updateControls() {
  const hasImages = images.length > 0;
  prevBtn.disabled = !hasImages;
  nextBtn.disabled = !hasImages;
  playBtn.disabled = !hasImages;
  toggleSelectBtn.disabled = !hasImages;
  copyBtn.disabled = selected.size === 0;
  moveBtn.disabled = selected.size === 0;
}

function updateSelectionUI() {
  selectionCount.textContent = `Selected: ${selected.size}`;
  if (images.length === 0) {
    toggleSelectBtn.textContent = 'Select';
    return;
  }

  const currentPath = images[currentIndex].path;
  toggleSelectBtn.textContent = selected.has(currentPath) ? 'Unselect' : 'Select';
}

function preloadNeighbors() {
  if (images.length === 0) return;

  const prevIndex = (currentIndex - 1 + images.length) % images.length;
  const nextIndex = (currentIndex + 1) % images.length;
  preloadPrev.src = images[prevIndex].url;
  preloadNext.src = images[nextIndex].url;
}

function renderImage() {
  if (images.length === 0) {
    photoEl.classList.remove('visible');
    emptyState.style.display = 'block';
    fileInfo.textContent = 'No images found in folder';
    updateSelectionUI();
    updateControls();
    return;
  }

  const item = images[currentIndex];
  photoEl.classList.remove('visible');
  photoEl.src = item.url;
  photoEl.onload = () => {
    photoEl.classList.add('visible');
  };

  emptyState.style.display = 'none';
  fileInfo.textContent = `${item.name} (${currentIndex + 1}/${images.length})`;

  preloadNeighbors();
  updateSelectionUI();
  updateControls();
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
    playTimer = setInterval(nextImage, 2500);
  } else {
    isPlaying = false;
    playBtn.textContent = 'Play';
    clearInterval(playTimer);
    playTimer = null;
  }
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

async function chooseFolder() {
  const result = await window.photoApi.openFolder();
  if (result.canceled) return;

  images = result.images || [];
  currentIndex = 0;
  selected.clear();
  setStatus(`Loaded ${images.length} image(s) from ${result.folderPath}`);
  renderImage();
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
      renderImage();
    }
  } else {
    setStatus(`Operation failed: ${response.error}`);
  }

  updateSelectionUI();
  updateControls();
}

openFolderBtn.addEventListener('click', chooseFolder);
prevBtn.addEventListener('click', prevImage);
nextBtn.addEventListener('click', nextImage);
playBtn.addEventListener('click', togglePlay);
toggleSelectBtn.addEventListener('click', toggleSelect);
copyBtn.addEventListener('click', () => runFileOperation('copy'));
moveBtn.addEventListener('click', () => runFileOperation('move'));

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') nextImage();
  if (event.key === 'ArrowLeft') prevImage();
  if (event.key === ' ') {
    event.preventDefault();
    togglePlay();
  }
  if (event.key === 's') toggleSelect();
});
