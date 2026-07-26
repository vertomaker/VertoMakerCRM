/**
 * exporter.js
 * Self-contained exporters so the app never needs three.js's ES-module
 * addon exporters (which would force type="module" and break when the
 * file is opened directly from disk in Chrome). Produces files that
 * open cleanly in Bambu Studio, OrcaSlicer, PrusaSlicer and Cura.
 */
(function (global) {
  'use strict';

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function toNonIndexedTriangles(geometry) {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  // ---------------------------------------------------------------- STL
  function exportSTL(geometry, name = 'model') {
    const geo = toNonIndexedTriangles(geometry);
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const triCount = pos.count / 3;

    const buffer = new ArrayBuffer(84 + triCount * 50);
    const view = new DataView(buffer);
    // 80-byte header
    const header = `VertoMaker Creator STL export - ${name}`.padEnd(80, ' ').slice(0, 80);
    for (let i = 0; i < 80; i++) view.setUint8(i, header.charCodeAt(i));
    view.setUint32(80, triCount, true);

    let offset = 84;
    const nx = [], ny = [], nz = [];
    for (let i = 0; i < triCount; i++) {
      const a = i * 3, b = a + 1, c = a + 2;
      // face normal = average of vertex normals (already smooth-shaded per our generators)
      const fnx = (norm.getX(a) + norm.getX(b) + norm.getX(c)) / 3;
      const fny = (norm.getY(a) + norm.getY(b) + norm.getY(c)) / 3;
      const fnz = (norm.getZ(a) + norm.getZ(b) + norm.getZ(c)) / 3;
      view.setFloat32(offset, fnx, true); view.setFloat32(offset + 4, fny, true); view.setFloat32(offset + 8, fnz, true);
      offset += 12;
      for (const idx of [a, b, c]) {
        view.setFloat32(offset, pos.getX(idx), true);
        view.setFloat32(offset + 4, pos.getY(idx), true);
        view.setFloat32(offset + 8, pos.getZ(idx), true);
        offset += 12;
      }
      view.setUint16(offset, 0, true); // attribute byte count
      offset += 2;
    }
    return new Blob([buffer], { type: 'model/stl' });
  }

  // ---------------------------------------------------------------- OBJ
  function exportOBJ(geometry, name = 'model') {
    const geo = toNonIndexedTriangles(geometry);
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    let out = `# VertoMaker Creator OBJ export - ${name}\no ${name}\n`;
    for (let i = 0; i < pos.count; i++) {
      out += `v ${pos.getX(i).toFixed(6)} ${pos.getY(i).toFixed(6)} ${pos.getZ(i).toFixed(6)}\n`;
    }
    for (let i = 0; i < norm.count; i++) {
      out += `vn ${norm.getX(i).toFixed(6)} ${norm.getY(i).toFixed(6)} ${norm.getZ(i).toFixed(6)}\n`;
    }
    for (let i = 0; i < pos.count; i += 3) {
      const a = i + 1, b = i + 2, c = i + 3; // OBJ is 1-indexed
      out += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
    }
    return new Blob([out], { type: 'text/plain' });
  }

  // ---------------------------------------------------------------- 3MF
  // A minimal, spec-valid, STORE-only (uncompressed) ZIP writer - 3MF is
  // just a ZIP container with a fixed set of XML parts, and every major
  // slicer accepts uncompressed entries just as well as deflated ones.

  function crc32(bytes) {
    let c;
    const table = crc32.table || (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
      }
      return t;
    })());
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function strToBytes(str) { return new TextEncoder().encode(str); }

  function buildZip(files) {
    // files: [{ name, data: Uint8Array }]
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = strToBytes(file.name);
      const data = file.data;
      const crc = crc32(data);

      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); // local file header signature
      lv.setUint16(4, 20, true);         // version needed
      lv.setUint16(6, 0, true);          // flags
      lv.setUint16(8, 0, true);          // method = 0 (store)
      lv.setUint16(10, 0, true);         // mod time
      lv.setUint16(12, 0, true);         // mod date
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true); // compressed size
      lv.setUint32(22, data.length, true); // uncompressed size
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);         // extra field length
      local.set(nameBytes, 30);

      localParts.push(local, data);

      const central = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); // central directory signature
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true); // relative offset of local header
      central.set(nameBytes, 46);
      centralParts.push(central);

      offset += local.length + data.length;
    }

    const centralStart = offset;
    let centralSize = 0;
    for (const part of centralParts) centralSize += part.length;

    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralStart, true);
    ev.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, end], { type: 'application/octet-stream' });
  }

  function vertexToXml(geo) {
    const pos = geo.attributes.position;
    let vertices = '';
    for (let i = 0; i < pos.count; i++) {
      vertices += `<vertex x="${pos.getX(i).toFixed(5)}" y="${pos.getY(i).toFixed(5)}" z="${pos.getZ(i).toFixed(5)}"/>`;
    }
    let triangles = '';
    for (let i = 0; i < pos.count; i += 3) {
      triangles += `<triangle v1="${i}" v2="${i + 1}" v3="${i + 2}"/>`;
    }
    return { vertices, triangles };
  }

  function export3MF(geometry, name = 'model') {
    const geo = toNonIndexedTriangles(geometry);
    const { vertices, triangles } = vertexToXml(geo);

    const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="pt-BR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">VertoMaker Creator</metadata>
  <metadata name="Title">${name}</metadata>
  <resources>
    <object id="1" type="model" name="${name}">
      <mesh>
        <vertices>${vertices}</vertices>
        <triangles>${triangles}</triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1"/>
  </build>
</model>`;

    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

    const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

    const files = [
      { name: '[Content_Types].xml', data: strToBytes(contentTypes) },
      { name: '_rels/.rels', data: strToBytes(rels) },
      { name: '3D/3dmodel.model', data: strToBytes(modelXml) },
    ];
    return buildZip(files);
  }

  global.VertoExporter = { exportSTL, exportOBJ, export3MF, triggerDownload };
})(window);
