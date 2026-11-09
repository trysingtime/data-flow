---
name: trace-values
description: >-
  Assemble a data-flow trace-values JSON overlay from a trace and display it
  inline. Use when the user wants runtime values on the diagram, to map a
  trace_id's API/DB/RPC fields to Node.field keys, to create or repair a
  trace-values JSON, or to verify the inline badges in the app.
---

# Trace values overlay

Build a runtime-value overlay for the data-flow app and verify it renders as
inline badges. The DSL stays schema-only; the overlay is a separate JSON file
keyed by `NodeId.fieldPath`.

If the user already has an overlay, start at **Validate** and go straight to
**Display**. Full format and privacy rules: `src/trace/README.md`. Worked pair:
`src/trace/example-swift-trace.dsl` + `src/trace/example-swift-trace.json`.

## Workflow

### 1. Pin the target keys

Read the DSL and list every field you will fill as `NodeId.fieldPath`. Use the
node IDs and field paths exactly as written in the DSL, not node labels. If the
DSL does not exist yet, build the six-stage schema first.

**Done when:** you have a key list per stage and the DSL parses with no
diagnostics.

### 2. Extract values per stage

For each stage, take the value from the trace's own artifact:

- API input/output.
- RPC input/output.
- DB insert/update (column/value pairs from the persistence layer).

Map each value to its target key. Use explicit per-stage mapping: the same
business field may have different names in each node. Do not infer
transformations from the DSL edges alone; write the actual rule
(e.g. `errorCode 0000 -> hisun_transfer_status=success`).

For FLS/insight-server traces, read `references/fls-extraction.md` for the
exact log markers and CLI commands.

**Done when:** every target key has a value, a `null`, or is deliberately
omitted, and each value has a source label.

### 3. Write the overlay JSON

Prefer the `values` wrapper:

```json
{
  "traceId": "7e1e6c7e021d4bba3fcbe615dadb161d",
  "capturedAt": "2026-11-06T17:35:11.547+0800",
  "values": {
    "SwiftTransferCall.transactionNo": "b3b7ca8bddf54b0ba5b35efe49d6b838",
    "RemittanceRecordInsert.batchNumber": "1094314483773145088",
    "HisunSwiftTransferResponse.errorCode": {
      "value": "0000",
      "source": "downstream RPC response"
    },
    "SwiftTransferCall.payeePhone": null,
    "SwiftTransferCall.payerAccount": {
      "value": "866****636",
      "masked": true
    }
  }
}
```

- Key: `NodeId.fieldPath`; nested fields use the dotted path
  (`Node.body.username`).
- Value: a primitive (`string`, `number`, `boolean`, `null`) or
  `{ "value": primitive, "source"?: string, "masked"?: boolean }`.
- `null` is a value and renders a gray `null` badge.
- Mask account numbers, names, phone numbers, emails, `_uid_`, and IPs before
  writing. The app displays what you write; it does not mask.
- Name the file after the DSL: `example-swift-trace.dsl` +
  `example-swift-trace.json`.

**Done when:** the file is valid JSON and every key appears in the DSL.

### 4. Validate before opening the app

Check, in this order:

1. Every key resolves to a field in the DSL (`0 unknown`).
2. Masked fields carry `masked: true`.
3. Long values are acceptable: badges truncate at 18 characters; the full
   value and `source` appear in the tooltip.
4. The value count matches the fields you intended to fill.

**Done when:** all four checks pass. Fix the JSON, not the viewer.

### 5. Display

Run `npm run dev` (or use the running dev server), then:

1. Paste the DSL into the editor.
2. Toolbar → **Trace values** → choose the JSON.
3. If the diagram is wide, click **Hide source** to give it the full width.
4. Check the toolbar status (`N values · traceId`), the inline badges, and the
   diagnostics panel.
5. Hover a truncated badge to confirm the full value and source.

**Done when:** the status shows the expected count with no `unknown`, badges
are visible, the tooltip shows the full value, and the console has no errors.

### 6. Report

State the trace id, the JSON path, the DSL path, the value count, the masked
fields, and any deliberate omissions. Note that the overlay is in memory only:
reloading or sharing the link does not carry it. SVG/PNG exports do include the
rendered badges.

## Assembly rules

- **One key, one stage.** A DB column that appears in both insert and update
  maps to two node IDs; write two keys.
- **Source labels are evidence.** Use the artifact or log line that produced
  the value, e.g. `API input` or `DB update (post-response)`.
- **Unknown keys are silent.** The viewer ignores them and counts them in the
  toolbar; `N unknown` is a bug in the overlay, not the diagram.
- **Values are single-valued.** For a field that changes over time, use
  distinct stage nodes; keep `value` a primitive.
- **Keep the DSL schema-only.** The overlay is the separate runtime input.

## Files

- `src/trace/README.md` — overlay format, privacy, export behavior.
- `src/trace/example-swift-trace.dsl` + `.json` — worked six-stage example.
- `src/trace/values.ts` — parser and formatting behavior (authoritative).
- `src/render/fieldValueBadge.ts` — badge rendering and truncation.
- `references/fls-extraction.md` — FLS/insight-server extraction notes.
