# Photo Selector - Desktop Photo Viewer & Organizer

A powerful Electron-based desktop application for viewing, organizing, and managing your photo collections.

## Features

### Image Viewing
- **Slideshow Mode**: Auto-play through images with configurable speed (0.5s - 5s)
- **Grid View**: Browse all images as thumbnails for quick navigation
- **Zoom & Pan**: Zoom up to 500% and pan around large images with mouse drag
- **Image Rotation**: Rotate images 90° left or right
- **Fullscreen Mode**: Distraction-free viewing
- **Smooth Transitions**: Fade effects and preloading for seamless browsing

### File Management
- **Smart Selection**: Select individual images or use batch operations
- **Copy/Move**: Copy or move selected images to any folder
- **Delete to Trash**: Safely delete images (moves to system trash, not permanent)
- **Visual Indicators**: Checkmark badges show selected images
- **Batch Operations**:
  - Select All
  - Clear Selection
  - Invert Selection

### Image Organization
- **Multiple Sort Options**:
  - Sort by Name (alphabetical)
  - Sort by Date (most recent first)
  - Sort by Size (largest first)
- **EXIF Metadata Display**: View detailed photo information including:
  - Camera make and model
  - Exposure settings (ISO, aperture, shutter speed)
  - Focal length
  - Date taken
  - GPS coordinates (if available)
  - File size and dimensions

### User Experience
- **Keyboard Shortcuts**: Full keyboard navigation (press `?` for help)
- **Drag & Drop**: Visual feedback for folder dropping
- **Responsive UI**: Adapts to different screen sizes
- **Status Messages**: Real-time feedback for all operations
- **Dark Theme**: Easy on the eyes for long viewing sessions

### Format Support
Supports all major image formats:
- JPEG/JPG
- PNG
- GIF
- BMP
- WebP
- TIFF/TIF
- HEIC/HEIF
- AVIF
- SVG

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` `→` | Navigate previous/next image |
| `Space` | Play/pause slideshow |
| `S` | Select/unselect current image |
| `A` | Select all images |
| `C` | Clear selection |
| `I` | Invert selection |
| `Delete` | Delete current/selected images |
| `F` | Toggle fullscreen |
| `G` | Toggle grid/photo view |
| `[` `]` | Rotate left/right |
| `+` `-` | Zoom in/out |
| `0` | Reset zoom |
| `M` | Toggle metadata panel |
| `?` | Show help overlay |
| `Esc` | Close overlay/exit fullscreen |

## Mouse Controls

- **Click & Drag**: Pan around zoomed images
- **Mouse Wheel**: Zoom in/out
- **Click Thumbnail**: Jump to image in grid view
- **Click Buttons**: All features accessible via toolbar

## Development

Built with:
- Electron 39.2.7
- Native JavaScript (ES6+)
- CSS3 with CSS Grid and Flexbox
- EXIF metadata parsing

## Project Structure

```
.
├── main.js          # Electron main process
├── renderer.js      # UI logic and event handlers
├── preload.js       # IPC bridge
├── index.html       # App structure
├── styles.css       # All styling
└── package.json     # Dependencies
```

## New Features Added

This version includes major enhancements over the base photo selector:

1. ✨ **Zoom & Pan Controls** - Mouse wheel zoom and drag to pan
2. 🖼️ **Fullscreen Mode** - Immersive viewing experience
3. 🔄 **Image Rotation** - Rotate images in 90° increments
4. 🗑️ **Delete Functionality** - Move unwanted images to trash
5. 📋 **Grid View** - Thumbnail overview of all images
6. ⚡ **Batch Selection** - Select all, clear, invert operations
7. 📊 **EXIF Metadata** - Detailed photo information panel
8. 🔢 **Sort Options** - Sort by name, date, or size
9. ⌨️ **Keyboard Shortcuts** - Full keyboard navigation
10. 🎨 **Visual Indicators** - Checkmarks for selected images
11. ⏱️ **Configurable Speed** - Adjust slideshow timing
12. 📸 **Extended Format Support** - HEIC, AVIF, SVG support
13. 💡 **Help Overlay** - Built-in keyboard shortcut reference
14. 💾 **Settings Persistence** - Remembers your preferences

### Settings & Preferences
- **Persistent Settings**: Automatically remembers your preferences between sessions:
  - Slideshow speed
  - Sort order preference
  - Last opened folder path

## Future Enhancements

Potential improvements for future versions:
- Star rating system
- Image tags and labels
- Side-by-side comparison view
- Recent folders history
- Recursive folder loading
- Image resize/export tools
- Custom themes

## License

MIT
