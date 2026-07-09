# Condoria CMS

The self-hosted content management system and public website of **Condoria**, a
roleplay nation on the Rulercraft Minecraft server.
One application serves both the nation's official gazette (articles, decrees,
standing pages, an interactive 3D exhibit of the National Monument) and the
admin panel where residents draft, editors publish, and the Chancellery keeps
order. Built with **Payload CMS 3** and **Next.js 16** (App Router) with
Tailwind CSS v4 — SQLite for zero-setup local development, Postgres (Neon) and
Vercel Blob in production.

- [Quick start (local)](#quick-start-local)
- [Roles and permissions](#roles-and-permissions)
- [Content model](#content-model)
- [Database adapters](#database-adapters)
- [Deploying to production](#deploying-to-production-vercel--neon--vercel-blob)
- [Extending the CMS with custom blocks](#extending-the-cms-with-custom-blocks)
- [Scripts](#scripts)
- [Project layout](#project-layout)

## Quick start (local)

You need **Node.js ≥ 20.9** and **pnpm ≥ 10** (`npm i -g pnpm`). Nothing else —
local development uses a SQLite file database and stores uploads in a local
`./media` directory, so no external services are required.

```sh
# 1. Configuration
cp .env.example .env          # Windows (cmd): copy .env.example .env
#    → edit .env: set PAYLOAD_SECRET to a long random string, e.g.
#      node -e "console.log(crypto.randomBytes(32).toString('hex'))"
#    → optionally change SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD

# 2. Install and seed
pnpm install
pnpm seed                     # creates users, categories, media and articles

# 3. Run
pnpm dev
```

Then visit:

- **http://localhost:3000** — the public site
- **http://localhost:3000/admin** — the admin panel; sign in with the
  `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from your `.env`

The seed also creates two **demo accounts** so every role can be tried
immediately:

| Account                     | Role     | Password                |
| --------------------------- | -------- | ----------------------- |
| `editor@condoria.example`   | editor   | `condoria-editor-2026`  |
| `resident@condoria.example` | resident | `condoria-resident-2026`|

> [!IMPORTANT]
> These are published demo credentials. **Change the admin password and both
> demo account passwords immediately** after first login (Admin → Users), and
> never run the seed against a shared database with the defaults.

### A note on email

This project deliberately configures **no email adapter**, so Payload writes
every email (e.g. password resets) to the **server console instead of sending
it** — no real mail ever leaves the app. All seed accounts additionally use
the `condoria.example` domain, which is IANA-reserved and cannot receive mail
(the nation does not own a mail domain; `condoria.org` belongs to someone
else). If you ever add a real email adapter, first move every user to email
addresses on a domain you actually control.

### What the seed creates

Four categories (Decrees, Gazette, Culture, Public Works), three media items
(two generated banner images and the National Monument `.glb`), the About page,
and five articles that exercise every content block — including
*“The National Monument, Restored”*, whose interactive 3D model block you can
orbit in the browser, and a draft article by the resident account demonstrating
the review workflow.

The seed is **idempotent**: if the admin user already exists it exits without
touching anything. To reseed locally, delete `condoria.db` (and optionally the
`./media` directory) and run `pnpm seed` again. A read-only check of the seeded
content is available with:

```sh
pnpm payload run src/seed/verify.ts
```

## Roles and permissions

| Role         | May do                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| **resident** | Write and edit **drafts of their own articles**. Cannot publish, and cannot add the 3D model block. |
| **editor**   | Create, edit and publish any article or page; manage categories and media; use all blocks including 3D models. |
| **admin**    | Everything an editor can, plus user management and role assignment.                           |

Enforcement is server-side, twice over: collection and field **access control**
(`src/access/index.ts`) restricts reads, writes and specific fields (e.g. only
editors/admins may set `pinned` or reassign `author`), and **hooks** on the
Articles collection (`src/collections/Articles.ts`) reject resident attempts to
publish or to smuggle a `model3d` block into content, regardless of how the
request arrives.

## Content model

Collections (`src/collections/`):

- **Articles** — the gazette: title, excerpt, rich text content, auto-generated
  slug, author, category, featured image, `pinned` flag, drafts + autosave,
  `publishedAt` stamped on first publish (backdatable).
- **Pages** — standing pages (About, …) served at `/<slug>`; same editor,
  drafts enabled.
- **Media** — uploads with required alt text; images get `thumbnail`/`card`/
  `hero` renditions; also accepts `.glb` 3D models (`model/gltf-binary`).
- **Categories** — name + auto-generated slug.
- **Users** — name, email, role (`resident | editor | admin`).

Article and page content is a Lexical rich-text field with six custom blocks
(schema in `src/blocks/config.ts`, renderers in `src/blocks/components/`):

| Block     | Purpose                                                                  |
| --------- | ------------------------------------------------------------------------ |
| `callout` | Boxed aside in `note`, `decree` or `warning` style, with optional title. |
| `quote`   | Pull quote with optional attribution and attribution title.              |
| `image`   | Single captioned image, `standard` or `wide` layout.                     |
| `gallery` | Grid of captioned images in 2 or 3 columns.                              |
| `embed`   | YouTube/Vimeo player from a URL; other URLs render as a link card.       |
| `model3d` | Interactive three.js viewer for a `.glb` from the media library, with optional auto-rotate. |

## Database adapters

The database is selected by `DATABASE_ADAPTER` in `.env`:

- `sqlite` (default) — a local file (`DATABASE_URL=file:./condoria.db`). In
  dev the schema is **pushed** automatically; no migration files involved.
- `postgres` — production (Neon). Schema changes are applied with **migration
  files** in `src/migrations`, run via `pnpm payload migrate`.

> [!WARNING]
> **SQLite and Postgres are not interchangeable.** The two adapters generate
> different SQL, and SQLite dev mode never writes migration files — so a
> project that works locally has, by default, **no migrations for Postgres at
> all**. Before your first production deploy you must test against a real Neon
> database:
>
> 1. In `.env`, set `DATABASE_ADAPTER=postgres` and `DATABASE_URL` to your Neon
>    connection string.
> 2. Run `pnpm payload migrate:create` to generate the initial migration into
>    `src/migrations/`.
> 3. Run `pnpm payload migrate` to apply it, then boot the app (`pnpm dev`) and
>    verify.
> 4. **Commit `src/migrations/`.** Repeat `migrate:create` after every future
>    schema change.
>
> Content does **not** transfer between adapters automatically — the SQLite
> file and the Postgres database are separate worlds. Re-run `pnpm seed`
> against Postgres (with strong `SEED_*` values) or migrate data yourself.

## Deploying to production (Vercel + Neon + Vercel Blob)

1. **Create a Neon project** (or any hosted Postgres). Copy the pooled
   connection string — this is your production `DATABASE_URL`.
2. **Create a Vercel Blob store** (Vercel dashboard → Storage → Blob) and copy
   its read-write token — this is `BLOB_READ_WRITE_TOKEN`. Media uploads are
   stored in Blob whenever the token is set; without it they land in `./media`,
   which **does not persist** on Vercel's ephemeral filesystem, so Blob is
   required in production.
3. **Import the repository into Vercel** (`vercel` CLI or the dashboard). The
   defaults for a Next.js project are correct; ensure the install command uses
   pnpm.
4. **Set the environment variables** on the Vercel project:

   | Variable                 | Value                                              |
   | ------------------------ | -------------------------------------------------- |
   | `PAYLOAD_SECRET`         | long random string (do not reuse the dev value)    |
   | `DATABASE_ADAPTER`       | `postgres`                                         |
   | `DATABASE_URL`           | the Neon connection string                         |
   | `BLOB_READ_WRITE_TOKEN`  | the Blob store token                               |
   | `NEXT_PUBLIC_SERVER_URL` | `https://condoria.vercel.app` (no trailing slash)  |

5. **Run the migrations against Neon** before (or as part of) the first
   deploy: locally, with the production values in your environment, run
   `pnpm payload migrate`. (Alternatively add it to the build step:
   `pnpm payload migrate && pnpm build`.) Migration files must already exist —
   see the warning above.
6. **Seed production**: locally, point `.env` at Neon
   (`DATABASE_ADAPTER=postgres`, `DATABASE_URL=…`, plus `BLOB_READ_WRITE_TOKEN`
   so the monument model and banners upload to Blob), set **strong**
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, and run `pnpm seed`. Change the
   demo account passwords immediately afterwards, or delete those accounts.
7. Deploy, sign in at `https://condoria.vercel.app/admin`, and raise the flag.

## Extending the CMS with custom blocks

Blocks are the intended extension point, and the 3D model block is the worked
example — every step below points at its real source. Adding your own block
takes five steps:

**1. Define the block schema** in `src/blocks/config.ts` and add it to the
`contentBlocks` array at the bottom of the file. This is the single source of
truth for both the admin UI form and the stored data:

```ts
export const Model3DBlock: Block = {
  slug: 'model3d',                    // becomes `blockType` in the stored JSON
  interfaceName: 'Model3DBlockType',  // generated TypeScript interface name
  fields: [
    { name: 'model', type: 'upload', relationTo: 'media' /* … */ },
    { name: 'caption', type: 'text' },
    { name: 'autoRotate', type: 'checkbox', defaultValue: true },
  ],
}

export const contentBlocks: Block[] = [/* …, */ Model3DBlock]
```

**2. Regenerate the types** so your block's interface appears in
`src/payload-types.ts`:

```sh
pnpm generate:types
```

**3. Build the React component** under `src/blocks/components/`. Components
receive the block's `fields` object as props. Write a **server component**
unless the block needs browser APIs. The Model3D block shows the pattern for
heavy client-side libraries (`src/blocks/components/Model3D/`): a server-safe
entry (`index.tsx`) renders the frame, a `'use client'` wrapper (`Client.tsx`)
loads the scene with `next/dynamic` and `ssr: false`, and all three.js imports
live only in `Scene.tsx` — so three.js never runs on the server and never
ships to pages without the block:

```tsx
// src/blocks/components/Model3D/Client.tsx
'use client'
import dynamic from 'next/dynamic'

const Scene = dynamic(() => import('./Scene'), { ssr: false })
```

**4. Register the renderer** in the converter map in
`src/components/RichText.tsx`, keyed by the block's slug:

```tsx
const converters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  blocks: {
    // …
    model3d: ({ node }) => <Model3DBlock {...node.fields} />,
    myblock: ({ node }) => <MyBlock {...node.fields} />,   // ← yours
  },
})
```

**5. Restart `pnpm dev`.** The admin editor UI for your block comes entirely
from the field schema in step 1 — no admin code needed.
(`pnpm generate:importmap` is only required when you add **custom admin
components**, which plain blocks do not.)

## Scripts

| Script                    | Does                                                        |
| ------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                | Start the dev server (site + admin) at `localhost:3000`.    |
| `pnpm build`              | Production build.                                           |
| `pnpm start`              | Serve the production build.                                 |
| `pnpm lint`               | ESLint.                                                     |
| `pnpm typecheck`          | `tsc --noEmit`.                                             |
| `pnpm seed`               | Seed the database with the demo nation (idempotent).        |
| `pnpm payload <cmd>`      | Payload CLI (`migrate`, `migrate:create`, `run <script>`…). |
| `pnpm generate:types`     | Regenerate `src/payload-types.ts` from the config.          |
| `pnpm generate:importmap` | Regenerate the admin import map (custom admin components).  |

## Project layout

```
src/
├─ app/
│  ├─ (frontend)/       # public site: home, /articles, /articles/[slug], /[slug]
│  └─ (payload)/        # Payload admin UI + REST/GraphQL API routes
├─ access/              # role helpers shared by all collections
├─ blocks/
│  ├─ config.ts         # the six content-block schemas (single source of truth)
│  └─ components/       # React renderers for each block (Model3D/ is client-only)
├─ collections/         # Articles, Pages, Media, Categories, Users
├─ components/
│  ├─ RichText.tsx      # Lexical → React converter map (register new blocks here)
│  └─ site/             # site chrome (header, footer, cards, …)
├─ fields/slug.ts       # shared auto-generated slug field
├─ lib/queries.ts       # typed, published-only data helpers for the frontend
├─ seed/                # pnpm seed (index.ts), verify.ts, lexical/image helpers, assets/
├─ migrations/          # Postgres migrations (created by migrate:create; commit these)
└─ payload.config.ts    # the Payload config: collections, adapters, storage
scripts/                # make-sample-glb.mjs — regenerates the monument .glb
media/                  # local dev uploads (gitignored; Blob in production)
```

---

Built for the Rulercraft roleplay community.
