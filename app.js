/**
 * Lottie Pose Studio & Vector Exporter
 * Comprehensive interactive studio for extracting poses, tweaking limbs/colors,
 * and exporting static SVG, PNG, WebP, or modified Lottie JSON.
 */

// Application State
const state = {
  rawAnimData: null,       // Original unmodified JSON
  workingAnimData: null,   // Current modified JSON (colors, pose offsets, layer toggles)
  animInstance: null,      // lottie-web player instance
  isPlaying: false,
  currentFrame: 0,
  totalFrames: 60,
  fps: 30,
  zoom: 1.0,
  bgMode: 'checker',       // 'checker', 'white', 'dark', 'custom'
  customBgColor: '#0b0f19',
  
  // Pose Tweaks
  poseTweaks: {
    handRRot: 0,
    handLRot: 0,
    shoeRRot: 0,
    shoeLRot: 0,
    headRot: 0,
    eyesOffsetX: 0,
    eyesOffsetY: 0,
    showLoadingBar: true,
    showCharacter: true,
    showEyes: true,
    showHands: true,
    showShoes: true,
  },

  // Color Mapping: originalHex -> currentHex
  colorMap: {
    '#e90179': '#e90179', // Primary Pink (Body square & Pill bar)
    '#f44ba3': '#f44ba3', // Secondary Pink (Head star/square)
    '#4601e9': '#4601e9', // Accent Indigo (Pill block)
    '#0c0c0c': '#0c0c0c', // Dark Outline / Shoes / Hands
    '#ffffff': '#ffffff', // White details
  }
};

// Preset Color Palettes
const PALETTES = {
  original: {
    name: 'Original Pink',
    colors: { '#e90179': '#e90179', '#f44ba3': '#f44ba3', '#4601e9': '#4601e9', '#0c0c0c': '#0c0c0c', '#ffffff': '#ffffff' }
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    colors: { '#e90179': '#ff007f', '#f44ba3': '#00f0ff', '#4601e9': '#7928ca', '#0c0c0c': '#0d1117', '#ffffff': '#ffffff' }
  },
  emerald: {
    name: 'Emerald Mint',
    colors: { '#e90179': '#059669', '#f44ba3': '#34d399', '#4601e9': '#047857', '#0c0c0c': '#064e3b', '#ffffff': '#ffffff' }
  },
  sunset: {
    name: 'Sunset Amber',
    colors: { '#e90179': '#f97316', '#f44ba3': '#fbbf24', '#4601e9': '#e11d48', '#0c0c0c': '#18181b', '#ffffff': '#ffffff' }
  },
  monochrome: {
    name: 'Dark Slate',
    colors: { '#e90179': '#475569', '#f44ba3': '#94a3b8', '#4601e9': '#1e293b', '#0c0c0c': '#020617', '#ffffff': '#ffffff' }
  },
  purple: {
    name: 'Royal Violet',
    colors: { '#e90179': '#8b5cf6', '#f44ba3': '#c084fc', '#4601e9': '#4c1d95', '#0c0c0c': '#1e1b4b', '#ffffff': '#ffffff' }
  }
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupEventListeners();
  setupDragAndDrop();
  
  // Load initial animation data
  await loadInitialAnimation();
});

// Load Initial Animation
async function loadInitialAnimation() {
  try {
    const res = await fetch('loading.json');
    if (res.ok) {
      const data = await res.json();
      initAnimationData(data, 'loading.json');
      return;
    }
  } catch (err) {
    console.warn('Fetch loading.json failed (likely file:// protocol), using embedded fallback data.', err);
  }

  // Use embedded data fallback if available
  if (window.DEFAULT_LOTTIE_DATA) {
    initAnimationData(window.DEFAULT_LOTTIE_DATA, 'loading.json (embedded)');
  } else {
    showToast('Please select or drop a Lottie JSON file.', 'warning');
  }
}

// Initialize Animation Data
function initAnimationData(jsonData, filename = 'animation.json') {
  state.rawAnimData = JSON.parse(JSON.stringify(jsonData));
  state.totalFrames = Math.round(jsonData.op - jsonData.ip) || 60;
  state.fps = jsonData.fr || 30;
  
  // Update UI Elements
  document.getElementById('filename-display').textContent = filename;
  document.getElementById('meta-display').textContent = `${jsonData.w}×${jsonData.h}px • ${state.totalFrames} frames • ${state.fps} fps`;
  
  const scrubber = document.getElementById('frame-scrubber');
  scrubber.min = 0;
  scrubber.max = state.totalFrames - 1;
  scrubber.value = 0;
  
  rebuildWorkingData();
  renderAnimation();
}

