import { ELEMENT_IDS } from "./constants";
import {
  getRequiredElementById,
  isButtonElement,
  isHtmlElement,
  isInputElement,
  isSvgElement,
} from "./dom";

export interface AppControls {
  debugConnections: HTMLInputElement;
  toggleEditor: HTMLButtonElement;
  resetView: HTMLButtonElement;
  resetExample: HTMLButtonElement;
  downloadDsl: HTMLButtonElement;
  uploadDsl: HTMLInputElement;
  exportSvg: HTMLButtonElement;
  exportPng: HTMLButtonElement;
  copyLink: HTMLButtonElement;
}

export interface AppElements {
  editorHost: HTMLElement;
  diagnosticsHost: HTMLElement;
  svg: SVGSVGElement;
  traceValuesHost: HTMLElement;
  controls: AppControls;
}

const buildToolbarMarkup = (): string => `
  <header class="toolbar">
    <div class="toolbar-group">
      <button id="${ELEMENT_IDS.resetExample}">Reset to example</button>
      <button id="${ELEMENT_IDS.downloadDsl}">Download DSL</button>
      <label class="button">
        Upload DSL
        <input id="${ELEMENT_IDS.uploadDsl}" type="file" accept=".txt,.dsl" />
      </label>
      <button id="${ELEMENT_IDS.exportSvg}">Export SVG</button>
      <button id="${ELEMENT_IDS.exportPng}">Export PNG</button>
      <button id="${ELEMENT_IDS.copyLink}">Copy share link</button>
    </div>
    <div class="toolbar-group" id="${ELEMENT_IDS.traceValuesHost}"></div>
    <div class="toolbar-group">
      <label class="button">
        <input id="${ELEMENT_IDS.debugConnections}" type="checkbox" />
        Debug connections
      </label>
      <button
        id="${ELEMENT_IDS.toggleEditor}"
        aria-controls="${ELEMENT_IDS.editor}"
        aria-expanded="true"
      >
        Hide source
      </button>
      <button id="${ELEMENT_IDS.resetView}">Reset view</button>
    </div>
    <a
      class="button github-link"
      href="https://github.com/popovdk/data-flow"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View source on GitHub"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
        />
      </svg>
      GitHub
    </a>
  </header>
`;

const buildPaneMarkup = (): string => `
  <main class="pane">
    <section class="editor-pane">
      <div id="${ELEMENT_IDS.editor}"></div>
      <div id="${ELEMENT_IDS.diagnostics}" class="diagnostics"></div>
    </section>
    <section class="diagram-pane">
      <div id="diagram-container">
        <svg id="${ELEMENT_IDS.diagram}"></svg>
      </div>
    </section>
  </main>
`;

const buildLayoutMarkup = (): string =>
  `${buildToolbarMarkup()}${buildPaneMarkup()}`;

const resolveControls = (): AppControls => ({
  debugConnections: getRequiredElementById(
    ELEMENT_IDS.debugConnections,
    isInputElement,
  ),
  toggleEditor: getRequiredElementById(
    ELEMENT_IDS.toggleEditor,
    isButtonElement,
  ),
  resetView: getRequiredElementById(ELEMENT_IDS.resetView, isButtonElement),
  resetExample: getRequiredElementById(
    ELEMENT_IDS.resetExample,
    isButtonElement,
  ),
  downloadDsl: getRequiredElementById(
    ELEMENT_IDS.downloadDsl,
    isButtonElement,
  ),
  uploadDsl: getRequiredElementById(ELEMENT_IDS.uploadDsl, isInputElement),
  exportSvg: getRequiredElementById(ELEMENT_IDS.exportSvg, isButtonElement),
  exportPng: getRequiredElementById(ELEMENT_IDS.exportPng, isButtonElement),
  copyLink: getRequiredElementById(ELEMENT_IDS.copyLink, isButtonElement),
});

export const buildAppLayout = (root: HTMLElement): AppElements => {
  root.innerHTML = buildLayoutMarkup();

  return {
    editorHost: getRequiredElementById(ELEMENT_IDS.editor, isHtmlElement),
    diagnosticsHost: getRequiredElementById(
      ELEMENT_IDS.diagnostics,
      isHtmlElement,
    ),
    svg: getRequiredElementById(ELEMENT_IDS.diagram, isSvgElement),
    traceValuesHost: getRequiredElementById(
      ELEMENT_IDS.traceValuesHost,
      isHtmlElement,
    ),
    controls: resolveControls(),
  };
};
