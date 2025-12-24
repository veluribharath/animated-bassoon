# Changelog

## v2.0.0 - Major Feature Update

### New Features

#### High Priority
- **Zoom & Pan Controls** (renderer.js:372-410)
  - Mouse wheel zooming (25% increments, up to 500%)
  - Click and drag to pan around zoomed images
  - Zoom in/out buttons with keyboard shortcuts (+/-)
  - Reset zoom button (0 key)
  - Real-time zoom percentage display

- **Fullscreen Mode** (renderer.js:422-432)
  - Toggle fullscreen with F key or button
  - Auto-hide toolbar and status bar in fullscreen
  - Exit with Esc key
  - Dedicated fullscreen toggle button

- **Image Rotation** (renderer.js:413-421)
  - Rotate 90° left with [ key
  - Rotate 90° right with ] key
  - Rotation buttons in toolbar
  - Rotation preserved during zoom/pan

- **Delete Functionality** (main.js:214-228, renderer.js:335-364)
  - Move files to system trash (not permanent deletion)
  - Delete current image or all selected images
  - Confirmation dialog before deletion
  - Automatically updates image list after deletion
  - Delete key or Delete button

- **Drag & Drop Support** (renderer.js:537-558)
  - Visual feedback when dragging folders
  - Drop zone highlights on drag over
  - Helpful message directing to Open Folder button

#### Medium Priority
- **Configurable Slideshow Speed** (renderer.js:272-281, index.html:30-33)
  - Range slider from 0.5s to 5s
  - Real-time speed display
  - Updates active slideshow immediately
  - Persistent across sessions

- **Visual Selection Indicators** (styles.css:126-140, 178-191)
  - Green checkmark badge on selected images
  - Checkmarks visible in both photo and grid view
  - Positioned in top-right corner
  - Clear visual feedback

- **Batch Selection Operations** (renderer.js:283-311)
  - Select All (A key) - select all images
  - Clear Selection (C key) - deselect everything
  - Invert Selection (I key) - flip selection
  - Individual toggle with S key
  - Buttons in toolbar

- **EXIF Metadata Display** (main.js:41-91, renderer.js:117-149)
  - Toggle panel with M key
  - Displays camera make and model
  - Shows exposure settings (ISO, aperture, shutter speed)
  - Focal length information
  - Date taken and GPS coordinates
  - File size and dimensions
  - Automatic extraction from JPEG files

- **Sort Options** (renderer.js:449-468, index.html:35-39)
  - Sort by Name (alphabetical)
  - Sort by Date (most recent first)
  - Sort by Size (largest first)
  - Maintains current image selection after sort
  - Dropdown selector in toolbar

- **Keyboard Shortcuts Help** (index.html:67-89, styles.css:262-306)
  - Press ? to show overlay
  - Comprehensive shortcut list
  - Click anywhere or Esc to close
  - Clean, organized layout
  - Dark overlay with centered modal

#### Low Priority
- **Thumbnail Grid View** (renderer.js:206-228, styles.css:158-220)
  - Toggle with G key
  - Auto-fill responsive grid layout
  - Lazy loading for performance
  - Click thumbnail to view full size
  - Visual indicators for current and selected images
  - Checkmarks on selected thumbnails

- **Extended Format Support** (main.js:7-9)
  - HEIC/HEIF (Apple photos)
  - AVIF (modern web format)
  - SVG (vector graphics)
  - TIFF/TIF (professional photography)
  - All existing formats maintained

- **Settings Persistence** (renderer.js:3-37)
  - Remembers slideshow speed
  - Saves sort order preference
  - Stores last folder path
  - Uses localStorage
  - Auto-loads on startup

### UI/UX Improvements
- Larger default window size (1400x900)
- Three-section toolbar layout (left/center/right)
- Better responsive design for small screens
- Improved color scheme with success/danger colors
- Smooth transitions and hover effects
- Better button organization and grouping
- Status messages for all operations
- Loading states and feedback

### Technical Improvements
- Added exif-parser dependency for metadata extraction
- Improved file metadata collection (size, dates)
- Better error handling throughout
- More organized code structure
- Comprehensive event handling
- Performance optimizations with preloading
- Proper cleanup of event listeners

### Bug Fixes
- Fixed image sorting to preserve current selection
- Proper handling of cross-device file moves
- Better handling of empty folders
- Improved edge cases in navigation

### Files Modified
- `index.html` - Complete UI restructure with new controls
- `styles.css` - Major styling overhaul with new components
- `renderer.js` - Complete rewrite with all new features
- `main.js` - Enhanced with metadata extraction and delete
- `preload.js` - Added new IPC methods
- `package.json` - Added exif-parser dependency

### Dependencies Added
- exif-parser@0.1.12 - For EXIF metadata extraction

---

## v1.0.0 - Initial Release

Basic photo viewer with:
- Folder selection
- Previous/Next navigation
- Slideshow mode
- Image selection
- Copy/Move operations
- Basic image format support
