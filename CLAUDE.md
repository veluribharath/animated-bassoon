# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Photo Selector is an Electron-based desktop photo viewer and organizer with advanced features including slideshow, grid view, zoom/pan, rotation, EXIF metadata display, batch operations, and file management capabilities.

**Tech Stack:**
- Electron 39.2.7 (main process, renderer process, preload script architecture)
- Vanilla JavaScript (ES6+)
- CSS3 (Grid, Flexbox)
- exif-parser for EXIF metadata extraction

## Commands

### Development
```bash
npm install          # Install dependencies
npm start           # Run the application
```

### Testing
There are no automated tests in this project.

## Architecture

### Electron Process Model

This application follows the standard Electron security model with three isolated components:

1. **Main Process** (`main.js`):
   - Manages app lifecycle, window creation, and native OS operations
   - Handles file system operations (read directory, file stats, copy/move/delete)
   - Exposes IPC handlers for: `open-folder`, `get-metadata`, `choose-destination`, `process-files`, `delete-files`, `validate-folder`
   - Uses `electron.shell.trashItem()` for safe file deletion (moves to trash, not permanent)
   - Implements cross-device file move fallback (copy + delete when rename fails with EXDEV error)
   - EXIF parsing happens here in main process for security (using exif-parser library)

2. **Preload Script** (`preload.js`):
   - Security bridge between main and renderer processes
   - Uses `contextBridge` to expose safe `photoApi` to renderer
   - All IPC communication flows through this predefined API surface

3. **Renderer Process** (`renderer.js` + `index.html` + `styles.css`):
   - UI logic, event handling, and user interactions
   - No direct Node.js or Electron API access (enforces contextIsolation)
   - Manages application state: image list, current index, selection set, zoom/pan/rotation state, view mode
   - Uses IntersectionObserver for lazy loading grid thumbnails to prevent UI freezing with large image collections

### State Management

State is managed in `renderer.js` with the following key structures:

- `images[]` - Array of image objects with `{path, url, name, size, mtime}` properties
- `currentIndex` - Currently displayed image index
- `selected` - Set of selected file paths
- `scale`, `rotation`, `translateX`, `translateY` - Transform state for zoom/pan/rotation
- `isGridView`, `isMetadataVisible` - View mode toggles
- `isPlaying`, `playTimer`, `slideShowSpeed` - Slideshow state

Settings (slideshow speed, sort order, last folder) are persisted to localStorage and loaded on startup.

### Image Loading and Performance

- **Preloading**: Adjacent images (prev/next) are preloaded using Image objects for instant navigation
- **Lazy Loading**: Grid view uses IntersectionObserver with `rootMargin: '50px'` to load thumbnails only when near viewport
- **Batch Rendering**: Grid view renders in batches of 20 thumbnails using `requestAnimationFrame` to prevent UI blocking with large collections
- **File URL Conversion**: Uses `pathToFileURL()` to convert file paths to `file://` URLs for img src attributes

### IPC Communication Pattern

All renderer-to-main communication uses async IPC invoke/handle pattern:

```javascript
// Renderer calls
const result = await window.photoApi.openFolder();

// Main handles
ipcMain.handle('open-folder', async () => { ... });
```

Return values follow `{ok, error}` or `{canceled, data}` patterns for consistent error handling.

### Supported Image Formats

Defined in `IMAGE_EXTENSIONS` in `main.js:7-10`:
JPG, JPEG, PNG, GIF, BMP, WebP, TIFF, TIF, HEIC, HEIF, AVIF, SVG

## Code Organization

- **main.js**: Electron main process - window creation, file operations, EXIF parsing
- **renderer.js**: UI logic - state management, event handlers, rendering, keyboard shortcuts
- **preload.js**: IPC bridge - exposes photoApi to renderer
- **index.html**: DOM structure - all UI elements and overlays
- **styles.css**: All styling - uses CSS custom properties, flexbox, grid

## Key Implementation Details

### Transform System
Images use CSS transforms combining translate, scale, and rotate. The `applyTransform()` function (renderer.js:156) applies all transforms in order. Panning is only enabled when `scale > 1`.

### File Operations
The `getUniquePath()` function (main.js:163) handles filename conflicts by appending `(1)`, `(2)`, etc. The `moveFile()` function (main.js:177) handles cross-device moves by falling back to copy+delete when `rename()` fails with EXDEV error code.

### Grid View Performance Fix
Grid view was recently optimized (see commit 407bb94) to handle large collections by:
- Batching DOM updates (20 items per frame)
- Using IntersectionObserver for lazy image loading
- Adding status messages during rendering
- Using `requestAnimationFrame` for smooth rendering

### Sort Behavior
When sorting (renderer.js:573), the current image is tracked across the re-sort by finding its path in the newly sorted array. This prevents the view from jumping to a different image after sorting.

### Metadata Loading
EXIF metadata is only loaded for JPEG/JPG files. The metadata panel shows file stats for all formats but camera/GPS data only for JPEGs with EXIF data.

## Common Patterns

### Adding New Keyboard Shortcuts
Add to the switch statement in the keydown event listener (renderer.js:690). Check for input focus to avoid triggering during text entry.

### Adding New IPC Handlers
1. Add handler in main.js: `ipcMain.handle('handler-name', async (event, args) => { ... })`
2. Expose in preload.js: `handlerName: (args) => ipcRenderer.invoke('handler-name', args)`
3. Call from renderer: `await window.photoApi.handlerName(args)`

### Adding New UI Controls
1. Add button/element to index.html
2. Get element reference in renderer.js DOM Elements section
3. Add event listener in Event Listeners section
4. Implement handler function
5. Update `updateControls()` to manage enabled/disabled state

## Important Notes

- Always use `photoApi` methods for file system access - never try to use Node.js directly in renderer
- File deletion uses `shell.trashItem()` - files go to OS trash, not permanent deletion
- The app uses `contextIsolation: true` and `nodeIntegration: false` for security
- All file paths are converted to file:// URLs for use in img src attributes
- Settings are persisted to localStorage with key `photoSelectorSettings`
