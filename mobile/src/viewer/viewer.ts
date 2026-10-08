// The wall viewer: one wall's photogrammetry model with route lines draped
// over the rock. Plain TypeScript on three.js with no React, so the Wall page
// and the authoring tool share it. It needs a browser DOM and WebGL, so
// screens reach it through the DOM component in wall-viewer.tsx and never
// import it into native code.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';

import type { Uuid } from '@/core/types';
import { drape, findCapturedFace, typicalEdge } from '@/viewer/geometry';
import type { DrapeStats, ModelInfo, SurfaceHit, Viewer, ViewerOptions, ViewerRoute } from '@/viewer/types';

export const ROUTE_COLORS = ['#ffd23f', '#3fd0ff', '#ff5ad1', '#ff8a3d', '#7dff5a', '#b58cff', '#ffffff', '#ff5a5a'];
const STRAIGHT_COLOR = '#ff5a5a';
const BACKGROUND = '#1b1d21';
/** Opacity of the other routes while one is highlighted. */
const DIMMED = 0.35;
/** Half-widths of the front arc: 90° across and 60° up and down. */
const ARC_AZIMUTH = Math.PI / 4;
const ARC_POLAR = Math.PI / 6;
/** A press counts as a tap if it moves less than this many CSS pixels... */
const TAP_SLOP = 6;
/** ...and lifts within this many milliseconds. */
const TAP_MS = 600;
/** How far from a line a tap can land and still pick the route, in CSS pixels. */
const LINE_REACH = { touch: 24, other: 10 };

interface RouteState {
  route: ViewerRoute;
  color: string;
  /** The points and normals the line was draped for, to skip draping again. */
  key: string;
  line: THREE.Vector3[];
  stats: DrapeStats | null;
  group: THREE.Group;
  label: CSS2DObject;
  labelBox: HTMLDivElement;
  labelName: HTMLSpanElement;
  labelGrade: HTMLSpanElement;
}

/** Where the camera starts, straight in front of the wall. */
interface Home {
  azimuth: number;
  polar: number;
  target: THREE.Vector3;
  distance: number;
}

/**
 * Builds a viewer inside `container`, which must have a size. The model loads
 * in the background; routes and settings given before it finishes are applied
 * when it does.
 */
