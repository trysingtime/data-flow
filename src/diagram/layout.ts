import * as dagre from "dagre";

import type { DiagramModel } from "../dsl";
import type {
  BundledEdge,
  FieldLayout,
  LayoutGroup,
  LayoutNode,
  LayoutOptions,
  LayoutResult,
} from "./types";
import { getEdgePoints, getGraphBounds, getNodePosition } from "./dagreTypes";

const CHAR_WIDTH = 7;
const NODE_MIN_WIDTH = 160;
const NODE_PADDING_X = 14;
const NODE_PADDING_Y = 12;
const HEADER_HEIGHT = 24;
const ROW_HEIGHT = 18;
const ROW_GAP = 4;
const INDENT_SIZE = 12;
const GROUP_PADDING_X = 24;
const GROUP_PADDING_Y = 24;
const GROUP_LABEL_HEIGHT = 22;
const COLUMN_GAP = 100;
const NODE_GAP = 50;
const LAYOUT_MARGIN = 40;

type FieldRow = { path: string; label: string; depth: number };

const buildFieldRows = (
  fields: DiagramModel["nodes"][number]["fields"],
  depth = 0,
): FieldRow[] => {
  const rows: FieldRow[] = [];
  for (const field of fields) {
    const label = field.type ? `${field.name}: ${field.type}` : field.name;
    rows.push({ path: field.path, label, depth });
    if (field.children?.length) {
      rows.push(...buildFieldRows(field.children, depth + 1));
    }
  }
  return rows;
};

const estimateNodeSize = (
  label: string,
  rows: FieldRow[],
  valueColumnWidth = 0,
): { width: number; height: number } => {
  let maxWidth = label.length * CHAR_WIDTH + NODE_PADDING_X * 2;
  for (const row of rows) {
    const rowWidth =
      NODE_PADDING_X * 2 +
      row.depth * INDENT_SIZE +
      row.label.length * CHAR_WIDTH;
    if (rowWidth > maxWidth) {
      maxWidth = rowWidth;
    }
  }
  const width = Math.max(NODE_MIN_WIDTH, maxWidth) + valueColumnWidth;
  const height =
    NODE_PADDING_Y * 2 +
    HEADER_HEIGHT +
    rows.length * ROW_HEIGHT +
    Math.max(0, rows.length - 1) * ROW_GAP;
  return { width, height };
};

type NodeSize = {
  width: number;
  height: number;
  rows: FieldRow[];
  valueColumnWidth: number;
};

const buildLayoutNode = (
  node: DiagramModel["nodes"][number],
  size: NodeSize,
  x: number,
  y: number,
  fieldLayouts: Map<string, FieldLayout>,
): LayoutNode => {
  const fieldsStartY = y + NODE_PADDING_Y + HEADER_HEIGHT;
  const fields: FieldLayout[] = [];

  size.rows.forEach((row, index) => {
    const rowY = fieldsStartY + index * (ROW_HEIGHT + ROW_GAP);
    const layout: FieldLayout = {
      key: `${node.id}.${row.path}`,
      nodeId: node.id,
      path: row.path,
      label: row.label,
      depth: row.depth,
      x: x + NODE_PADDING_X,
      y: rowY,
      width: size.width - NODE_PADDING_X * 2,
      height: ROW_HEIGHT,
      valueWidth: size.valueColumnWidth,
    };
    fields.push(layout);
    fieldLayouts.set(layout.key, layout);
  });

  return {
    id: node.id,
    x,
    y,
    width: size.width,
    height: size.height,
    fields,
  };
};

const buildNodeSizing = (
  diagram: DiagramModel,
  options: LayoutOptions = {},
): Map<string, NodeSize> => {
  const nodeSizing = new Map<string, NodeSize>();
  const valueKeys = options.fieldValueKeys;
  const valueColumnWidth = options.fieldValueColumnWidth ?? 0;

  for (const node of diagram.nodes) {
    const rows = buildFieldRows(node.fields);
    const hasValues = Boolean(
      valueKeys?.size &&
        rows.some((row) => valueKeys.has(`${node.id}.${row.path}`)),
    );
    const resolvedValueWidth = hasValues ? valueColumnWidth : 0;
    const size = estimateNodeSize(
      node.label ?? node.id,
      rows,
      resolvedValueWidth,
    );
    nodeSizing.set(node.id, {
      ...size,
      rows,
      valueColumnWidth: resolvedValueWidth,
    });
  }

  return nodeSizing;
};

