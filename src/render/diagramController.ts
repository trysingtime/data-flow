import Panzoom from "@panzoom/panzoom";

import { computeHighlight } from "../diagram";
import { DiagramRenderer } from "./renderer";
import { PANZOOM_CONFIG } from "../app/constants";
import { PANZOOM_EXCLUDE_CLASS } from "./constants";
import type { FieldValueBadge } from "./fieldValueBadge";
import type { DiagramData, HighlightState } from "../diagram";

export interface DiagramOptions {
  debugConnections: boolean;
}

type PanzoomController = ReturnType<typeof Panzoom>;

export class DiagramController {
  private data: DiagramData | null = null;
  private fieldValues: ReadonlyMap<string, FieldValueBadge> | null = null;
  private options: DiagramOptions = {
    debugConnections: false,
  };
  private hoveredField: string | null = null;
  private pinnedField: string | null = null;
  private readonly panzoom: PanzoomController;
  private readonly svg: SVGSVGElement;
  private readonly renderer: DiagramRenderer;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
    this.renderer = new DiagramRenderer(svg);
    this.panzoom = Panzoom(svg, {
      maxScale: PANZOOM_CONFIG.maxScale,
      minScale: PANZOOM_CONFIG.minScale,
      canvas: true,
      excludeClass: PANZOOM_EXCLUDE_CLASS,
    });
    this.bindEvents();
  }

  setData(
    data: DiagramData | null,
    fieldValues: ReadonlyMap<string, FieldValueBadge> | null = this.fieldValues,
  ): void {
    this.data = data;
    this.fieldValues = fieldValues;
    this.clearSelection();
    this.render();
  }

  setOptions(options: Partial<DiagramOptions>): void {
    this.options = { ...this.options, ...options };
    this.render();
  }

  resetView(): void {
    this.panzoom.reset({ animate: false });
  }

  private bindEvents(): void {
    this.svg.parentElement?.addEventListener("wheel", this.panzoom.zoomWithWheel);
    this.svg.addEventListener("pointermove", this.onPointerMove);
    this.svg.addEventListener("pointerleave", this.onPointerLeave);
    this.svg.addEventListener("click", this.onClick);
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse") {
      return;
    }
    if (this.pinnedField) {
      return;
    }
    const key = this.resolveFieldKey(event.target);
    if (key !== this.hoveredField) {
      this.hoveredField = key;
      this.render();
    }
  };

  private onPointerLeave = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse") {
      return;
    }
    if (!this.pinnedField && this.hoveredField) {
      this.hoveredField = null;
      this.render();
    }
  };

  private onClick = (event: MouseEvent): void => {
    const key = this.resolveFieldKey(event.target);
    if (key) {
      this.pinnedField = this.pinnedField === key ? null : key;
      this.hoveredField = null;
      this.render();
      return;
    }
    if (this.pinnedField) {
      this.pinnedField = null;
      this.render();
    }
  };

  private resolveFieldKey(target: EventTarget | null): string | null {
    const element = target instanceof Element ? target : null;
    const field = element?.closest("[data-field-key]");
    return field?.getAttribute("data-field-key") ?? null;
  }

  private getActiveField(): string | null {
    return this.pinnedField ?? this.hoveredField;
  }

  private clearSelection(): void {
    this.hoveredField = null;
    this.pinnedField = null;
  }

  private render(): void {
    const highlight = this.buildHighlightState();
    this.renderer.render({
      diagram: this.data?.diagram ?? null,
      layout: this.data?.layout ?? null,
      bundles: this.data?.bundles ?? [],
      highlight,
      debugConnections: this.options.debugConnections,
      fieldValues: this.fieldValues,
    });
  }

  private buildHighlightState(): HighlightState {
    const activeField = this.getActiveField();
    if (!activeField || !this.data) {
      return this.createEmptyHighlight();
    }
    return computeHighlight(
      this.data.graph,
      activeField,
      true,
    );
  }

  private createEmptyHighlight(): HighlightState {
    return {
      activeFieldKeys: new Set(),
      reverseFieldKeys: new Set(),
      activeEdgeKeys: new Set(),
      reverseEdgeKeys: new Set(),
      activeNodeIds: new Set(),
      hasHighlight: false,
    };
  }
}
