# Lottie Pose Studio & SVG / Image Exporter

An interactive, zero-dependency local web studio for extracting static poses from Lottie animations, customizing limb angles and colors, and exporting them as vector **SVG**, high-resolution **PNG/JPEG/WebP**, or modified **Lottie JSON**.

---

## 🚀 How to Run

You can launch the studio in two ways:

1. **Direct Double-Click**:
   Double-click [index.html](file:///C:/Users/Helix/Desktop/test/animation/index.html) in your file explorer. It works 100% offline out-of-the-box (no installation needed).

2. **Via Local Web Server**:
   Double-click [start.bat](file:///C:/Users/Helix/Desktop/test/animation/start.bat) to launch a local server at `http://localhost:8080`.

---

## 🎨 Features

### 1. Frame Scrubbing & Pose Selection
* **Timeline Scrubber**: Scrub across all 60 frames (0.00s to 2.00s) to freeze the exact movement you want.
* **Play / Pause / Step Controls**: Play in real-time, step backward (`◀` or Left Arrow key), or step forward (`▶` or Right Arrow key).
* **Quick Pose Bookmarks**: Instant buttons for key character poses (Frame 0, 15, 30, 45, 59).

### 2. Limb & Pose Articulation
* **Loading Bar Toggle**: Hide the top capsule loading pill to extract just the standalone character mascot / sticker.
* **Hand & Arm Rotation**: Adjust Left and Right hands by $-60^\circ$ to $+60^\circ$.
* **Foot & Shoe Angles**: Adjust rotation for Left and Right shoes.
* **Head Tilt & Eye Offsets**: Fine-tune facial gaze and head posture.

### 3. Live Color Palette & Themes
* 1-Click Themes: **Original Pink**, **Cyberpunk Neon**, **Emerald Mint**, **Sunset Amber**, **Dark Slate**, and **Royal Violet**.
* Custom Color Pickers: Modify Body Pink (`#e90179`), Head Pink (`#f44ba3`), Accent Indigo (`#4601e9`), Outlines (`#0c0c0c`), or Highlights.

### 4. Vector & Image Export
* **Vector SVG (`.svg`)**: Pure vector graphic, infinite resolution, compatible with Figma, Adobe Illustrator, Inkscape, or Web.
* **Copy SVG to Clipboard**: 1-click button to copy raw SVG code and paste directly into Figma canvas.
* **Raster PNG / WebP / JPEG**: Export at 512px, 1024px, 2000px (Native HD), or 4000px (4K Print), with transparent or solid background.
* **Modified Lottie JSON (`.json`)**: Save the updated animation for mobile or web projects.

### 5. Drag-and-Drop Any Lottie JSON
* Drop any other `.json` animation from [lottiefiles.com](https://lottiefiles.com/free-animations) onto the window to convert and pose it!
