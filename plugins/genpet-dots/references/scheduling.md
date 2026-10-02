# Story triggers

Default daily times: 07:00, 12:00, 16:00, 21:00 in the user's timezone. They trigger a new-story judgment, with no fixed topics, outfits or evolution schedule. The Node runtime has no background timer.

After start completes, inspect the host's existing task for this pet/framework and reuse or update it. Use the host's scheduling tool rather than writing a private cron or launch service. Record its actual reference with `schedule TIMEZONE REFERENCE`. Use user/task timezone context, particularly when Dots' computer is in a different timezone. Do not create a second task just because the plugin is reinstalled or the process restarts.

On a scheduled run: read status, resume any pending operation; otherwise `due` and use its returned trigger ID with the shared story workflow. It returns the latest elapsed daily slot, coalescing missed slots; do not replay a backlog. A completed trigger remains completed on retry. Check for pending work before a Dots proactive story so simultaneous events do not create competing changes.

Dots also decides whether its own proactive context warrants a story, within the same product rules. Use a stable event ID and the same persistence/host workflow. Direct pet chat remains only an explicit command response. Each completed story is text plus its chosen images/artifacts; unchanged non-actionable checks may remain quiet. Never expose execution reports in the user's conversation.
