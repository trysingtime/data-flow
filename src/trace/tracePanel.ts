import { parseTraceValuesText } from "./values";
import type { TraceValues } from "./types";

export interface TracePanelCallbacks {
  onLoad: (trace: TraceValues) => void;
  onClear: () => void;
}

const valueLabel = (count: number): string =>
  `${count} ${count === 1 ? "value" : "values"}`;

export class TracePanel {
  private readonly callbacks: TracePanelCallbacks;
  private readonly input: HTMLInputElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly status: HTMLSpanElement;
  private warnings: string[] = [];

  constructor(host: HTMLElement, callbacks: TracePanelCallbacks) {
    this.callbacks = callbacks;

    const uploadLabel = document.createElement("label");
    uploadLabel.className = "button";
    uploadLabel.textContent = "Trace values";

    this.input = document.createElement("input");
    this.input.type = "file";
    this.input.accept = ".json,application/json";
    this.input.hidden = true;
    uploadLabel.appendChild(this.input);

    this.clearButton = document.createElement("button");
    this.clearButton.className = "button";
    this.clearButton.textContent = "Clear";
    this.clearButton.hidden = true;

    this.status = document.createElement("span");
    this.status.className = "trace-values-status";
    this.status.textContent = "No trace values";

    host.append(uploadLabel, this.clearButton, this.status);

    this.input.addEventListener("change", () => void this.handleFile());
    this.clearButton.addEventListener("click", () => {
      this.warnings = [];
      this.callbacks.onClear();
      this.setSummary(null);
    });
  }

  setSummary(trace: TraceValues | null, unknownCount = 0): void {
    this.status.classList.remove("is-error");
    if (!trace) {
      this.status.textContent = "No trace values";
      this.status.title = "";
      this.clearButton.hidden = true;
      return;
    }

    const parts = [valueLabel(trace.values.size)];
    if (trace.traceId) {
      parts.push(trace.traceId.slice(0, 8));
    }
    if (unknownCount > 0) {
      parts.push(`${unknownCount} unknown`);
    }
    if (this.warnings.length > 0) {
      parts.push(`${this.warnings.length} warnings`);
    }
    this.status.textContent = parts.join(" · ");
    this.status.title = this.warnings.join("\n");
    this.clearButton.hidden = false;
  }

  private setError(message: string): void {
    this.status.textContent = message;
    this.status.title = message;
    this.status.classList.add("is-error");
  }

  private async handleFile(): Promise<void> {
    const file = this.input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const result = parseTraceValuesText(text);
      if (!result.trace) {
        this.warnings = result.warnings;
        this.setError(result.warnings[0] ?? "Could not load trace values.");
        return;
      }
      this.warnings = result.warnings;
      this.status.classList.remove("is-error");
      this.callbacks.onLoad(result.trace);
    } catch {
      this.setError("Could not read the file.");
    } finally {
      this.input.value = "";
    }
  }
}
