import type { WallModel } from '@/core/database';

/** "v1 · 10.7 MB · 300k triangles · made Nov 6", the facts a moderator scans a model by. */
export function modelSummary(model: WallModel): string {
  const parts = [`v${model.version}`, `${(model.bytes / 1e6).toFixed(1)} MB`];
  if (model.triangles) parts.push(`${Math.round(model.triangles / 1000)}k triangles`);
  parts.push(`made ${new Date(model.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`);
  return parts.join(' · ');
}
