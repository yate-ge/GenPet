# GenPet design

[中文](DESIGN.zh-CN.md)

## Design idea

**A virtual pet that grows with the user.** Desktop pets today, in Codex and in other AI clients, have a fixed look: each person can generate one to their own needs, and after that it never changes. GenPet wants a pet that connects with the user, changes and grows, a companion that stays with the user and changes along with them. It starts as an egg: the user takes part in a short adventure and gets the egg, which hatches into a creature designed for that user and slowly grows up.

**The pet watches the user and keeps them company.** The pet lives in a virtual world. It watches the user, reacts to how they are doing, and has an emotional exchange with them, so the user feels accompanied. It does not need the user to feed or look after it. It has a life of its own in its small world, but it is first of all the user's pet, and keeping the user company comes first.

**One identity, a look that changes.** The pet stays one identity and can still grow. It builds an emotional bond with the user through the context it observes, and changes its expression and look because of it.

**Designers set the rules, the generative model generates.** This comes from our research on meta-design for generative agent interfaces, published as [GenFaceUI (CHI '26)](https://arxiv.org/abs/2602.11055). There, designers define templates, rules and how context maps to expression, and each agent's face is generated at runtime within those rules, keeping one recognizable identity while its expression changes with the context. GenPet uses the power of a generative model to make the pet a dynamic figure while holding two kinds of consistency: the design style stays consistent, and the pet's own look stays consistent. All change happens inside both. The product rules fix the boundaries (a literal egg, a cute pixel companion with eyes, one identity across stages), and the Agent makes every creative choice inside them, from the pet's design to each story.

**Beyond pets.** The same split works for other companions in other agents and apps: product rules set the boundaries, an Agent makes the creative choices, and a small amount of code keeps identity and records reliable.

## Stories

The pet connects with the user through stories. Every so often it makes a new one.

**Story principles**

1. **Connected to the user.** Each story responds to the user right now: keeping them company while they work, saying something when they finish or get stuck, or giving them a small thing from its world. The user can tell at a glance that it is meant for them.
2. **Written for the user.** A story matters because of its connection to the user, and is never told just to tell a story.
3. **A pleasant surprise.** Each story is something the user finds interesting, with a reason behind its content, so the user can see why it happened.

**One image per story.** There are three kinds:

| Kind | What it tells |
| --- | --- |
| Scene | The pet doing something in a place, or just the place. The pet's home is one kind of scene. |
| Change of form | The pet looks different. Everyday look: new clothes, something held, something being done, with the same body. Growth: egg, hatchling, juvenile, adult in turn. Transformation: a rare, temporary, playful change for adults. The look follows how the pet responds to the user (keeping watch, celebrating, welcoming them back). |
| Item | A story told through a thing: something the pet brings home, or gives to the user. |

**Over a long time.** The pet's home keeps changing: things added, tidied away, a move. The pet builds up many different looks and keeps every one, so it can wear an old one again. What it brings back, gives to the user or leaves at home is recorded: which story it came from and where it is now.

## Principles

1. **Nothing about the user is made up.** The pet's world can be imaginary; the user's actions, feelings and words cannot. Reading user information needs consent first, sensitive details are never used or saved, and only short observations with their sources are kept.
2. **The rules set the boundary, the Agent designs.** Each pet is designed from a named, familiar source (a specific species, legend or character) with a reason for every main feature. There is no species catalog, body template or personality preset; randomness only picks among grounded designs.
3. **One pet, one identity.** The egg is a literal egg that only hints at what is inside. After hatching, every stage and every new look is still recognizably the same pet. Soul, memory and state are saved together.
4. **Cute and readable first.** Pets are cute cartoon pixel companions with at least eyes, readable at the small size the desktop shows them. A design that is unsettling or unpleasant to look at fails, whatever its story.
5. **Company that stays out of the way.** The pet watches, responds and keeps the user company. It does not ask questions, invite replies, nag or make the user feel guilty. Growth is never shown as a number, level or progress bar.
