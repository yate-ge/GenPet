# Native Codex Pet compatibility

Verified read-only against the installed desktop app **26.908.70816 (build 9275)** on 2026-09-24, including its actual sprite renderer, custom-Pet loader, and bundled Hatch Pet utilities. Run `npm run verify:native` to compare the installed runtime with GenPet's table again. The check never executes or modifies app code.

## V2 layout

PNG/WebP with transparency, 1536 × 2288 pixels, 8 columns × 11 rows; each cell is 192 × 208 pixels. Declare `spriteVersionNumber: 2` in `pet.json`. The native loader also accepts legacy V1 (1536 × 1872), but newly generated GenPet assets use V2.

| Row | Native state | Animation frames | Base frame timing |
|---|---|---:|---|
| 0 | idle | 6 | 280, 110, 110, 140, 140, 320 ms |
| 1 | running-right | 8 | 120 ms; last 220 ms |
| 2 | running-left | 8 | 120 ms; last 220 ms |
| 3 | waving | 4 | 140 ms; last 280 ms |
| 4 | jumping | 5 | 140 ms; last 280 ms |
| 5 | failed | 8 | 140 ms; last 240 ms |
| 6 | waiting | 6 | 150 ms; last 260 ms |
| 7 | running | 6 | 120 ms; last 220 ms |
| 8 | review | 6 | 150 ms; last 280 ms |
| 9–10 | pointer directions | 16 static poses | Selected by pointer angle, not a timed animation |

There are **57 regular animation frames + 16 direction poses = 73 runtime poses**. The official assembly utility additionally populates row 0, column 6 as a neutral reference, so its completed output contains **74 occupied cells out of 88**. This reference is not a seventh idle animation frame. In the verified app, the pointer deadzone falls back to idle.

## Native playback

The app uses one sprite component for built-in and custom pets. Non-idle actions run three cycles before falling back to slow idle; idle uses six times the base timings above. Reduced-motion mode holds a first frame. Pointer tracking selects a direction every 22.5 degrees, starting at up, across rows 9 and 10. The app controls drag direction, hover reactions and task-state changes.

GenPet supplies the official custom-Pet package under `<CODEX_HOME>/pets/genpet-companion`. It does not replace the native animation engine, inject a desktop window, change action timings or patch the application. Its additional responsibility is egg-first identity, growth/context state, generation and validated file replacement.

The external GenPet-Debugger project is a diagnostic surface and is excluded from this plugin. Its timed preview follows the same action repetition and idle timing, but browser controls are not evidence that native task/drag/pointer integration has been visually exercised. Actual selection must be checked in the native Pet window.

## Verification evidence

The local compatibility check compares the app's V2 dimensions, row counts, 9 action tables, base durations, 16-direction quantization, action repetition and idle multiplier. It writes `output/native-contract-report.json`. Local extracted code remains in ignored development output and is not distributed.

Final artwork additionally goes through the official atlas validator and direct visual inspection. The native file loader, image-quality checks and successful visible selection are separate claims. A passing file test is never recorded as proof that the user has selected the pet.
