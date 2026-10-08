'use dom';

import type { DOMProps } from 'expo/dom';
import { type CSSProperties, useEffect, useEffectEvent, useRef, useState } from 'react';

import { STYLES } from '@/author/styles';
import { gradeFromText, pickGrade } from '@/core/grades';
import type { RoutesFile } from '@/core/routes-file';
import type { Grade, GradeSystem, Uuid } from '@/core/types';
import type { DrapeStats, ModelInfo, SurfaceHit, Vec3, Viewer, ViewerRoute } from '@/viewer/types';
import { createViewer, ROUTE_COLORS } from '@/viewer/viewer';

/** scripts/viewer/serve.mjs, which serves data/ and writes the saves. */
const DATA_URL = 'http://localhost:8765/data';
const OPENBETA_FILE = `${DATA_URL}/openbeta/date-wall.json`;
const NOT_RUNNING = 'Is scripts/viewer/serve.mjs running?';
/** Camera angles from straight in front of the wall: [label, azimuth, elevation]. */
const VIEWS: [string, number, number][] = [
  ['Front', 0, 0],
  ['Left', -40, 0],
  ['Right', 40, 0],
  ['Above', 0, 25],
  ['Below', 0, -25],
];

/** An entry in data/models/index.json. */
interface ModelEntry {
  file: string;
  name?: string;
  notes?: string;
}

interface AuthorRoute {
  uuid: Uuid;
  name: string;
  grade: Grade | null;
  color: string;
  shown: boolean;
  points: Vec3[];
  normals: Vec3[];
}

interface SaveStatus {
  text: string;
  tone: 'normal' | 'dirty' | 'error';
}

/** The part of data/openbeta/date-wall.json the tool reads. */
interface OpenBetaFile {
  data: {
    area: {
      uuid: Uuid;
      area_name: string;
      climbs: {
        uuid: Uuid;
        name: string;
        grades: Partial<Record<GradeSystem, string | null>> | null;
        metadata: { leftRightIndex: number | null } | null;
      }[];
    };
  };
}

/**
 * Draws route lines on a wall's model: pick a route, click holds from the
 * start upward, then save to data/routes/<model>.json. A DOM component so
 * three.js stays out of the native bundle; the screen only shows it on web.
 */
