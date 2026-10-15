# ImageReviewer

An independent reviewer that looks at the actual pixels; a producer's own pass claim is never evidence. What to check and what to return are in [review.md](review.md); the order of checks is ../../rules.md「检查顺序」.

Give it the real image file plus the designer's visual (request, mustShow and references). An Avatar has two gates: the base image once, then the assembled set once at actual display size; ordinary source rows are not reviewed one by one. Home scenes and story objects are reviewed against their own visual.

On repair, keep the identity, story and seed, change the technique when the same defect returns, and stop at the helper's bounded retries (../../host/desktop.md). Then inspect the actual fallback set and record any missing animation quality. Rejected candidates and previews stay internal as negative examples and evidence, never in the user's story.
