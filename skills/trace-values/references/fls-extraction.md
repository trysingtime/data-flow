# FLS extraction reference

Read this only when the trace comes from the FLS / insight-server ecosystem.

## Get the artifacts

- `fls extract-payload <trace_id> -s <service> --format json` returns paired
  API/RPC input and return payloads.
- `fls trace <trace_id> --raw` saves the raw log JSON, including MyBatis
  `Preparing:` and `Parameters:` lines.
- If the `fls` CLI is not on PATH, use the FLS query skill/tool present in the
  environment; it handles authentication and masking.

## Markers

| Marker | Use |
|---|---|
| `[API_LOG] <method> input: ...` | API input value |
| `[API_LOG] <method> [Nms] return: ...` | API output value |
| `[CORE_BANK_LOG] <method> input: ...` | RPC input value |
| `[CORE_BANK_LOG] <method> [Nms] return: ...` | RPC output value |
| `==> Preparing:` + `==> Parameters:` | DB insert/update; zip columns to values by position |
| `<== Updates:` / `<== Total:` | Write/row counts; not field values |

## Mapping rules

- The SQL column and the DSL field have different names. Map semantically:
  `payer_account -> payerAccount`, `hisun_transfer_status ->
  hisunTransferStatus`.
- Read `Preparing:` and `Parameters:` together. MyBatis prints values in the
  same order as the column list; `null` and `(String)` empty strings are values.
- Write the target value, not the source token. Examples:
  `errorCode 0000 -> hisun_transfer_status=success`,
  `code 200 -> status=pending`.
- A field that appears in both insert and update maps to two stage nodes; write
  a key for each node.
- Mask account numbers, names, phone numbers, emails, `_uid_`, and IPs before
  writing the overlay. FLS masking may already have applied; keep the masked
  form.

## Done

Every target key in the FLS-derived stages has a value, a `null`, or is
deliberately omitted; each value has a short source label; the app reports `0
unknown`.
