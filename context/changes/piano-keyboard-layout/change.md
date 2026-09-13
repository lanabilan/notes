---
change_id: piano-keyboard-layout
title: Stop the practice piano from stretching
status: implementing
created: 2026-09-06
updated: 2026-09-09
archived_at: null
---

## Notes

change styles for web app, so keyboard is not stratched out

Phase 1 adaptation after manual review: skip the tight `max-w-md` + fixed height. Scale both axes with `aspect-[16/5]` (matches ~390px × `h-28`) and cap at `max-w-3xl`. Phone stays full-bleed; desktop keys keep the same proportion.
