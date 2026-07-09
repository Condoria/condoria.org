import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import sharp from 'sharp'

import { Articles } from './collections/Articles'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (process.env.NODE_ENV === 'production' && !process.env.PAYLOAD_SECRET) {
  throw new Error('PAYLOAD_SECRET must be set in production.')
}

/**
 * Database adapter, selected via DATABASE_ADAPTER:
 *  - "sqlite" (default): file-based local dev database. Schema is pushed
 *    automatically in dev — no migrations needed.
 *  - "postgres": production database (Neon). Run `pnpm payload migrate` —
 *    see the README for the SQLite→Postgres caveat.
 */
const db =
  process.env.DATABASE_ADAPTER === 'postgres'
    ? postgresAdapter({
        pool: {
          connectionString: process.env.DATABASE_URL || '',
        },
        migrationDir: path.resolve(dirname, 'migrations'),
      })
    : sqliteAdapter({
        client: {
          url: process.env.DATABASE_URL || 'file:./condoria.db',
        },
      })

export default buildConfig({
  // NO email adapter is configured — deliberately. Payload falls back to its
  // consoleEmailAdapter: password-reset and other emails are written to the
  // server console and NEVER sent. The nation does not own a mail domain
  // (seed accounts use the reserved, non-routable condoria.example). If you
  // ever add a real adapter, change every user email to a domain you own first.
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' · Condoria CMS',
    },
    avatar: 'default',
  },
  collections: [Articles, Pages, Media, Categories, Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'condoria-insecure-dev-secret',
  // serverURL is intentionally NOT set: media URLs stay relative
  // (/api/media/file/…), which next/image's localPatterns matches and which
  // survive domain changes between dev and production.
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db,
  sharp,
  plugins: [
    // File storage: local ./media directory unless a Vercel Blob token is set.
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? [
          vercelBlobStorage({
            collections: { media: true },
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }),
        ]
      : []),
  ],
})
