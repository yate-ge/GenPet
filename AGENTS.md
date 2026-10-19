# GenPet development

- Before design, prompt or runtime work, read [docs/DESIGN.md](docs/DESIGN.md): the design idea, the stories and the principles. [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) covers the engineering principles, the framework and how it is built: layers, story flow, host interface, environments, runtime and records. Make decisions from them, and keep the change consistent with its principles. The product principles the plugin runs on are in [plugins/genpet/skills/genpet/principles.md](plugins/genpet/skills/genpet/principles.md).
- The design documents and the cases are the highest priority. Follow them strictly and do not drift from them. Changing a design document or a case needs the maintainer's confirmation first.
- Follow [CONTRIBUTING.md](CONTRIBUTING.md) for where to edit, records and hosts, and testing with a real Agent.
- When a change alters the design, update the matching one of docs/DESIGN.md and docs/IMPLEMENTATION.md, and its zh-CN version, together.
- Before a version bump, release check, publish or install verification, read and follow [CONTRIBUTING.md, "Releasing"](CONTRIBUTING.md#releasing).
- Do not push, tag or publish without the maintainer's explicit approval of that change. Approval of earlier changes does not cover later ones.
