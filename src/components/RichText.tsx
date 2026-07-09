import type {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
} from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import {
  type JSXConvertersFunction,
  LinkJSXConverter,
  RichText as PayloadRichText,
} from '@payloadcms/richtext-lexical/react'

import type {
  Article,
  CalloutBlockType,
  EmbedBlockType,
  GalleryBlockType,
  ImageBlockType,
  Model3DBlockType,
  Page,
  QuoteBlockType,
} from '@/payload-types'

import { CalloutBlock } from '@/blocks/components/Callout'
import { EmbedBlock } from '@/blocks/components/Embed'
import { GalleryBlock } from '@/blocks/components/Gallery'
import { ImageBlock } from '@/blocks/components/Image'
import { Model3DBlock } from '@/blocks/components/Model3D'
import { QuoteBlock } from '@/blocks/components/Quote'
import { cn } from '@/blocks/components/shared'

type ContentBlocks =
  | CalloutBlockType
  | EmbedBlockType
  | GalleryBlockType
  | ImageBlockType
  | Model3DBlockType
  | QuoteBlockType

type NodeTypes = DefaultNodeTypes | SerializedBlockNode<ContentBlocks>

/** Maps internal Lexical links (depth-populated docs) to frontend routes. */
function internalDocToHref({ linkNode }: { linkNode: SerializedLinkNode }): string {
  const doc = linkNode.fields.doc
  if (!doc || !doc.value || typeof doc.value !== 'object') return '#'
  const slug = typeof doc.value.slug === 'string' && doc.value.slug.length > 0 ? doc.value.slug : null
  if (!slug) return '#'
  if (doc.relationTo === 'articles') return `/articles/${slug}`
  if (doc.relationTo === 'pages') return `/${slug}`
  return '#'
}

const converters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  blocks: {
    callout: ({ node }) => <CalloutBlock {...node.fields} />,
    embed: ({ node }) => <EmbedBlock {...node.fields} />,
    gallery: ({ node }) => <GalleryBlock {...node.fields} />,
    image: ({ node }) => <ImageBlock {...node.fields} />,
    model3d: ({ node }) => <Model3DBlock {...node.fields} />,
    quote: ({ node }) => <QuoteBlock {...node.fields} />,
  },
  // Nodes/blocks without a converter render nothing instead of crashing or
  // emitting the library's "unknown node" chip.
  unknown: () => null,
})

/**
 * Gazette typography for the default Lexical nodes.
 *
 * The default JSX converters emit classless tags (p, h1–h6, a, blockquote,
 * hr, img), while every element rendered by our block components carries a
 * class — so scoping these selectors with `:not([class])` styles the prose
 * without leaking into the blocks. Lists are the exception: the library puts
 * `list-*` classes on ul/ol, so those are targeted directly.
 */
const TYPOGRAPHY = cn(
  // Headings — display serif, deep pine.
  '[&_:is(h1,h2,h3,h4,h5,h6):not([class])]:font-display',
  '[&_:is(h1,h2,h3,h4,h5,h6):not([class])]:font-semibold',
  '[&_:is(h1,h2,h3,h4,h5,h6):not([class])]:tracking-tight',
  '[&_:is(h1,h2,h3,h4,h5,h6):not([class])]:leading-tight',
  '[&_:is(h1,h2,h3,h4,h5,h6):not([class])]:text-pine-900',
  '[&_h1:not([class])]:text-4xl',
  '[&_h2:not([class])]:text-3xl',
  '[&_h3:not([class])]:text-2xl',
  '[&_h4:not([class])]:text-xl',
  '[&_:is(h5,h6):not([class])]:text-lg',
  '[&_:is(h1,h2):not([class])]:mt-10',
  '[&_:is(h1,h2):not([class])]:mb-4',
  '[&_:is(h3,h4):not([class])]:mt-8',
  '[&_:is(h3,h4):not([class])]:mb-3',
  '[&_:is(h5,h6):not([class])]:mt-6',
  '[&_:is(h5,h6):not([class])]:mb-2',
  // Body copy.
  '[&_p:not([class])]:my-5',
  '[&_p:not([class])]:leading-relaxed',
  // Links — pine with a gold underline.
  '[&_a:not([class])]:text-pine-700',
  '[&_a:not([class])]:underline',
  '[&_a:not([class])]:decoration-gold-400',
  '[&_a:not([class])]:underline-offset-2',
  '[&_a:not([class]):hover]:text-pine-800',
  '[&_a:not([class]):hover]:decoration-gold-600',
  // Native blockquotes — quiet gold left rule.
  '[&_blockquote:not([class])]:my-6',
  '[&_blockquote:not([class])]:border-l-2',
  '[&_blockquote:not([class])]:border-gold-400',
  '[&_blockquote:not([class])]:pl-5',
  '[&_blockquote:not([class])]:text-ink-700',
  '[&_blockquote:not([class])]:italic',
  // Lists — proper markers and indentation, gold markers.
  '[&_ul.list-bullet]:my-5',
  '[&_ul.list-bullet]:list-disc',
  '[&_ul.list-bullet]:pl-6',
  '[&_ol.list-number]:my-5',
  '[&_ol.list-number]:list-decimal',
  '[&_ol.list-number]:pl-6',
  '[&_li_ul.list-bullet]:my-1',
  '[&_li_ol.list-number]:my-1',
  '[&_li]:my-1.5',
  '[&_li::marker]:text-gold-600',
  // Horizontal rules — a short centered gold divider.
  '[&_hr:not([class])]:mx-auto',
  '[&_hr:not([class])]:my-10',
  '[&_hr:not([class])]:w-24',
  '[&_hr:not([class])]:border-gold-400',
  // Inline code.
  '[&_code:not([class])]:bg-parchment-200',
  '[&_code:not([class])]:px-1',
  '[&_code:not([class])]:py-0.5',
  '[&_code:not([class])]:text-[0.9em]',
  // Bare upload nodes (default converter) — framed like plates.
  '[&_img:not([class])]:h-auto',
  '[&_img:not([class])]:max-w-full',
  '[&_img:not([class])]:border',
  '[&_img:not([class])]:border-parchment-300',
  '[&_:is(img,picture):not([class])]:my-8',
  '[&_picture_img:not([class])]:my-0',
  // Trim the column's outer margins.
  '[&>*:first-child]:mt-0!',
  '[&>*:last-child]:mb-0!',
)

type RichTextProps = {
  className?: string
  data: Article['content'] | Page['content'] | null | undefined
}

/**
 * Renders Lexical rich text content, including all six custom blocks
 * (callout, quote, image, gallery, embed, model3d). Server-safe: the only
 * client code is behind the Model3D block's dynamic import.
 */
export function RichText({ data, className }: RichTextProps) {
  if (!data?.root?.children?.length) return null

  return (
    <div className={cn(TYPOGRAPHY, className)}>
      <PayloadRichText
        converters={converters}
        data={data as SerializedEditorState}
        disableContainer
      />
    </div>
  )
}
