'use dom';

import type { DOMProps } from 'expo/dom';
import { useEffect, useEffectEvent, useRef } from 'react';

import type { Uuid } from '@/core/types';
import type { Insets, ModelCacheKey, ModelInfo, Viewer, ViewerRoute } from '@/viewer/types';
import { createViewer } from '@/viewer/viewer';

export interface WallViewerProps {
  /** URL of the wall's GLB. */
  model: string;
  /** Keep the file on the device under this key. Should change only when `model` does. */
  cache?: ModelCacheKey;
  routes: ViewerRoute[];
  /** Route to highlight. The others dim and the camera flies to it. */
  highlighted?: Uuid | null;
  /** Keep the camera in front of the wall. Defaults to true. */
  frontArc?: boolean;
  /** Space the screen's own controls cover, so routes are framed in what's left. */
  insets?: Insets;
  /** Change this number to fly the camera back to the whole wall. */
  showWholeWall?: number;
  onProgress?: (fraction: number) => void;
  onLoad?: (info: ModelInfo) => void;
  onError?: (message: string) => void;
  onRouteTap?: (uuid: Uuid) => void;
  onEmptyTap?: () => void;
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
  frontArc = true,
  insets,
  showWholeWall = 0,
  onProgress,
  onLoad,
  onError,
  onRouteTap,
  onEmptyTap,
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
  const measured = useEffectEvent((fps: number) => onFps?.(fps));

  useEffect(() => {
    if (!container.current) return;
    const v = createViewer(container.current, {
      model,
      cache,
      onProgress: (fraction) => progressed(fraction),
      onLoad: (info) => loaded(info),
      onError: (error) => failed(error.message),
      onRouteTap: (uuid) => tapped(uuid),
      onEmptyTap: () => missed(),
      onFps: (fps) => measured(fps),
    });
    viewer.current = v;
    return () => {
      v.dispose();
      viewer.current = null;
    };
    // The cache key belongs to the model URL, so a new key alone doesn't reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  useEffect(() => viewer.current?.setRoutes(routes), [model, routes]);
  // Before the highlight, so a flight that starts with it is framed for the new layout.
  useEffect(() => viewer.current?.setInsets({ top, right, bottom, left }), [model, top, right, bottom, left]);
  useEffect(() => {
    viewer.current?.highlight(highlighted);
    if (highlighted) viewer.current?.focus(highlighted);
  }, [model, highlighted]);
  useEffect(() => viewer.current?.setFrontArc(frontArc), [model, frontArc]);
  useEffect(() => {
    if (showWholeWall) viewer.current?.focus(null);
  }, [model, showWholeWall]);

  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />;
}
