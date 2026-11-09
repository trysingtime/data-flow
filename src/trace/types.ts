export type TracePrimitive = string | number | boolean | null;

export interface TraceValueEntry {
  value: TracePrimitive;
  source?: string;
  masked?: boolean;
}

export interface TraceValues {
  traceId?: string;
  capturedAt?: string;
  values: Map<string, TraceValueEntry>;
}

export interface TraceParseResult {
  trace: TraceValues | null;
  warnings: string[];
}
