import type { FieldIndexEntry, LayoutOptions } from "../diagram";
import type { FieldValueBadge } from "../render/fieldValueBadge";
import type {
  TraceParseResult,
  TracePrimitive,
  TraceValueEntry,
  TraceValues,
} from "./types";

/** Width reserved for the inline value column, including its inner gap. */
export const TRACE_VALUE_COLUMN_WIDTH = 132;

/** Badge text is truncated to this many characters; the full value is in the tooltip. */
export const TRACE_VALUE_MAX_CHARS = 18;

const METADATA_KEYS = new Set(["traceId", "capturedAt"]);

const isPrimitive = (value: unknown): value is TracePrimitive =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const toEntry = (raw: unknown): TraceValueEntry | null => {
  if (isPrimitive(raw)) {
    return { value: raw };
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    if (isPrimitive(record.value)) {
      return {
        value: record.value,
        source:
          typeof record.source === "string" ? record.source : undefined,
        masked: record.masked === true,
      };
    }
  }
  return null;
};

export function parseTraceValues(input: unknown): TraceParseResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      trace: null,
      warnings: ["Trace values must be a JSON object."],
    };
  }

  const record = input as Record<string, unknown>;
  const nestedValues =
    record.values &&
    typeof record.values === "object" &&
    !Array.isArray(record.values)
      ? (record.values as Record<string, unknown>)
      : record;

  const warnings: string[] = [];
  const values = new Map<string, TraceValueEntry>();
  for (const [key, raw] of Object.entries(nestedValues)) {
    if (METADATA_KEYS.has(key)) {
      continue;
    }
    if (!key.includes(".")) {
      warnings.push(`Skipped "${key}": expected "Node.field".`);
      continue;
    }
    const entry = toEntry(raw);
    if (!entry) {
      warnings.push(`Skipped "${key}": expected a value or { value }.`);
      continue;
    }
    values.set(key, entry);
  }

  if (values.size === 0) {
    return {
      trace: null,
      warnings: [...warnings, "No trace values found."],
    };
  }

  return {
    trace: {
      traceId:
        typeof record.traceId === "string" ? record.traceId : undefined,
      capturedAt:
        typeof record.capturedAt === "string"
          ? record.capturedAt
          : undefined,
      values,
    },
    warnings,
  };
}

export function parseTraceValuesText(text: string): TraceParseResult {
  try {
    return parseTraceValues(JSON.parse(text) as unknown);
  } catch {
    return { trace: null, warnings: ["Invalid JSON."] };
  }
}

const formatBadgeText = (value: TracePrimitive): string => {
  if (value === null) {
    return "null";
  }
  const text = String(value);
  if (text.length === 0) {
    return '""';
  }
  if (text.length <= TRACE_VALUE_MAX_CHARS) {
    return text;
  }
  return `${text.slice(0, TRACE_VALUE_MAX_CHARS - 1)}…`;
};

const formatFullText = (entry: TraceValueEntry): string => {
  const value = entry.value === null ? "null" : String(entry.value);
  const lines = [value.length === 0 ? '""' : value];
  if (entry.source) {
    lines.push(entry.source);
  }
  if (entry.masked) {
    lines.push("masked");
  }
  return lines.join("\n");
};

export function buildTraceFieldValues(
  trace: TraceValues | null,
): Map<string, FieldValueBadge> {
  const result = new Map<string, FieldValueBadge>();
  if (!trace) {
    return result;
  }
  for (const [key, entry] of trace.values) {
    result.set(key, {
      text: formatBadgeText(entry.value),
      fullText: formatFullText(entry),
      masked: entry.masked,
      kind: entry.value === null ? "null" : "value",
    });
  }
  return result;
}

export function buildTraceLayoutOptions(
  trace: TraceValues | null,
): LayoutOptions {
  if (!trace || trace.values.size === 0) {
    return {};
  }
  return {
    fieldValueKeys: new Set(trace.values.keys()),
    fieldValueColumnWidth: TRACE_VALUE_COLUMN_WIDTH,
  };
}

export function countUnknownTraceValues(
  trace: TraceValues | null,
  fieldIndex: ReadonlyMap<string, FieldIndexEntry>,
): number {
  if (!trace) {
    return 0;
  }
  let count = 0;
  for (const key of trace.values.keys()) {
    if (!fieldIndex.has(key)) {
      count += 1;
    }
  }
  return count;
}
