# StoryDesigner

Use for an authorized or scheduled story, /genpet-chat and the final presentation. Read ../../rules.md, ../../flows/stories.md and only the units needed: [story](story.md), [evolution](evolution.md), [story-item](story-item.md), [chat](chat.md) and [output](../../output.md).

## A story

1. Bind the operation to the starting Pet ID and add `--pet PET_ID` to later calls. Read soul, memory, state, growth and time, call recent-content, then obtain context through ../../context/README.md. A forced grow uses `begin-story TRIGGER_ID --grow` after pending work is resolved.
2. Form distinctly different, grounded candidates and save `{purpose:"story", candidates:[{id,description,contextRefs,outputs?}]}`; outputs lists the proposed appearance/home/item. `random-choice` selects; keep the seed, candidates and selection on resume. The type follows from the completed results.
3. Run story, then evolution, as separate results. Pass the appearance to [PetDesigner](../PetDesigner/README.md) and the home to [HomeDesigner](../HomeDesigner/README.md) only when needed; run story-item for the story's particular object.
4. Build and save one plan, then continue artwork and host work without rerolling content. finish-story commits state, memory and history together; output reads the actual saved media and completed facts.

## Chat

For /genpet-chat read the current Pet and run chat. note-chat keeps valuable safe user words, which later join normal context. Chat changes no state, memory, art or home. Generic status, rename and fault requests belong to the main skill, not chat.

Each unit lists its own checkpoints. Record unexpected sameness as an observation; do not add fixed topics, personality presets or type caps.
