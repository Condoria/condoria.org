# Condoria Newsroom — writing worktree

This is a **writing** worktree, checked out on the `articles` branch and kept
separate from the coding worktree (`../condoria.org`, on `main`). Sessions here
are for **drafting articles** for the Condoria site in the correct voice — not
for changing code. A lighter model (Sonnet/Haiku) is fine for this work.

## What this session does — and doesn't

- **Do:** draft article prose in Condoria's voice, as markdown files in
  `drafts/`. Read anything in the repo for reference (the seed content is the
  gold standard — see below). Keep the world's canon consistent.
- **Don't:** edit application code, run `pnpm build`/`dev`/migrations, seed, or
  deploy. Those belong to the coding session on `main`. If a draft needs a code
  change (a new content block, a template tweak), note it in the draft and hand
  it to the coding session — don't make it here.
- **Publishing is a human step.** Drafts here are handed to an **editor**, who
  creates the article in the Payload admin (`/admin`) and publishes it. Nothing
  in this folder reaches the live site on its own. This branch is a standing
  writing workspace and is **not meant to be merged into `main`**.

## The two publications

The site carries two publications with deliberately different voices. Every
article belongs to exactly one (its `section`).

### The Government Gazette — `section: government` (lives at `/gov`)
The **official record of the nation**, published by the Chancellery. Register is
formal, dignified and civic, warmed by a dry, ceremonious wit. It carries
decrees, public-works reports, features and notices. It speaks *for* the nation
("the Council extends the nation's thanks"). It is proud and a little
self-aware, but never sarcastic about the state — it *is* the state.

### The Condor Times — `section: times` (lives at `/times`)
The **independent press** — "Independent of the Chancellery." Sharper and
plainly journalistic: leads, investigations, market reports, and signed
editorials. It is sceptical of power, quotes **named sources**, asks questions
on the record, and keeps its own tallies. Fair, not cynical; its quarrel is
"not with the stone but with the arithmetic." Editorials close `— The Editors,
The Condor Times`.

**Read `src/seed/content.ts`** for eight finished examples across both voices
(charter, monument, founding-day feature, road report, resident proposal;
toll lead, road-overrun investigation, keepers op-ed, quay-prices market). Match
that quality and register. `src/seed/content.ts:255` onward is the Times set.

## The world (keep canon consistent)

Condoria is a roleplay nation on the **Rulercraft** Minecraft server. Anchor
names and facts (don't contradict these; introduce new ones sparingly and
plausibly):

- **Government:** the **Charter** (founding law), the **Council** (residents,
  legislates by open vote in the **Hall of Assembly**), the **Chancellor**
  (elected, keeps the Seal), the **Chancellery** (executive; keeps the archive,
  sets tolls, oversees common works), the **Keeper of Records**.
- **Geography:** the capital **Condoria-upon-Vale** (walled, in the vale); the
  **North Range** (mountains) and its high pass; the **South Quay** (harbour
  district); farming **terraces** along the river; the **Vale Gate**.
- **Landmarks & lore:** the **National Monument** (gold-capped obelisk on the
  founding hill, Article V of the Charter); the **Great North Road** (~4,200
  blocks, Vale Gate → pass) and the **Sixstone Bridge**; **Founding Day**
  (1 November; eleven founders, one leaking boat); **common works** "belong to
  all" (Article IV).

## House style

- **British spelling and idiom:** honour, neighbour, programme, organise,
  scepticism, chiselling, "a copper," "a fortnight."
- **Typography:** curly quotes `‘’ “”`, em-dashes `—` for asides, en-dashes for
  ranges. No emoji. Numbers spelled out in prose where it reads better
  ("forty-two hundred blocks").
- **Tone:** concrete and grounded (soup, lanterns, salt-fish, gold leaf), never
  breathless. Wit is dry and earned. Let quotes and detail carry the piece.
- **Length:** features 4–7 short paragraphs; notices and briefs shorter. Break
  up prose with a block (a pull-quote, a callout, an image) where it earns one.

## Article fields (the editor sets these from your draft's frontmatter)

- `title` (required) · `section`: `government` | `times` (required)
- `excerpt` — one or two sentences summarising the piece; shown in lists and on
  the homepage. Write it in the same voice.
- `content` — the body (your markdown).
- `category` (optional relationship) · `featuredImage` (optional; describe what's
  needed) · `publishedAt` (the editor sets on publish; can be backdated).
- `pinned` — **editors only**; pins a Gazette piece to "Documents of State" on
  the home page. Suggest it if warranted; don't assume it.
- `slug` is generated from the title; `author` is the writer.

## Content blocks you can use in the body

Rich-text bodies can contain these blocks (recreate them in the admin's block
editor). In a draft, mark them with a `::: name (option) — label` fence so the
editor can transcribe them:

- **callout** — styles `note` | `decree` | `warning`; optional title + body.
  (`decree` for proclamations; `note` for asides; `warning` sparingly.)
- **quote** — a pull-quote: `quote`, `attribution`, `attributionTitle`
  (e.g. "First Consul of Condoria"). The Times leans on these.
- **image** — layout `standard` | `wide`; a caption. Describe the image you want.
- **gallery** — 2 or 3 columns of captioned images.
- **embed** — a YouTube/Vimeo URL (other URLs render as a link card).
- **model3d** / **litematic** — interactive 3D exhibits, **editors/admins only**.
  A resident draft must not rely on these; suggest one and let an editor add it.

**Workflow reminder:** residents may draft but **cannot publish** and cannot add
the model3d/litematic exhibits; editors review, add any exhibits, and publish.

## How to work

1. Draft in `drafts/` — copy `drafts/_template.md` to a new
   `drafts/<publication>-<slug>.md` and write.
2. Fill the frontmatter (title, section, excerpt, …) and the body.
3. Keep canon consistent; when in doubt, check `src/seed/content.ts` and
   `src/collections/Articles.ts`.
4. Hand the finished draft to an editor to publish via `/admin`.

See `drafts/README.md` for the draft format and the block-fence notation.
