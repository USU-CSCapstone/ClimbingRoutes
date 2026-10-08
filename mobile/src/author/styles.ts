// Styles for the author tool, rendered in a <style> element so they only exist while the
// tool is open. (A .css import would land in every page of the production web build.)
// On web, DOM components render inside the app's page, so every rule is scoped to .author.
export const STYLES = `
.author {
  --panel: rgba(20, 22, 26, 0.86);
  --text: #e8e8e8;
  --muted: #9aa0a6;
  --route: #ffd23f;
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #1b1d21;
  color: var(--text);
  font: 13px/1.45 system-ui, sans-serif;
}
.author .stage { position: absolute; inset: 0; }
.author.drawing canvas { cursor: crosshair; }
.author .panel { position: absolute; background: var(--panel); border-radius: 8px; padding: 10px 12px; backdrop-filter: blur(4px); }
.author h1, .author h2 { font-size: 14px; margin: 0 0 6px; }
.author label { cursor: pointer; }
.author .hint { color: var(--muted); margin-top: 4px; }
.author .loading { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-size: 15px; pointer-events: none; }

.author .stats { top: 12px; left: 12px; min-width: 220px; }
.author .stats select { display: block; max-width: 100%; margin: 0 0 8px; padding: 3px 6px; font: 600 14px/1.4 system-ui, sans-serif; color: var(--text); background: #2a2d33; border: 1px solid #555; border-radius: 6px; cursor: pointer; }
.author .stats table { border-collapse: collapse; }
.author .stats td { padding: 1px 10px 1px 0; }
.author .stats td:first-child { color: var(--muted); }

.author .fps { top: 12px; right: 12px; font-variant-numeric: tabular-nums; font-size: 18px; font-weight: 600; }
.author .controls { bottom: 12px; left: 12px; }

.author .routes { top: 60px; right: 12px; width: 280px; max-height: calc(100% - 150px); overflow-y: auto; }
.author .routes button { font: inherit; padding: 3px 9px; border-radius: 6px; border: 1px solid #555; background: #2a2d33; color: var(--text); cursor: pointer; }
.author .routes button:hover { background: #353941; }
.author .routes button.on { background: var(--route); color: #1b1d21; border-color: var(--route); font-weight: 600; }
.author .routes button.mini { padding: 1px 7px; font-size: 12px; }
.author .route-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.author .route-header h2 { margin: 0; flex: 1; }
.author .route-list { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
.author .route-row { display: flex; align-items: center; gap: 4px; padding-left: 6px; border: 1px solid transparent; border-radius: 6px; }
.author .route-row:hover, .author .route-row.active { background: #2a2d33; }
.author .route-row.active { border-color: var(--route); }
.author .route-row input { margin: 0; accent-color: var(--route); cursor: pointer; }
.author .route-row.off .rname, .author .route-row.off .rgrade, .author .route-row.off .rdot { opacity: 0.4; }
.author .routes button.route-pick { display: flex; align-items: center; gap: 8px; flex: 1; text-align: left; padding: 4px 8px 4px 4px; border: 0; background: transparent; }
.author .rdot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.author .rname { flex: 1; }
.author .rgrade { font-variant-numeric: tabular-nums; }
.author .rcount { color: var(--muted); font-size: 11px; min-width: 52px; text-align: right; }
.author .row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; align-items: center; }
.author .save-status { color: var(--muted); font-size: 12px; }
.author .save-status.dirty { color: #ffb44d; }
.author .save-status.error { color: #ff6b6b; }
.author .route-status { color: var(--muted); font-size: 12px; }
.author .route-status b { color: var(--text); font-weight: 600; }
.author .swatch { display: inline-block; width: 16px; height: 3px; vertical-align: middle; margin-right: 5px; background: #ff5a5a; }

@media (max-width: 700px) {
  .author .stats { font-size: 11px; min-width: 0; }
  .author .routes { top: auto; bottom: 96px; left: 12px; width: auto; }
}
`;
