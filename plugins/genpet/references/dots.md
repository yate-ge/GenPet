# Dots Avatar integration

Dots owns its environment, Avatar customization and proactive behavior. Do not use desktop Pets folders, its sprite atlas contract, desktop IPC, or desktop selection commands for a Dots Avatar.

Read the available Dots tools and local implementation to identify the real Avatar ID, update format, active state and refresh mechanism. When necessary the Dots Agent implements the small integration in that environment. Keep the framework runtime unchanged unless its actual requirements demand a change.

Allocate a pet ID via `begin-story`, then `bind-avatar ACTUAL_AVATAR_ID` as soon as the target is identified. Dots may already have its own Avatar. Persist the exact ID before updating; use it on all retries, never locate a target by display name. If first creation is necessary, use the host's stable identity/idempotency mechanism and persist the returned ID immediately. An ambiguous creation result must be reconciled against the host, not blindly repeated.

Generate/validate artwork in the actual Dots format, save as `avatar` with `accept-art`. `host-request` requires the saved binding and returns `petId`, `operationId`, bound `target`, file and update requirements. Use Dots tools to update that target. Query whether it is active, and refresh immediately when active. If active state cannot be read, request a refresh rather than assuming it is inactive. Keep another currently selected Avatar selected.

Record the actual result in a JSON file, then `host-result OPERATION_ID RESULT_FILE`:

```json
{"petId":"PERSISTED_PET_ID","operationId":"PENDING_OPERATION_ID","appearanceId":"REQUEST_APPEARANCE_ID","avatarId":"BOUND_AVATAR_ID","updated":true,"active":true,"refreshRequested":true,"displayStatus":"unconfirmed"}
```

`confirmed` requires a concise `evidence` describing the actual observed display. Request acceptance alone is `unconfirmed`. An unsuccessful update uses `updated:false` and an `error`; do not complete its story as if a visual change succeeded.

The first integration must verify two actual cases: active target updates immediately; inactive target updates without changing selection. Local protocol tests are not Dots display evidence. Plug-in packaging cannot establish a particular cloud host's APIs; the Dots Agent must check and validate its own environment.