export function createViewer(container: HTMLElement, options: ViewerOptions): Viewer {
  const root = document.createElement('div');
  Object.assign(root.style, { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' });
  container.appendChild(root);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const canvas = renderer.domElement;
  Object.assign(canvas.style, { display: 'block', touchAction: 'none' });
  const labelRenderer = new CSS2DRenderer();
  Object.assign(labelRenderer.domElement.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    pointerEvents: 'none',
  });
  root.append(canvas, labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options.background ?? BACKGROUND);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.001, 1000);
  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true;
  const dotTexture = makeDotTexture();
  const dotMaterial = new THREE.SpriteMaterial({ map: dotTexture, sizeAttenuation: false, depthTest: false });

  const meshes: THREE.Mesh[] = [];
  const lineMaterials = new Set<LineMaterial>();
  const routes = new Map<Uuid, RouteState>();
  const size = new THREE.Vector2(1, 1);
  let controls: OrbitControls | null = null;
  let home: Home | null = null;
  /** The mesh's typical triangle edge, which scales line offsets and dashes. */
  let edge = 0.05;
  let pendingRoutes = options.routes ?? [];
  let highlighted: Uuid | null = null;
  let frontArc = options.frontArc ?? true;
  let overlays = { points: false, straight: false };
  let disposed = false;

  function resize() {
    const width = root.clientWidth;
    const height = root.clientHeight;
    if (!width || !height) return;
    size.set(width, height);
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    for (const m of lineMaterials) m.resolution.copy(size);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  resize();

  const manager = new THREE.LoadingManager();
  const started = performance.now();
  let bytes: number | null = null;
  new GLTFLoader(manager).load(
    options.model,
    onModel,
    (e) => {
      if (!e.total) return;
      bytes = e.total;
      options.onProgress?.(e.loaded / e.total);
    },
    (err) => {
      if (!disposed) options.onError?.(err instanceof Error ? err : new Error(String(err)));
    },
  );

  function onModel(gltf: GLTF) {
    const wall = gltf.scene;
    if (disposed) {
      disposeObject(wall);
      return;
    }
    const loadMs = performance.now() - started;
    let triangles = 0;
    let vertices = 0;
    const textures = new Map<string, THREE.Texture>();
    wall.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const geometry: THREE.BufferGeometry = o.geometry;
      vertices += geometry.attributes.position.count;
      triangles += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
      // Photogrammetry textures already contain the lighting, so render unlit.
      const source = [o.material].flat() as THREE.MeshStandardMaterial[];
      const map = source[0]?.map ?? null;
      if (map) textures.set(map.uuid, map);
      for (const m of source) m.dispose();
      o.material = new THREE.MeshBasicMaterial({
        map,
        color: map ? 0xffffff : 0xb0b0b0,
        side: THREE.DoubleSide,
      });
      geometry.boundsTree = new MeshBVH(geometry);
      o.raycast = acceleratedRaycast;
      meshes.push(o);
    });
    scene.add(wall);

    const face = findCapturedFace(wall);
    edge = typicalEdge(face.medianArea);
    const center = face.box.getCenter(new THREE.Vector3());
    const radius = face.box.getSize(new THREE.Vector3()).length() / 2;
    const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
    const level = new THREE.Vector3(face.facing.x, 0, face.facing.z).normalize();
    camera.near = radius / 100;
    camera.far = radius * 100;
    camera.updateProjectionMatrix();
    camera.position.copy(center).addScaledVector(level, distance);

    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.target.copy(center);
    controls.minDistance = radius * 0.02;
    controls.maxDistance = distance * 3;
    controls.update();
    home = { azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle(), target: center, distance };
    applyFrontArc();
    setRoutes(pendingRoutes);

    const box = new THREE.Box3().setFromObject(wall).getSize(new THREE.Vector3());
    options.onLoad?.({
      triangles: Math.round(triangles),
      vertices,
      textures: [...textures.values()].map((t) => {
        const image = t.image as { width: number; height: number };
        return `${image.width}×${image.height}`;
      }),
      bytes,
      loadMs: Math.round(loadMs),
      size: box.toArray(),
      capturedFace: face.share,
      maxTextureSize: renderer.capabilities.maxTextureSize,
    } satisfies ModelInfo);
  }

  function applyFrontArc() {
    if (!controls || !home) return;
    controls.minAzimuthAngle = frontArc ? home.azimuth - ARC_AZIMUTH : -Infinity;
    controls.maxAzimuthAngle = frontArc ? home.azimuth + ARC_AZIMUTH : Infinity;
    controls.minPolarAngle = frontArc ? Math.max(0, home.polar - ARC_POLAR) : 0;
    controls.maxPolarAngle = frontArc ? Math.min(Math.PI, home.polar + ARC_POLAR) : Math.PI;
    controls.update();
  }

  // Routes

  function setRoutes(list: ViewerRoute[]) {
    pendingRoutes = list;
    if (!home) return;
    const keep = new Set(list.map((r) => r.uuid));
    for (const [uuid, state] of routes) {
      if (!keep.has(uuid)) removeRoute(state);
    }
    list.forEach((route, i) => {
      const state = routes.get(route.uuid) ?? addRoute(route);
      state.route = route;
      state.color = route.color ?? ROUTE_COLORS[i % ROUTE_COLORS.length];
      const key = JSON.stringify([route.points, route.normals]);
      if (key !== state.key) {
        state.key = key;
        const draped =
          route.points.length >= 2
            ? drape(meshes, route.points.map(vec), route.normals.map(vec), edge, edge * 0.35)
            : null;
        state.line = draped?.line ?? [];
        state.stats = draped?.stats ?? null;
      }
      state.labelName.textContent = route.name;
      state.labelGrade.textContent = route.grade?.text ?? '?';
      state.labelBox.style.borderLeftColor = state.color;
      state.labelGrade.style.color = state.color;
    });
    for (const state of routes.values()) redraw(state);
  }

  function addRoute(route: ViewerRoute): RouteState {
    const group = new THREE.Group();
    scene.add(group);
    const { object: label, box: labelBox, name: labelName, grade: labelGrade } = makeLabel();
    if (options.onRouteTap) {
      labelBox.style.pointerEvents = 'auto';
      labelBox.style.cursor = 'pointer';
      labelBox.addEventListener('click', () => options.onRouteTap?.(route.uuid));
    }
    label.visible = false;
    scene.add(label);
    const state: RouteState = {
      route,
      color: ROUTE_COLORS[0],
      key: '',
      line: [],
      stats: null,
      group,
      label,
      labelBox,
      labelName,
      labelGrade,
    };
    routes.set(route.uuid, state);
    return state;
  }

  function removeRoute(state: RouteState) {
    clearGroup(state.group);
    scene.remove(state.group, state.label);
    routes.delete(state.route.uuid);
  }

  function redraw(state: RouteState) {
    clearGroup(state.group);
    const { points, normals } = state.route;
    const isHighlighted = state.route.uuid === highlighted;
    const opacity = highlighted && !isHighlighted && (options.dimOthers ?? true) ? DIMMED : 1;
    if (isHighlighted && overlays.points) {
      for (const p of points) {
        const dot = new THREE.Sprite(dotMaterial);
        dot.scale.set(0.014, 0.014, 1);
        dot.position.fromArray(p);
        state.group.add(dot);
      }
    }
    if (state.line.length >= 2) {
      state.group.add(makeLine(state.line, state.color, isHighlighted ? 5 : 3.5, opacity));
      if (isHighlighted && overlays.straight && state.stats) {
        const offset = state.stats.offset;
        const lifted = points.map((p, i) => vec(p).addScaledVector(vec(normals[i]), offset));
        state.group.add(makeLine(lifted, STRAIGHT_COLOR, 2.5, 1, true));
      }
    }
    const visible = state.route.visible ?? true;
    state.group.visible = visible;
    state.label.visible = visible && points.length > 0;
    if (points.length) state.label.position.fromArray(points[0]);
    state.labelBox.style.opacity = String(opacity);
  }

  function makeLine(points: THREE.Vector3[], color: string, width: number, opacity: number, dashed = false) {
    const geometry = new LineGeometry();
    geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
    const material = new LineMaterial({
      color,
      linewidth: width,
      dashed,
      dashSize: edge * 4,
      gapSize: edge * 3,
      worldUnits: false,
      transparent: opacity < 1,
      opacity,
    });
    material.resolution.copy(size);
    lineMaterials.add(material);
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    return line;
  }

  function clearGroup(group: THREE.Group) {
    for (const o of [...group.children]) {
      group.remove(o);
      if (o instanceof Line2) {
        o.geometry.dispose();
        o.material.dispose();
        lineMaterials.delete(o.material);
      }
    }
  }

  // Camera

  /** Frames the highlighted route, or the whole wall. */
  function routeFrame(start: Home) {
    const line = highlighted ? (routes.get(highlighted)?.line ?? []) : [];
    if (line.length < 2) return { target: start.target, distance: start.distance };
    const box = new THREE.Box3().setFromPoints(line);
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, edge * 40);
    const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.25;
    return { target: box.getCenter(new THREE.Vector3()), distance };
  }

  function setView(azimuthDeg: number, elevationDeg: number) {
    if (!controls || !home) return;
    const frame = routeFrame(home);
    const offset = new THREE.Vector3().setFromSpherical(
      new THREE.Spherical(
        frame.distance,
        home.polar - THREE.MathUtils.degToRad(elevationDeg),
        home.azimuth + THREE.MathUtils.degToRad(azimuthDeg),
      ),
    );
    controls.target.copy(frame.target);
    camera.position.copy(frame.target).add(offset);
    controls.update();
  }

  // Taps

  function pick(clientX: number, clientY: number): SurfaceHit | null {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit?.face) return null;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if (normal.dot(raycaster.ray.direction) > 0) normal.negate();
    return { point: hit.point.toArray(), normal: normal.toArray() };
  }

  /** The visible route whose line passes closest to a screen point, within `reach` pixels. */
  function routeAt(clientX: number, clientY: number, reach: number): Uuid | null {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const v = new THREE.Vector3();
    const a = new THREE.Vector2();
    const b = new THREE.Vector2();
    let best: Uuid | null = null;
    let bestDistance = reach;
    for (const state of routes.values()) {
      if (!(state.route.visible ?? true)) continue;
      let prevInView = false;
      for (const p of state.line) {
        v.copy(p).project(camera);
        const inView = v.z < 1;
        b.set(((v.x + 1) / 2) * rect.width, ((1 - v.y) / 2) * rect.height);
        if (inView && prevInView) {
          const d = segmentDistance(x, y, a, b);
          if (d < bestDistance) {
            bestDistance = d;
            best = state.route.uuid;
          }
        }
        a.copy(b);
        prevInView = inView;
      }
    }
    return best;
  }

  // Taps are told apart from orbit drags by how far and how long the pointer moved.
  const pointers = new Set<number>();
  let press: { id: number; x: number; y: number; time: number } | null = null;

  function onPointerDown(e: PointerEvent) {
    pointers.add(e.pointerId);
    press =
      pointers.size === 1 && e.button === 0
        ? { id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now() }
        : null;
  }

  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    const p = press;
    if (!p || p.id !== e.pointerId) return;
    press = null;
    if (!home) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP_SLOP || performance.now() - p.time > TAP_MS) {
      return;
    }
    options.onSurfaceTap?.(pick(e.clientX, e.clientY));
    if (options.onRouteTap) {
      const uuid = routeAt(e.clientX, e.clientY, e.pointerType === 'touch' ? LINE_REACH.touch : LINE_REACH.other);
      if (uuid) options.onRouteTap(uuid);
    }
  }

  function onPointerCancel(e: PointerEvent) {
    pointers.delete(e.pointerId);
    press = null;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  // Render loop

  let frames = 0;
  let lastFps = performance.now();
  renderer.setAnimationLoop(() => {
    controls?.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
    if (!options.onFps) return;
    frames++;
    const now = performance.now();
    if (now - lastFps >= 500) {
      options.onFps(Math.round((frames * 1000) / (now - lastFps)));
      frames = 0;
      lastFps = now;
    }
  });

  return {
    setRoutes,
    highlight(uuid) {
      highlighted = uuid;
      for (const state of routes.values()) redraw(state);
    },
    setFrontArc(on) {
      frontArc = on;
      applyFrontArc();
    },
    setView,
    setOverlays(next) {
      overlays = { ...overlays, ...next };
      const state = highlighted ? routes.get(highlighted) : undefined;
      if (state) redraw(state);
    },
    routeStats(uuid) {
      return routes.get(uuid)?.stats ?? null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      manager.abort();
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      controls?.dispose();
      for (const state of [...routes.values()]) removeRoute(state);
      disposeObject(scene);
      dotMaterial.dispose();
      dotTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      root.remove();
    },
  };
}

