import path from 'path'
import { fileURLToPath } from 'url'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import {
  aboutContent,
  charterContent,
  excerpts,
  foundingDayContent,
  lanternFestivalContent,
  monumentContent,
  northRoadContent,
} from './content'
import { generateBannerImages } from './images'

/**
 * Condoria seed script — creates the demo nation: users, categories, media
 * (including the National Monument .glb), articles and the About page.
 *
 *   pnpm seed        (= payload run src/seed/index.ts)
 *
 * Idempotent: if the seed admin user already exists, it exits without writing.
 * Delete condoria.db (local SQLite dev) to reseed from scratch.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.resolve(here, 'assets')

// Accounts are username-only: no email addresses exist anywhere in the system
// (the nation owns no mail domain, and no email adapter is configured).
const DEFAULT_ADMIN_USERNAME = 'chancellor'
const DEFAULT_ADMIN_PASSWORD = 'condoria-dev-2026'

/** Demo accounts (documented in the README — change these passwords!). */
const EDITOR = {
  username: 'keeper',
  password: 'condoria-editor-2026',
  name: 'Keeper of Records',
} as const
const RESIDENT = {
  username: 'resident',
  password: 'condoria-resident-2026',
  name: 'A Resident of Condoria',
} as const

const log = (message: string) => console.log(`[seed] ${message}`)

