'use dom';

import type { DOMProps } from 'expo/dom';
import { useEffect, useEffectEvent, useRef } from 'react';

import type { Uuid } from '@/core/types';
import type { ModelInfo, Viewer, ViewerRoute } from '@/viewer/types';
import { createViewer } from '@/viewer/viewer';

export interface WallViewerProps {
  /** URL of the wall's GLB. */
  model: string;
  routes: ViewerRoute[];
  /** Route to highlight. The others dim. */
  highlighted?: Uuid | null;
  /** Keep the camera in front of the wall. Defaults to true. */
  frontArc?: boolean;
  onProgress?: (fraction: number) => void;
  onLoad?: (info: ModelInfo) => void;
  onError?: (message: string) => void;
  onRouteTap?: (uuid: Uuid) => void;
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
  routes,
  highlighted = null,
  frontArc = true,
  onProgress,
  onLoad,
  onError,
  onRouteTap,
  onFps,
}: WallViewerProps) {
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);

  // Effect events so new callback props don't rebuild the viewer and reload the model.
  const progressed = useEffectEvent((fraction: number) => onProgress?.(fraction));
  const loaded = useEffectEvent((info: ModelInfo) => onLoad?.(info));
  const failed = useEffectEvent((message: string) => onError?.(message));
  const tapped = useEffectEvent((uuid: Uuid) => onRouteTap?.(uuid));
  const measured = useEffectEvent((fps: number) => onFps?.(fps));

  useEffect(() => {
    if (!container.current) return;
    const v = createViewer(container.current, {
      model,
      onProgress: (fraction) => progressed(fraction),
      onLoad: (info) => loaded(info),
      onError: (error) => failed(error.message),
      onRouteTap: (uuid) => tapped(uuid),
      onFps: (fps) => measured(fps),
    });
    viewer.current = v;
    return () => {
      v.dispose();
      viewer.current = null;
    };
  }, [model]);

  useEffect(() => viewer.current?.setRoutes(routes), [model, routes]);
  useEffect(() => viewer.current?.highlight(highlighted), [model, highlighted]);
  useEffect(() => viewer.current?.setFrontArc(frontArc), [model, frontArc]);

  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />;
}