function vec(a: number[]): THREE.Vector3 {
  return new THREE.Vector3().fromArray(a);
}

function segmentDistance(x: number, y: number, a: THREE.Vector2, b: THREE.Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? THREE.MathUtils.clamp(((x - a.x) * dx + (y - a.y) * dy) / lengthSq, 0, 1) : 0;
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
}

/** Route name and grade, pinned to the route's first point. */
function makeLabel() {
  const box = document.createElement('div');
  Object.assign(box.style, {
    transform: 'translateY(-20px)',
    background: 'rgba(15, 16, 19, 0.9)',
    color: '#fff',
    borderLeft: '3px solid',
    borderRadius: '4px',
    padding: '2px 8px',
    font: '600 13px/1.4 system-ui, sans-serif',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  });
  const name = document.createElement('span');
  const grade = document.createElement('span');
  grade.style.marginLeft = '6px';
  box.append(name, grade);
  // CSS2DObject positions the outer element, so the offset above the point goes on the inner one.
  const outer = document.createElement('div');
  outer.appendChild(box);
  return { object: new CSS2DObject(outer), box, name, grade };
}

/** White dot with a dark ring, for the placed points of a route being drawn. */
function makeDotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.beginPath();
  g.arc(32, 32, 24, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 10;
  g.strokeStyle = '#1b1d21';
  g.stroke();
  return new THREE.CanvasTexture(c);
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.dispose();
    for (const m of [o.material].flat() as THREE.MeshBasicMaterial[]) {
      m.map?.dispose();
      m.dispose();
    }
  });
}
