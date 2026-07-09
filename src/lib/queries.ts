import { getPayload, type PaginatedDocs } from 'payload'
import config from '@payload-config'

import type { Article, Page } from '@/payload-types'

/**
 * Read-side data access for the public frontend. Every helper returns only
 * PUBLISHED content and swallows database errors (returning empty results) so
 * that `next build` succeeds even before the database has been initialized.
 */

const getClient = () => getPayload({ config })

const PUBLISHED = { _status: { equals: 'published' as const } }

export const ARTICLES_PER_PAGE = 9

export async function getPinnedArticles(limit = 6): Promise<Article[]> {
  try {
    const payload = await getClient()
    const result = await payload.find({
      collection: 'articles',
      where: { and: [PUBLISHED, { pinned: { equals: true } }] },
      sort: '-publishedAt',
      limit,
      depth: 2,
    })
    return result.docs
  } catch {
    return []
  }
}

export async function getLatestArticles(limit = 6): Promise<Article[]> {
  try {
    const payload = await getClient()
    const result = await payload.find({
      collection: 'articles',
      where: { and: [PUBLISHED, { pinned: { not_equals: true } }] },
      sort: '-publishedAt',
      limit,
      depth: 2,
    })
    return result.docs
  } catch {
    return []
  }
}

export async function getArticlesPage(page = 1): Promise<PaginatedDocs<Article> | null> {
  try {
    const payload = await getClient()
    return await payload.find({
      collection: 'articles',
      where: PUBLISHED,
      sort: '-publishedAt',
      page,
      limit: ARTICLES_PER_PAGE,
      depth: 2,
    })
  } catch {
    return null
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  try {
    const payload = await getClient()
    const result = await payload.find({
      collection: 'articles',
      where: { and: [PUBLISHED, { slug: { equals: slug } }] },
      limit: 1,
      depth: 2,
    })
    return result.docs[0] ?? null
  } catch {
    return null
  }
}

export async function getAllArticleSlugs(): Promise<string[]> {
  try {
    const payload = await getClient()
    const result = await payload.find({
      collection: 'articles',
      where: PUBLISHED,
      limit: 200,
      select: { slug: true },
    })
    return result.docs.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug))
  } catch {
    return []
  }
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const payload = await getClient()
    const result = await payload.find({
      collection: 'pages',
      where: { and: [PUBLISHED, { slug: { equals: slug } }] },
      limit: 1,
      depth: 2,
    })
    return result.docs[0] ?? null
  } catch {
    return null
  }
}

export async function getAllPageSlugs(): Promise<string[]> {
  try {
    const payload = await getClient()
    const result = await payload.find({
      collection: 'pages',
      where: PUBLISHED,
      limit: 200,
      select: { slug: true },
    })
    return result.docs.map((doc) => doc.slug).filter((slug): slug is string => Boolean(slug))
  } catch {
    return []
  }
}
