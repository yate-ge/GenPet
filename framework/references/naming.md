# User naming

Product behavior lives in `prompts/meta.md` under 用户命名. Naming changes the saved display name, not the unique Pet ID, genes, personality, artwork or past stories.

After `finish-story`, read `story-output` or `status`. `naming.due` / `namingDue` becomes true only when the completed pet is no longer an egg and its naming status is unasked. A saved hatch plan, unfinished host update or read-only status cannot trigger it.

Present the actual hatch story and accepted visual. Ask one short free-text naming question with `request_user_input_async` when available, without suggested names. Otherwise ask the same concise question in the story reply. After the question is actually delivered, call `name-asked PET_ID`. Keep the question's Pet ID for its reply. No answer leaves asked status and does not block stories or cause repeated prompts. Do not mark a question delivered when its tool failed.

For an explicit user name, call `name-pet QUESTION_PET_ID USER_NAME`, quoting the name as one shell argument. A reply for a reset/replaced pet is rejected; do not silently apply it to the new pet. If the user prefers to decide later, nothing more is saved: the asked status already stops repeated invitations. `/genpet-name` can name or rename the existing individual at any time; read status, ask only if a name was not supplied, and save only the user's own answer. This entry does not adopt or generate a story.

Naming is serialized with stories: if an operation is unfinished, complete/resume it before applying the reply. A same-name retry is idempotent. Existing records without a naming field retain their original name and are not automatically invited again. An explicit reset creates a new, unasked individual.

Later stories and art/host requests carry the saved name. The name is for talking with the user (stories, replies, questions). Desktop publication does not use it: the Codex Pet list shows the unique ID in short form (`genpet-xxxxxx`, `desktopLabel`) as displayName, so naming and renaming never need a republish and never change the entry. Existing entries get the ID label the next time their appearance is published. Dots updates receive name.
