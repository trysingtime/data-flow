import { cloneSvgElement } from "../app/dom";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const inlineSvgStyles = `
.node-rect { fill: #fff; stroke: #ccc; stroke-width: 1.5; }
.group-rect { fill: #f8fafc; stroke: #bbbbbb; stroke-width: 1.5; }
.group-label { font-size: 12px; font-weight: 600; fill: #4b5563; }
.node-title { font-weight: 700; font-size: 13px; fill: #222; }
.field-text { font-size: 12px; fill: #333; }
.field-bg { fill: transparent; }
.field--active .field-bg { fill: #d7ecff; }
.field--reverse .field-bg { fill: #d7ecff; }
.edge { stroke: #ddd; stroke-width: 2; fill: none; }
.edge--active { stroke: #2196f3; stroke-width: 3; }
.edge--reverse { stroke: #2196f3; stroke-width: 3; }
.dim { opacity: 0.2; }
.field-value-bg { fill: #eef2ff; stroke: #dbe3ff; stroke-width: 0.5; }
.field-value-text { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9.5px; fill: #1e3a8a; }
.field-value--masked .field-value-bg { fill: #fef3c7; stroke: #fde68a; }
.field-value--masked .field-value-text { fill: #92400e; }
.field-value--null .field-value-bg { fill: #f8fafc; stroke: #e5e7eb; }
.field-value--null .field-value-text { fill: #9ca3af; font-style: italic; }
`;

const serializeSvg = (svg: SVGSVGElement) => {
  const clone = cloneSvgElement(svg);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = inlineSvgStyles;
  clone.prepend(style);
  return new XMLSerializer().serializeToString(clone);
};

export const exportSvg = (svg: SVGSVGElement) => {
  const content = serializeSvg(svg);
  const blob = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, "diagram.svg");
};

export const exportPng = async (svg: SVGSVGElement) => {
  const content = serializeSvg(svg);
  const blob = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  const viewBox = svg.viewBox.baseVal;
  const width = viewBox?.width || svg.clientWidth || 800;
  const height = viewBox?.height || svg.clientHeight || 600;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load SVG"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    return;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  canvas.toBlob((pngBlob) => {
    if (pngBlob) {
      downloadBlob(pngBlob, "diagram.png");
    }
  }, "image/png");
};

export const downloadDsl = (text: string) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, "diagram.dsl");
};