export default function AuthorTool({
  model,
  onModelChange,
}: {
  /** File in data/models/. Defaults to the first model in data/models/index.json. */
  model: string | null;
  onModelChange: (file: string) => void;
  dom?: DOMProps;
}) {
  const [models, setModels] = useState<ModelEntry[] | null>(null);

  useEffect(() => {
    fetch(`${DATA_URL}/models/index.json`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((index: { models?: ModelEntry[] } | null) => setModels(index?.models ?? []));
  }, []);

  if (!models) {
    return (
      <div className="author">
        <style>{STYLES}</style>
        <div className="loading">Loading models…</div>
      </div>
    );
  }
  const file = model ?? models[0]?.file ?? 'wall47.glb';
  return <Author key={file} file={file} models={models} onModelChange={onModelChange} />;
}

function Author({
  file,
  models,
  onModelChange,
}: {
  file: string;
  models: ModelEntry[];
  onModelChange: (file: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [area, setArea] = useState<RoutesFile['area']>(null);
  const [routes, setRoutes] = useState<AuthorRoute[] | null>(null);
  const [active, setActive] = useState<Uuid | null>(null);
  const [stats, setStats] = useState<DrapeStats | null>(null);
  const [missed, setMissed] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [save, setSave] = useState<SaveStatus>({ text: '', tone: 'normal' });
  const [straight, setStraight] = useState(false);
  const [frontArc, setFrontArc] = useState(false);

  const entry = models.find((m) => m.file === file);
  const routesName = `${file.replace(/\.glb$/i, '')}.json`;
  const routesUrl = `${DATA_URL}/routes/${encodeURIComponent(routesName)}`;
  const activeRoute = routes?.find((r) => r.uuid === active) ?? null;

  /** Shows a new set of routes on the model, and remembers which are hidden. */
  function update(next: AuthorRoute[], nextActive = active) {
    setRoutes(next);
    setActive(nextActive);
    setMissed(false);
    saveHidden(file, next);
    const v = viewer.current;
    if (!v) return;
    v.setRoutes(next.map(toViewerRoute));
    v.highlight(nextActive);
    setStats(nextActive ? v.routeStats(nextActive) : null);
  }

  function changed() {
    setDirty(true);
    setSave({ text: 'Unsaved changes', tone: 'dirty' });
  }

  function select(route: AuthorRoute) {
    if (!routes) return;
    update(
      routes.map((r) => (r === route ? { ...r, shown: true } : r)),
      route.uuid,
    );
  }

  function show(list: AuthorRoute[], on: boolean) {
    if (!routes) return;
    const uuids = new Set(list.map((r) => r.uuid));
    update(routes.map((r) => (uuids.has(r.uuid) ? { ...r, shown: on } : r)));
  }

  function addPoint(hit: SurfaceHit | null) {
    if (!drawing || !routes || !active) return;
    if (!hit) {
      setMissed(true);
      return;
    }
    update(
      routes.map((r) =>
        r.uuid === active
          ? { ...r, shown: true, points: [...r.points, hit.point], normals: [...r.normals, hit.normal] }
          : r,
      ),
    );
    changed();
  }

  function undo() {
    if (!routes || !activeRoute?.points.length) return;
    update(
      routes.map((r) =>
        r === activeRoute ? { ...r, points: r.points.slice(0, -1), normals: r.normals.slice(0, -1) } : r,
      ),
    );
    changed();
  }

  function clear() {
    if (!routes || !activeRoute?.points.length) return;
    if (!confirm(`Clear the line for ${activeRoute.name}?`)) return;
    update(routes.map((r) => (r === activeRoute ? { ...r, points: [], normals: [] } : r)));
    changed();
  }

  async function saveRoutes() {
    if (!routes) return;
    setSaving(true);
    try {
      const res = await fetch(routesUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toRoutesFile(file, area, routes)),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setDirty(false);
      setSave({ text: `Saved ${new Date().toLocaleTimeString()} to data/routes/${routesName}`, tone: 'normal' });
    } catch (e) {
      setSave({ text: `Save failed: ${errorText(e)}. ${NOT_RUNNING}`, tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function changeModel(next: string) {
    if (dirty && !confirm('This model has unsaved route changes. Switch models and lose them?')) return;
    onModelChange(next);
  }

  // The viewer calls these long after it is created, so they read the latest state.
  const loaded = useEffectEvent((modelInfo: ModelInfo) => {
    setInfo(modelInfo);
    if (active) setStats(viewer.current?.routeStats(active) ?? null);
  });
  const tapped = useEffectEvent((hit: SurfaceHit | null) => addPoint(hit));
  const routesLoaded = useEffectEvent((result: LoadedRoutes) => {
    setArea(result.area);
    setSave(result.status);
    const first = result.routes.find((r) => r.shown) ?? result.routes[0];
    update(result.routes, first?.uuid ?? null);
  });
  const keyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape' && drawing) setDrawing(false);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    }
  });

  useEffect(() => {
    if (!container.current) return;
    const v = createViewer(container.current, {
      model: `${DATA_URL}/models/${encodeURIComponent(file)}`,
      frontArc: false,
      // Neighboring routes stay clear while drawing.
      dimOthers: false,
      onProgress: (fraction) => setProgress(fraction),
      onLoad: (modelInfo) => loaded(modelInfo),
      onError: (error) => setLoadError(error.message),
      onSurfaceTap: (hit) => tapped(hit),
      onFps: (value) => setFps(value),
    });
    v.setOverlays({ points: true });
    viewer.current = v;
    return () => {
      v.dispose();
      viewer.current = null;
    };
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    loadRoutes(file, routesUrl).then((result) => {
      if (!cancelled) routesLoaded(result);
    });
    return () => {
      cancelled = true;
    };
  }, [file, routesUrl]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keyDown(e);
    addEventListener('keydown', onKeyDown);
    return () => removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener('beforeunload', onBeforeUnload);
    return () => removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  return (
    <div className={drawing ? 'author drawing' : 'author'}>
      <style>{STYLES}</style>
      <div ref={container} className="stage" />

      {info ? null : (
        <div className="loading">
          {loadError
            ? `Failed to load model: ${loadError}. ${NOT_RUNNING}`
            : `Loading model…${progress == null ? '' : ` ${Math.round(progress * 100)}%`}`}
        </div>
      )}

      {info ? (
        <div className="panel stats">
          {models.length > 1 ? (
            <select aria-label="Model" value={file} onChange={(e) => changeModel(e.target.value)}>
              {models.map((m) => (
                <option key={m.file} value={m.file}>
                  {m.name || m.file}
                </option>
              ))}
            </select>
          ) : (
            <h1>{entry?.name || file}</h1>
          )}
          <StatsTable info={info} notes={entry?.notes} />
        </div>
      ) : null}

      <div className="panel fps">{fps == null ? '– fps' : `${fps} fps`}</div>

      {routes ? (
        <div className="panel routes" style={{ '--route': activeRoute?.color } as CSSProperties}>
          <div className="route-header">
            <h2>{area ? `Routes · ${area.name} (OpenBeta)` : 'Routes (OpenBeta data not found)'}</h2>
            <button className="mini" title="Show every route on the model" onClick={() => show(routes, true)}>
              All
            </button>
            <button className="mini" title="Hide every route on the model" onClick={() => show(routes, false)}>
              None
            </button>
          </div>
          <div className="route-list" role="listbox" aria-label="Routes">
            {routes.map((r) => (
              <div
                key={r.uuid}
                className={`route-row${r.uuid === active ? ' active' : ''}${r.shown ? '' : ' off'}`}
                style={{ '--route': r.color } as CSSProperties}>
                <input
                  type="checkbox"
                  checked={r.shown}
                  onChange={(e) => show([r], e.target.checked)}
                  aria-label={`Show ${r.name} on the model`}
                />
                <button className="route-pick" role="option" aria-selected={r.uuid === active} onClick={() => select(r)}>
                  <span className="rdot" style={{ background: r.color }} />
                  <span className="rname">{r.name}</span>
                  <span className="rgrade">{r.grade?.text ?? '?'}</span>
                  <span className="rcount">{r.points.length ? `${r.points.length} pts` : 'not drawn'}</span>
                </button>
              </div>
            ))}
          </div>
          {activeRoute ? (
            <>
              <div className="row">
                <button className={drawing ? 'on' : undefined} onClick={() => setDrawing(!drawing)}>
                  {drawing ? 'Drawing… (Esc)' : 'Draw'}
                </button>
                <button onClick={undo}>Undo</button>
                <button onClick={clear}>Clear route</button>
              </div>
              <div className="row">
                <button disabled={saving} onClick={saveRoutes}>
                  Save routes
                </button>
                <span className={`save-status ${save.tone}`}>{save.text}</span>
              </div>
              <div className="row">
                <label>
                  <input
                    type="checkbox"
                    checked={straight}
                    onChange={(e) => {
                      setStraight(e.target.checked);
                      viewer.current?.setOverlays({ straight: e.target.checked });
                    }}
                  />{' '}
                  Show straight segments too
                </label>
              </div>
              <div className="row">
                Views:
                {VIEWS.map(([label, azimuth, elevation]) => (
                  <button key={label} onClick={() => viewer.current?.setView(azimuth, elevation)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="route-status">
                {missed ? (
                  <>
                    <b>Missed the model.</b> Click on the wall.
                  </>
                ) : (
                  <RouteStatus route={activeRoute} stats={stats} />
                )}
              </div>
            </>
          ) : (
            <div className="route-status">No routes to draw: {OPENBETA_FILE} did not load.</div>
          )}
        </div>
      ) : null}

      <div className="panel controls">
        <label>
          <input
            type="checkbox"
            checked={frontArc}
            onChange={(e) => {
              setFrontArc(e.target.checked);
              viewer.current?.setFrontArc(e.target.checked);
            }}
          />{' '}
          Limit to front arc (90° across, 60° up and down)
        </label>
        <div className="hint">Drag to orbit · scroll to zoom · right-drag to pan</div>
      </div>
    </div>
  );
}

function StatsTable({ info, notes }: { info: ModelInfo; notes?: string }) {
  const rows: [string, string][] = [
    ['Triangles', info.triangles.toLocaleString()],
    ['Vertices', info.vertices.toLocaleString()],
    ['Textures', `${info.textures.length} (${info.textures.join(', ') || 'none'})`],
    ['File size', info.bytes == null ? '?' : `${(info.bytes / 1048576).toFixed(1)} MB`],
    ['Load + parse', `${(info.loadMs / 1000).toFixed(2)} s`],
    ['Bounding box', `${info.size.map((v) => v.toFixed(1)).join(' × ')} (model units, unscaled)`],
    ['Captured face', `${(100 * info.capturedFace).toFixed(0)}% of triangles`],
    ['GPU max texture', `${info.maxTextureSize.toLocaleString()} px`],
  ];
  if (notes) rows.push(['Notes', notes]);
  return (
    <table>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** What to do next with the selected route, or how well its line follows the rock. */
function RouteStatus({ route, stats }: { route: AuthorRoute; stats: DrapeStats | null }) {
  const n = route.points.length;
  const name = <b>{route.name}</b>;
  if (!n) {
    return (
      <>
        {name}: click <b>Draw</b>, then click holds on the wall from the start upward. Esc stops drawing; Ctrl+Z
        undoes a point.
      </>
    );
  }
  if (n < 2 || !stats) {
    return (
      <>
        {name}: {n === 1 ? '1 point. Click the next hold.' : `${n} points.`}
      </>
    );
  }
  // Deviations are NaN over holes in the mesh.
  const valid = stats.deviations.filter(Number.isFinite);
  const abs = valid.map(Math.abs);
  const tolerance = stats.offset * 3;
  const floating = valid.filter((v) => v < -tolerance).length;
  const sunk = valid.filter((v) => v > tolerance).length;
  return (
    <>
      {name}: {n} points, {stats.length.toFixed(2)} units long, draped over {stats.samples} surface samples
      {stats.misses ? (
        <>
          , <b>{stats.misses} over holes</b>
        </>
      ) : null}
      .
      {abs.length ? (
        <>
          <br />
          <span className="swatch" />
          Straight segments would stray up to <b>{Math.max(...abs).toFixed(2)}</b> units (mean{' '}
          {(abs.reduce((s, v) => s + v, 0) / abs.length).toFixed(3)}): {percent(floating, valid.length)} floating,{' '}
          {percent(sunk, valid.length)} sunk in.
        </>
      ) : null}
    </>
  );
}

interface LoadedRoutes {
  area: RoutesFile['area'];
  routes: AuthorRoute[];
  status: SaveStatus;
}

/**
 * The wall's routes from OpenBeta, left to right, with the lines saved for
 * this model. Saved routes OpenBeta doesn't list are kept at the end.
 */
async function loadRoutes(file: string, routesUrl: string): Promise<LoadedRoutes> {
  let area: RoutesFile['area'] = null;
  const list: Omit<AuthorRoute, 'color' | 'shown'>[] = [];
  try {
    const { data } = (await (await fetch(OPENBETA_FILE)).json()) as OpenBetaFile;
    area = { name: data.area.area_name, openbeta_uuid: data.area.uuid };
    const climbs = [...data.area.climbs].sort(
      (a, b) => (a.metadata?.leftRightIndex ?? 0) - (b.metadata?.leftRightIndex ?? 0),
    );
    for (const c of climbs) {
      list.push({ uuid: c.uuid, name: c.name, grade: pickGrade(c.grades, []), points: [], normals: [] });
    }
  } catch {
    // Without the OpenBeta file, only saved routes are listed.
  }

  let status: SaveStatus;
  try {
    const res = await fetch(routesUrl, { cache: 'no-store' });
    if (res.status === 404) {
      status = { text: 'No saved routes yet', tone: 'normal' };
    } else {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = (await res.json()) as RoutesFile;
      for (const s of saved.routes) {
        let route = list.find((r) => r.uuid === s.openbeta_uuid);
        if (!route) {
          route = { uuid: s.openbeta_uuid, name: s.name, grade: gradeFromText(s.grade), points: [], normals: [] };
          list.push(route);
        }
        route.points = s.points;
        route.normals = s.normals;
      }
      status = { text: `Loaded ${saved.routes.length} saved route(s)`, tone: 'normal' };
    }
  } catch (e) {
    status = { text: `Could not load saved routes: ${errorText(e)}. ${NOT_RUNNING}`, tone: 'error' };
  }

  const hidden = loadHidden(file);
  return {
    area,
    status,
    routes: list.map((r, i) => ({ ...r, color: ROUTE_COLORS[i % ROUTE_COLORS.length], shown: !hidden.has(r.uuid) })),
  };
}

function toViewerRoute(r: AuthorRoute): ViewerRoute {
  return {
    uuid: r.uuid,
    name: r.name,
    grade: r.grade,
    color: r.color,
    visible: r.shown,
    points: r.points,
    normals: r.normals,
  };
}

function toRoutesFile(file: string, area: RoutesFile['area'], routes: AuthorRoute[]): RoutesFile {
  const round = (v: Vec3) => v.map((x) => +x.toFixed(4)) as Vec3;
  return {
    model: `data/models/${file}`,
    area,
    updated: new Date().toISOString(),
    routes: routes
      .filter((r) => r.points.length)
      .map((r) => ({
        openbeta_uuid: r.uuid,
        name: r.name,
        grade: r.grade?.text ?? '?',
        points: r.points.map(round),
        normals: r.normals.map(round),
      })),
  };
}

// Which routes are hidden is remembered per model in this browser.
const hiddenKey = (file: string) => `hiddenRoutes:${file}`;

function loadHidden(file: string): Set<Uuid> {
  try {
    return new Set(JSON.parse(localStorage.getItem(hiddenKey(file)) ?? '[]'));
  } catch {
    return new Set();
  }
}

function saveHidden(file: string, routes: AuthorRoute[]) {
  try {
    localStorage.setItem(hiddenKey(file), JSON.stringify(routes.filter((r) => !r.shown).map((r) => r.uuid)));
  } catch {
    // Storage can be blocked, for example in private browsing. Hiding still works, it just isn't remembered.
  }
}

function percent(part: number, whole: number): string {
  return `${Math.round((100 * part) / Math.max(whole, 1))}%`;
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
