# Records

Default roots: `~/.genpet/desktop` and `~/.genpet/dots`, within each host's own environment. `GENPET_DATA_DIR` overrides the shared base, not the host namespace. Do not move the Dots pet into the user's desktop record.

`state.json` holds the current pet, stories, assets, pending operation, optional conversation notes (`chats`: brief records of what the user told the pet, never the pet's replies) and optional actual schedule reference. Pending operations and completed stories may contain `steps`: append-only generation results with a step ID, unit name, time, input references and an open result object. These are internal artifacts under the existing continuation/history records, not another copy of all user data. Existing v2 records without steps remain readable. Each pet's files live in `pets/PET_ID/assets/`. An explicit reset saves the full previous record to `backups/` and creates a new pet identity while transferring the existing host surface, so it does not add another Avatar entry.

The persisted contents are identity/binding, open genes/acquisition, current phase/state (including any adult special form), the open home description, story/change history, reusable assets, and operation/continuation. User data is read as needed; store only the relevant brief facts and decision basis. There is no fixed profile, activity taxonomy, item catalog or face schema. Growth uses only the pace ceilings in `src/growth.ts`, computed from story history rather than a stored clock.

The genes unit's `designBasis` is saved within its internal step, and the open `genes` text carries the same basis, so later stories can use the persisted genes alone. Read existing records and old steps without rewriting their origin; missing historical design grounds remain unknown.

Plan JSON fields (content is chosen by Agent):

```json
{
  "text": "The pet story, to be expressed with completed images",
  "basis": "Brief real user context and reason for this state or evolution",
  "state": "Open description of the story's resulting pet state",
  "stage": "egg",
  "genes": "Initialization only: self-contained genes text from the genes unit",
  "place": "Initialization only: where the egg was acquired",
  "connection": "Initialization only: why the encounter matters to the user",
  "personality": "An open description of character, how it relates to the user, state expression and brief creative grounds",
  "home": "After hatching, when changed: the complete home description from the home unit (location, zones, items), referring to saved media IDs for items kept there",
  "special": "Adults: the special form after this story, or null when an active form ends",
  "appearance": {"description": "Appearance implied by this story"}
}
```

For later stories, omit genes/place/connection and reuse the persisted personality. Story/state judgments and source references stay in the existing generation steps and brief basis; no new story classifier is required. Stage may stay unchanged or advance one stage. Omit `home` when it is unchanged (story unit `home: null`). Set `special` from the evolution unit: its text while in a form, `null` only to end an active form, omitted otherwise. A due `growth.required` change must be in the plan. Stage changes and entering or leaving a special form need an appearance. Omit appearance when no other Avatar change is needed; add `appearance.reuseArtId` to select a saved compatible appearance. `mediaIds` can reuse existing story pictures/artifacts.

Personality and naming fields are additive. Old v2 records remain readable without being rewritten; an existing name is preserved. Old saved pending plans can finish as saved. A pet lacking personality can supply it in a new story plan and receives it only on successful completion. Later plans cannot replace it. New initialization requires a personality. `name-pet` and `name-asked` act on an explicit Pet ID; see [naming](naming.md).

Legacy v1 data is not automatically aged, reset or modified. Read the old record and its actual identity images; write a small design file with `genes`, `place`, `connection` reflecting that existing individual, keeping missing origins explicit. `migrate-legacy ABSOLUTE_V1_FILE ABSOLUTE_DESIGN_FILE` preserves the old ID, phase, image files and native binding, backs up the source record and discards time-based growth rules. Missing old images remain missing, not substitutes. Generate any missing/currently required v2 artwork through a new story. If the user explicitly requests a new pet instead, use reset; do not adopt around an existing legacy companion.
