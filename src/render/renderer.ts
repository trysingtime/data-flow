import { PANZOOM_EXCLUDE_CLASS } from "./constants";
import {
  createFieldValueBadge,
  type FieldValueBadge,
} from "./fieldValueBadge";
import type {
  BundledEdge,
  DiagramModel,
  HighlightState,
  LayoutResult,
} from "../diagram";

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_PADDING_X = 14;
const NODE_PADDING_Y = 12;
const INDENT_SIZE = 12;
const EMPTY_MESSAGE = "No valid diagram to display yet.";
const GROUP_LABEL_OFFSET_X = 16;
const GROUP_LABEL_OFFSET_Y = 18;

type EdgePoint = { x: number; y: number };
type LabelMap = Map<string, string>;
type SvgGroups = {
  viewport: SVGGElement;
  groups: SVGGElement;
  edges: SVGGElement;
  nodes: SVGGElement;
};

export interface RenderOptions {
  diagram: DiagramModel | null;
  layout: LayoutResult | null;
  bundles: BundledEdge[];
  highlight: HighlightState;
  debugConnections: boolean;
  fieldValues?: ReadonlyMap<string, FieldValueBadge> | null;
}

interface ValidatedRenderOptions {
  diagram: DiagramModel;
  layout: LayoutResult;
  bundles: BundledEdge[];
  highlight: HighlightState;
  debugConnections: boolean;
  fieldValues: ReadonlyMap<string, FieldValueBadge> | null;
}

