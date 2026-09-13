---
change_id: piano-keyboard-layout
title: Stop the practice piano from stretching
status: archived
created: 2026-09-06
updated: 2026-09-13
archived_at: 2026-09-13T12:44:37Z
---

## Notes

change styles for web app, so keyboard is not stratched out

Phase 1 adaptation after manual review: skip the tight `max-w-md` + fixed height. Scale both axes with `aspect-[16/5]` (matches ~390px × `h-28`) and cap at `max-w-3xl`. Phone stays full-bleed; desktop keys keep the same proportion.
