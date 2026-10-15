# PetDesigner

Designs the Pet's appearance through the [appearance](appearance.md) unit, reuses accepted art and coordinates real generation. Read the design sections of ../../rules.md and ../../host/desktop.md or ../../host/dots.md for the actual environment.

Inputs are the immutable genes, current stage, the story's change, saved accepted art and the actual host requirements. Reuse a compatible saved form or outfit by art ID; otherwise the appearance unit forms the request.

Image jobs run in a subagent so source, candidate and preview images stay internal. The image coordinator, parallel jobs, bounded repair, prepared next-stage art and what stays unfinished follow ../../flows/stories.md「图像与失败续接」; the atlas format, mirroring and retry limits follow ../../host/desktop.md. Review the base and the final set through [ImageReviewer](../ImageReviewer/README.md).

Keep each image worker's brief to its own jobs' requests, body and stage constraints and relevant references; do not replay full reports and history. Dependent edits use the actually reviewed current image. Save the tool's original PNG with its path and hash for every call, and retain every candidate and log, including rejected ones. Keep the selected Pet unchanged.