export class DiagramRenderer {
  private readonly svg: SVGSVGElement;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
  }

  render(options: RenderOptions): void {
    const validated = this.validateOptions(options);
    if (!validated) {
      this.renderEmptyState();
      return;
    }

    const context = this.buildRenderContext(validated);
    this.prepareSvg(context.layout);
    const groups = this.createGroups();
    this.renderGroups(groups.groups, context);
    this.renderEdges(groups.edges, context);
    this.renderNodes(groups.nodes, context);
  }

  private validateOptions(options: RenderOptions): ValidatedRenderOptions | null {
    if (!options.diagram || !options.layout) {
      return null;
    }
    return {
      diagram: options.diagram,
      layout: options.layout,
      bundles: options.bundles,
      highlight: options.highlight,
      debugConnections: options.debugConnections,
      fieldValues: options.fieldValues ?? null,
    };
  }

  private buildRenderContext(options: ValidatedRenderOptions): RenderContext {
    return {
      diagram: options.diagram,
      layout: options.layout,
      bundles: options.bundles,
      highlight: options.highlight,
      debugConnections: options.debugConnections,
      fieldValues: options.fieldValues,
      labelById: this.buildLabelMap(options.diagram),
    };
  }

  private renderEmptyState(): void {
    this.clearSvg();
    const text = createSvgText("empty-state", 24, 40, EMPTY_MESSAGE);
    this.svg.appendChild(text);
  }

  private prepareSvg(layout: LayoutResult): void {
    this.clearSvg();
    this.svg.setAttribute(
      "viewBox",
      `0 0 ${layout.bounds.width} ${layout.bounds.height}`,
    );
    this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  private clearSvg(): void {
    this.svg.innerHTML = "";
  }

  private buildLabelMap(diagram: DiagramModel): LabelMap {
    return new Map(diagram.nodes.map((node) => [node.id, node.label ?? node.id]));
  }

  private createGroups(): SvgGroups {
    const viewport = createSvgGroup("viewport");
    const groups = createSvgGroup("groups");
    const edges = createSvgGroup("edges");
    const nodes = createSvgGroup("nodes");
    viewport.appendChild(groups);
    viewport.appendChild(edges);
    viewport.appendChild(nodes);
    this.svg.appendChild(viewport);
    return { viewport, groups, edges, nodes };
  }

  private renderGroups(groups: SVGGElement, context: RenderContext): void {
    context.layout.groups.forEach((group) => {
      const hasActiveNode = group.nodeIds.some((nodeId) =>
        context.highlight.activeNodeIds.has(nodeId),
      );
      const className = buildGroupClassName(context.highlight, hasActiveNode);
      const groupElement = createSvgGroup(className);
      groupElement.appendChild(createGroupRect(group));
      groupElement.appendChild(createGroupLabel(group));
      groups.appendChild(groupElement);
    });
  }

  private renderEdges(groups: SVGGElement, context: RenderContext): void {
    if (context.debugConnections) {
      this.renderDebugEdges(groups, context);
      return;
    }
    this.renderBundledEdges(groups, context);
  }

  private renderDebugEdges(groups: SVGGElement, context: RenderContext): void {
    context.diagram.connections.forEach((connection) => {
      const sourceKey = buildFieldKey(
        connection.source.nodeId,
        connection.source.fieldPath,
      );
      const targetKey = buildFieldKey(
        connection.target.nodeId,
        connection.target.fieldPath,
      );
      const path = this.buildDebugPath(
        context.layout,
        sourceKey,
        targetKey,
        connection.source.nodeId,
        connection.target.nodeId,
      );
      if (!path) {
        return;
      }
      const edgeKey = buildConnectionKey(sourceKey, targetKey);
      const className = buildEdgeClassName(
        context.highlight,
        context.highlight.activeEdgeKeys.has(edgeKey),
        context.highlight.reverseEdgeKeys.has(edgeKey),
      );
      groups.appendChild(createSvgPath(path, className));
    });
  }

  private renderBundledEdges(groups: SVGGElement, context: RenderContext): void {
    const bundleGroups = buildUndirectedBundles(context.bundles);
    const highlightSets = buildBundledHighlightSets(
      context.diagram,
      context.highlight,
    );

    bundleGroups.forEach((bundleGroup, undirectedKey) => {
      const bundle = selectBundleForPath(bundleGroup, context.layout);
      if (!bundle) {
        return;
      }
      const path = this.buildBundledPath(context.layout, bundle);
      if (!path) {
        return;
      }
      const className = buildEdgeClassName(
        context.highlight,
        highlightSets.active.has(undirectedKey),
        highlightSets.reverse.has(undirectedKey),
      );
      groups.appendChild(createSvgPath(path, className));
    });
  }

  private buildDebugPath(
    layout: LayoutResult,
    sourceKey: string,
    targetKey: string,
    sourceNodeId: string,
    targetNodeId: string,
  ): string | null {
    const sourceField = layout.fieldLayouts.get(sourceKey);
    const targetField = layout.fieldLayouts.get(targetKey);
    const sourceNode = layout.nodeIndex.get(sourceNodeId);
    const targetNode = layout.nodeIndex.get(targetNodeId);

    if (!sourceField || !targetField || !sourceNode || !targetNode) {
      return null;
    }

    const start = {
      x: sourceNode.x + sourceNode.width,
      y: sourceField.y + sourceField.height / 2,
    };
    const end = {
      x: targetNode.x,
      y: targetField.y + targetField.height / 2,
    };
    return buildBezierPath(start, end);
  }

  private buildBundledPath(
    layout: LayoutResult,
    bundle: BundledEdge,
  ): string | null {
    const points = layout.edges.get(bundle.key);
    if (points?.length) {
      return buildPathFromPoints(points);
    }

    const sourceNode = layout.nodeIndex.get(bundle.source);
    const targetNode = layout.nodeIndex.get(bundle.target);
    if (!sourceNode || !targetNode) {
      return null;
    }
    const start = {
      x: sourceNode.x + sourceNode.width,
      y: sourceNode.y + sourceNode.height / 2,
    };
    const end = {
      x: targetNode.x,
      y: targetNode.y + targetNode.height / 2,
    };
    return buildStraightPath(start, end);
  }

  private renderNodes(groups: SVGGElement, context: RenderContext): void {
    context.layout.nodes.forEach((node) => {
      const label = context.labelById.get(node.id) ?? node.id;
      const nodeGroup = createSvgGroup(
        buildNodeClassName(
          context.highlight,
          context.highlight.activeNodeIds.has(node.id),
        ),
      );
      nodeGroup.appendChild(createNodeRect(node));
      nodeGroup.appendChild(createNodeTitle(node, label));
      this.renderFields(nodeGroup, node, context);
      groups.appendChild(nodeGroup);
    });
  }

  private renderFields(
    nodeGroup: SVGGElement,
    node: LayoutResult["nodes"][number],
    context: RenderContext,
  ): void {
    node.fields.forEach((field) => {
      const isActive = context.highlight.activeFieldKeys.has(field.key);
      const isReverse =
        !isActive && context.highlight.reverseFieldKeys.has(field.key);
      const className = buildFieldClassName(
        context.highlight,
        isActive,
        isReverse,
      );
      const fieldGroup = createSvgGroup(className);
      fieldGroup.setAttribute("data-field-key", field.key);
      fieldGroup.appendChild(createFieldBackground(field));
      fieldGroup.appendChild(createFieldText(field));
      const value = context.fieldValues?.get(field.key);
      if (value) {
        const badge = createFieldValueBadge(field, value);
        if (badge) {
          fieldGroup.appendChild(badge);
        }
      }
      nodeGroup.appendChild(fieldGroup);
    });
  }
}