async function seed(payload: Payload): Promise<void> {
  // ── Credentials ───────────────────────────────────────────────────────────
  let adminUsername = process.env.SEED_ADMIN_USERNAME
  let adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminUsername || !adminPassword) {
    console.warn(
      '\n[seed] WARNING: SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD are not set in\n' +
        `[seed] the environment. Falling back to the well-known dev defaults\n` +
        `[seed] (${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}).\n` +
        '[seed] NEVER seed a production database without setting strong values.\n',
    )
    adminUsername = adminUsername || DEFAULT_ADMIN_USERNAME
    adminPassword = adminPassword || DEFAULT_ADMIN_PASSWORD
  }

  // ── Idempotency check ─────────────────────────────────────────────────────
  const existing = await payload.find({
    collection: 'users',
    where: { username: { equals: adminUsername } },
    limit: 1,
  })
  if (existing.totalDocs > 0) {
    log('Already seeded — nothing to do. (Delete condoria.db to reseed locally.)')
    return
  }

  log('Seeding the Nation of Condoria…')

  // ── 1. Users ──────────────────────────────────────────────────────────────
  const admin = await payload.create({
    collection: 'users',
    data: {
      name: 'Chancellor of Condoria',
      username: adminUsername,
      password: adminPassword,
      role: 'admin',
    },
  })
  log(`user    admin     ${admin.username} (id ${admin.id})`)

  const editor = await payload.create({
    collection: 'users',
    data: {
      name: EDITOR.name,
      username: EDITOR.username,
      password: EDITOR.password,
      role: 'editor',
    },
  })
  log(`user    editor    ${editor.username} (id ${editor.id})`)

  const resident = await payload.create({
    collection: 'users',
    data: {
      name: RESIDENT.name,
      username: RESIDENT.username,
      password: RESIDENT.password,
      role: 'resident',
    },
  })
  log(`user    resident  ${resident.username} (id ${resident.id})`)

  // ── 2. Categories (slug auto-generates from name) ─────────────────────────
  const categories: Record<string, number> = {}
  for (const name of ['Decrees', 'Gazette', 'Culture', 'Public Works']) {
    const category = await payload.create({ collection: 'categories', data: { name } })
    categories[name] = category.id
    log(`category ${category.slug}  (id ${category.id})`)
  }

  // ── 3. Media ──────────────────────────────────────────────────────────────
  const monument = await payload.create({
    collection: 'media',
    data: { alt: 'The National Monument of Condoria — stone obelisk with gilded pyramidion' },
    filePath: path.join(assetsDir, 'condoria-monument.glb'),
  })
  log(`media   ${monument.filename}  (id ${monument.id}, ${monument.mimeType})`)

  log('generating banner images with sharp…')
  const banners = await generateBannerImages(assetsDir)

  const foundingBanner = await payload.create({
    collection: 'media',
    data: { alt: banners.foundingDay.alt },
    filePath: banners.foundingDay.filePath,
  })
  log(`media   ${foundingBanner.filename}  (id ${foundingBanner.id}, ${foundingBanner.mimeType})`)

  const roadBanner = await payload.create({
    collection: 'media',
    data: { alt: banners.northRoad.alt },
    filePath: banners.northRoad.filePath,
  })
  log(`media   ${roadBanner.filename}  (id ${roadBanner.id}, ${roadBanner.mimeType})`)

  // ── 4. Articles ───────────────────────────────────────────────────────────
  const charter = await payload.create({
    collection: 'articles',
    data: {
      title: 'The Charter of Condoria',
      excerpt: excerpts.charter,
      content: charterContent(),
      author: admin.id,
      category: categories['Decrees'],
      pinned: true,
      publishedAt: '2025-11-01T09:00:00.000Z',
      _status: 'published',
    },
  })
  log(`article ${charter.slug}  (pinned, published)`)

  const monumentArticle = await payload.create({
    collection: 'articles',
    data: {
      title: 'The National Monument, Restored',
      excerpt: excerpts.monument,
      content: monumentContent(monument.id),
      author: editor.id,
      category: categories['Culture'],
      publishedAt: '2026-07-02T14:00:00.000Z',
      _status: 'published',
    },
  })
  log(`article ${monumentArticle.slug}  (published, 3D model block)`)

  const foundingDay = await payload.create({
    collection: 'articles',
    data: {
      title: 'Founding Day: How Condoria Came To Be',
      excerpt: excerpts.foundingDay,
      content: foundingDayContent(foundingBanner.id),
      author: editor.id,
      category: categories['Gazette'],
      featuredImage: foundingBanner.id,
      publishedAt: '2026-06-12T08:00:00.000Z',
      _status: 'published',
    },
  })
  log(`article ${foundingDay.slug}  (published)`)

  const northRoad = await payload.create({
    collection: 'articles',
    data: {
      title: 'The Great North Road Opens',
      excerpt: excerpts.northRoad,
      content: northRoadContent(foundingBanner.id, roadBanner.id),
      author: admin.id,
      category: categories['Public Works'],
      featuredImage: roadBanner.id,
      publishedAt: '2026-06-28T10:30:00.000Z',
      _status: 'published',
    },
  })
  log(`article ${northRoad.slug}  (published)`)

  const lanternFestival = await payload.create({
    collection: 'articles',
    draft: true,
    data: {
      title: 'Proposal: Lantern Festival on the South Quay',
      excerpt: excerpts.lanternFestival,
      content: lanternFestivalContent(),
      author: resident.id,
      category: categories['Culture'],
      _status: 'draft',
    },
  })
  log(`article ${lanternFestival.slug}  (DRAFT by resident)`)

  // ── 5. Pages ──────────────────────────────────────────────────────────────
  const about = await payload.create({
    collection: 'pages',
    data: {
      title: 'About Condoria',
      slug: 'about',
      content: aboutContent(),
      _status: 'published',
    },
  })
  log(`page    ${about.slug}  (published)`)

  // ── Summary ───────────────────────────────────────────────────────────────
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  console.log(`
[seed] ────────────────────────────────────────────────────────────
[seed] The Nation of Condoria is seeded.
[seed]   users       3  (1 admin, 1 editor, 1 resident)
[seed]   categories  4  (Decrees, Gazette, Culture, Public Works)
[seed]   media       3  (monument .glb → ${monument.mimeType}, 2 banners)
[seed]   articles    5  (4 published — one with the 3D model block — 1 resident draft)
[seed]   pages       1  (About Condoria)
[seed]
[seed] Sign in:  ${serverURL}/admin
[seed]   username: ${adminUsername}  (password: your SEED_ADMIN_PASSWORD)
[seed]   Demo accounts (change these passwords!): ${EDITOR.username}, ${RESIDENT.username}
[seed]
[seed] Visit:    ${serverURL}/           — the national gazette
[seed]           ${serverURL}/articles   — all published articles
[seed]           ${serverURL}/about      — the standing page
[seed] ────────────────────────────────────────────────────────────
`)
}

try {
  const payload = await getPayload({ config })
  await seed(payload)
  process.exit(0)
} catch (error) {
  console.error('[seed] FAILED:', error)
  process.exit(1)
}
