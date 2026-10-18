# Research foundation

> This page explains where GenPet's design comes from. The rules the plugin runs on are in [rules.md](../plugins/genpet/skills/genpet/rules.md), and [the architecture](ARCHITECTURE.md) shows how they are carried out.

GenPet takes theoretical inspiration from **GenFaceUI: Meta-Design of Generative Personalized Facial Expression Interfaces for Intelligent Agents** and its Generative Personalized Facial Expression Interface (GPFEI) framework. It is a native Codex Pet plugin, not a replication of GenFaceUI. It applies bounded personalization and contextual expression to a companion that persists and changes over time.

## What comes from GenFaceUI

The GPFEI framework has four connected components: personalized base-face generation, contextual expression, context mapping, and meta-design. Designers establish templates, semantic elements, constraints, and mappings; runtime generation produces individual instances within those conditions. A recognizable individual identity remains the basis for subsequent contextual expressions.

GenPet translates these components into:

| GPFEI component | GenPet |
| --- | --- |
| Personalized base face | A literal egg whose shell colors and patterns come from the adoption journey; the body designed from the genes appears at hatching and is kept, recognizably the same Pet, through later stages |
| Contextual expression | Everyday looks (日常): what the Pet wears, holds or does and its momentary condition, drawn as a full set for every host animation slot |
| Context mapping | The Agent observes the user's current situation from Codex memories and recent sessions and decides how this Pet responds; there is no fixed activity-to-look table |
| Meta-design | Product rules that every design follows: specific inspiration, cute cartoon pixel style, readable at small size, at least eyes, egg stays an egg |

The rules fix the boundaries and leave the individual open. Each egg shows only shell clues; the complete creature is designed at adoption from the user's traits and journey choices but is shown only when it hatches. The clues support continuity in hindsight without giving the answer away.

## Three time scales

1. **Growth:** an egg hatches within five hours. After that the Pet grows when it has accumulated enough experiences (rewrites of its memory), preferably at a real change in the user's life, with one week per stage as the latest fallback. Adults can occasionally transform (幻化) for at most two days.
2. **Stories:** a scheduled check runs every five hours while Codex is open. Each check gives the Pet something to show: usually an everyday look, sometimes an item, a change at home or a few words.
3. **Immediate interaction:** Codex's own animations continue to show running, waiting, review and failure. An everyday look does not change what an animation slot means.

The five-hour and one-week figures are GenPet design choices, not timings established by the GenFaceUI study. The Pet's personality shapes how it responds; it is not a diagnosis or measurement of the user's personality.

## Image-generation continuity

Generated character art is the intended visual medium. Every subsequent life stage or contextual variant should reference an approved identity image, with the same palette, motif, permanent mark, facial language, and family constraints. Prompt instructions alone do not prove identity continuity. Generated sheets need visual inspection for recognizable identity, coherent proportions, consistent framing, and correctly ordered actions, followed by mechanical checks of dimensions and transparency.

The runtime must distinguish an approved generated sprite sheet from a requested design specification. A profile or growth-state change does not by itself mean a matching image has been generated. Asset records should retain which identity, stage, and contextual condition they actually depict, along with generation provenance and approval status. If a corresponding variant is unavailable, the interface should describe the available asset honestly.

For reproducible demonstrations, previously generated and reviewed assets may be distributed with the project. Reusing such an asset should be described as selecting a prepared example. Fresh personalized generations are a separate operation.

## User and designer control

GenFaceUI participants asked for structured inputs, clearer rule relationships and lightweight explanations of how rules affected outputs. In GenPet:

- Adoption starts with a short notice of what the Pet reads, and stops if the user declines.
- The user's own choices in the adoption journey are real input to the design, alongside what Codex already knows about them.
- The user names the Pet, can talk to it with `/genpet-chat`, ask for a story, growth or a replacement, and stop the scheduled checks.
- Developers change behavior by editing the rules and unit prompts; the debugger page shows exactly what a Pet's record holds.

Adapting automatically from user information is not the same as the user designing. Direct choices and the ability to stop or replace provide the concrete points of participation.

## What this prototype does not establish

The original GenFaceUI study was an exploratory qualitative study with twelve designers. Participants reported perceived consistency and controllability, alongside problems with fine-grained control, predictability, and animated continuity. It did not demonstrate benefits to end users' trust, engagement, communication, or productivity in situated long-term use.

GenPet's longitudinal development, attachment, evolving expression preferences, and contextual growth are therefore new design hypotheses. A runnable demonstration and passing software checks establish implementation behavior; they do not establish those user-experience outcomes.

Useful future evaluation questions include whether people recognize the same individual across stages, understand why a contextual change happened, can correct unwanted adaptations, and perceive growth without feeling pressured to work longer. Designer evaluation should also examine how reliably the declared constraints are preserved across generated variants.

## Source references

- **GenFaceUI: Meta-Design of Generative Personalized Facial Expression Interfaces for Intelligent Agents**, camera-ready manuscript: “Generative Personalized Facial Expression Interface (GPFEI),” “Design Challenges for Meta-Design Tool,” study findings, and “Limitations & Future Work.”
- **Designing Generative Visual Interfaces for Human-Agent Interaction**, dissertation, Chapter 6: GPFEI framework; exploratory designer study; discussion of design-decision rights, adaptation, and user participation.

Local source files were checked during development. Private filesystem locations and research data are intentionally omitted from this public document. No participant-level data are included.