const computeDagreLayout = (
  diagram: DiagramModel,
  bundles: BundledEdge[],
  options: LayoutOptions,
): LayoutResult => {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: "LR",
    nodesep: 50,
    ranksep: 100,
    edgesep: 10,
    marginx: 40,
    marginy: 40,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  const nodeSizing = buildNodeSizing(diagram, options);

  for (const node of diagram.nodes) {
    const size = nodeSizing.get(node.id);
    if (!size) {
      continue;
    }
    graph.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const bundle of bundles) {
    graph.setEdge(bundle.source, bundle.target);
  }

  dagre.layout(graph);

  const nodes: LayoutNode[] = [];
  const nodeIndex = new Map<string, LayoutNode>();
  const fieldLayouts = new Map<string, FieldLayout>();

  for (const node of diagram.nodes) {
    const nodePosition = getNodePosition(graph, node.id);
    const size = nodeSizing.get(node.id);
    if (!nodePosition || !size) {
      continue;
    }

    const x = nodePosition.x - size.width / 2;
    const y = nodePosition.y - size.height / 2;
    const layout = buildLayoutNode(node, size, x, y, fieldLayouts);
    nodes.push(layout);
    nodeIndex.set(node.id, layout);
  }

  const edges = new Map<string, { x: number; y: number }[]>();
  for (const edge of graph.edges()) {
    const points = getEdgePoints(graph, edge);
    const key = `${edge.v}->${edge.w}`;
    if (points?.length) {
      edges.set(key, points);
    }
  }

  const bounds = getGraphBounds(graph);
  return {
    nodes,
    nodeIndex,
    edges,
    bounds: {
      width: (bounds.width ?? 0) + 80,
      height: (bounds.height ?? 0) + 80,
    },
    fieldLayouts,
    groups: [],
  };
};

const computeGroupedLayout = (
  diagram: DiagramModel,
  options: LayoutOptions,
): LayoutResult => {
  const nodeSizing = buildNodeSizing(diagram, options);
  const nodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const nodes: LayoutNode[] = [];
  const nodeIndex = new Map<string, LayoutNode>();
  const fieldLayouts = new Map<string, FieldLayout>();
  const groups: LayoutGroup[] = [];

  const declaredGroups = diagram.groups ?? [];
  const groupedNodeIds = new Set<string>();
  declaredGroups.forEach((group) => {
    group.nodeIds.forEach((nodeId) => groupedNodeIds.add(nodeId));
  });

  const ungroupedNodeIds = diagram.nodes
    .filter((node) => !groupedNodeIds.has(node.id))
    .map((node) => node.id);

  let currentX = LAYOUT_MARGIN;
  const startY = LAYOUT_MARGIN;

  for (const group of declaredGroups) {
    const nodeIds = group.nodeIds.filter((nodeId) => nodeById.has(nodeId));
    const sizes = nodeIds
      .map((nodeId) => nodeSizing.get(nodeId))
      .filter(
        (value): value is NodeSize =>
          Boolean(value),
      );

    const maxNodeWidth = sizes.reduce(
      (max, size) => Math.max(max, size.width),
      0,
    );
    const contentHeight =
      sizes.reduce((total, size) => total + size.height, 0) +
      Math.max(0, sizes.length - 1) * NODE_GAP;
    const label = group.label ?? group.id;
    const labelWidth = label.length * CHAR_WIDTH + GROUP_PADDING_X * 2;
    const groupWidth = Math.max(maxNodeWidth + GROUP_PADDING_X * 2, labelWidth);
    const groupHeight = Math.max(
      GROUP_PADDING_Y * 2 + GROUP_LABEL_HEIGHT,
      GROUP_PADDING_Y * 2 + GROUP_LABEL_HEIGHT + contentHeight,
    );

    groups.push({
      id: group.id,
      label,
      x: currentX,
      y: startY,
      width: groupWidth,
      height: groupHeight,
      nodeIds,
    });

    let nodeY = startY + GROUP_PADDING_Y + GROUP_LABEL_HEIGHT;
    const nodeX = currentX + GROUP_PADDING_X;
    for (const nodeId of nodeIds) {
      const node = nodeById.get(nodeId);
      const size = nodeSizing.get(nodeId);
      if (!node || !size) {
        continue;
      }
      const layout = buildLayoutNode(node, size, nodeX, nodeY, fieldLayouts);
      nodes.push(layout);
      nodeIndex.set(node.id, layout);
      nodeY += size.height + NODE_GAP;
    }

    currentX += groupWidth + COLUMN_GAP;
  }

  if (ungroupedNodeIds.length) {
    const sizes = ungroupedNodeIds
      .map((nodeId) => nodeSizing.get(nodeId))
      .filter(
        (value): value is NodeSize =>
          Boolean(value),
      );
    const maxNodeWidth = sizes.reduce(
      (max, size) => Math.max(max, size.width),
      0,
    );
    let nodeY = startY;
    const nodeX = currentX;
    for (const nodeId of ungroupedNodeIds) {
      const node = nodeById.get(nodeId);
      const size = nodeSizing.get(nodeId);
      if (!node || !size) {
        continue;
      }
      const layout = buildLayoutNode(node, size, nodeX, nodeY, fieldLayouts);
      nodes.push(layout);
      nodeIndex.set(node.id, layout);
      nodeY += size.height + NODE_GAP;
    }
    currentX += maxNodeWidth + COLUMN_GAP;
  }

  let maxX = 0;
  let maxY = 0;
  nodes.forEach((node) => {
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  });
  groups.forEach((group) => {
    maxX = Math.max(maxX, group.x + group.width);
    maxY = Math.max(maxY, group.y + group.height);
  });

  return {
    nodes,
    nodeIndex,
    edges: new Map(),
    bounds: {
      width: maxX + LAYOUT_MARGIN,
      height: maxY + LAYOUT_MARGIN,
    },
    fieldLayouts,
    groups,
  };
};

export function computeLayout(
  diagram: DiagramModel,
  bundles: BundledEdge[],
  options: LayoutOptions = {},
): LayoutResult {
  if (diagram.groups?.length) {
    return computeGroupedLayout(diagram, options);
  }
  return computeDagreLayout(diagram, bundles, options);
}
