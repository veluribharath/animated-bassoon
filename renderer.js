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

const findGroupsBtn = document.getElementById('findGroupsBtn');
const groupToggleBtn = document.getElementById('groupToggleBtn');
const groupCount = document.getElementById('groupCount');
const groupCompareOverlay = document.getElementById('groupCompareOverlay');
const compareCloseBtn = document.getElementById('compareCloseBtn');
const compareGrid = document.getElementById('compareGrid');
const deleteNonSelectedBtn = document.getElementById('deleteNonSelectedBtn');
const keepAllBtn = document.getElementById('keepAllBtn');

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
    lastFolder: null,
    groupingEnabled: false,
    groupingSettings: {
      timeThresholdSeconds: 10,
      similarityThreshold: 0.9,
      minGroupSize: 2
    }
  };
}

// Save settings to localStorage
function saveSettings() {
  try {
    const currentSettings = loadSettings();
    const settings = {
      slideShowSpeed,
      sortBy: sortSelect.value,
      lastFolder: images.length > 0 ? images[0].path.split('/').slice(0, -1).join('/') : null,
      groupingEnabled: currentSettings.groupingEnabled || false,
      groupingSettings: currentSettings.groupingSettings || {
        timeThresholdSeconds: 10,
        similarityThreshold: 0.9,
        minGroupSize: 2
      }
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

// Group state
let photoGroups = new Map();  // Map<groupId, GroupInfo>
let isGroupingMode = false;   // Toggle for group review mode
let expandedGroupId = null;   // Currently expanded group for comparison

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

  // Group controls
  findGroupsBtn.disabled = !hasImages;
  groupToggleBtn.disabled = photoGroups.size === 0;
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
  
  // Show loading indicator
  setStatus(`Loading ${images.length} thumbnails...`);
  
  // Use requestAnimationFrame to batch DOM updates and prevent freezing
  let batchIndex = 0;
  const batchSize = 20; // Load 20 thumbnails at a time
  
  function renderBatch() {
    const endIndex = Math.min(batchIndex + batchSize, images.length);
    
    for (let index = batchIndex; index < endIndex; index++) {
      const item = images[index];
      const gridItem = document.createElement('div');
      gridItem.className = 'grid-item';
      if (selected.has(item.path)) gridItem.classList.add('selected');
      if (index === currentIndex) gridItem.classList.add('current');
      
      const img = document.createElement('img');
      // Don't load image immediately - wait for intersection observer
      img.dataset.src = item.url;
      img.alt = item.name;
      img.loading = 'lazy';
      img.className = 'grid-thumbnail';
      
      // Add placeholder background
      gridItem.style.backgroundColor = '#1f2937';
      
      gridItem.appendChild(img);
      gridItem.addEventListener('click', () => {
        currentIndex = index;
        toggleView();
      });
      
      gridView.appendChild(gridItem);
    }
    
    batchIndex = endIndex;
    
    if (batchIndex < images.length) {
      // Continue with next batch
      requestAnimationFrame(renderBatch);
      setStatus(`Loading thumbnails... ${batchIndex}/${images.length}`);
    } else {
      // All batches done, now lazy load images using IntersectionObserver
      setStatus(`Grid view ready (${images.length} images)`);
      lazyLoadGridImages();
    }
  }
  
  // Start rendering batches
  requestAnimationFrame(renderBatch);
}

// Lazy load grid images using IntersectionObserver
let gridImageObserver = null;

function lazyLoadGridImages() {
  // Disconnect previous observer if it exists
  if (gridImageObserver) {
    gridImageObserver.disconnect();
  }
  
  gridImageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          delete img.dataset.src;
          gridImageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px', // Start loading slightly before entering viewport
    threshold: 0.01
  });
  
  // Observe all grid thumbnails
  const thumbnails = gridView.querySelectorAll('.grid-thumbnail');
  thumbnails.forEach(img => {
    if (img.dataset.src) {
      gridImageObserver.observe(img);
    }
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
    // Cleanup grid view
    if (gridImageObserver) {
      gridImageObserver.disconnect();
      gridImageObserver = null;
    }
    
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

// ====================
// Photo Grouping Functions
// ====================

// Find and group similar photos
async function findGroupsWithProgress() {
  if (images.length === 0) {
    setStatus('No images to group');
    return;
  }

  setStatus('Analyzing images for grouping...');
  const settings = loadSettings();
  const groupingSettings = settings.groupingSettings || {
    timeThresholdSeconds: 10,
    similarityThreshold: 0.9,
    minGroupSize: 2
  };

  try {
    const result = await window.photoApi.groupPhotos({
      images,
      settings: groupingSettings
    });

    if (!result.ok) {
      setStatus(`Grouping failed: ${result.error}`);
      return;
    }

    // Update images with enriched data
    images = result.enrichedImages;

    // Update groups map
    photoGroups.clear();
    result.groups.forEach(group => {
      photoGroups.set(group.id, {
        id: group.id,
        members: group.members,
        leaderId: group.leaderId,
        userOverrideId: null,
        collapsed: true
      });
    });

    // Update UI
    groupCount.textContent = `Groups: ${photoGroups.size}`;
    setStatus(`Found ${photoGroups.size} groups of similar photos`);

    // Auto-switch to group view if groups found
    if (photoGroups.size > 0 && !isGroupingMode) {
      toggleGroupingMode();
    }
  } catch (error) {
    console.error('Grouping error:', error);
    setStatus(`Grouping failed: ${error.message}`);
  }
}

// Toggle grouping mode
function toggleGroupingMode() {
  isGroupingMode = !isGroupingMode;

  if (isGroupingMode) {
    groupToggleBtn.textContent = 'Normal View';
    if (isGridView) {
      renderGridWithGroups();
    } else {
      // Switch to grid view for grouping
      toggleView();
    }
  } else {
    groupToggleBtn.textContent = 'Group View';
    if (isGridView) {
      renderGrid();
    }
  }
}

// Render grid with group containers
function renderGridWithGroups() {
  if (!isGroupingMode || photoGroups.size === 0) {
    renderGrid();
    return;
  }

  gridView.innerHTML = '';
  setStatus(`Rendering ${photoGroups.size} groups...`);

  // Render groups
  photoGroups.forEach(group => {
    const groupContainer = createGroupContainer(group);
    gridView.appendChild(groupContainer);
  });

  // Render ungrouped images
  const ungroupedImages = images.filter(img => !img.groupId);
  ungroupedImages.forEach(img => {
    const gridItem = createStandardGridItem(img);
    gridView.appendChild(gridItem);
  });

  // Apply lazy loading
  lazyLoadGridImages();
  setStatus(`Group view ready (${photoGroups.size} groups, ${ungroupedImages.length} ungrouped)`);
}

// Create group container element
function createGroupContainer(group) {
  const container = document.createElement('div');
  container.className = 'group-container';
  container.dataset.groupId = group.id;

  // Group header
  const header = document.createElement('div');
  header.className = 'group-header';

  const badge = document.createElement('span');
  badge.className = 'group-badge';
  badge.textContent = `${group.members.length} similar photos`;

  const expandBtn = document.createElement('button');
  expandBtn.className = 'group-expand-btn';
  expandBtn.textContent = group.collapsed ? 'Expand' : 'Collapse';
  expandBtn.addEventListener('click', () => toggleGroupExpand(group.id));

  const compareBtn = document.createElement('button');
  compareBtn.className = 'group-expand-btn';
  compareBtn.textContent = 'Compare & Choose';
  compareBtn.style.marginLeft = '8px';
  compareBtn.addEventListener('click', () => showGroupComparison(group.id));

  header.appendChild(badge);
  header.appendChild(document.createTextNode(' '));
  header.appendChild(compareBtn);
  header.appendChild(expandBtn);
  container.appendChild(header);

  // Leader thumbnail
  const leaderPath = group.userOverrideId || group.leaderId;
  const leaderImg = images.find(img => img.path === leaderPath);
  if (leaderImg) {
    const leaderThumbnail = createGroupThumbnail(leaderImg, true, group.id);
    container.appendChild(leaderThumbnail);
  }

  // Expanded members
  if (!group.collapsed) {
    const membersContainer = document.createElement('div');
    membersContainer.className = 'group-members';

    group.members
      .filter(path => path !== leaderPath)
      .forEach(path => {
        const img = images.find(i => i.path === path);
        if (img) {
          const thumbnail = createGroupThumbnail(img, false, group.id);
          membersContainer.appendChild(thumbnail);
        }
      });

    container.appendChild(membersContainer);
  }

  return container;
}

// Create thumbnail for group member
function createGroupThumbnail(img, isLeader, groupId) {
  const gridItem = document.createElement('div');
  gridItem.className = `grid-item ${isLeader ? 'group-leader' : 'group-member'}`;
  gridItem.dataset.groupId = groupId;
  gridItem.dataset.path = img.path;

  const thumbnail = document.createElement('img');
  thumbnail.dataset.src = img.url;
  thumbnail.alt = img.name;
  thumbnail.loading = 'lazy';
  thumbnail.className = 'grid-thumbnail';

  gridItem.appendChild(thumbnail);

  // Leader badge
  if (isLeader) {
    const badge = document.createElement('div');
    badge.className = 'leader-badge';
    badge.textContent = 'BEST';
    gridItem.appendChild(badge);
  }

  // Click to select as leader (if not already leader)
  if (!isLeader) {
    gridItem.addEventListener('click', () => {
      selectAsGroupLeader(groupId, img.path);
    });
  }

  return gridItem;
}

// Create standard grid item (for ungrouped images)
function createStandardGridItem(img) {
  const gridItem = document.createElement('div');
  gridItem.className = 'grid-item';
  if (selected.has(img.path)) gridItem.classList.add('selected');

  const thumbnail = document.createElement('img');
  thumbnail.dataset.src = img.url;
  thumbnail.alt = img.name;
  thumbnail.loading = 'lazy';
  thumbnail.className = 'grid-thumbnail';

  gridItem.appendChild(thumbnail);

  gridItem.addEventListener('click', () => {
    const index = images.findIndex(i => i.path === img.path);
    if (index !== -1) {
      currentIndex = index;
      toggleView();
    }
  });

  return gridItem;
}

// Toggle group expand/collapse
function toggleGroupExpand(groupId) {
  const group = photoGroups.get(groupId);
  if (!group) return;

  group.collapsed = !group.collapsed;
  photoGroups.set(groupId, group);

  renderGridWithGroups();
}

// Show group comparison overlay
function showGroupComparison(groupId) {
  const group = photoGroups.get(groupId);
  if (!group) return;

  expandedGroupId = groupId;
  compareGrid.innerHTML = '';

  const leaderPath = group.userOverrideId || group.leaderId;

  group.members.forEach(path => {
    const img = images.find(i => i.path === path);
    if (!img) return;

    const isLeader = path === leaderPath;

    const card = document.createElement('div');
    card.className = `compare-card ${isLeader ? 'selected' : ''}`;
    card.dataset.path = path;

    const imgEl = document.createElement('img');
    imgEl.src = img.url;
    imgEl.alt = img.name;

    const info = document.createElement('div');
    info.className = 'compare-info';

    const fileName = document.createElement('p');
    fileName.textContent = img.name;

    const meta = document.createElement('p');
    meta.className = 'compare-meta';
    const dimensions = img.dimensions ? `${img.dimensions.width}×${img.dimensions.height}` : 'N/A';
    const fileSize = formatFileSize(img.size);
    meta.textContent = `${dimensions} • ${fileSize}`;

    const quality = document.createElement('p');
    quality.className = 'compare-quality';
    quality.textContent = `Quality Score: ${img.qualityScore || 0}/100`;

    info.appendChild(fileName);
    info.appendChild(meta);
    info.appendChild(quality);

    const selectBtn = document.createElement('button');
    selectBtn.className = 'select-best-btn';
    selectBtn.textContent = isLeader ? '✓ Selected' : 'Select as Best';
    selectBtn.dataset.path = path;

    selectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectAsGroupLeader(groupId, path);
      updateComparisonUI(groupId);
    });

    card.appendChild(imgEl);
    card.appendChild(info);
    card.appendChild(selectBtn);

    compareGrid.appendChild(card);
  });

  groupCompareOverlay.classList.add('active');
}

// Update comparison overlay UI after leader change
function updateComparisonUI(groupId) {
  const group = photoGroups.get(groupId);
  if (!group) return;

  const leaderPath = group.userOverrideId || group.leaderId;

  document.querySelectorAll('.compare-card').forEach(card => {
    const cardPath = card.dataset.path;
    const isLeader = cardPath === leaderPath;

    if (isLeader) {
      card.classList.add('selected');
      const btn = card.querySelector('.select-best-btn');
      if (btn) btn.textContent = '✓ Selected';
    } else {
      card.classList.remove('selected');
      const btn = card.querySelector('.select-best-btn');
      if (btn) btn.textContent = 'Select as Best';
    }
  });
}

// Select a photo as group leader
function selectAsGroupLeader(groupId, newLeaderPath) {
  const group = photoGroups.get(groupId);
  if (!group) return;

  group.userOverrideId = newLeaderPath;
  photoGroups.set(groupId, group);

  // Update images array
  group.members.forEach(path => {
    const img = images.find(i => i.path === path);
    if (img) {
      img.isGroupLeader = (path === newLeaderPath);
    }
  });

  // Re-render if in group view
  if (isGroupingMode && isGridView) {
    renderGridWithGroups();
  }

  setStatus(`Updated group leader`);
}

// Delete non-selected photos from current group
async function deleteGroupRejects() {
  if (!expandedGroupId) return;

  const group = photoGroups.get(expandedGroupId);
  if (!group) return;

  const keepPath = group.userOverrideId || group.leaderId;
  const deletePaths = group.members.filter(path => path !== keepPath);

  if (deletePaths.length === 0) {
    setStatus('No photos to delete');
    return;
  }

  if (!confirm(`Delete ${deletePaths.length} photo(s) from this group?`)) {
    return;
  }

  setStatus(`Deleting ${deletePaths.length} photo(s)...`);

  try {
    const result = await window.photoApi.deleteGroupRejects({
      keepPath,
      deletePaths
    });

    if (result.ok) {
      // Remove deleted images from images array
      images = images.filter(img => !deletePaths.includes(img.path));

      // Update group
      group.members = [keepPath];
      photoGroups.set(expandedGroupId, group);

      // If group only has 1 member, remove it
      if (group.members.length < 2) {
        photoGroups.delete(expandedGroupId);
      }

      // Update UI
      groupCount.textContent = `Groups: ${photoGroups.size}`;
      groupCompareOverlay.classList.remove('active');
      expandedGroupId = null;

      if (isGroupingMode && isGridView) {
        renderGridWithGroups();
      }

      setStatus(`Deleted ${result.deleted} photo(s)`);
    } else {
      setStatus(`Delete failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Delete error:', error);
    setStatus(`Delete failed: ${error.message}`);
  }
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

// Group controls
findGroupsBtn.addEventListener('click', findGroupsWithProgress);
groupToggleBtn.addEventListener('click', toggleGroupingMode);

// Comparison overlay
compareCloseBtn.addEventListener('click', () => {
  groupCompareOverlay.classList.remove('active');
  expandedGroupId = null;
});
deleteNonSelectedBtn.addEventListener('click', deleteGroupRejects);
keepAllBtn.addEventListener('click', () => {
  groupCompareOverlay.classList.remove('active');
  expandedGroupId = null;
});

// Close comparison overlay when clicking outside
groupCompareOverlay.addEventListener('click', (e) => {
  if (e.target === groupCompareOverlay) {
    groupCompareOverlay.classList.remove('active');
    expandedGroupId = null;
  }
});

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
      if (event.shiftKey && photoGroups.size > 0) {
        toggleGroupingMode();
      } else {
        toggleView();
      }
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
      if (groupCompareOverlay.classList.contains('active')) {
        groupCompareOverlay.classList.remove('active');
        expandedGroupId = null;
      } else if (helpOverlay.classList.contains('active')) {
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