interface RenderContext {
  diagram: DiagramModel;
  layout: LayoutResult;
  bundles: BundledEdge[];
  highlight: HighlightState;
  debugConnections: boolean;
  fieldValues: ReadonlyMap<string, FieldValueBadge> | null;
  labelById: LabelMap;
}

const createSvgElement = <T extends keyof SVGElementTagNameMap>(
  tag: T,
  attrs: Record<string, string> = {},
): SVGElementTagNameMap[T] => {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) =>
    element.setAttribute(key, value),
  );
  return element;
};

const createSvgGroup = (className: string): SVGGElement =>
  createSvgElement("g", { class: className });

const createSvgPath = (path: string, className: string): SVGPathElement =>
  createSvgElement("path", { d: path, class: className });

const createSvgText = (
  className: string,
  x: number,
  y: number,
  content: string,
): SVGTextElement => {
  const text = createSvgElement("text", {
    x: `${x}`,
    y: `${y}`,
    class: className,
  });
  text.textContent = content;
  return text;
};

const buildConnectionKey = (sourceKey: string, targetKey: string): string =>
  `${sourceKey}->${targetKey}`;

const buildFieldKey = (nodeId: string, fieldPath: string): string =>
  `${nodeId}.${fieldPath}`;

const buildUndirectedKey = (source: string, target: string): string =>
  [source, target].sort().join("<->");

const buildUndirectedBundles = (
  bundles: BundledEdge[],
): Map<string, BundledEdge[]> => {
  const map = new Map<string, BundledEdge[]>();
  bundles.forEach((bundle) => {
    const key = buildUndirectedKey(bundle.source, bundle.target);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(bundle);
  });
  return map;
};

const buildBundledHighlightSets = (
  diagram: DiagramModel,
  highlight: HighlightState,
): { active: Set<string>; reverse: Set<string> } => {
  const active = new Set<string>();
  const reverse = new Set<string>();
  if (!highlight.hasHighlight) {
    return { active, reverse };
  }
  diagram.connections.forEach((connection) => {
    const edgeKey = buildConnectionKey(
      buildFieldKey(connection.source.nodeId, connection.source.fieldPath),
      buildFieldKey(connection.target.nodeId, connection.target.fieldPath),
    );
    const undirectedKey = buildUndirectedKey(
      connection.source.nodeId,
      connection.target.nodeId,
    );
    if (highlight.activeEdgeKeys.has(edgeKey)) {
      active.add(undirectedKey);
    }
    if (highlight.reverseEdgeKeys.has(edgeKey)) {
      reverse.add(undirectedKey);
    }
  });
  return { active, reverse };
};

