'use dom';

import type { DOMProps } from 'expo/dom';
import { useEffect, useEffectEvent, useRef } from 'react';

import type { Uuid } from '@/core/types';
import type { Insets, ModelCacheKey, ModelInfo, SurfaceHit, Viewer, ViewerRoute } from '@/viewer/types';
import { createViewer } from '@/viewer/viewer';

export interface WallViewerProps {
  /** URL of the wall's GLB. */
  model: string;
  /** Keep the file on the device under this key. Should change only when `model` does. */
  cache?: ModelCacheKey;
  routes: ViewerRoute[];
  /** Route to highlight. The others dim and the camera flies to it. */
  highlighted?: Uuid | null;
  /** Fly the camera to the highlighted route. Defaults to true; off while drawing, so the view holds still. */
  flyToHighlight?: boolean;
  /** Keep the camera in front of the wall. Defaults to true. */
  frontArc?: boolean;
  /** Dim the other routes while one is highlighted. Defaults to true. Read when the model loads. */
  dimOthers?: boolean;
  /** Mark the placed points on the highlighted route, for drawing. */
  showPoints?: boolean;
  /** Space the screen's own controls cover, so routes are framed in what's left. */
  insets?: Insets;
  /** Change this number to fly the camera back to the whole wall. */
  showWholeWall?: number;
  onProgress?: (fraction: number) => void;
  onLoad?: (info: ModelInfo) => void;
  onError?: (message: string) => void;
  onRouteTap?: (uuid: Uuid) => void;
  onEmptyTap?: () => void;
  /** Every tap, with the point on the rock under it, or null if it missed the wall. */
  onSurfaceTap?: (hit: SurfaceHit | null) => void;
  onFps?: (fps: number) => void;
  dom?: DOMProps;
}

/**
 * The wall viewer as an Expo DOM component: rendered as-is on web, and in a
 * webview on iOS and Android, where three.js has the browser it needs. Props
 * must be plain data, and callbacks reach native screens asynchronously.
 */
export default function WallViewer({
  model,
  cache,
  routes,
  highlighted = null,
  flyToHighlight = true,
  frontArc = true,
  dimOthers = true,
  showPoints = false,
  insets,
  showWholeWall = 0,
  onProgress,
  onLoad,
  onError,
  onRouteTap,
  onEmptyTap,
  onSurfaceTap,
  onFps,
}: WallViewerProps) {
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const { top = 0, right = 0, bottom = 0, left = 0 } = insets ?? {};

  // Effect events so new callback props don't rebuild the viewer and reload the model.
  const progressed = useEffectEvent((fraction: number) => onProgress?.(fraction));
  const loaded = useEffectEvent((info: ModelInfo) => onLoad?.(info));
  const failed = useEffectEvent((message: string) => onError?.(message));
  const tapped = useEffectEvent((uuid: Uuid) => onRouteTap?.(uuid));
  const missed = useEffectEvent(() => onEmptyTap?.());
  const surface = useEffectEvent((hit: SurfaceHit | null) => onSurfaceTap?.(hit));
  const measured = useEffectEvent((fps: number) => onFps?.(fps));

  useEffect(() => {
    if (!container.current) return;
    const v = createViewer(container.current, {
      model,
      cache,
      dimOthers,
      onProgress: (fraction) => progressed(fraction),
      onLoad: (info) => loaded(info),
      onError: (error) => failed(error.message),
      onRouteTap: (uuid) => tapped(uuid),
      onEmptyTap: () => missed(),
      onSurfaceTap: (hit) => surface(hit),
      onFps: (fps) => measured(fps),
    });
    viewer.current = v;
    return () => {
      v.dispose();
      viewer.current = null;
    };
    // The cache key and dimOthers are read when the model loads, so changing them alone doesn't reload it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  useEffect(() => viewer.current?.setRoutes(routes), [model, routes]);
  // Before the highlight, so a flight that starts with it is framed for the new layout.
  useEffect(() => viewer.current?.setInsets({ top, right, bottom, left }), [model, top, right, bottom, left]);
  useEffect(() => {
    viewer.current?.highlight(highlighted);
    if (highlighted && flyToHighlight) viewer.current?.focus(highlighted);
  }, [model, highlighted, flyToHighlight]);
  useEffect(() => viewer.current?.setFrontArc(frontArc), [model, frontArc]);
  useEffect(() => viewer.current?.setOverlays({ points: showPoints }), [model, showPoints]);
  useEffect(() => {
    if (showWholeWall) viewer.current?.focus(null);
  }, [model, showWholeWall]);

  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />;
}
