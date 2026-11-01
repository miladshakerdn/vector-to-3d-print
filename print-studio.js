/**
 * 3D Print Studio Engine
 * Full-featured Three.js viewport for single-color 3D print verification,
 * interactive 3D Puzzle Layer Mixer, Coin/Medallion mode, and watertight STL export.
 */

const PrintStudio = (function() {
  'use strict';

  // State
  const psState = {
    initialized: false,
    container: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    modelGroup: null,
    gridHelper: null,
    lights: [],
    meshes: [],
    selectedLayerId: null,

    // Settings
    modelType: '360_figurine',    // '360_figurine', '25d_flatback', 'coin'
    materialMode: 'clay',         // 'clay', 'colored'
    wireframe: false,
    pedestalEnabled: true,
    stripesMode: 'embossed',      // 'embossed', 'engraved'
    targetHeightMm: 100,          // mm total character height
    bodyDepthFactor: 1.0,

    // Coin Mode Settings
    coinPaddingMm: 8.0,
    coinRimEnabled: true,
    coinKeychainEnabled: true,

    // Listeners
    onSelectCallback: null,

    // Puzzle Layers Configuration
    puzzleLayers: {
      coin_plate: {
        id: 'coin_plate',
        name: 'Base / Coin Plate',
        icon: '🪙',
        zOffset: -4.0,
        thickness: 4.0,
        bevel: 0.6,
        scaleBoost: 1.0,
        visible: false
      },
      body: {
        id: 'body',
        name: 'Body (Torso)',
        icon: '👕',
        zOffset: 0,
        thickness: 18.0,
        bevel: 3.5,
        scaleBoost: 1.0,
        visible: true
      },
      head: {
        id: 'head',
        name: 'Head',
        icon: '🙂',
        zOffset: 2.0,
        thickness: 16.0,
        bevel: 3.0,
        scaleBoost: 1.0,
        visible: true
      },
      eyes: {
        id: 'eyes',
        name: 'Eyes (x2)',
        icon: '👀',
        zOffset: 9.0,
        thickness: 2.8,
        bevel: 0.6,
        scaleBoost: 1.0,
        visible: true
      },
      arms: {
        id: 'arms',
        name: 'Arms (Left & Right)',
        icon: '💪',
        zOffset: 0,
        thickness: 6.0,      // Tube diameter in mm
        bevel: 0,
        scaleBoost: 1.0,
        visible: true
      },
      capsule_plate: {
        id: 'capsule_plate',
        name: 'Capsule Backing & Rim',
        icon: '💊',
        zOffset: 0,
        thickness: 6.0,
        bevel: 1.2,
        scaleBoost: 1.0,
        visible: true
      },
      capsule_balls: {
        id: 'capsule_balls',
        name: 'Capsule Balls (x3 Stepped)',
        icon: '⚪',
        zOffset: 1.5,
        thickness: 4.5,
        bevel: 0.8,
        scaleBoost: 1.0,
        visible: true
      },
      shoes_outer: {
        id: 'shoes_outer',
        name: 'Shoes Outer (Left & Right)',
        icon: '👟',
        zOffset: 3.0,
        thickness: 16.0,
        bevel: 3.0,
        scaleBoost: 1.0,
        visible: true
      },
      shoe_inner: {
        id: 'shoe_inner',
        name: 'Shoe Inner Soles',
        icon: '🥾',
        zOffset: 10.0,
        thickness: 2.5,
        bevel: 0.6,
        scaleBoost: 1.0,
        visible: true
      },
      shoe_stripes: {
        id: 'shoe_stripes',
        name: 'Shoe Stripes (x4)',
        icon: '〰️',
        zOffset: 12.0,
        thickness: 1.8,
        bevel: 0.2,
        scaleBoost: 1.0,
        visible: true
      }
    },

    // Slicer Metrics
    metrics: {
      widthMm: 0,
      heightMm: 0,
      depthMm: 0,
      triangles: 0
    }
  };

  // --- INITIALIZATION ---
  function init(container) {
    if (psState.initialized && psState.container === container) {
      handleResize();
      return;
    }
    psState.container = container;
    container.innerHTML = '';

    // 1. Scene
    psState.scene = new THREE.Scene();
    psState.scene.background = new THREE.Color(0x0e1320);

    // 2. Camera: Centered at (0, -2, 175) looking at character center (0, -2, 0)
    const aspect = container.clientWidth / (container.clientHeight || 1);
    psState.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
    psState.camera.position.set(0, -2, 175);

    // 3. Renderer
    psState.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    psState.renderer.setSize(container.clientWidth, container.clientHeight);
    psState.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    psState.renderer.shadowMap.enabled = true;
    psState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    psState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    psState.renderer.toneMappingExposure = 1.05;
    container.appendChild(psState.renderer.domElement);

    // 4. Orbit Controls
    if (window.THREE && THREE.OrbitControls) {
      psState.controls = new THREE.OrbitControls(psState.camera, psState.renderer.domElement);
      psState.controls.enableDamping = true;
      psState.controls.dampingFactor = 0.08;
      psState.controls.target.set(0, 0, 0);
      psState.controls.minDistance = 20;
      psState.controls.maxDistance = 600;
    }

    // 5. Lighting (Three-Point Studio Setup for Crevices & Relief)
    setupLighting();

    // 6. Build Plate Grid
    setupBuildPlate();

    // 7. Model Group
    psState.modelGroup = new THREE.Group();
    psState.scene.add(psState.modelGroup);

    // 8. Raycaster for Viewport Click Selection
    setupRaycaster();

    // 9. Resize Listener
    window.addEventListener('resize', handleResize);

    // 10. Start Animation Loop
    psState.initialized = true;
    animate();

    // Apply default architecture preset
    applyArchitecturePreset(psState.modelType);
  }

  function setupLighting() {
    // Soft Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    psState.scene.add(ambient);
    psState.lights.push(ambient);

    // Key Light (Cast Shadows)
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(60, 90, 120);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 400;
    const d = 80;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0004;
    psState.scene.add(keyLight);
    psState.lights.push(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0x8ba2c4, 0.45);
    fillLight.position.set(-80, 40, 80);
    psState.scene.add(fillLight);
    psState.lights.push(fillLight);

    // Rim / Back Light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(0, -30, -100);
    psState.scene.add(rimLight);
    psState.lights.push(rimLight);
  }

  function setupBuildPlate() {
    // Grid Helper positioned beneath character feet
    const size = 200;
    const divisions = 20;
    psState.gridHelper = new THREE.GridHelper(size, divisions, 0x6366f1, 0x1f293d);
    psState.gridHelper.position.y = -52.2;
    psState.scene.add(psState.gridHelper);

    // Shadow floor
    const floorGeo = new THREE.PlaneGeometry(size, size);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -52.25;
    floor.receiveShadow = true;
    psState.scene.add(floor);
  }

  function handleResize() {
    if (!psState.container || !psState.camera || !psState.renderer) return;
    const w = psState.container.clientWidth;
    const h = psState.container.clientHeight;
    if (w === 0 || h === 0) return;
    psState.camera.aspect = w / h;
    psState.camera.updateProjectionMatrix();
    psState.renderer.setSize(w, h);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (psState.controls) psState.controls.update();
    if (psState.renderer && psState.scene && psState.camera) {
      psState.renderer.render(psState.scene, psState.camera);
    }
  }

  // --- RAYCASTER CLICK SELECTION ---
  function setupRaycaster() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    psState.container.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const rect = psState.container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, psState.camera);
      const intersects = raycaster.intersectObjects(psState.modelGroup.children, true);

      if (intersects.length > 0) {
        for (let i = 0; i < intersects.length; i++) {
          const m = intersects[i].object;
          if (m.userData && m.userData.layerId) {
            selectLayer(m.userData.layerId);
            break;
          }
        }
      }
    });
  }

  function selectLayer(layerId) {
    psState.selectedLayerId = layerId;
    flashLayerMesh(layerId);
    if (typeof psState.onSelectCallback === 'function') {
      psState.onSelectCallback(layerId);
    }
  }

  function flashLayerMesh(layerId) {
    psState.meshes.forEach(m => {
      if (m.userData.layerId === layerId && m.material && m.material.emissive) {
        m.material.emissive.setHex(0x6366f1);
        setTimeout(() => {
          if (m.material && m.material.emissive) m.material.emissive.setHex(0x000000);
        }, 350);
      }
    });
  }

  // --- ARCHITECTURE PRESETS ---
  function applyArchitecturePreset(mode) {
    psState.modelType = mode;
    const L = psState.puzzleLayers;

    if (mode === 'coin') {
      L.coin_plate.visible = true;
      L.coin_plate.zOffset = -4.0;
      L.coin_plate.thickness = 4.0;
      L.coin_plate.bevel = 0.6;

      L.body.zOffset = 0;
      L.body.thickness = 8.0;
      L.body.bevel = 1.5;

      L.head.zOffset = 3.0;
      L.head.thickness = 8.0;
      L.head.bevel = 1.5;

      L.eyes.zOffset = 9.5;
      L.eyes.thickness = 3.3;
      L.eyes.bevel = 0.6;

      L.arms.zOffset = 4.0;
      L.arms.thickness = 5.0;

      L.capsule_plate.zOffset = 0;
      L.capsule_plate.thickness = 5.0;
      L.capsule_plate.bevel = 0.8;

      L.capsule_balls.zOffset = 3.0;
      L.capsule_balls.thickness = 4.5;
      L.capsule_balls.bevel = 0.8;

      L.shoes_outer.zOffset = 2.0;
      L.shoes_outer.thickness = 10.0;
      L.shoes_outer.bevel = 2.0;

      L.shoe_inner.zOffset = 10.5;
      L.shoe_inner.thickness = 3.0;
      L.shoe_inner.bevel = 0.6;

      L.shoe_stripes.zOffset = 12.5;
      L.shoe_stripes.thickness = 2.2;
      L.shoe_stripes.bevel = 0.2;

    } else if (mode === '25d_flatback') {
      L.coin_plate.visible = false;

      L.body.zOffset = 0;
      L.body.thickness = 8.0;
      L.body.bevel = 1.5;

      L.head.zOffset = 3.0;
      L.head.thickness = 8.0;
      L.head.bevel = 1.5;

      L.eyes.zOffset = 9.5;
      L.eyes.thickness = 3.3;
      L.eyes.bevel = 0.6;

      L.arms.zOffset = 4.0;
      L.arms.thickness = 5.0;

      L.capsule_plate.zOffset = 0;
      L.capsule_plate.thickness = 5.0;
      L.capsule_plate.bevel = 0.8;

      L.capsule_balls.zOffset = 3.0;
      L.capsule_balls.thickness = 4.5;
      L.capsule_balls.bevel = 0.8;

      L.shoes_outer.zOffset = 2.0;
      L.shoes_outer.thickness = 10.0;
      L.shoes_outer.bevel = 2.0;

      L.shoe_inner.zOffset = 10.5;
      L.shoe_inner.thickness = 3.0;
      L.shoe_inner.bevel = 0.6;

      L.shoe_stripes.zOffset = 12.5;
      L.shoe_stripes.thickness = 2.2;
      L.shoe_stripes.bevel = 0.2;

    } else { // '360_figurine'
      L.coin_plate.visible = false;

      L.body.zOffset = 0;
      L.body.thickness = 18.0;
      L.body.bevel = 3.5;

      L.head.zOffset = 2.0;
      L.head.thickness = 16.0;
      L.head.bevel = 3.0;

      L.eyes.zOffset = 9.0;
      L.eyes.thickness = 2.8;
      L.eyes.bevel = 0.6;

      L.arms.zOffset = 0;
      L.arms.thickness = 6.4;

      L.capsule_plate.zOffset = 0;
      L.capsule_plate.thickness = 6.0;
      L.capsule_plate.bevel = 1.2;

      L.capsule_balls.zOffset = 1.5;
      L.capsule_balls.thickness = 4.5;
      L.capsule_balls.bevel = 0.8;

      L.shoes_outer.zOffset = 3.0;
      L.shoes_outer.thickness = 16.0;
      L.shoes_outer.bevel = 3.0;

      L.shoe_inner.zOffset = 10.0;
      L.shoe_inner.thickness = 2.5;
      L.shoe_inner.bevel = 0.6;

      L.shoe_stripes.zOffset = 12.0;
      L.shoe_stripes.thickness = 1.8;
      L.shoe_stripes.bevel = 0.2;
    }
  }

  // --- GEOMETRY UTILITIES ---
  function pointsToShape(pts) {
    if (!pts || pts.length < 3) return new THREE.Shape();
    const v2 = pts.map(p => new THREE.Vector2(p.x, p.y));
    // Three.js expects counter-clockwise outer path
    if (THREE.ShapeUtils.isClockWise(v2)) {
      v2.reverse();
    }
    const shape = new THREE.Shape();
    shape.moveTo(v2[0].x, v2[0].y);
    for (let i = 1; i < v2.length; i++) {
      shape.lineTo(v2[i].x, v2[i].y);
    }
    shape.closePath();
    return shape;
  }

  function pointsToHolePath(pts) {
    if (!pts || pts.length < 3) return new THREE.Path();
    const v2 = pts.map(p => new THREE.Vector2(p.x, p.y));
    // Three.js expects clockwise hole path
    if (!THREE.ShapeUtils.isClockWise(v2)) {
      v2.reverse();
    }
    const path = new THREE.Path();
    path.moveTo(v2[0].x, v2[0].y);
    for (let i = 1; i < v2.length; i++) {
      path.lineTo(v2[i].x, v2[i].y);
    }
    path.closePath();
    return path;
  }

  function createSmoothExtrude(shape, depth, bevelThickness, bevelSize, bevelSegments = 20, curveSegments = 64) {
    const hasBevel = bevelThickness > 0.05;
    const d = Math.max(0.5, depth);
    const bThick = hasBevel ? Math.min(bevelThickness, d * 0.45) : 0;
    const bSize = hasBevel ? Math.min(bevelSize || bThick, d * 0.45) : 0;

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: hasBevel,
      bevelThickness: bThick,
      bevelSize: bSize,
      bevelSegments: hasBevel ? bevelSegments : 0,
      curveSegments: curveSegments
    });

    let finalGeom = geom;
    if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeVertices) {
      finalGeom = THREE.BufferGeometryUtils.mergeVertices(geom, 1e-4);
    }
    finalGeom.computeVertexNormals();
    return finalGeom;
  }

  function makeCapsulePoints(x0, y1, y2, R, segments = 32) {
    const pts = [];
    // Top semicircle
    for (let i = 0; i <= segments; i++) {
      const th = Math.PI - (i / segments) * Math.PI;
      pts.push({ x: x0 + R * Math.cos(th), y: y1 - R * Math.sin(th) });
    }
    // Bottom semicircle
    for (let i = 0; i <= segments; i++) {
      const th = -(i / segments) * Math.PI;
      pts.push({ x: x0 + R * Math.cos(th), y: y2 - R * Math.sin(th) });
    }
    return pts;
  }

  function clearModel() {
    psState.meshes = [];
    while (psState.modelGroup.children.length > 0) {
      const child = psState.modelGroup.children[0];
      psState.modelGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
  }

  // CRITICAL: NEVER CALL geometry.center()!
  // Vertices remain in the global coordinate space; only Z is set per mesh.
  function addMesh(geom, layerId, defaultColorHex, zPos = 0, isCenteredZ = false, depth = 0) {
    const colorHex = defaultColorHex || '#d0d4dc';
    const mat = getMaterialForLayer(layerId, colorHex);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      layerId: layerId,
      defaultColor: colorHex,
      zPos: zPos
    };

    // Position mesh at exact (0, 0, Z)
    if (isCenteredZ) {
      mesh.position.set(0, 0, -(depth * 0.5));
    } else {
      mesh.position.set(0, 0, zPos);
    }

    psState.modelGroup.add(mesh);
    psState.meshes.push(mesh);
    return mesh;
  }

  function getMaterialForLayer(layerId, defaultHex) {
    const isClay = psState.materialMode === 'clay';
    let hex = 0xd0d4dc;

    if (!isClay) {
      const appState = window.state;
      if (appState && appState.colorMap && appState.colorMap[defaultHex]) {
        hex = parseInt(appState.colorMap[defaultHex].replace('#', '0x'), 16);
      } else {
        hex = parseInt(defaultHex.replace('#', '0x'), 16);
      }
    }

    return new THREE.MeshStandardMaterial({
      color: hex,
      roughness: isClay ? 0.65 : 0.45,
      metalness: isClay ? 0.05 : 0.1,
      wireframe: psState.wireframe,
      shadowSide: THREE.DoubleSide
    });
  }

  // --- CUMULATIVE WORLD MATRIX EXTRACTOR ---
  // Guaranteed 100% reliable matrix concatenation from SVG DOM ancestors
  function getStackMatrix(el, svgRoot) {
    let matrix = svgRoot.createSVGMatrix();
    const stack = [];
    let curr = el;
    while (curr && curr !== svgRoot) {
      if (curr.transform && curr.transform.baseVal && curr.transform.baseVal.numberOfItems > 0) {
        const c = curr.transform.baseVal.consolidate();
        if (c && c.matrix) stack.unshift(c.matrix);
      }
      curr = curr.parentElement;
    }
    for (const m of stack) {
      matrix = matrix.multiply(m);
    }
    return matrix;
  }

  function applyMatrix(x, y, m) {
    return {
      x: m.a * x + m.c * y + m.e,
      y: m.b * x + m.d * y + m.f
    };
  }

  // --- CORE 3D MODEL BUILDER ---
  function updateModel() {
    const svgRoot = document.querySelector('#lottie-player svg');
    if (!svgRoot) return;
    const mainGroup = svgRoot.querySelector('g > g');
    if (!mainGroup || mainGroup.children.length < 13) return;

    clearModel();

    const children = Array.from(mainGroup.children);

    function samplePath(pathEl, N = 48) {
      if (!pathEl) return [];
      const m = getStackMatrix(pathEl, svgRoot);
      const len = pathEl.getTotalLength ? pathEl.getTotalLength() : 0;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const p = pathEl.getPointAtLength((i / N) * len);
        pts.push(applyMatrix(p.x, p.y, m));
      }
      return pts;
    }

    // --- FIX 1: GLOBAL LINEAR COORDINATE MAPPING ---
    // Character in 2000x2000 viewBox spans Y from 402 (capsule top) to 1787 (shoes bottom)
    // and X from 478 (left arm) to 1371 (right arm).
    // Height in SVG = 1385 px. Scale converts this to targetHeightMm.
    const targetH = psState.targetHeightMm;
    const scale = targetH / 1385.0;
    const originX = 1000.0;     // Center of 2000x2000 viewBox
    const originY = 1094.5;     // Vertical character center (402 + 1787) / 2

    // ONE global linear transform for all points. NEVER center individual meshes!
    const to3D = (x_svg, y_svg) => ({
      x: (x_svg - originX) * scale,
      y: -(y_svg - originY) * scale
    });

    const is360 = psState.modelType === '360_figurine';
    const isCoin = psState.modelType === 'coin';
    const L = psState.puzzleLayers;
    const appState = window.state || {};
    const tweaks = appState.poseTweaks || { showCharacter: true, showEyes: true, showShoes: true, showLoadingBar: true, showHands: true };

    // --- 1. BASE / COIN PLATE (if Coin Mode) ---
    if (isCoin && L.coin_plate.visible) {
      buildCoinPlate(targetH);
    }

    // --- 2. BODY / TORSO (Child 8) ---
    if (tweaks.showCharacter && L.body.visible) {
      const torsoPath = children[8].querySelector('path');
      if (torsoPath) {
        const ptsSvg = samplePath(torsoPath, 64);
        if (ptsSvg.length > 2) {
          const pts3D = ptsSvg.map(p => to3D(p.x, p.y));
          const shape = pointsToShape(pts3D);
          const depth = L.body.thickness * (is360 ? psState.bodyDepthFactor : 1.0);
          const geom = createSmoothExtrude(shape, depth, L.body.bevel, L.body.bevel * 0.8, 20, 64);
          addMesh(geom, 'body', '#e90179', L.body.zOffset, is360, depth);
        }
      }
    }

    // --- 3. HEAD (Child 9) ---
    if (tweaks.showCharacter && L.head.visible) {
      const headPath = children[9].querySelector('path');
      if (headPath) {
        const ptsSvg = samplePath(headPath, 64);
        if (ptsSvg.length > 2) {
          const pts3D = ptsSvg.map(p => to3D(p.x, p.y));
          const shape = pointsToShape(pts3D);
          const depth = L.head.thickness * (is360 ? psState.bodyDepthFactor : 1.0);
          const geom = createSmoothExtrude(shape, depth, L.head.bevel, L.head.bevel * 0.8, 20, 64);
          addMesh(geom, 'head', '#f44ba3', L.head.zOffset, is360, depth);
        }
      }
    }

    // --- 4. EYES (Child 10) ---
    if (tweaks.showEyes && L.eyes.visible) {
      const eyePaths = Array.from(children[10].querySelectorAll('path'));
      eyePaths.forEach(ep => {
        const eyePtsSvg = samplePath(ep, 24);
        if (eyePtsSvg.length > 2) {
          const eye3DPts = eyePtsSvg.map(p => to3D(p.x, p.y));
          const shape = pointsToShape(eye3DPts);
          const geom = createSmoothExtrude(shape, L.eyes.thickness, L.eyes.bevel, L.eyes.bevel * 0.8, 16, 32);
          addMesh(geom, 'eyes', '#0c0c0c', L.eyes.zOffset, false, 0);
        }
      });
    }

    // --- 5. ARMS & HANDS (Child 4, 5, 6, 7) ---
    if (tweaks.showHands && L.arms.visible) {
      buildArmsAndHands(children, to3D, samplePath, L.arms, scale);
    }

    // --- 6. TOP CAPSULE ASSEMBLY (Child 0, 1, 2, 3) ---
    if (tweaks.showLoadingBar) {
      buildTopCapsule(children, to3D, samplePath, L.capsule_plate, L.capsule_balls, is360);
    }

    // --- 7. SHOES & STRIPES (Child 11, 12) ---
    if (tweaks.showShoes) {
      buildShoesAssembly(children, svgRoot, to3D, L.shoes_outer, L.shoe_inner, L.shoe_stripes, scale, is360);
    }

    // --- 8. PEDESTAL BASE (if 360 Figurine Mode) ---
    if (is360 && psState.pedestalEnabled) {
      buildPedestalBase();
    }

    // Apply materials and compute metrics
    applyMaterials();
    computeMetrics();
  }

  // --- ARMS & HANDS BUILDER ---
  function buildArmsAndHands(children, to3D, samplePath, layerConfig, scale) {
    const armDefs = [
      { armIdx: 4, handIdx: 5 }, // Left
      { armIdx: 6, handIdx: 7 }  // Right
    ];

    // Stroke-width in SVG is 20px for arms, 35px for hands
    const tubeRadius = Math.max(1.5, (20 * 0.5 * scale) * layerConfig.scaleBoost);
    const handRadius = tubeRadius * 1.55;

    armDefs.forEach(def => {
      const pathEl = children[def.armIdx].querySelector('path');
      if (!pathEl) return;
      const ptsSvg = samplePath(pathEl, 32);
      if (ptsSvg.length < 2) return;

      const pts3D = ptsSvg.map(p => {
        const pt = to3D(p.x, p.y);
        return new THREE.Vector3(pt.x, pt.y, layerConfig.zOffset);
      });

      // 1. Tube along curve
      const curve = new THREE.CatmullRomCurve3(pts3D);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, tubeRadius, 16, false);
      addMesh(tubeGeo, 'arms', '#0c0c0c', 0, false, 0);

      // 2. Hand Spherical Joint at endpoint
      const handPos = pts3D[pts3D.length - 1];
      const handGeo = new THREE.SphereGeometry(handRadius, 20, 20);
      const handMesh = addMesh(handGeo, 'arms', '#0c0c0c', 0, false, 0);
      handMesh.position.copy(handPos);

      // 3. Shoulder spherical joint at start point (embeds into torso)
      const shoulderPos = pts3D[0];
      const shoulderGeo = new THREE.SphereGeometry(tubeRadius * 1.15, 16, 16);
      const shoulderMesh = addMesh(shoulderGeo, 'arms', '#0c0c0c', 0, false, 0);
      shoulderMesh.position.copy(shoulderPos);
    });
  }

  // --- TOP CAPSULE BUILDER ---
  function buildTopCapsule(children, to3D, samplePath, plateConfig, ballsConfig, is360) {
    const rimPath = children[0].querySelector('path');
    if (!rimPath) return;

    const outerPtsSvg = samplePath(rimPath, 48);
    if (outerPtsSvg.length < 3) return;
    const outerPts3D = outerPtsSvg.map(p => to3D(p.x, p.y));

    // 1. Solid Backing Plate
    if (plateConfig.visible) {
      const plateShape = pointsToShape(outerPts3D);
      const plateGeo = createSmoothExtrude(plateShape, plateConfig.thickness, plateConfig.bevel, plateConfig.bevel * 0.8, 16, 48);
      addMesh(plateGeo, 'capsule_plate', '#e90179', plateConfig.zOffset, is360, plateConfig.thickness);

      // 2. Raised Outer Border Rim
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      outerPts3D.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
      });
      const cx = (minX + maxX) * 0.5;
      const cy = (minY + maxY) * 0.5;

      const innerPts3D = outerPts3D.map(p => ({
        x: cx + (p.x - cx) * 0.88,
        y: cy + (p.y - cy) * 0.80
      }));

      const rimShape = pointsToShape(outerPts3D);
      rimShape.holes.push(pointsToHolePath(innerPts3D));
      const rimDepth = plateConfig.thickness + 2.0;
      const rimGeo = createSmoothExtrude(rimShape, rimDepth, 0.4, 0.4, 16, 48);
      addMesh(rimGeo, 'capsule_plate', '#e90179', plateConfig.zOffset, is360, rimDepth);
    }

    // 3. Three Stepped Balls inside capsule
    if (ballsConfig.visible) {
      const balls = [
        { idx: 1, color: '#0c0c0c', step: 0.0 }, // Left (Black)
        { idx: 2, color: '#4601e9', step: 1.5 }, // Middle (Indigo)
        { idx: 3, color: '#e90179', step: 3.0 }  // Right (Pink)
      ];

      balls.forEach(b => {
        const ballPath = children[b.idx].querySelector('path');
        if (!ballPath) return;
        const ptsSvg = samplePath(ballPath, 28);
        if (ptsSvg.length < 3) return;
        const pts3D = ptsSvg.map(p => to3D(p.x, p.y));

        const shape = pointsToShape(pts3D);
        const depth = ballsConfig.thickness + b.step;
        const geom = createSmoothExtrude(shape, depth, ballsConfig.bevel, ballsConfig.bevel * 0.8, 16, 32);
        addMesh(geom, 'capsule_balls', b.color, ballsConfig.zOffset, false, 0);
      });
    }
  }

  // --- SHOES & STRIPES BUILDER ---
  function buildShoesAssembly(children, svgRoot, to3D, outerConfig, innerConfig, stripesConfig, scale, is360) {
    const shoeIndices = [11, 12]; // Left & Right Shoes

    shoeIndices.forEach(idx => {
      const shoeEl = children[idx];
      const paths = Array.from(shoeEl.querySelectorAll('path'));
      if (paths.length < 8) return;

      // 1. Outer Shoe Capsule (paths[1], stroke 141)
      if (outerConfig.visible) {
        const mOuter = getStackMatrix(paths[1], svgRoot);
        const outerPtsLocal = makeCapsulePoints(-121.5, 440.5, 518.5, 70.5, 28);
        const outerPts3D = outerPtsLocal.map(p => {
          const w = applyMatrix(p.x, p.y, mOuter);
          return to3D(w.x, w.y);
        });
        const outerShape = pointsToShape(outerPts3D);
        const outerGeo = createSmoothExtrude(outerShape, outerConfig.thickness, outerConfig.bevel, outerConfig.bevel * 0.8, 16, 48);
        addMesh(outerGeo, 'shoes_outer', '#0c0c0c', outerConfig.zOffset, false, 0);
      }

      // 2. Inner Sole Capsule (paths[3], stroke 97)
      if (innerConfig.visible) {
        const mInner = getStackMatrix(paths[3], svgRoot);
        const innerPtsLocal = makeCapsulePoints(-121.5, 476.5, 527.572, 48.5, 28);
        const innerPts3D = innerPtsLocal.map(p => {
          const w = applyMatrix(p.x, p.y, mInner);
          return to3D(w.x, w.y);
        });
        const innerShape = pointsToShape(innerPts3D);
        const innerGeo = createSmoothExtrude(innerShape, innerConfig.thickness, innerConfig.bevel, innerConfig.bevel * 0.7, 16, 48);
        addMesh(innerGeo, 'shoe_inner', '#ffffff', innerConfig.zOffset, false, 0);
      }

      // 3. Four Shoe Stripes (paths[5] & paths[7])
      if (stripesConfig.visible) {
        const stripePaths = [paths[5], paths[7]];
        stripePaths.forEach(sp => {
          const mStripe = getStackMatrix(sp, svgRoot);
          const len = sp.getTotalLength();
          const p1 = applyMatrix(sp.getPointAtLength(0).x, sp.getPointAtLength(0).y, mStripe);
          const p2 = applyMatrix(sp.getPointAtLength(len).x, sp.getPointAtLength(len).y, mStripe);

          const pt1_3D = to3D(p1.x, p1.y);
          const pt2_3D = to3D(p2.x, p2.y);
          const dist = Math.hypot(pt2_3D.x - pt1_3D.x, pt2_3D.y - pt1_3D.y);
          if (dist < 0.5) return;

          const isEmbossed = psState.stripesMode === 'embossed';
          const stripeWidth = 2.4 * stripesConfig.scaleBoost;
          const stripeDepth = isEmbossed ? stripesConfig.thickness : Math.max(0.8, stripesConfig.thickness * 0.6);

          const boxGeo = new THREE.BoxGeometry(dist, stripeWidth, stripeDepth);
          const midX = (pt1_3D.x + pt2_3D.x) * 0.5;
          const midY = (pt1_3D.y + pt2_3D.y) * 0.5;
          const zOffset = isEmbossed ? stripesConfig.zOffset : (innerConfig.zOffset + 0.2);

          const boxMesh = addMesh(boxGeo, 'shoe_stripes', '#0c0c0c', zOffset, false, 0);
          boxMesh.position.set(midX, midY, zOffset);
          const angle = Math.atan2(pt2_3D.y - pt1_3D.y, pt2_3D.x - pt1_3D.x);
          boxMesh.rotation.z = angle;
        });
      }
    });
  }

  // --- COIN / MEDALLION PLATE BUILDER ---
  function buildCoinPlate(targetH) {
    const coinR = 56.0 + psState.coinPaddingMm;
    const coinThick = psState.puzzleLayers.coin_plate.thickness;
    const zPos = psState.puzzleLayers.coin_plate.zOffset;

    // 1. Solid Medallion Disc centered at (0, 0)
    const discGeo = new THREE.CylinderGeometry(coinR, coinR, coinThick, 64);
    discGeo.rotateX(Math.PI / 2);
    const discMesh = addMesh(discGeo, 'coin_plate', '#2b2d42', zPos + coinThick * 0.5, false, 0);
    discMesh.position.set(0, 0, zPos + coinThick * 0.5);

    // 2. Raised Outer Border Rim
    if (psState.coinRimEnabled) {
      const rimThick = 1.8;
      const rimShape = new THREE.Shape();
      rimShape.absarc(0, 0, coinR, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, coinR - 3.5, 0, Math.PI * 2, true);
      rimShape.holes.push(hole);
      const rimExtrude = new THREE.ExtrudeGeometry(rimShape, { depth: rimThick, bevelEnabled: false });
      const rimMesh = addMesh(rimExtrude, 'coin_plate', '#3b4252', 0, false, 0);
      rimMesh.position.set(0, 0, zPos + coinThick);
    }

    // 3. Keychain Loop Hole at Top
    if (psState.coinKeychainEnabled) {
      const loopOuterR = 6.0;
      const loopTubeR = 2.2;
      const torusGeo = new THREE.TorusGeometry(loopOuterR, loopTubeR, 20, 36);
      const torusMesh = addMesh(torusGeo, 'coin_plate', '#2b2d42', 0, false, 0);
      torusMesh.position.set(0, coinR + loopOuterR - 1.5, zPos + coinThick * 0.5);
    }
  }

  // --- COMPACT PEDESTAL BASE (STAND) ---
  function buildPedestalBase() {
    const standR = 34.0;
    const standH = 4.0;
    // Feet are at Y = -50. Stand placed at Y = -50.2 mm so it physically intersects shoes by 1.8mm!
    const standGeo = new THREE.CylinderGeometry(standR, standR * 1.08, standH, 48);
    const standMesh = addMesh(standGeo, 'body', '#2b2d42', 0, false, 0);
    standMesh.position.set(0, -50.2, 0);
  }

  // --- MATERIALS & SHADERS ---
  function applyMaterials() {
    psState.meshes.forEach(m => {
      if (!m.userData || !m.userData.layerId) return;
      m.material = getMaterialForLayer(m.userData.layerId, m.userData.defaultColor);
    });
  }

  // --- LIVE SLICER METRICS ---
  function computeMetrics() {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let totalTris = 0;

    psState.modelGroup.updateMatrixWorld(true);

    psState.meshes.forEach(mesh => {
      if (!mesh.geometry) return;
      const geo = mesh.geometry;
      if (geo.index) {
        totalTris += geo.index.count / 3;
      } else if (geo.attributes.position) {
        totalTris += geo.attributes.position.count / 3;
      }

      if (!geo.boundingBox) geo.computeBoundingBox();
      const b = geo.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      if (b.min.x < minX) minX = b.min.x;
      if (b.min.y < minY) minY = b.min.y;
      if (b.min.z < minZ) minZ = b.min.z;
      if (b.max.x > maxX) maxX = b.max.x;
      if (b.max.y > maxY) maxY = b.max.y;
      if (b.max.z > maxZ) maxZ = b.max.z;
    });

    const w = (maxX - minX > 0) ? (maxX - minX) : 0;
    const h = (maxY - minY > 0) ? (maxY - minY) : 0;
    const d = (maxZ - minZ > 0) ? (maxZ - minZ) : 0;

    psState.metrics = {
      widthMm: parseFloat(w.toFixed(1)),
      heightMm: parseFloat(h.toFixed(1)),
      depthMm: parseFloat(d.toFixed(1)),
      triangles: Math.round(totalTris)
    };

    const elH = document.getElementById('print-metric-height');
    const elW = document.getElementById('print-metric-width');
    const elD = document.getElementById('print-metric-depth');
    const elT = document.getElementById('print-metric-tris');

    if (elH) elH.textContent = `${psState.metrics.heightMm} mm`;
    if (elW) elW.textContent = `${psState.metrics.widthMm} mm`;
    if (elD) elD.textContent = `${psState.metrics.depthMm} mm`;
    if (elT) elT.textContent = psState.metrics.triangles.toLocaleString();
  }

  // --- STL EXPORTER (WATERTIGHT BINARY Z-UP) ---
  function exportSTL() {
    if (!window.THREE || !THREE.STLExporter) {
      alert('STLExporter is not loaded!');
      return;
    }

    psState.modelGroup.updateMatrixWorld(true);

    // Clone modelGroup and orient Z-Up for Slicers (Cura, PrusaSlicer, Bambu Studio)
    const exportGroup = psState.modelGroup.clone(true);
    // In Three.js: Y is Up, Z is Forward.
    // Rotate -90° around X axis so Three.js Y becomes slicer +Z:
    exportGroup.rotation.x = -Math.PI / 2;
    exportGroup.updateMatrixWorld(true);

    const exporter = new THREE.STLExporter();
    const result = exporter.parse(exportGroup, { binary: true });

    const blob = new Blob([result], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const modeName = psState.modelType === 'coin' ? 'Coin_Medallion' : (psState.modelType === '25d_flatback' ? '2.5D_Relief' : '360_Figurine');
    link.download = `Lottie_Character_${modeName}_Watertight.stl`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // --- CAMERA UTILITIES ---
  function resetCamera() {
    if (!psState.camera || !psState.controls) return;
    psState.camera.position.set(0, -2, 175);
    psState.controls.target.set(0, -2, 0);
    psState.controls.update();
  }

  function focusModel() {
    if (!psState.camera || !psState.controls) return;
    psState.camera.position.set(0, -2, 145);
    psState.controls.target.set(0, -2, 0);
    psState.controls.update();
  }

  // --- PUBLIC API ---
  return {
    init,
    updateModel,
    applyMaterials,
    exportSTL,
    resetCamera,
    focusModel,
    selectLayer,

    // Setters
    setModelType: function(type) {
      applyArchitecturePreset(type);
      updateModel();
    },
    setMaterialMode: function(mode) {
      psState.materialMode = mode;
      applyMaterials();
    },
    setWireframe: function(val) {
      psState.wireframe = val;
      applyMaterials();
    },
    setPedestal: function(val) {
      psState.pedestalEnabled = val;
      updateModel();
    },
    setStripesMode: function(mode) {
      psState.stripesMode = mode;
      updateModel();
    },
    setTargetHeight: function(val) {
      psState.targetHeightMm = val;
      updateModel();
    },
    setBodyDepth: function(val) {
      psState.bodyDepthFactor = val;
      updateModel();
    },
    setCoinPadding: function(val) {
      psState.coinPaddingMm = val;
      updateModel();
    },
    setCoinRim: function(val) {
      psState.coinRimEnabled = val;
      updateModel();
    },
    setCoinKeychain: function(val) {
      psState.coinKeychainEnabled = val;
      updateModel();
    },
    updateLayerParam: function(layerId, param, val) {
      if (psState.puzzleLayers[layerId]) {
        psState.puzzleLayers[layerId][param] = val;
        updateModel();
      }
    },
    toggleLayerVisibility: function(layerId) {
      if (psState.puzzleLayers[layerId]) {
        psState.puzzleLayers[layerId].visible = !psState.puzzleLayers[layerId].visible;
        updateModel();
        return psState.puzzleLayers[layerId].visible;
      }
      return false;
    },
    onSelectLayer: function(callback) {
      psState.onSelectCallback = callback;
    },

    // Getters
    getState: function() {
      return psState;
    },
    getLayers: function() {
      return psState.puzzleLayers;
    }
  };
})();

// Attach to global window
window.PrintStudio = PrintStudio;