// Deep clone raw data and apply pose tweaks & color replacements
function rebuildWorkingData() {
  if (!state.rawAnimData) return;
  const clone = JSON.parse(JSON.stringify(state.rawAnimData));
  
  // Apply Layer-level Pose Tweaks & Visibility
  applyPoseTweaksToData(clone);
  
  // Apply Color Palette
  applyColorsToData(clone);
  
  state.workingAnimData = clone;
}

// Modify keyframes & layers inside the Lottie JSON
function applyPoseTweaksToData(anim) {
  const compLayers = (anim.assets && anim.assets[0] && anim.assets[0].layers) 
    ? anim.assets[0].layers 
    : anim.layers;

  compLayers.forEach(layer => {
    const name = layer.nm || '';
    
    // Toggle Loading Bar (Shape Layer 7, 8, 9, 10)
    if (name.startsWith('Shape Layer')) {
      layer.hd = !state.poseTweaks.showLoadingBar;
      if (!state.poseTweaks.showLoadingBar) {
        layer.ks.o = { a: 0, k: 0 };
      }
    }

    // Toggle Eyes
    if (name.includes('eye')) {
      layer.hd = !state.poseTweaks.showEyes;
      if (state.poseTweaks.showEyes) {
        offsetPosition(layer, state.poseTweaks.eyesOffsetX, state.poseTweaks.eyesOffsetY);
      }
    }

    // Toggle Hands
    if (name.startsWith('had')) {
      layer.hd = !state.poseTweaks.showHands;
      if (name.includes('R')) {
        offsetRotation(layer, state.poseTweaks.handRRot);
      } else if (name.includes('L')) {
        offsetRotation(layer, state.poseTweaks.handLRot);
      }
    }

    // Toggle Shoes
    if (name.startsWith('shoe')) {
      layer.hd = !state.poseTweaks.showShoes;
      if (name.includes('R')) {
        offsetRotation(layer, state.poseTweaks.shoeRRot);
      } else if (name.includes('L')) {
        offsetRotation(layer, state.poseTweaks.shoeLRot);
      }
    }

    // Head tilt
    if (name === 'head square') {
      offsetRotation(layer, state.poseTweaks.headRot);
    }
  });
}

function offsetRotation(layer, deltaDeg) {
  if (!deltaDeg || !layer.ks || !layer.ks.r) return;
  const r = layer.ks.r;
  if (r.a === 1 && Array.isArray(r.k)) {
    r.k.forEach(kf => {
      if (kf.s && typeof kf.s[0] === 'number') {
        kf.s[0] += deltaDeg;
      }
    });
  } else if (r.a === 0 && typeof r.k === 'number') {
    r.k += deltaDeg;
  }
}

function offsetPosition(layer, dx, dy) {
  if ((!dx && !dy) || !layer.ks || !layer.ks.p) return;
  const p = layer.ks.p;
  if (p.a === 1 && Array.isArray(p.k)) {
    p.k.forEach(kf => {
      if (kf.s && Array.isArray(kf.s)) {
        kf.s[0] += dx;
        kf.s[1] += dy;
      }
    });
  } else if (p.a === 0 && Array.isArray(p.k)) {
    p.k[0] += dx;
    p.k[1] += dy;
  }
}

// Convert Hex to 0..1 RGB array
function hexToNormalizedRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255, 1];
}

function colorDistance(c1, c2) {
  return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}

// Traverse and replace colors
function applyColorsToData(anim) {
  const replacements = [];
  for (const [origHex, newHex] of Object.entries(state.colorMap)) {
    if (origHex.toLowerCase() !== newHex.toLowerCase()) {
      replacements.push({
        orig: hexToNormalizedRgb(origHex),
        replacement: hexToNormalizedRgb(newHex)
      });
    }
  }

  if (replacements.length === 0) return;

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if ((node.ty === 'fl' || node.ty === 'st') && node.c && Array.isArray(node.c.k)) {
      for (const rep of replacements) {
        if (colorDistance(node.c.k, rep.orig) < 0.08) {
          node.c.k[0] = rep.replacement[0];
          node.c.k[1] = rep.replacement[1];
          node.c.k[2] = rep.replacement[2];
          break;
        }
      }
    }
    for (const key of Object.keys(node)) {
      walk(node[key]);
    }
  }

  walk(anim);
}

