import type { AppControls } from "./appLayout";
import { getInputTarget } from "./dom";

export type VoidCallback = () => void;

export interface ToolbarCallbacks {
  onResetExample: VoidCallback;
  onDownloadDsl: VoidCallback;
  onUploadDsl: (text: string) => void;
  onExportSvg: VoidCallback;
  onExportPng: VoidCallback;
  onCopyShareLink: VoidCallback;
  onDebugConnectionsChange: (enabled: boolean) => void;
  onToggleEditor: VoidCallback;
  onResetView: VoidCallback;
}

export class ToolbarController {
  private readonly controls: AppControls;
  private readonly callbacks: ToolbarCallbacks;

  constructor(controls: AppControls, callbacks: ToolbarCallbacks) {
    this.controls = controls;
    this.callbacks = callbacks;
    this.bindEvents();
  }

  setDebugConnections(value: boolean): void {
    this.controls.debugConnections.checked = value;
  }

  setEditorVisible(visible: boolean): void {
    this.controls.toggleEditor.textContent = visible
      ? "Hide source"
      : "Show source";
    this.controls.toggleEditor.setAttribute(
      "aria-expanded",
      String(visible),
    );
  }

  private bindEvents(): void {
    this.controls.resetExample.addEventListener("click", () =>
      this.callbacks.onResetExample(),
    );
    this.controls.downloadDsl.addEventListener("click", () =>
      this.callbacks.onDownloadDsl(),
    );
    this.controls.exportSvg.addEventListener("click", () =>
      this.callbacks.onExportSvg(),
    );
    this.controls.exportPng.addEventListener("click", () =>
      this.callbacks.onExportPng(),
    );
    this.controls.copyLink.addEventListener("click", () =>
      this.callbacks.onCopyShareLink(),
    );
    this.controls.toggleEditor.addEventListener("click", () =>
      this.callbacks.onToggleEditor(),
    );
    this.controls.resetView.addEventListener("click", () =>
      this.callbacks.onResetView(),
    );

    this.controls.debugConnections.addEventListener("change", () =>
      this.callbacks.onDebugConnectionsChange(
        this.controls.debugConnections.checked,
      ),
    );

    this.controls.uploadDsl.addEventListener("change", (event) =>
      this.handleUpload(event),
    );
  }

  private async handleUpload(event: Event): Promise<void> {
    const input = getInputTarget(event);
    const file = input?.files?.[0];
    if (!file || !input) {
      return;
    }
    const text = await file.text();
    this.callbacks.onUploadDsl(text);
    input.value = "";
  }
}
