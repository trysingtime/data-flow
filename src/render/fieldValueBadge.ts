import type { FieldLayout } from "../diagram";

const SVG_NS = "http://www.w3.org/2000/svg";
const BADGE_GAP = 4;
const BADGE_HEIGHT = 14;
const BADGE_TEXT_OFFSET = 5;
const BADGE_TEXT_BASELINE = 10;

export interface FieldValueBadge {
  text: string;
  fullText?: string;
  masked?: boolean;
  kind?: "value" | "null";
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

/**
 * Draws a right-aligned value pill inside a field row. The layout reserves
 * `field.valueWidth` for it, so the label and the pill never overlap.
 */
export function createFieldValueBadge(
  field: FieldLayout,
  value: FieldValueBadge,
): SVGGElement | null {
  if (field.valueWidth <= BADGE_GAP * 2) {
    return null;
  }

  const classes = ["field-value"];
  if (value.masked) {
    classes.push("field-value--masked");
  }
  if (value.kind === "null") {
    classes.push("field-value--null");
  }

  const group = createSvgElement("g", {
    class: classes.join(" "),
    "data-field-value": field.key,
  });
  const maxWidth = field.valueWidth - BADGE_GAP * 2;
  const textWidth = Math.min(maxWidth, Math.max(24, value.text.length * 6 + 10));
  const x = field.x + field.width - BADGE_GAP - textWidth;
  const y = field.y + (field.height - BADGE_HEIGHT) / 2;

  group.appendChild(
    createSvgElement("rect", {
      x: `${x}`,
      y: `${y}`,
      width: `${textWidth}`,
      height: `${BADGE_HEIGHT}`,
      rx: "3",
      class: "field-value-bg",
    }),
  );
  const text = createSvgElement("text", {
    x: `${x + textWidth - BADGE_TEXT_OFFSET}`,
    y: `${y + BADGE_TEXT_BASELINE}`,
    "text-anchor": "end",
    class: "field-value-text",
  });
  text.textContent = value.text;
  group.appendChild(text);

  if (value.fullText) {
    const title = createSvgElement("title");
    title.textContent = value.fullText;
    group.appendChild(title);
  }

  return group;
}