const selectBundleForPath = (
  bundleGroup: BundledEdge[],
  layout: LayoutResult,
): BundledEdge | null => {
  const withPath = bundleGroup.find((bundle) => layout.edges.has(bundle.key));
  return withPath ?? bundleGroup[0] ?? null;
};

const buildPathFromPoints = (points: EdgePoint[]): string => {
  if (!points.length) {
    return "";
  }
  const [first, ...rest] = points;
  const commands = rest.flatMap((point) => ["L", point.x, point.y]);
  return ["M", first.x, first.y, ...commands].join(" ");
};

const buildBezierPath = (start: EdgePoint, end: EdgePoint): string => {
  const delta = Math.max(40, Math.abs(end.x - start.x) / 2);
  const direction = end.x >= start.x ? 1 : -1;
  const c1x = start.x + delta * direction;
  const c2x = end.x - delta * direction;
  return `M ${start.x} ${start.y} C ${c1x} ${start.y} ${c2x} ${end.y} ${end.x} ${end.y}`;
};

const buildStraightPath = (start: EdgePoint, end: EdgePoint): string =>
  `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

const buildEdgeClassName = (
  highlight: HighlightState,
  isActive: boolean,
  isReverse: boolean,
): string => {
  const classes = ["edge"];
  const isHighlighted = isActive || isReverse;
  if (isHighlighted) {
    classes.push("edge--active");
  } else if (highlight.hasHighlight) {
    classes.push("dim");
  }
  return classes.join(" ");
};

const buildNodeClassName = (
  highlight: HighlightState,
  isActive: boolean,
): string => {
  const classes = ["node"];
  if (highlight.hasHighlight && !isActive) {
    classes.push("dim");
  }
  return classes.join(" ");
};

const buildGroupClassName = (
  highlight: HighlightState,
  isActive: boolean,
): string => {
  const classes = ["group"];
  if (highlight.hasHighlight && !isActive) {
    classes.push("dim");
  }
  return classes.join(" ");
};

const buildFieldClassName = (
  highlight: HighlightState,
  isActive: boolean,
  isReverse: boolean,
): string => {
  const classes = ["field", PANZOOM_EXCLUDE_CLASS];
  const isHighlighted = isActive || isReverse;
  if (isHighlighted) {
    classes.push("field--active");
  } else if (highlight.hasHighlight) {
    classes.push("dim");
  }
  return classes.join(" ");
};

const createNodeRect = (node: LayoutResult["nodes"][number]): SVGRectElement =>
  createSvgElement("rect", {
    x: `${node.x}`,
    y: `${node.y}`,
    width: `${node.width}`,
    height: `${node.height}`,
    rx: "8",
    ry: "8",
    class: "node-rect",
  });

const createGroupRect = (
  group: LayoutResult["groups"][number],
): SVGRectElement =>
  createSvgElement("rect", {
    x: `${group.x}`,
    y: `${group.y}`,
    width: `${group.width}`,
    height: `${group.height}`,
    rx: "10",
    ry: "10",
    class: "group-rect",
  });

const createGroupLabel = (
  group: LayoutResult["groups"][number],
): SVGTextElement =>
  createSvgText(
    "group-label",
    group.x + GROUP_LABEL_OFFSET_X,
    group.y + GROUP_LABEL_OFFSET_Y,
    group.label,
  );

const createNodeTitle = (
  node: LayoutResult["nodes"][number],
  label: string,
): SVGTextElement =>
  createSvgText(
    "node-title",
    node.x + NODE_PADDING_X,
    node.y + NODE_PADDING_Y + 16,
    label,
  );

const createFieldBackground = (
  field: LayoutResult["nodes"][number]["fields"][number],
): SVGRectElement =>
  createSvgElement("rect", {
    x: `${field.x}`,
    y: `${field.y}`,
    width: `${field.width}`,
    height: `${field.height}`,
    class: "field-bg",
  });

const createFieldText = (
  field: LayoutResult["nodes"][number]["fields"][number],
): SVGTextElement =>
  createSvgText(
    "field-text",
    field.x + field.depth * INDENT_SIZE,
    field.y + 13,
    field.label,
  );
