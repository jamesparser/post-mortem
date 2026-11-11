// The real room, as the headset understands it. Reads WebXR plane detection and
// mesh detection, builds depth only occluders so Thing can vanish behind real
// furniture, lays shadow catchers on real surfaces, and answers spatial
// questions: where is the floor, where are the tables, where can he hide.

import * as THREE from "three";

const HORIZONTAL_SURFACES = new Set(["table", "couch", "storage", "bed", "other", "shelf", "desk", "counter", ""]);
const FLOOR_STANDING = new Set(["couch", "storage", "bed", "other", "plant", "lamp", "table", "screen"]);

const occluderMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.4, depthWrite: false });

export class Room {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "room";
    scene.add(this.group);
    this.planes = new Map();
    this.meshes = new Map();
    this.floorY = 0;
    this.version = 0;
    this.hasScan = false;
    this.hasGlobalMesh = false;
    this.start = new THREE.Vector3();
    this.fallbackFloor = this.makeFallbackFloor();
  }

  makeFallbackFloor() {
    const geo = new THREE.CircleGeometry(12, 48);
    geo.rotateX(-Math.PI / 2);
    const occluder = new THREE.Mesh(geo, occluderMaterial);
    occluder.renderOrder = -10;
    const catcher = new THREE.Mesh(geo, shadowMaterial);
    catcher.receiveShadow = true;
    catcher.position.y = 0.001;
    catcher.renderOrder = 1;
    const group = new THREE.Group();
    group.add(occluder, catcher);
    this.group.add(group);
    return group;
  }

  setStart(position) {
    this.start.set(position.x, this.floorY, position.z);
  }

  // The headset boundary, if the player has one, so Thing never hides
  // somewhere the system will tell them they cannot walk.
  setBoundarySpace(space) {
    this.boundarySpace = space;
  }

  readBoundary(frame, refSpace) {
    if (this.boundary || !this.boundarySpace || !this.boundarySpace.boundsGeometry) return;
    const pts = this.boundarySpace.boundsGeometry;
    if (!pts || pts.length < 3) return;
    const pose = frame.getPose(this.boundarySpace, refSpace);
    if (!pose) return;
    const m = new THREE.Matrix4().fromArray(pose.transform.matrix);
    const world = Array.from(pts).map((p) => new THREE.Vector3(p.x, 0, p.z).applyMatrix4(m));
    // Pull it in by 30 cm so he is always reachable without touching the edge.
    const c = world.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(world.length);
    this.boundary = world.map((p) => {
      const d = p.clone().sub(c);
      const len = Math.hypot(d.x, d.z);
      return len > 0.4 ? c.clone().addScaledVector(d, (len - 0.3) / len) : p;
    });
    this.boundaryRadius = Math.max(...this.boundary.map((p) => Math.hypot(p.x - c.x, p.z - c.z)));
  }

  update(frame, refSpace) {
    this.readBoundary(frame, refSpace);
    let changed = false;
    const planes = frame.detectedPlanes;
    if (planes) {
      for (const plane of planes) {
        const record = this.planes.get(plane);
        if (record && record.changed === plane.lastChangedTime) continue;
        const pose = frame.getPose(plane.planeSpace, refSpace);
        if (!pose) continue;
        this.planes.set(plane, this.buildPlane(plane, pose, record));
        changed = true;
      }
      for (const [plane, record] of this.planes) {
        if (!planes.has(plane)) {
          this.dispose(record);
          this.planes.delete(plane);
          changed = true;
        }
      }
    }
    const meshes = frame.detectedMeshes;
    if (meshes) {
      for (const mesh of meshes) {
        const record = this.meshes.get(mesh);
        if (record && record.changed === mesh.lastChangedTime) continue;
        const pose = frame.getPose(mesh.meshSpace, refSpace);
        if (!pose) continue;
        this.meshes.set(mesh, this.buildMesh(mesh, pose, record));
        changed = true;
      }
      for (const [mesh, record] of this.meshes) {
        if (!meshes.has(mesh)) {
          this.dispose(record);
          this.meshes.delete(mesh);
          changed = true;
        }
      }
    }
    if (changed) this.refresh();
  }

  dispose(record) {
    if (!record) return;
    for (const obj of record.objects || []) {
      this.group.remove(obj);
      obj.geometry.dispose();
    }
  }

  buildPlane(plane, pose, previous) {
    this.dispose(previous);
    const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
    const local = plane.polygon.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const world = local.map((p) => p.clone().applyMatrix4(matrix));
    const normal = new THREE.Vector3(0, 1, 0).transformDirection(matrix);
    const center = world.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(Math.max(1, world.length));
    const label = String(plane.semanticLabel || "").toLowerCase();
    const orientation = plane.orientation || (Math.abs(normal.y) > 0.8 ? "horizontal" : "vertical");
    const objects = [];
    if (local.length >= 3) {
      const shape = new THREE.Shape(local.map((p) => new THREE.Vector2(p.x, -p.z)));
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      const occluder = new THREE.Mesh(geo, occluderMaterial);
      occluder.matrixAutoUpdate = false;
      occluder.matrix.copy(matrix);
      occluder.renderOrder = -10;
      objects.push(occluder);
      if (orientation === "horizontal" && normal.y > 0.5) {
        const catcher = new THREE.Mesh(geo, shadowMaterial);
        catcher.matrixAutoUpdate = false;
        catcher.matrix.copy(matrix).premultiply(new THREE.Matrix4().makeTranslation(0, 0.002, 0));
        catcher.receiveShadow = true;
        catcher.renderOrder = 1;
        objects.push(catcher);
      }
      for (const obj of objects) this.group.add(obj);
    }
    const area = polygonArea(world);
    return { changed: plane.lastChangedTime, label, orientation, world, normal, center, area, objects, y: center.y };
  }

  buildMesh(mesh, pose, previous) {
    this.dispose(previous);
    const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
    const label = String(mesh.semanticLabel || "").toLowerCase();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(mesh.vertices), 3));
    if (mesh.indices) geo.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.indices), 1));
    geo.computeBoundingBox();
    const box = geo.boundingBox.clone().applyMatrix4(matrix);
    const occluder = new THREE.Mesh(geo, occluderMaterial);
    occluder.matrixAutoUpdate = false;
    occluder.matrix.copy(matrix);
    occluder.renderOrder = -10;
    occluder.userData.label = label;
    this.group.add(occluder);
    return { changed: mesh.lastChangedTime, label, box, objects: [occluder], center: box.getCenter(new THREE.Vector3()) };
  }

  setManualFloor(y) {
    this.manualFloor = y;
    this.refresh();
  }

  refresh() {
    this.version += 1;
    const floors = this.planeList().filter((p) => p.label === "floor");
    if (floors.length) {
      floors.sort((a, b) => b.area - a.area);
      this.floorY = floors[0].y;
      this.floorPolygon = floors[0].world;
    } else {
      const horizontals = this.planeList().filter((p) => p.orientation === "horizontal" && p.normal.y > 0.5);
      if (this.manualFloor !== undefined) this.floorY = this.manualFloor;
      else if (horizontals.length) this.floorY = Math.min(0, ...horizontals.map((p) => p.y));
      else this.floorY = 0;
    }
    this.hasGlobalMesh = this.meshList().some((m) => m.label === "global mesh");
    this.hasScan = this.planes.size > 0 || this.meshes.size > 0;
    this.fallbackFloor.position.y = this.floorY;
    this.fallbackFloor.children[0].visible = !this.hasGlobalMesh && !floors.length;
    this.fallbackFloor.children[1].visible = !floors.length;
    this.start.y = this.floorY;
  }

  // Add a plane that did not come from the headset. Used by the desktop preview.
  addSyntheticPlane(label, orientation, world, normal) {
    const center = world.reduce((acc, p) => acc.add(p), new THREE.Vector3()).divideScalar(world.length);
    const key = { synthetic: label + this.planes.size };
    this.planes.set(key, { label, orientation, world, normal, center, area: polygonArea(world), objects: [], y: center.y });
    this.refresh();
  }

  planeList() {
    return [...this.planes.values()];
  }

  meshList() {
    return [...this.meshes.values()];
  }

  // Horizontal, upward facing surfaces above the floor: tables, shelves, sofas.
  surfaces() {
    return this.planeList().filter(
      (p) =>
        p.orientation === "horizontal" &&
        p.normal.y > 0.5 &&
        p.label !== "floor" &&
        p.label !== "ceiling" &&
        HORIZONTAL_SURFACES.has(p.label) &&
        p.y - this.floorY > 0.3 &&
        p.y - this.floorY < 2.1 &&
        p.area > 0.04
    );
  }

  walls() {
    return this.planeList().filter((p) => p.orientation === "vertical" && (p.label === "wall" || p.label === ""));
  }

  furniture() {
    return this.meshList().filter(
      (m) => m.label !== "global mesh" && FLOOR_STANDING.has(m.label) && m.box.min.y - this.floorY < 0.25
    );
  }

  insideRoom(point) {
    if (this.boundary && !pointInPolygonXZ(point, this.boundary)) return false;
    if (!this.floorPolygon || this.floorPolygon.length < 3) {
      const dx = point.x - this.start.x;
      const dz = point.z - this.start.z;
      return Math.hypot(dx, dz) < (this.hasScan ? 4.5 : 1.8);
    }
    return pointInPolygonXZ(point, this.floorPolygon);
  }

  insideFurniture(point, margin = 0.05) {
    return this.furniture().some(
      (m) =>
        point.x > m.box.min.x - margin &&
        point.x < m.box.max.x + margin &&
        point.z > m.box.min.z - margin &&
        point.z < m.box.max.z + margin &&
        m.box.max.y - this.floorY > 0.15 &&
        m.label !== "table"
    );
  }

  randomFloorPoint(rand, near, radius) {
    for (let i = 0; i < 40; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * (radius || 3.5);
      const base = near || this.start;
      const p = new THREE.Vector3(base.x + Math.cos(a) * r, this.floorY, base.z + Math.sin(a) * r);
      if (this.insideRoom(p) && !this.insideFurniture(p)) return p;
    }
    return new THREE.Vector3(this.start.x + 1, this.floorY, this.start.z + 1);
  }

  // A point along the base of a wall, a hand's width out from it.
  skirtingPoint(rand) {
    const walls = this.walls();
    if (!walls.length) return this.randomFloorPoint(rand);
    const wall = walls[Math.floor(rand() * walls.length)];
    const bottom = wall.world.filter((p) => p.y < wall.center.y);
    const edge = bottom.length >= 2 ? bottom : wall.world;
    const a = edge[Math.floor(rand() * edge.length)];
    const b = edge[Math.floor(rand() * edge.length)];
    const t = 0.2 + rand() * 0.6;
    const p = a.clone().lerp(b, t);
    p.addScaledVector(new THREE.Vector3(wall.normal.x, 0, wall.normal.z).normalize(), 0.08);
    p.y = this.floorY;
    if (!this.insideRoom(p) || this.insideFurniture(p)) return this.randomFloorPoint(rand);
    return p;
  }

  // A random point on a surface, kept away from its edges.
  pointOnSurface(surface, rand, inset = 0.07) {
    const poly = surface.world;
    for (let i = 0; i < 30; i += 1) {
      const a = poly[Math.floor(rand() * poly.length)];
      const b = poly[Math.floor(rand() * poly.length)];
      const p = surface.center.clone().lerp(a.clone().lerp(b, rand()), rand() * 0.8);
      if (pointInPolygonXZ(p, poly) && distanceToEdgeXZ(p, poly) > inset) {
        p.y = surface.y;
        return p;
      }
    }
    const p = surface.center.clone();
    p.y = surface.y;
    return p;
  }

  // The nearest point on a surface edge, and the floor point just outside it.
  edgeOf(surface, from) {
    const poly = surface.world;
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < poly.length; i += 1) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const q = closestOnSegmentXZ(from, a, b);
      const d = Math.hypot(q.x - from.x, q.z - from.z);
      if (d < bestDist) {
        bestDist = d;
        best = { point: q, a, b };
      }
    }
    const outward = new THREE.Vector3(best.point.x - surface.center.x, 0, best.point.z - surface.center.z).normalize();
    const top = best.point.clone().addScaledVector(outward, -0.06);
    top.y = surface.y;
    const floor = best.point.clone().addScaledVector(outward, 0.06);
    floor.y = this.floorY;
    return { top, floor, outward };
  }

  surfaceAt(point, tolerance = 0.08) {
    if (Math.abs(point.y - this.floorY) < tolerance) return null;
    return (
      this.surfaces().find(
        (s) => Math.abs(s.y - point.y) < tolerance && pointInPolygonXZ(point, s.world)
      ) || null
    );
  }

  // Pick a hiding spot of a category. Returns null if the room has none.
  hideSpot(category, rand) {
    // Far enough to need finding, but inside a small boundary too.
    const minFar = this.boundary ? Math.min(2, this.boundaryRadius * 0.5) : this.hasScan ? 2 : 0.9;
    const far = (p) => Math.hypot(p.x - this.start.x, p.z - this.start.z) >= minFar;
    const awayYaw = (p) => Math.atan2(this.start.x - p.x, this.start.z - p.z);
    const candidates = [];

    if (category === "under") {
      for (const s of this.surfaces()) {
        if (s.label !== "table" && s.label !== "desk" && s.label !== "") continue;
        if (s.y - this.floorY < 0.4) continue;
        const p = s.center.clone();
        p.y = this.floorY;
        if (far(p) && this.insideRoom(p)) candidates.push({ position: p, yaw: awayYaw(p) + Math.PI, pose: "still" });
      }
    }

    if (category === "behind") {
      for (const m of this.furniture()) {
        if (m.box.max.y - this.floorY < 0.35) continue;
        const dir = new THREE.Vector3(m.center.x - this.start.x, 0, m.center.z - this.start.z);
        if (dir.lengthSq() < 0.01) continue;
        dir.normalize();
        const half = Math.abs(dir.x) * (m.box.max.x - m.box.min.x) / 2 + Math.abs(dir.z) * (m.box.max.z - m.box.min.z) / 2;
        const p = m.center.clone().addScaledVector(dir, half + 0.1);
        p.y = this.floorY;
        if (far(p) && this.insideRoom(p) && !this.insideFurniture(p, 0.02)) {
          candidates.push({ position: p, yaw: awayYaw(p), pose: "still" });
        }
      }
    }

    if (category === "top") {
      for (const s of this.surfaces()) {
        const p = this.pointOnSurface(s, rand, 0.1);
        if (far(p)) candidates.push({ position: p, yaw: awayYaw(p), pose: "still", surface: s, weight: s.y - this.floorY });
      }
    }

    if (category === "blend") {
      for (const s of this.surfaces()) {
        if (s.y - this.floorY < 0.5 || s.y - this.floorY > 1.25) continue;
        const neighbours = this.meshList().filter(
          (m) => m.label !== "global mesh" && Math.abs(m.box.min.y - s.y) < 0.08 && pointInPolygonXZ(m.center, s.world)
        );
        let p;
        if (neighbours.length) {
          const n = neighbours[Math.floor(rand() * neighbours.length)];
          const a = rand() * Math.PI * 2;
          const r = Math.max(n.box.max.x - n.box.min.x, n.box.max.z - n.box.min.z) / 2 + 0.1;
          p = new THREE.Vector3(n.center.x + Math.cos(a) * r, s.y, n.center.z + Math.sin(a) * r);
          if (!pointInPolygonXZ(p, s.world)) p = this.pointOnSurface(s, rand, 0.1);
        } else {
          p = this.pointOnSurface(s, rand, 0.1);
        }
        p.y = s.y;
        if (far(p)) candidates.push({ position: p, yaw: rand() * Math.PI * 2, pose: "flat", surface: s });
      }
    }

    if (category === "hanging") {
      for (const door of this.planeList().filter((p) => p.label === "door frame")) {
        const topY = Math.max(...door.world.map((p) => p.y));
        const p = door.center.clone();
        p.y = topY;
        p.addScaledVector(new THREE.Vector3(door.normal.x, 0, door.normal.z).normalize(), 0.03);
        if (far(p)) candidates.push({ position: p, yaw: Math.atan2(door.normal.x, door.normal.z), pose: "hang", climbWall: door });
      }
      for (const s of this.surfaces()) {
        if (s.y - this.floorY < 0.6) continue;
        const edge = this.edgeOf(s, this.start.clone().add(new THREE.Vector3((rand() - 0.5) * 6, 0, (rand() - 0.5) * 6)));
        const p = edge.top.clone().addScaledVector(edge.outward, 0.06);
        p.y = s.y;
        if (far(p)) {
          candidates.push({ position: p, yaw: Math.atan2(edge.outward.x, edge.outward.z), pose: "hang", surface: s });
        }
      }
    }

    if (!candidates.length) return null;
    if (category === "top") candidates.sort((a, b) => b.weight - a.weight);
    const pick = category === "top" && rand() < 0.5 ? candidates[0] : candidates[Math.floor(rand() * candidates.length)];
    return { category, ...pick };
  }

  // A spot that always exists, for rooms without a scan.
  fallbackSpot(rand, viewerForward) {
    const back = viewerForward.clone().setY(0).normalize().multiplyScalar(-1);
    for (let i = 0; i < 40; i += 1) {
      const a = (rand() - 0.5) * (i < 20 ? 1.6 : 3.4);
      const dir = back.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      // Try far first, then closer, so the spot is always inside the room.
      const reach = i < 20 ? 2.2 + rand() * 1.3 : 0.9 + rand() * 0.8;
      const p = this.start.clone().addScaledVector(dir, reach);
      p.y = this.floorY;
      if (this.insideRoom(p) && !this.insideFurniture(p)) {
        return { category: "behind", position: p, yaw: Math.atan2(-dir.x, -dir.z), pose: "still" };
      }
    }
    const p = this.start.clone().addScaledVector(back, 1.1);
    p.y = this.floorY;
    return { category: "behind", position: p, yaw: 0, pose: "still" };
  }
}

export function pointInPolygonXZ(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i];
    const b = poly[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function closestOnSegmentXZ(p, a, b) {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const len = abx * abx + abz * abz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / len));
  return new THREE.Vector3(a.x + abx * t, a.y + (b.y - a.y) * t, a.z + abz * t);
}

function distanceToEdgeXZ(p, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i += 1) {
    const q = closestOnSegmentXZ(p, poly[i], poly[(i + 1) % poly.length]);
    best = Math.min(best, Math.hypot(q.x - p.x, q.z - p.z));
  }
  return best;
}

function polygonArea(poly) {
  let area = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    area += (poly[j].x + poly[i].x) * (poly[j].z - poly[i].z);
  }
  return Math.abs(area / 2);
}