// Render or Re-render Animation
function renderAnimation() {
  const container = document.getElementById('lottie-player');
  
  if (state.animInstance) {
    state.animInstance.destroy();
    state.animInstance = null;
  }
  container.innerHTML = '';

  state.animInstance = lottie.loadAnimation({
    container: container,
    renderer: 'svg',
    loop: true,
    autoplay: false,
    animationData: state.workingAnimData,
    rendererSettings: {
      progressiveLoad: false,
      hideOnTransparent: false
    }
  });

  state.animInstance.addEventListener('DOMLoaded', () => {
    goToFrame(state.currentFrame);
    if (state.isPlaying) {
      state.animInstance.play();
    }
  });

  state.animInstance.addEventListener('enterFrame', (e) => {
    if (state.isPlaying) {
      state.currentFrame = Math.round(e.currentTime);
      updateTimelineUI();
    }
  });
}

// Frame Navigation
function goToFrame(frameNumber) {
  state.currentFrame = Math.max(0, Math.min(state.totalFrames - 1, frameNumber));
  if (state.animInstance) {
    state.animInstance.goToAndStop(state.currentFrame, true);
  }
  updateTimelineUI();
}

function updateTimelineUI() {
  const scrubber = document.getElementById('frame-scrubber');
  scrubber.value = state.currentFrame;
  
  const frameDisplay = document.getElementById('frame-indicator');
  const seconds = (state.currentFrame / state.fps).toFixed(2);
  const totalSeconds = (state.totalFrames / state.fps).toFixed(2);
  frameDisplay.innerHTML = `Frame: <strong>${state.currentFrame}</strong> / ${state.totalFrames - 1} &nbsp;•&nbsp; <strong>${seconds}s</strong> / ${totalSeconds}s`;

  // Update quick pose chips active state
  document.querySelectorAll('.pose-chip').forEach(chip => {
    const chipFrame = parseInt(chip.dataset.frame, 10);
    chip.classList.toggle('active', chipFrame === state.currentFrame);
  });
}

// Toggle Playback
function togglePlay() {
  if (!state.animInstance) return;
  state.isPlaying = !state.isPlaying;
  const playBtn = document.getElementById('btn-play');
  
  if (state.isPlaying) {
    state.animInstance.play();
    playBtn.innerHTML = '⏸ Pause';
  } else {
    state.animInstance.pause();
    playBtn.innerHTML = '▶ Play';
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Playback
  document.getElementById('btn-play').addEventListener('click', togglePlay);
  
  document.getElementById('btn-prev-frame').addEventListener('click', () => {
    if (state.isPlaying) togglePlay();
    goToFrame(state.currentFrame - 1);
  });

  document.getElementById('btn-next-frame').addEventListener('click', () => {
    if (state.isPlaying) togglePlay();
    goToFrame(state.currentFrame + 1);
  });

  document.getElementById('frame-scrubber').addEventListener('input', (e) => {
    if (state.isPlaying) togglePlay();
    goToFrame(parseInt(e.target.value, 10));
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      if (state.isPlaying) togglePlay();
      goToFrame(state.currentFrame - 1);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      if (state.isPlaying) togglePlay();
      goToFrame(state.currentFrame + 1);
    }
  });

  // Quick Poses
  document.querySelectorAll('.pose-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (state.isPlaying) togglePlay();
      goToFrame(parseInt(chip.dataset.frame, 10));
    });
  });

  // Background Controls
  document.getElementById('bg-select').addEventListener('change', (e) => {
    const val = e.target.value;
    const viewport = document.getElementById('stage-viewport');
    viewport.className = 'stage-viewport';
    if (val === 'checker') {
      viewport.classList.add('bg-checker');
      state.bgMode = 'checker';
    } else if (val === 'white') {
      viewport.classList.add('bg-white');
      state.bgMode = 'white';
    } else if (val === 'dark') {
      viewport.classList.add('bg-dark');
      state.bgMode = 'dark';
    } else if (val === 'custom') {
      state.bgMode = 'custom';
      viewport.style.backgroundColor = state.customBgColor;
    }
  });

  // Zoom Controls
  document.getElementById('btn-zoom-in').addEventListener('click', () => updateZoom(0.15));
  document.getElementById('btn-zoom-out').addEventListener('click', () => updateZoom(-0.15));
  document.getElementById('btn-zoom-reset').addEventListener('click', () => {
    state.zoom = 1.0;
    applyZoom();
  });

  // File Upload
  document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadJsonFile(file);
  });

  // Pose Tweaks Listeners
  setupPoseSliders();

  // Color Pickers
  setupColorPickers();

  // Export Buttons
  setupExportButtons();
}

