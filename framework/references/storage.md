# Records

Default roots: `~/.genpet/desktop` and `~/.genpet/dots`, within each host's own environment. `GENPET_DATA_DIR` overrides the shared base, not the host namespace. `--demo` adds a separate demo namespace. Do not move the Dots pet into the user's desktop record.

`state.json` holds the current pet, stories, assets, pending operation, and optional actual schedule reference. Pending operations and completed stories may contain `steps`: append-only generation results with a step ID, unit name, time, input references and an open result object. These are internal artifacts under the existing continuation/history records, not another copy of all user data. Existing v2 records without steps remain readable. Each pet's `pets/PET_ID/record.json` and `assets/` preserve its record and files. An explicit reset saves a backup and creates a new pet identity while transferring the existing host surface, so it does not add another Avatar entry.

The six persisted contents are identity/binding, open genes/acquisition, current phase/state, story/change history, reusable assets, and operation/continuation. User data is read as needed; store only the relevant brief facts and decision basis. There is no fixed profile, activity taxonomy, growth clock or face schema.

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
  "appearance": {"description": "Appearance implied by this story"}
}
```

For later stories, omit genes/place/connection. Stage may stay unchanged. Omit appearance when no Avatar change is needed; add `appearance.reuseArtId` to select a saved compatible appearance. `mediaIds` can reuse existing story pictures/artifacts. These fields define references and continuation, not the space of possible identities or stories.

Legacy v1 data is not automatically aged, reset or modified. Read the old record and its actual identity images; write a small design file with `genes`, `place`, `connection` reflecting that existing individual, keeping missing origins explicit. `migrate-legacy ABSOLUTE_V1_FILE ABSOLUTE_DESIGN_FILE` preserves the old ID, phase, image files and native binding, backs up the source record and discards time-based growth rules. Missing old images remain missing, not substitutes. Generate any missing/currently required v2 artwork through a new story. If the user explicitly requests a new pet instead, use reset; do not adopt around an existing legacy companion.
