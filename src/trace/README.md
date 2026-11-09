# Trace values overlay

Runtime values are a separate input, never part of the DSL. The DSL stays the
schema/lineage source of truth; a trace overlay supplies a value for individual
fields by `Node.field` key.

## UI

Toolbar → **Trace values** → choose a `.json` file. **Clear** removes the
overlay and the reserved value column.

A sample pair is included:

- `example-swift-trace.dsl` — the six-stage SWIFT schema.
- `example-swift-trace.json` — 78 masked/null values keyed by `Node.field`.

Paste the DSL into the editor, then load the JSON via **Trace values**.

The overlay is held in memory only: it is not written to `localStorage`, not
included in the share URL, and not part of the DSL export. SVG/PNG exports do
include the rendered badges, so treat an exported image as a value-bearing
artifact.

## Format

```json
{
  "traceId": "7e1e6c7e021d4bba3fcbe615dadb161d",
  "capturedAt": "2026-11-06T17:35:11.547+0800",
  "values": {
    "SwiftTransferCall.transactionNo": "b3b7ca8bddf54b0ba5b35efe49d6b838",
    "SwiftTransferCall.payerAmount": "40000",
    "RemittanceRecordInsert.batchNumber": "1094314483773145088",
    "HisunSwiftTransferResponse.errorCode": {
      "value": "0000",
      "source": "[CORE_BANK_LOG] hisunSwiftTransfer return"
    },
    "SwiftTransferRsp.status": {
      "value": "pending",
      "source": "transfer result: SwiftTransferRsp",
      "masked": false
    }
  }
}
```

- Key: `NodeId.fieldPath`, exactly as shown in the DSL (`body.username` for
  nested fields).
- Value: a primitive (`string`, `number`, `boolean`, `null`) or
  `{ "value": primitive, "source"?: string, "masked"?: boolean }`.
- `traceId` / `capturedAt` are optional metadata.
- A flat object without a `values` wrapper is also accepted.
- Unknown keys are ignored and counted in the toolbar summary.
- Long values are truncated in the badge; the full value and optional source
  are in the native SVG tooltip.

## Layout behavior

When at least one field in a node has a value, the layout reserves a fixed
value column for that node (`TRACE_VALUE_COLUMN_WIDTH`). Nodes without values
keep their original width. The column is part of the SVG, so it participates in
zoom/pan and export.

Values are single-valued per key. For a DB row that changes over time, use
distinct nodes for the stages (for example `RemittanceRecordInsert` and
`RemittanceRecordUpdate`) or generate one overlay per snapshot.

## Privacy

Mask account numbers, names, phone numbers, emails, `_uid_`, and IPs before
writing the overlay. The UI marks `masked: true` entries and shows the full
value in a tooltip; it does not mask values itself.
