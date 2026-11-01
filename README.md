# Lottie Pose & 3D Print Studio

An interactive, zero-dependency local web studio for extracting static poses from Lottie animations, customizing limb angles and colors, inspecting watertight geometry in 3D, and exporting **Vector SVG**, high-resolution **PNG/JPEG/WebP**, or 3D-printable **Binary .STL** files.

---

## 🚀 How to Run

1. **Direct Double-Click (100% Offline)**:  
   Double-click [index.html](file:///C:/Users/Helix/Desktop/test/animation/index.html) in your file explorer. It runs completely offline with bundled libraries (`three.min.js`, `OrbitControls.js`, `SVGLoader.js`, `STLExporter.js`, and `lottie.min.js`).

2. **Via Local Web Server**:  
   Double-click [start.bat](file:///C:/Users/Helix/Desktop/test/animation/start.bat) to launch a local server at `http://localhost:8585`.

---

## 🖨️ 3D Print Studio Tab

The **3D Print Studio** tab allows you to inspect the current character pose in real-time 3D and export a watertight, single-color printable `.STL` file.

### 1. Interactive 3D Viewport & Single-Color Print Inspection
* **Three.js + OrbitControls**: Rotate, pan, and zoom around the character in real-time 3D space.
* **Studio Three-Point Lighting with Soft Shadows**: Key, fill, and rim lights with real-time shadow casting (`PCFSoftShadowMap`) to highlight all physical creases, bevels, and surface reliefs.
* **3D Printer Build Plate**: A $200 \times 200\text{ mm}$ standard printer grid with shadow-receiving ground plane.
* **View Modes**:
  * **Monochrome Clay / Print Preview (Default)**: Renders all meshes in unified matte gray clay/resin (`color: 0xd0d4dc, roughness: 0.65, metalness: 0.05`). Verifies that every feature (chin crease, eye domes, shoe stripes, overlapping balls) is visible through geometry and shadows alone without relying on 2D color.
  * **Colored Preview**: Displays meshes with your active palette colors.
  * **Wireframe Overlay**: Inspects triangle distribution and clean manifold topology.

### 2. Triple Geometry Architecture
* **🪙 Coin / Medallion Mode**:
  * Places a solid circular or rounded-capsule medallion disc behind the character with an embossed outer rim.
  * Includes an optional **Keychain Hole Loop** at the top for lanyards, keyrings, or bag tags.
  * Zero supports required — prints flat on the print bed.
* **📐 2.5D Flat-Back / Relief Mode**:
  * Aligns the back of the torso, head, shoes, arms, and capsule to a flat $Z = 0$ plane. Prints directly on the build bed with **zero supports required**.
* **🧍 360° Full Figurine Mode (with Pedestal Stand)**:
  * Double-sided volumetric geometry across the Z-axis with curved front and back bevels.
  * Includes a sturdy circular **Pedestal Base (Stand)** ($68\text{ mm}$ diameter, $4\text{ mm}$ height) that physically intersects the bottom of the shoes by $1.8\text{ mm}$ for stable, non-tipping display. (Toggle On/Off).

### 3. Interactive "3D Puzzle Layer Mixer"
* **10 Semantic Puzzle Layers**:
  1. `Base / Coin Plate` (for Coin Mode)
  2. `Body (Torso)`
  3. `Head`
  4. `Eyes (x2)`
  5. `Arms (Left & Right)`
  6. `Top Capsule Backing & Rim`
  7. `Capsule Balls (x3 Stepped Heights)`
  8. `Shoes Outer (Left & Right)`
  9. `Shoe Inner Soles`
  10. `Shoe Stripes (x4)`
* **Click-to-Pick (Raycasting)**: Click any piece directly in the 3D viewport to automatically highlight, expand, and focus its controls in the sidebar.
* **Live Controls Per Piece**:
  * **Z-Offset (mm)**: Fine-tune forward/backward stacking and interlocking penetration.
  * **Thickness / Depth (mm)**: Adjust extrusion height.
  * **Bevel / Roundness (mm)**: Control edge fillet and smoothing.
  * **Scale / Boost**: Boost line/tube thickness for arms and stripes.
  * **Visibility Eye Toggle**: Show or hide individual parts.

### 4. Stepped Z-Relief for Single-Color Visibility
* **Body & Head**: Head is positioned forward in Z relative to the body (penetrating deep inside the upper chest) so the V-shaped chin crease casts a distinct shadow on the torso.
* **Eyes**: Raised 3D dome spheres protruding $+1.8\text{ mm}$ outward from the front surface of the head.
* **Shoes & Stripes**:
  * Outer shoe body sitting in front of the lower torso.
  * Inner white shoe oval physically embossed $+1.5\text{ mm}$ outward above the shoe surface.
  * 2 Stripes on each shoe with UI toggle for **Embossed (+1.2mm)** vs **Engraved (-1.2mm)** recessed grooves.
* **Top Loading Capsule**:
  * Built as a solid 2.5D rounded-rectangle backing plate ($4\text{ mm}$ thick) with a raised outer rim ($+2\text{ mm}$).
  * **Stepped Overlapping Balls**: Left circle ($+1.5\text{ mm}$), Middle circle ($+2.5\text{ mm}$), and Right circle ($+3.5\text{ mm}$) with rounded bevels, creating sharp physical crescent shadows where they overlap.
* **Arms**: Converted from stroked bezier paths into solid 3D cylindrical tubes (`TubeGeometry` with spherical end-caps). The ends penetrate deep into the torso and top capsule frame.

### 4. Real-World Sizing & Binary STL Export
* **Sliders**: Target Print Height ($50\text{ mm} - 250\text{ mm}$, default $100\text{ mm}$), Body Depth/Puffiness ($50\% - 200\%$), Arm Tube Thickness ($2.5\text{ mm} - 8.0\text{ mm}$), and Detail Relief Depth ($0.8\text{ mm} - 3.0\text{ mm}$).
* **Live Slicer Metrics Card**: Displays live Height, Width, Depth (in millimeters), Triangle count, and manifold verification.
* **Binary STL Download**: Merges visible meshes, scales to real-world millimeters, orients upright with **$Z$-Up** (universal slicer standard for Cura, Bambu Studio, PrusaSlicer, OrcaSlicer), and exports a binary `.stl` file.

---

## 🎨 2D Pose & Vector Studio Features

* **Frame Timeline Scrubber**: Scrub through 60 frames (0.00s to 2.00s) to capture any dynamic pose.
* **Limb Articulation**: Sliders for Left/Right Hand rotation, Left/Right Shoe rotation, Head Tilt, Eye Gaze offsets, and part toggles.
* **Color Palette Editor**: Instant preset themes (Original, Cyberpunk Neon, Emerald Mint, Sunset Amber, Dark Slate, Royal Violet) and custom hex pickers.
* **SVG & Raster Export**: Download static vector `.svg`, copy SVG code directly to clipboard for Figma/Illustrator, export high-res PNG/WebP/JPEG (up to $4000\times4000$ 4K), or save modified Lottie JSON.
