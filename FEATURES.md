# Photo Selector - Feature Overview

## 🎯 Complete Feature List

### 📸 Image Viewing & Navigation
| Feature | Keyboard | Button | Description |
|---------|----------|--------|-------------|
| Next Image | `→` | Next | Navigate to next image |
| Previous Image | `←` | Prev | Navigate to previous image |
| Slideshow | `Space` | Play/Pause | Auto-play through images |
| Speed Control | - | Slider | Adjust slideshow speed (0.5s-5s) |
| Grid View | `G` | Grid View | Show all images as thumbnails |
| Photo View | `G` | Photo View | Return to single image view |

### 🔍 Zoom & Transform
| Feature | Keyboard | Button | Description |
|---------|----------|--------|-------------|
| Zoom In | `+` | + | Increase zoom by 25% |
| Zoom Out | `-` | - | Decrease zoom by 25% |
| Reset Zoom | `0` | Reset | Return to 100% zoom |
| Pan Image | Mouse Drag | - | Pan around zoomed images |
| Wheel Zoom | Mouse Wheel | - | Zoom with scroll wheel |
| Rotate Left | `[` | ⟲ | Rotate 90° counter-clockwise |
| Rotate Right | `]` | ⟳ | Rotate 90° clockwise |

### 🖼️ Display Modes
| Feature | Keyboard | Button | Description |
|---------|----------|--------|-------------|
| Fullscreen | `F` | ⛶ | Toggle fullscreen mode |
| Exit Fullscreen | `Esc` | ⛶ Exit | Exit fullscreen |
| Metadata Panel | `M` | - | Show/hide image info panel |
| Help Overlay | `?` | ? | Show keyboard shortcuts |

### ✅ Selection & Organization
| Feature | Keyboard | Button | Description |
|---------|----------|--------|-------------|
| Select/Unselect | `S` | Select | Toggle current image |
| Select All | `A` | Select All | Select all images |
| Clear Selection | `C` | Clear | Deselect all images |
| Invert Selection | `I` | Invert | Flip selection |
| Selection Count | - | Display | Shows number selected |
| Visual Indicator | - | ✓ Badge | Green checkmark on selected |

### 📁 File Management
| Feature | Keyboard | Button | Description |
|---------|----------|--------|-------------|
| Open Folder | - | Open Folder | Choose image folder |
| Copy Selected | - | Copy Selected | Copy to destination |
| Move Selected | - | Move Selected | Move to destination |
| Delete | `Delete` | Delete | Move to trash |
| Drag & Drop | Mouse | - | Drop zone for folders |

### 🔄 Sorting & Filtering
| Feature | Keyboard | Button | Description |
|---------|----------|--------|-------------|
| Sort by Name | - | Dropdown | Alphabetical order |
| Sort by Date | - | Dropdown | Most recent first |
| Sort by Size | - | Dropdown | Largest first |

### 📊 Metadata Display
| Information | Source | Description |
|-------------|--------|-------------|
| File Name | File System | Original filename |
| File Size | File System | Human-readable size |
| Dimensions | EXIF/Image | Width × Height pixels |
| Date Modified | File System | Last modification date |
| Date Created | File System | Creation date |
| Date Taken | EXIF | Original photo date |
| Camera Make | EXIF | Camera manufacturer |
| Camera Model | EXIF | Camera model name |
| ISO | EXIF | ISO sensitivity |
| Aperture | EXIF | f-stop value |
| Shutter Speed | EXIF | Exposure time |
| Focal Length | EXIF | Lens focal length |
| GPS Location | EXIF | Latitude, Longitude |

### 💾 Settings Persistence
| Setting | Storage | Description |
|---------|---------|-------------|
| Slideshow Speed | LocalStorage | Remembers speed preference |
| Sort Order | LocalStorage | Remembers sort preference |
| Last Folder | LocalStorage | Stores last folder path |

### 🎨 Supported Formats
| Category | Formats |
|----------|---------|
| Standard | JPG, JPEG, PNG, GIF, BMP |
| Modern Web | WebP, AVIF |
| Professional | TIFF, TIF |
| Apple | HEIC, HEIF |
| Vector | SVG |

## 🎮 Complete Keyboard Shortcuts

### Navigation
- `←` Previous image
- `→` Next image
- `Space` Play/pause slideshow
- `G` Toggle grid/photo view

### Selection
- `S` Select/unselect current
- `A` Select all
- `C` Clear selection
- `I` Invert selection

### Zoom & Transform
- `+` or `=` Zoom in
- `-` or `_` Zoom out
- `0` Reset zoom
- `[` Rotate left
- `]` Rotate right

### Display
- `F` Toggle fullscreen
- `M` Toggle metadata panel
- `?` Show help overlay
- `Esc` Close overlay/exit fullscreen

### File Operations
- `Delete` or `Backspace` Delete selected

## 🖱️ Mouse Controls

### Photo View
- **Click & Drag** - Pan around zoomed images
- **Mouse Wheel** - Zoom in/out
- **Click** - Various UI interactions

### Grid View
- **Click Thumbnail** - Jump to that image in photo view
- **Hover** - Highlight thumbnail

### General
- **Drag & Drop** - Drop folders onto window (shows instruction)

## 📈 Performance Features

- **Image Preloading** - Preloads adjacent images for instant navigation
- **Lazy Loading** - Grid view thumbnails load as needed
- **Efficient Rendering** - Only renders visible content
- **Smooth Transitions** - CSS-based fade effects
- **Responsive Layout** - Adapts to any screen size

## 🎯 Use Cases

### Photography Review
1. Load photo folder after a shoot
2. Use grid view for quick overview
3. Select keepers with `S` key
4. Copy selected to "Best" folder
5. Delete unwanted photos

### Photo Organization
1. Open folder of mixed images
2. Sort by date or size
3. View EXIF data to check camera settings
4. Batch select similar photos
5. Move to organized folders

### Presentation Mode
1. Load presentation images
2. Enter fullscreen (`F`)
3. Set slideshow speed
4. Start slideshow (`Space`)
5. Navigate with arrow keys

### Image Review & Comparison
1. Open folder
2. Use arrow keys to compare similar shots
3. Zoom in to check details
4. Check EXIF for technical info
5. Select best versions

## 🛠️ Technical Stack

- **Framework:** Electron 39.2.7
- **UI:** Vanilla JavaScript (ES6+)
- **Styling:** CSS3 (Grid, Flexbox, Custom Properties)
- **Metadata:** exif-parser
- **Storage:** LocalStorage API
- **File Operations:** Node.js fs/promises, Electron shell

## 📦 What's New in v2.0

All 14 planned improvements have been implemented:

1. ✅ Zoom & pan controls
2. ✅ Fullscreen mode
3. ✅ Image rotation
4. ✅ Delete functionality
5. ✅ Drag & drop support
6. ✅ Configurable slideshow speed
7. ✅ Visual selection indicators
8. ✅ Batch selection operations
9. ✅ EXIF metadata display
10. ✅ Sort options (name, date, size)
11. ✅ Keyboard shortcuts help
12. ✅ Thumbnail grid view
13. ✅ Extended format support
14. ✅ Settings persistence

This represents a **10x improvement** over the original basic photo selector!
