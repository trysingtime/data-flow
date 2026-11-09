import { parseDsl, validateDiagram } from "../dsl";
import { buildGraph, bundleConnections } from "./graph";
import { computeLayout } from "./layout";
import type { Diagnostic } from "../dsl";
import type { DiagramData, LayoutOptions } from "./types";

export interface DiagramBuildResult {
  diagnostics: Diagnostic[];
  data: DiagramData | null;
  hasErrors: boolean;
}

export class DiagramBuilder {
  build(
    text: string,
    layoutOptions: LayoutOptions = {},
  ): DiagramBuildResult {
    const parsed = parseDsl(text);
    if (!parsed.diagram) {
      return { diagnostics: parsed.diagnostics, data: null, hasErrors: true };
    }

    const validation = validateDiagram(parsed.diagram);
    const diagnostics = validation.diagnostics;
    const hasErrors = diagnostics.some(
      (diagnostic) => diagnostic.severity === "error",
    );
    if (hasErrors) {
      return { diagnostics, data: null, hasErrors: true };
    }

    const diagram = validation.diagram;
    const bundles = bundleConnections(diagram);
    const graph = buildGraph(diagram);
    const layout = computeLayout(diagram, bundles, layoutOptions);

    return {
      diagnostics,
      data: { diagram, bundles, graph, layout },
      hasErrors: false,
    };
  }
}