function updateZoom(delta) {
  state.zoom = Math.max(0.3, Math.min(3.0, state.zoom + delta));
  applyZoom();
}

function applyZoom() {
  document.getElementById('canvas-wrapper').style.transform = `scale(${state.zoom})`;
  document.getElementById('zoom-display').textContent = `${Math.round(state.zoom * 100)}%`;
}

// Pose Controls
function setupPoseSliders() {
  const sliders = [
    { id: 'slider-hand-r', key: 'handRRot', labelId: 'val-hand-r', unit: '°' },
    { id: 'slider-hand-l', key: 'handLRot', labelId: 'val-hand-l', unit: '°' },
    { id: 'slider-shoe-r', key: 'shoeRRot', labelId: 'val-shoe-r', unit: '°' },
    { id: 'slider-shoe-l', key: 'shoeLRot', labelId: 'val-shoe-l', unit: '°' },
    { id: 'slider-head-rot', key: 'headRot', labelId: 'val-head-rot', unit: '°' },
    { id: 'slider-eyes-x', key: 'eyesOffsetX', labelId: 'val-eyes-x', unit: 'px' },
    { id: 'slider-eyes-y', key: 'eyesOffsetY', labelId: 'val-eyes-y', unit: 'px' },
  ];

  sliders.forEach(({ id, key, labelId, unit }) => {
    const input = document.getElementById(id);
    const label = document.getElementById(labelId);
    if (!input || !label) return;

    input.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.poseTweaks[key] = val;
      label.textContent = `${val > 0 ? '+' : ''}${val}${unit}`;
      debouncedRebuild();
    });
  });

  // Visibility Toggles
  const toggles = [
    { id: 'toggle-bar', key: 'showLoadingBar' },
    { id: 'toggle-eyes', key: 'showEyes' },
    { id: 'toggle-hands', key: 'showHands' },
    { id: 'toggle-shoes', key: 'showShoes' },
  ];

  toggles.forEach(({ id, key }) => {
    const checkbox = document.getElementById(id);
    if (!checkbox) return;
    checkbox.addEventListener('change', (e) => {
      state.poseTweaks[key] = e.target.checked;
      rebuildWorkingData();
      renderAnimation();
    });
  });

  // Reset Pose Button
  document.getElementById('btn-reset-pose').addEventListener('click', () => {
    sliders.forEach(({ id, key, labelId, unit }) => {
      state.poseTweaks[key] = 0;
      document.getElementById(id).value = 0;
      document.getElementById(labelId).textContent = `0${unit}`;
    });
    toggles.forEach(({ id, key }) => {
      state.poseTweaks[key] = true;
      document.getElementById(id).checked = true;
    });
    rebuildWorkingData();
    renderAnimation();
    showToast('Pose tweaks reset to default');
  });
}

let rebuildTimeout = null;
function debouncedRebuild() {
  clearTimeout(rebuildTimeout);
  rebuildTimeout = setTimeout(() => {
    rebuildWorkingData();
    renderAnimation();
  }, 30);
}

// Color Pickers Setup
function setupColorPickers() {
  const colorInputs = [
    { id: 'color-primary', key: '#e90179' },
    { id: 'color-secondary', key: '#f44ba3' },
    { id: 'color-accent', key: '#4601e9' },
    { id: 'color-dark', key: '#0c0c0c' },
    { id: 'color-white', key: '#ffffff' },
  ];

  colorInputs.forEach(({ id, key }) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = state.colorMap[key];
    input.addEventListener('input', (e) => {
      state.colorMap[key] = e.target.value;
      debouncedRebuild();
    });
  });

  // Preset Palettes
  document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const pKey = card.dataset.palette;
      const palette = PALETTES[pKey];
      if (!palette) return;

      Object.assign(state.colorMap, palette.colors);
      colorInputs.forEach(({ id, key }) => {
        const inp = document.getElementById(id);
        if (inp) inp.value = state.colorMap[key];
      });

      rebuildWorkingData();
      renderAnimation();
      showToast(`Applied ${palette.name} theme`);
    });
  });

  // Reset Colors Button
  document.getElementById('btn-reset-colors').addEventListener('click', () => {
    Object.assign(state.colorMap, PALETTES.original.colors);
    colorInputs.forEach(({ id, key }) => {
      const inp = document.getElementById(id);
      if (inp) inp.value = state.colorMap[key];
    });
    rebuildWorkingData();
    renderAnimation();
    showToast('Colors restored to original');
  });
}

