# Drafts

Each article is one markdown file here, named `<publication>-<slug>.md`
(e.g. `times-vale-gate-toll.md`, `gov-lantern-festival.md`). Copy
`_template.md` to start. Files beginning with `_` are templates, not drafts.

A draft is **handed to an editor**, who recreates it in the Payload admin
(`/admin`) and publishes it. These files never reach the live site directly.

## Frontmatter

YAML at the top of the file carries the article fields the editor will set:

```yaml
---
title: Traders Balk as Vale Gate Toll Takes Effect
section: times          # government | times
excerpt: The Chancellery's new toll is meant to keep the North Road in repair. The
  traders who use it are not convinced they should pay twice for a road they were
  told was theirs.
category:               # optional
featuredImage:          # optional — describe the image needed, e.g. "the Vale Gate at dawn, cart queue"
pinned: false           # editors only; pins a Gazette piece to "Documents of State"
status: draft           # draft | ready-for-review
---
```

## Body

Write the body in plain markdown below the frontmatter. For the rich-text
**blocks** (which markdown can't express), use a `:::` fence so the editor knows
exactly what to build in the admin:

```
::: callout (decree) — Proclamation of the Founding Council
By decree of the Founding Council, given under the Seal of the Nation…
:::

::: quote — Bram Cartwright, of the Carters' Benevolent Fund
They cut the ribbon and told us the road was ours. A fortnight later they put a
till at the gate.
:::

::: image (wide) — The Vale Gate at first light, the cart queue past the gatehouse
[image to supply: dawn over the gate, carts waiting]
:::
```

Fence forms:
- `::: callout (note|decree|warning) — Optional Title` … `:::`
- `::: quote — Attribution, Attribution Title` … `:::`
- `::: image (standard|wide) — caption` … `:::`
- `::: gallery (2|3 cols) — caption` then one `[image: …]` line each … `:::`
- `::: embed — https://youtu.be/… (caption)` … `:::`
- `::: exhibit (model3d|litematic) — caption` … `:::`  ← **editor-only**; suggest,
  don't rely on it in a resident draft.

See `example-times-market-brief.md` for a complete short draft.
