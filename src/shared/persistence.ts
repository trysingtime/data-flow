const STORAGE_KEY = "data-flow-dsl";
const EDITOR_VISIBLE_KEY = "data-flow-editor-visible";

const supportsCompression = () =>
  "CompressionStream" in window && "DecompressionStream" in window;

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const fromBase64Url = (encoded: string) => {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const compressText = async (text: string): Promise<Uint8Array> => {
  if (!supportsCompression()) {
    return new TextEncoder().encode(text);
  }
  const stream = new Blob([text]).stream().pipeThrough(
    new CompressionStream("gzip"),
  );
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
};

const decompressText = async (bytes: Uint8Array<ArrayBuffer>): Promise<string> => {
  if (!supportsCompression()) {
    return new TextDecoder().decode(bytes);
  }
  const stream = new Blob([bytes]).stream().pipeThrough(
    new DecompressionStream("gzip"),
  );
  return new Response(stream).text();
};

export const loadFromStorage = () => localStorage.getItem(STORAGE_KEY);

export const saveToStorage = (text: string) => {
  localStorage.setItem(STORAGE_KEY, text);
};

export const loadEditorVisible = (): boolean =>
  localStorage.getItem(EDITOR_VISIBLE_KEY) !== "false";

export const saveEditorVisible = (visible: boolean): void => {
  localStorage.setItem(EDITOR_VISIBLE_KEY, String(visible));
};

export const encodeDslToHash = async (text: string) => {
  const compressed = await compressText(text);
  return toBase64Url(compressed);
};

export const decodeDslFromHash = async (hash: string) => {
  const normalized = hash.replace(/^#/, "");
  if (!normalized) {
    return null;
  }
  try {
    const bytes = fromBase64Url(normalized);
    return await decompressText(bytes);
  } catch {
    return null;
  }
};

export const updateHash = async (text: string) => {
  const encoded = await encodeDslToHash(text);
  const url = new URL(window.location.href);
  url.hash = encoded;
  window.history.replaceState(null, "", url.toString());
};

export const buildShareUrl = async (text: string) => {
  const encoded = await encodeDslToHash(text);
  return `${window.location.origin}${window.location.pathname}#${encoded}`;
};
