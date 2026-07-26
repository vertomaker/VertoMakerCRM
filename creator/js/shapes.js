/**
 * shapes.js - shared low-level geometry helpers for /models/*.js
 * All dimensions are expressed in millimeters, consistent with the
 * rest of the app (1 Three.js unit == 1 mm).
 */
(function (global) {
  'use strict';

  /** Rounded-rectangle THREE.Shape on the XY plane, centered at origin. */
  function roundedRectShape(w, h, r) {
    const shape = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2 - 0.001));
    shape.moveTo(x, y + r);
    shape.lineTo(x, y + h - r);
    shape.quadraticCurveTo(x, y + h, x + r, y + h);
    shape.lineTo(x + w - r, y + h);
    shape.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    shape.lineTo(x + w, y + r);
    shape.quadraticCurveTo(x + w, y, x + w - r, y);
    shape.lineTo(x + r, y);
    shape.quadraticCurveTo(x, y, x, y + r);
    return shape;
  }

  /** Solid box with rounded vertical edges, extruded along Z (height = depth param). */
  function roundedBox(width, depthY, height, radius) {
    const shape = roundedRectShape(width, depthY, radius);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      curveSegments: 12,
    });
    geo.rotateX(-Math.PI / 2); // extrusion was along Z -> lift to Y-up
    geo.translate(0, 0, 0);
    geo.computeVertexNormals();
    return geo;
  }

  /** An open-top rounded box shell (a "tray"): outer rounded box minus an inset rounded box, using CSG. */
  function roundedBoxShell(width, depthY, height, wall, radius, floorThickness) {
    const outerMesh = new THREE.Mesh(roundedBox(width, depthY, height, radius));
    const innerW = Math.max(width - 2 * wall, 0.5);
    const innerD = Math.max(depthY - 2 * wall, 0.5);
    const innerH = Math.max(height - floorThickness, 0.1);
    const innerR = Math.max(radius - wall, 0);
    const innerGeo = roundedBox(innerW, innerD, innerH + 1, innerR);
    innerGeo.translate(0, floorThickness, 0);
    const innerMesh = new THREE.Mesh(innerGeo);
    const result = VertoCSG.subtract(outerMesh, innerMesh);
    return result.geometry;
  }

  /** A cylinder mesh oriented as a drilling tool along an arbitrary axis, for use as a CSG subtraction brush. */
  function holeCylinder(diameter, length, position, axis) {
    axis = axis || 'y';
    const geo = new THREE.CylinderGeometry(diameter / 2, diameter / 2, length, 24);
    if (axis === 'x') geo.rotateZ(Math.PI / 2);
    if (axis === 'z') geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo);
    mesh.position.copy(position);
    return mesh;
  }

  /** Merge an array of BufferGeometries (already in local space) into one, without booleans. */
  function mergeGeometries(geometries) {
    const merged = THREE.BufferGeometryUtils.mergeGeometries(geometries, false);
    merged.computeVertexNormals();
    return merged;
  }

  // ---- Text (async - depends on a loaded font) --------------------
  let cachedFont = null;
  let fontLoadPromise = null;
  const FONT_URL = 'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json';

  function loadFont() {
    if (cachedFont) return Promise.resolve(cachedFont);
    if (fontLoadPromise) return fontLoadPromise;
    fontLoadPromise = new Promise((resolve, reject) => {
      const loader = new THREE.FontLoader();
      loader.load(FONT_URL, (font) => { cachedFont = font; resolve(font); }, undefined, reject);
    });
    return fontLoadPromise;
  }

  /** Returns a Promise<BufferGeometry> for extruded 3D text, centered at origin. */
  function textGeometry(text, size, height) {
    return loadFont().then((font) => {
      const geo = new THREE.TextGeometry(text && text.length ? text : ' ', {
        font,
        size,
        height,
        curveSegments: 6,
        bevelEnabled: false,
      });
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const cx = -(bb.max.x + bb.min.x) / 2;
      const cy = -(bb.max.y + bb.min.y) / 2;
      geo.translate(cx, cy, 0);
      geo.rotateX(-Math.PI / 2);
      return geo;
    });
  }

  /** A simple gear-free hexagon prism (used for e.g. keychain rings / hex-nut trims). */
  function hexPrism(diameter, height) {
    const shape = new THREE.Shape();
    const r = diameter / 2;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const px = r * Math.cos(a), py = r * Math.sin(a);
      i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 6 });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  global.VertoShapes = {
    roundedRectShape,
    roundedBox,
    roundedBoxShell,
    holeCylinder,
    mergeGeometries,
    textGeometry,
    hexPrism,
  };
})(window);
