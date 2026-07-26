/**
 * csg.js
 * ------------------------------------------------------------------
 * A compact, dependency-free Constructive Solid Geometry (CSG) engine
 * based on the classic BSP-tree boolean algorithm (union / subtract /
 * intersect), adapted to read/write THREE.BufferGeometry directly.
 *
 * This is fully self-contained (no external CSG library, no build
 * step) so it keeps working when the app is opened straight from
 * disk (file://) - only THREE itself is required, loaded from CDN.
 * ------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  const EPSILON = 1e-5;
  const COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;

  class Vec3 {
    constructor(x, y, z) { this.x = x; this.y = y; this.z = z; }
    clone() { return new Vec3(this.x, this.y, this.z); }
    negate() { return new Vec3(-this.x, -this.y, -this.z); }
    add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
    mul(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
    cross(v) {
      return new Vec3(
        this.y * v.z - this.z * v.y,
        this.z * v.x - this.x * v.z,
        this.x * v.y - this.y * v.x
      );
    }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    lerp(v, t) { return this.add(v.sub(this).mul(t)); }
    length() { return Math.sqrt(this.dot(this)); }
    unit() { const l = this.length() || 1; return this.mul(1 / l); }
  }

  class Vertex {
    constructor(pos, normal) { this.pos = pos; this.normal = normal; }
    clone() { return new Vertex(this.pos.clone(), this.normal.clone()); }
    flip() { this.normal = this.normal.negate(); }
    interpolate(other, t) {
      return new Vertex(this.pos.lerp(other.pos, t), this.normal.lerp(other.normal, t));
    }
  }

  class Plane {
    constructor(normal, w) { this.normal = normal; this.w = w; }
    static fromPoints(a, b, c) {
      const n = b.sub(a).cross(c.sub(a)).unit();
      return new Plane(n, n.dot(a));
    }
    clone() { return new Plane(this.normal.clone(), this.w); }
    flip() { this.normal = this.normal.negate(); this.w = -this.w; }

    // Split `polygon` by this plane, distributing the result into the
    // four output buckets (coplanar-front/back kept as-is, front/back
    // for polygons fully on one side, and both for polygons that need
    // to be split into new sub-polygons).
    splitPolygon(polygon, coplanarFront, coplanarBack, front, back) {
      let polygonType = 0;
      const types = [];
      for (let i = 0; i < polygon.vertices.length; i++) {
        const t = this.normal.dot(polygon.vertices[i].pos) - this.w;
        const type = t < -EPSILON ? BACK : t > EPSILON ? FRONT : COPLANAR;
        polygonType |= type;
        types.push(type);
      }

      switch (polygonType) {
        case COPLANAR:
          (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
          break;
        case FRONT:
          front.push(polygon);
          break;
        case BACK:
          back.push(polygon);
          break;
        case SPANNING: {
          const f = [], b = [];
          for (let i = 0; i < polygon.vertices.length; i++) {
            const j = (i + 1) % polygon.vertices.length;
            const ti = types[i], tj = types[j];
            const vi = polygon.vertices[i], vj = polygon.vertices[j];
            if (ti !== BACK) f.push(vi);
            if (ti !== FRONT) b.push(ti !== BACK ? vi.clone() : vi);
            if ((ti | tj) === SPANNING) {
              const t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.sub(vi.pos));
              const v = vi.interpolate(vj, t);
              f.push(v);
              b.push(v.clone());
            }
          }
          if (f.length >= 3) front.push(new Polygon(f));
          if (b.length >= 3) back.push(new Polygon(b));
          break;
        }
      }
    }
  }

  class Polygon {
    constructor(vertices) {
      this.vertices = vertices;
      this.plane = Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
    }
    clone() { return new Polygon(this.vertices.map((v) => v.clone())); }
    flip() {
      this.vertices.reverse();
      this.vertices.forEach((v) => v.flip());
      this.plane.flip();
    }
  }

  class Node {
    constructor(polygons) {
      this.plane = null;
      this.front = null;
      this.back = null;
      this.polygons = [];
      if (polygons) this.build(polygons);
    }
    clone() {
      const node = new Node();
      node.plane = this.plane && this.plane.clone();
      node.front = this.front && this.front.clone();
      node.back = this.back && this.back.clone();
      node.polygons = this.polygons.map((p) => p.clone());
      return node;
    }
    invert() {
      for (const p of this.polygons) p.flip();
      if (this.plane) this.plane.flip();
      if (this.front) this.front.invert();
      if (this.back) this.back.invert();
      const tmp = this.front; this.front = this.back; this.back = tmp;
    }
    clipPolygons(polygons) {
      if (!this.plane) return polygons.slice();
      let front = [], back = [];
      for (const p of polygons) this.plane.splitPolygon(p, front, back, front, back);
      if (this.front) front = this.front.clipPolygons(front);
      back = this.back ? this.back.clipPolygons(back) : [];
      return front.concat(back);
    }
    clipTo(bsp) {
      this.polygons = bsp.clipPolygons(this.polygons);
      if (this.front) this.front.clipTo(bsp);
      if (this.back) this.back.clipTo(bsp);
    }
    allPolygons() {
      let polygons = this.polygons.slice();
      if (this.front) polygons = polygons.concat(this.front.allPolygons());
      if (this.back) polygons = polygons.concat(this.back.allPolygons());
      return polygons;
    }
    build(polygons) {
      if (!polygons.length) return;
      if (!this.plane) this.plane = polygons[0].plane.clone();
      const front = [], back = [];
      for (const p of polygons) this.plane.splitPolygon(p, this.polygons, this.polygons, front, back);
      if (front.length) {
        if (!this.front) this.front = new Node();
        this.front.build(front);
      }
      if (back.length) {
        if (!this.back) this.back = new Node();
        this.back.build(back);
      }
    }
  }

  // ---- Conversions between THREE.BufferGeometry <-> polygon soup ----

  function geometryToPolygons(geometry, matrix) {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = geo.attributes.position;
    let normal = geo.attributes.normal;
    if (!normal) { geo.computeVertexNormals(); normal = geo.attributes.normal; }

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    const polygons = [];
    for (let i = 0; i < pos.count; i += 3) {
      const verts = [];
      for (let k = 0; k < 3; k++) {
        const idx = i + k;
        const p = new THREE.Vector3(pos.getX(idx), pos.getY(idx), pos.getZ(idx)).applyMatrix4(matrix);
        const n = new THREE.Vector3(normal.getX(idx), normal.getY(idx), normal.getZ(idx)).applyMatrix3(normalMatrix).normalize();
        verts.push(new Vertex(new Vec3(p.x, p.y, p.z), new Vec3(n.x, n.y, n.z)));
      }
      // Skip degenerate triangles which would otherwise poison the BSP tree.
      const a = verts[1].pos.sub(verts[0].pos);
      const b = verts[2].pos.sub(verts[0].pos);
      if (a.cross(b).length() > 1e-10) polygons.push(new Polygon(verts));
    }
    return polygons;
  }

  function polygonsToGeometry(polygons) {
    const positions = [];
    const normals = [];
    for (const poly of polygons) {
      for (let i = 2; i < poly.vertices.length; i++) {
        const tri = [poly.vertices[0], poly.vertices[i - 1], poly.vertices[i]];
        for (const v of tri) {
          positions.push(v.pos.x, v.pos.y, v.pos.z);
          normals.push(v.normal.x, v.normal.y, v.normal.z);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function meshToNode(mesh) {
    mesh.updateMatrixWorld(true);
    return new Node(geometryToPolygons(mesh.geometry, mesh.matrixWorld));
  }

  function op(meshA, meshB, kind) {
    const a = meshToNode(meshA);
    const b = meshToNode(meshB);

    let resultPolygons;
    switch (kind) {
      case 'union':
        a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert();
        resultPolygons = a.allPolygons().concat(b.allPolygons());
        break;
      case 'subtract':
        a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.invert();
        resultPolygons = a.allPolygons().concat(b.allPolygons());
        break;
      case 'intersect':
        a.invert(); b.clipTo(a); b.invert(); a.clipTo(b); b.clipTo(a); a.invert(); b.invert();
        resultPolygons = a.allPolygons().concat(b.allPolygons());
        break;
      default:
        throw new Error('Operação CSG desconhecida: ' + kind);
    }
    const geometry = polygonsToGeometry(resultPolygons);
    const mesh = new THREE.Mesh(geometry);
    return mesh;
  }

  global.VertoCSG = {
    /** A - B */
    subtract(meshA, meshB) { return op(meshA, meshB, 'subtract'); },
    /** A + B */
    union(meshA, meshB) { return op(meshA, meshB, 'union'); },
    /** A ∩ B */
    intersect(meshA, meshB) { return op(meshA, meshB, 'intersect'); },
    /** Chain a subtract of several "tool" meshes out of a base mesh - convenience for drilling N holes. */
    subtractMany(baseMesh, toolMeshes) {
      let result = baseMesh;
      for (const tool of toolMeshes) result = op(result, tool, 'subtract');
      return result;
    },
  };
})(window);
