import { debounce } from "../shared/debounce";
import { downloadDsl, exportPng, exportSvg } from "../shared/exporters";
import { buildShareUrl, saveToStorage, updateHash } from "../shared/persistence";
import { EXAMPLE_DSL } from "./examples";
import { copyTextToClipboard } from "./clipboard";
import { buildAppLayout } from "./appLayout";
import { DIAGNOSTICS_EMPTY_MESSAGE, DEBOUNCE_MS } from "./constants";
import { DiagnosticsRenderer } from "./diagnosticsRenderer";
import { DiagramBuilder, type DiagramData } from "../diagram";
import { loadInitialDsl } from "./initialDsl";
import { ToolbarCallbacks, ToolbarController } from "./toolbarController";
import { EditorController } from "../editor/editorController";
import { DiagramController } from "../render";
import {
  TracePanel,
  buildTraceFieldValues,
  buildTraceLayoutOptions,
  countUnknownTraceValues,
} from "../trace";
import type { TraceValues } from "../trace";
import type { FieldValueBadge } from "../render";

export class AppController {
  private readonly root: HTMLElement;
  private readonly diagnosticsRenderer: DiagnosticsRenderer;
  private readonly diagramController: DiagramController;
  private readonly diagramBuilder: DiagramBuilder;
  private readonly elements: ReturnType<typeof buildAppLayout>;
  private editorController: EditorController | null = null;
  private toolbarController: ToolbarController | null = null;
  private tracePanel: TracePanel | null = null;
  private traceValues: TraceValues | null = null;
  private traceFieldValues: ReadonlyMap<string, FieldValueBadge> | null = null;
  private lastValidData: DiagramData | null = null;
  private readonly debouncedApply: (text: string) => void;
  private readonly debouncedPersist: (text: string) => void;

  constructor(root: HTMLElement) {
    this.root = root;
    this.elements = buildAppLayout(this.root);
    this.diagnosticsRenderer = new DiagnosticsRenderer(
      this.elements.diagnosticsHost,
      DIAGNOSTICS_EMPTY_MESSAGE,
    );
    this.diagramController = new DiagramController(this.elements.svg);
    this.diagramBuilder = new DiagramBuilder();
    this.debouncedApply = debounce(this.applyDsl, DEBOUNCE_MS.parse);
    this.debouncedPersist = debounce(this.persistDsl, DEBOUNCE_MS.persist);
  }

  async init(): Promise<void> {
    const initialDsl = await loadInitialDsl(EXAMPLE_DSL);
    this.editorController = new EditorController(
      this.elements.editorHost,
      initialDsl,
      this.handleEditorChange,
    );
    this.toolbarController = new ToolbarController(
      this.elements.controls,
      this.buildToolbarCallbacks(),
    );
    this.tracePanel = new TracePanel(this.elements.traceValuesHost, {
      onLoad: this.loadTraceValues,
      onClear: this.clearTraceValues,
    });
    this.setInitialToolbarState();
    this.applyDsl(initialDsl);
  }

  private buildToolbarCallbacks(): ToolbarCallbacks {
    return {
      onResetExample: () => this.requireEditor().setValue(EXAMPLE_DSL),
      onDownloadDsl: () => downloadDsl(this.requireEditor().getValue()),
      onUploadDsl: (text: string) => this.requireEditor().setValue(text),
      onExportSvg: () => exportSvg(this.elements.svg),
      onExportPng: () => this.exportPngSafely(),
      onCopyShareLink: () => void this.copyShareLink(),
      onDebugConnectionsChange: (enabled: boolean) =>
        this.diagramController.setOptions({ debugConnections: enabled }),
      onResetView: () => this.diagramController.resetView(),
    };
  }

  private setInitialToolbarState(): void {
    this.requireToolbar().setDebugConnections(false);
  }

  private handleEditorChange = (text: string): void => {
    this.debouncedPersist(text);
    this.debouncedApply(text);
  };

  private persistDsl = (text: string): void => {
    saveToStorage(text);
    updateHash(text).catch(() => undefined);
  };

  private loadTraceValues = (trace: TraceValues): void => {
    this.traceValues = trace;
    this.traceFieldValues = buildTraceFieldValues(trace);
    this.tracePanel?.setSummary(trace, 0);
    this.applyDsl(this.requireEditor().getValue());
    this.diagramController.resetView();
  };

  private clearTraceValues = (): void => {
    this.traceValues = null;
    this.traceFieldValues = null;
    this.applyDsl(this.requireEditor().getValue());
    this.diagramController.resetView();
  };

  private applyDsl = (text: string): void => {
    const result = this.diagramBuilder.build(
      text,
      buildTraceLayoutOptions(this.traceValues),
    );
    this.diagnosticsRenderer.render(result.diagnostics);

    if (result.data) {
      this.lastValidData = result.data;
      this.diagramController.setData(result.data, this.traceFieldValues);
      const unknown = this.traceValues
        ? countUnknownTraceValues(
            this.traceValues,
            result.data.graph.fieldIndex,
          )
        : 0;
      this.tracePanel?.setSummary(this.traceValues, unknown);
      return;
    }

    if (!this.lastValidData) {
      this.diagramController.setData(null, this.traceFieldValues);
    }
  };

  private async copyShareLink(): Promise<void> {
    const url = await buildShareUrl(this.requireEditor().getValue());
    await copyTextToClipboard(url);
  }

  private exportPngSafely(): void {
    exportPng(this.elements.svg).catch(() => undefined);
  }

  private requireEditor(): EditorController {
    if (!this.editorController) {
      throw new Error("Editor is not initialized.");
    }
    return this.editorController;
  }

  private requireToolbar(): ToolbarController {
    if (!this.toolbarController) {
      throw new Error("Toolbar is not initialized.");
    }
    return this.toolbarController;
  }
}