// Export Engine
function setupExportButtons() {
  // Export SVG
  document.getElementById('btn-export-svg').addEventListener('click', exportSvgFile);

  // Copy SVG to Clipboard
  document.getElementById('btn-copy-svg').addEventListener('click', copySvgToClipboard);

  // Export Raster (PNG / JPG / WebP)
  document.getElementById('btn-export-raster').addEventListener('click', exportRasterImage);

  // Export Modified Lottie JSON
  document.getElementById('btn-export-json').addEventListener('click', exportLottieJsonFile);
}

// Clean and format SVG element
function getSerializedSvg() {
  const container = document.getElementById('lottie-player');
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('No SVG element found.');

  const clone = svg.cloneNode(true);
  const w = state.workingAnimData.w || 2000;
  const h = state.workingAnimData.h || 2000;

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);
  clone.setAttribute('viewBox', `0 0 ${w} ${h}`);

  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

function exportSvgFile() {
  try {
    const svgString = getSerializedSvg();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `character-pose-f${state.currentFrame}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Saved character-pose-f${state.currentFrame}.svg!`);
  } catch (err) {
    console.error(err);
    showToast('Failed to export SVG', 'error');
  }
}

async function copySvgToClipboard() {
  try {
    const svgString = getSerializedSvg();
    await navigator.clipboard.writeText(svgString);
    showToast('SVG copied to clipboard! Paste into Figma/Illustrator.');
  } catch (err) {
    console.error(err);
    showToast('Could not copy to clipboard', 'error');
  }
}

function exportRasterImage() {
  try {
    const format = document.getElementById('export-format').value; // 'png', 'jpeg', 'webp'
    const resolution = parseInt(document.getElementById('export-res').value, 10) || 2000;
    const bgSetting = document.getElementById('export-bg').value; // 'transparent', 'white', 'dark'

    const svgString = getSerializedSvg();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');

      // Draw background if requested or if JPEG (JPEG doesn't support transparency)
      if (format === 'jpeg' || bgSetting !== 'transparent') {
        ctx.fillStyle = bgSetting === 'dark' ? '#0b0f19' : '#ffffff';
        ctx.fillRect(0, 0, resolution, resolution);
      }

      ctx.drawImage(img, 0, 0, resolution, resolution);
      URL.revokeObjectURL(url);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : (format === 'webp' ? 'image/webp' : 'image/png');
      canvas.toBlob((resultBlob) => {
        const downloadUrl = URL.createObjectURL(resultBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        const ext = format === 'jpeg' ? 'jpg' : format;
        a.download = `character-pose-f${state.currentFrame}-${resolution}px.${ext}`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
        showToast(`Saved ${a.download}!`);
      }, mimeType, 0.95);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('Error rendering raster image', 'error');
    };

    img.src = url;
  } catch (err) {
    console.error(err);
    showToast('Failed to export image', 'error');
  }
}

function exportLottieJsonFile() {
  try {
    const jsonString = JSON.stringify(state.workingAnimData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `character-custom.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Saved modified Lottie JSON!');
  } catch (err) {
    console.error(err);
    showToast('Failed to export JSON', 'error');
  }
}

// Drag & Drop
function setupDragAndDrop() {
  const overlay = document.getElementById('drop-overlay');

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    overlay.classList.add('active');
  });

  window.addEventListener('dragleave', (e) => {
    if (e.relatedTarget === null) {
      overlay.classList.remove('active');
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    overlay.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.json') || file.type.includes('json'))) {
      loadJsonFile(file);
    } else {
      showToast('Please drop a valid .json Lottie file', 'warning');
    }
  });
}

function loadJsonFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.v || !data.layers) {
        showToast('File does not appear to be a valid Lottie JSON.', 'error');
        return;
      }
      initAnimationData(data, file.name);
      showToast(`Loaded ${file.name}`);
    } catch (err) {
      showToast('Failed to parse JSON file.', 'error');
    }
  };
  reader.readAsText(file);
}

// UI Tabs
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(`tab-${btn.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });
}

// Toast Notifications
let toastTimeout = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'error') toast.style.borderColor = 'var(--danger)';
  else if (type === 'warning') toast.style.borderColor = 'var(--warning)';
  else toast.style.borderColor = 'var(--accent)';

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}
