# Research foundation

GenPet takes theoretical inspiration from **GenFaceUI: Meta-Design of Generative Personalized Facial Expression Interfaces for Intelligent Agents** and its Generative Personalized Facial Expression Interface (GPFEI) framework. It is a native Codex Pet plugin, not a replication of GenFaceUI. It applies bounded personalization and contextual expression to a companion that persists and changes over time.

## What comes from GenFaceUI

The GPFEI framework has four connected components: personalized base-face generation, contextual expression, context mapping, and meta-design. Designers establish templates, semantic elements, constraints, and mappings; runtime generation produces individual instances within those conditions. A recognizable individual identity remains the basis for subsequent contextual expressions.

GenPet translates these components into:

| GPFEI component | GenPet implementation target |
| --- | --- |
| Personalized base face | An abstract shell signature, then an identity resolved at hatching and preserved across later life stages |
| Contextual expression | Native Codex action animations, with longer-lived contextual props |
| Context mapping | Explicit mappings from automatically read local activity labels to visual changes |
| Meta-design | A shared visual family, immutable identity features, permitted variation, and validation rules |

The visual family establishes the common silhouette language, facial structure, materials, palette range, and animation semantics. Each egg receives only faint palette and abstract shell clues. A complete creature is not selected or generated at adoption. Hatching resolves the first individual from those clues, incubation evidence and a seed. Its approved identity is then preserved across maturation. The clues support retrospective continuity without revealing the answer in advance.

## Three different time scales

1. **Identity and growth:** an egg hatches after five hours; subsequent daily growth changes the life stage, proportions, and accumulated details. Elapsed time provides growth. Sustained activities can shape optional visual differences.
2. **Five-hour context:** an authorized recent activity summary can change a prop or small scene. Context changes should preserve the character's identity and developmental stage. Missing context must not be presented as observed user behavior.
3. **Immediate interaction:** Codex runtime actions continue to communicate current work, waiting, review, and failure. A contextual outfit must not change what an action means.

The five-hour and daily schedules are **GenPet design choices**, not timings established by the GenFaceUI study. Personality-like changes describe the companion's expression preferences; they should not be presented as diagnoses or reliable measurements of the user's personality.

## Image-generation continuity

Generated character art is the intended visual medium. Every subsequent life stage or contextual variant should reference an approved identity image, with the same palette, motif, permanent mark, facial language, and family constraints. Prompt instructions alone do not prove identity continuity. Generated sheets need visual inspection for recognizable identity, coherent proportions, consistent framing, and correctly ordered actions, followed by mechanical checks of dimensions and transparency.

The runtime must distinguish an approved generated sprite sheet from a requested design specification. A profile or growth-state change does not by itself mean a matching image has been generated. Asset records should retain which identity, stage, and contextual condition they actually depict, along with generation provenance and approval status. If a corresponding variant is unavailable, the interface should describe the available asset honestly.

For reproducible demonstrations, previously generated and reviewed assets may be distributed with the project. Reusing such an asset should be described as selecting a prepared example. Fresh personalized generations are a separate operation.

## User and designer control

GenFaceUI participants requested structured inputs, parameter locking, clearer rule relationships, and lightweight explanations of how rules affected outputs. GenPet should make the following visible and editable:

- Adoption preferences and immutable identity features.
- The recent-context summary and the rule that caused a change.
- Permitted life-stage, accessory, and scene changes.
- Options to lock an appearance, correct context, and reject or reverse a proposed visual change.
- An explicit distinction between real elapsed time and accelerated demo time.

Automatic adaptation based on user information differs from intentional user customization. A system that changes from activity data does not, on that basis alone, establish user design agency. Direct choices, corrections, locks, and rejection mechanisms provide concrete opportunities for participation.

## What this prototype does not establish

The original GenFaceUI study was an exploratory qualitative study with twelve designers. Participants reported perceived consistency and controllability, alongside problems with fine-grained control, predictability, and animated continuity. It did not demonstrate benefits to end users' trust, engagement, communication, or productivity in situated long-term use.

GenPet's longitudinal development, attachment, evolving expression preferences, and contextual growth are therefore new design hypotheses. A runnable demonstration and passing software checks establish implementation behavior; they do not establish those user-experience outcomes.

Useful future evaluation questions include whether people recognize the same individual across stages, understand why a contextual change happened, can correct unwanted adaptations, and perceive growth without feeling pressured to work longer. Designer evaluation should also examine how reliably the declared constraints are preserved across generated variants.

## Source references

- **GenFaceUI: Meta-Design of Generative Personalized Facial Expression Interfaces for Intelligent Agents**, camera-ready manuscript: “Generative Personalized Facial Expression Interface (GPFEI),” “Design Challenges for Meta-Design Tool,” study findings, and “Limitations & Future Work.”
- **Designing Generative Visual Interfaces for Human-Agent Interaction**, dissertation, Chapter 6: GPFEI framework; exploratory designer study; discussion of design-decision rights, adaptation, and user participation.

Local source files were checked during development. Private filesystem locations and research data are intentionally omitted from this public document. No participant-level data are included.
