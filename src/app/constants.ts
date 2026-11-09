export const ELEMENT_IDS = {
  appRoot: "app",
  editor: "editor",
  diagnostics: "diagnostics",
  diagram: "diagram",
  debugConnections: "debug-connections",
  resetView: "reset-view",
  resetExample: "reset-example",
  downloadDsl: "download-dsl",
  uploadDsl: "upload-dsl",
  exportSvg: "export-svg",
  exportPng: "export-png",
  copyLink: "copy-link",
  traceValuesHost: "trace-values-host",
} as const;

export const DEBOUNCE_MS = {
  parse: 350,
  persist: 400,
} as const;

export const PANZOOM_CONFIG = {
  minScale: 0.2,
  maxScale: 4,
} as const;

export const DIAGNOSTICS_EMPTY_MESSAGE = "No diagnostics.";
