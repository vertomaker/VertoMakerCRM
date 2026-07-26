/**
 * viewer.js - the central 3D viewport (uses classic, non-module THREE
 * build pinned to r146 so the app keeps working from file:// with no
 * server and no build step - see index.html for the <script> tags).
 */
(function (global) {
  'use strict';

  function createViewer(container) {
    const prefs = VertoState.getViewerPrefs();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(prefs.bgColor);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(140, 120, 160);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = !!prefs.autoRotate;
    controls.autoRotateSpeed = 1.4;

    // ---- lights: a CAD-viewport-style three-point rig -------------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x39393d, 0.65);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(120, 220, 140);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff5a52, 0.25);
    rim.position.set(-160, 60, -120);
    scene.add(rim);

    const grid = new THREE.GridHelper(400, 40, 0x555559, 0x2a2a2e);
    grid.visible = prefs.showGrid;
    scene.add(grid);

    const axes = new THREE.AxesHelper(120);
    axes.visible = prefs.showAxes;
    scene.add(axes);

    const material = new THREE.MeshStandardMaterial({
      color: 0xd6d6da, metalness: 0.05, roughness: 0.55, flatShading: false,
    });
    const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xe8352f, wireframe: true });

    // ---- dimension-line overlay (width/height/depth callouts) ------
    const DIM_COLOR = '#35d67e';
    let dimensionGroup = new THREE.Group();
    scene.add(dimensionGroup);
    let dimensionsVisible = true;

    function makeTextSprite(text) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const fontSize = 72;
      ctx.font = `700 ${fontSize}px 'JetBrains Mono', monospace`;
      const width = Math.ceil(ctx.measureText(text).width) + 28;
      const height = fontSize + 28;
      canvas.width = width;
      canvas.height = height;
      ctx.font = `700 ${fontSize}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = DIM_COLOR;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 12, height / 2);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.userData.aspect = width / height;
      return sprite;
    }

    function buildDimensionGroup(geometry) {
      geometry.computeBoundingBox();
      const bb = geometry.boundingBox;
      const dx = bb.max.x - bb.min.x, dy = bb.max.y - bb.min.y, dz = bb.max.z - bb.min.z;
      const maxDim = Math.max(dx, dy, dz, 1);
      const offset = maxDim * 0.12;
      const group = new THREE.Group();
      const lineMat = new THREE.LineBasicMaterial({ color: 0x35d67e, depthTest: false });

      function addLine(a, b) {
        const g = new THREE.BufferGeometry().setFromPoints([a, b]);
        const line = new THREE.Line(g, lineMat);
        line.renderOrder = 999;
        group.add(line);
      }
      function addLabel(text, pos) {
        const sprite = makeTextSprite(text);
        const s = maxDim * 0.1;
        sprite.scale.set(s * sprite.userData.aspect, s, 1);
        sprite.position.copy(pos);
        sprite.renderOrder = 1000;
        group.add(sprite);
      }

      const zFront = bb.min.z - offset;
      addLine(new THREE.Vector3(bb.min.x, bb.min.y, zFront), new THREE.Vector3(bb.max.x, bb.min.y, zFront));
      addLine(new THREE.Vector3(bb.min.x, bb.min.y, bb.min.z), new THREE.Vector3(bb.min.x, bb.min.y, zFront));
      addLine(new THREE.Vector3(bb.max.x, bb.min.y, bb.min.z), new THREE.Vector3(bb.max.x, bb.min.y, zFront));
      addLabel(dx.toFixed(1) + 'mm', new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y, zFront - maxDim * 0.05));

      const xSide = bb.min.x - offset;
      addLine(new THREE.Vector3(xSide, bb.min.y, bb.min.z), new THREE.Vector3(xSide, bb.max.y, bb.min.z));
      addLine(new THREE.Vector3(bb.min.x, bb.min.y, bb.min.z), new THREE.Vector3(xSide, bb.min.y, bb.min.z));
      addLine(new THREE.Vector3(bb.min.x, bb.max.y, bb.min.z), new THREE.Vector3(xSide, bb.max.y, bb.min.z));
      addLabel(dy.toFixed(1) + 'mm', new THREE.Vector3(xSide - maxDim * 0.06, (bb.min.y + bb.max.y) / 2, bb.min.z));

      const yTop = bb.max.y + offset;
      addLine(new THREE.Vector3(bb.max.x, yTop, bb.min.z), new THREE.Vector3(bb.max.x, yTop, bb.max.z));
      addLine(new THREE.Vector3(bb.max.x, bb.max.y, bb.min.z), new THREE.Vector3(bb.max.x, yTop, bb.min.z));
      addLine(new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z), new THREE.Vector3(bb.max.x, yTop, bb.max.z));
      addLabel(dz.toFixed(1) + 'mm', new THREE.Vector3(bb.max.x + maxDim * 0.02, yTop, (bb.min.z + bb.max.z) / 2));

      group.visible = dimensionsVisible;
      return group;
    }

    function setDimensionsVisible(visible) {
      dimensionsVisible = visible;
      dimensionGroup.visible = visible;
    }

    let currentMesh = null;
    let currentGeometry = null;

    function fitCameraToObject(object, offset = 1.6) {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const fitDist = (maxDim / 2) / Math.tan((camera.fov * Math.PI) / 360) * offset;
      const dir = new THREE.Vector3(0.6, 0.55, 0.7).normalize();
      camera.position.copy(center.clone().add(dir.multiplyScalar(fitDist)));
      camera.near = maxDim / 100;
      camera.far = maxDim * 50;
      camera.updateProjectionMatrix();
      controls.target.copy(center);
      controls.update();
    }

    function setGeometry(geometry, opts = {}) {
      if (currentMesh) {
        scene.remove(currentMesh);
        currentMesh.geometry.dispose();
      }
      currentGeometry = geometry;
      geometry.computeVertexNormals();
      currentMesh = new THREE.Mesh(geometry, prefs.wireframe ? wireMaterial : material);
      currentMesh.castShadow = false;
      scene.add(currentMesh);

      scene.remove(dimensionGroup);
      dimensionGroup = buildDimensionGroup(geometry);
      scene.add(dimensionGroup);

      if (opts.fit !== false) fitCameraToObject(currentMesh);
      updateStatusBar();
    }

    function setWireframe(on) {
      if (!currentMesh) return;
      currentMesh.material = on ? wireMaterial : material;
    }
    function setGrid(on) { grid.visible = on; }
    function setAxes(on) { axes.visible = on; }
    function setBackground(hex) { scene.background = new THREE.Color(hex); }
    function setAutoRotate(on) { controls.autoRotate = on; }

    function resetView() { if (currentMesh) fitCameraToObject(currentMesh); }

    function captureImage() {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    }

    function getGeometry() { return currentGeometry; }
    function getMesh() { return currentMesh; }

    // ---- status bar (CAD-style readout: dims / triangles) ----------
    const statusEl = document.getElementById('viewport-status');
    function updateStatusBar() {
      if (!statusEl || !currentGeometry) return;
      currentGeometry.computeBoundingBox();
      const bb = currentGeometry.boundingBox;
      const dx = (bb.max.x - bb.min.x).toFixed(1);
      const dy = (bb.max.y - bb.min.y).toFixed(1);
      const dz = (bb.max.z - bb.min.z).toFixed(1);
      const triCount = currentGeometry.index
        ? currentGeometry.index.count / 3
        : currentGeometry.attributes.position.count / 3;
      statusEl.textContent = `X ${dx}mm · Y ${dy}mm · Z ${dz}mm  |  ${Math.round(triCount)} triângulos`;
    }

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', resize);
    resize();

    (function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    })();

    return {
      scene, camera, renderer, controls,
      setGeometry, setWireframe, setGrid, setAxes, setBackground, setAutoRotate, setDimensionsVisible,
      resetView, captureImage, getGeometry, getMesh, resize,
    };
  }

  global.VertoViewer = { create: createViewer };
})(window);
