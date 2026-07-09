import type { Block } from 'payload'

/**
 * Lexical content blocks — the shared contract between the CMS schema and the
 * frontend renderer in `src/components/RichText.tsx`.
 *
 * Each block's `slug` is its `blockType` in the stored Lexical JSON. Frontend
 * components receive the block's `fields` object as props.
 *
 * To add a new block: see the "Extending the CMS with custom blocks" section
 * of the README.
 */

export const CalloutBlock: Block = {
  slug: 'callout',
  interfaceName: 'CalloutBlockType',
  labels: { singular: 'Callout', plural: 'Callouts' },
  fields: [
    {
      name: 'style',
      type: 'select',
      required: true,
      defaultValue: 'note',
      options: [
        { label: 'Note', value: 'note' },
        { label: 'Decree', value: 'decree' },
        { label: 'Warning', value: 'warning' },
      ],
    },
    { name: 'title', type: 'text' },
    { name: 'body', type: 'textarea', required: true },
  ],
}

export const QuoteBlock: Block = {
  slug: 'quote',
  interfaceName: 'QuoteBlockType',
  labels: { singular: 'Quote', plural: 'Quotes' },
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'attribution', type: 'text' },
    {
      name: 'attributionTitle',
      type: 'text',
      admin: { description: 'e.g. "First Consul of Condoria"' },
    },
  ],
}

export const ImageBlock: Block = {
  slug: 'image',
  interfaceName: 'ImageBlockType',
  labels: { singular: 'Image', plural: 'Images' },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: { mimeType: { contains: 'image' } },
    },
    { name: 'caption', type: 'text' },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'standard',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Wide', value: 'wide' },
      ],
    },
  ],
}

export const GalleryBlock: Block = {
  slug: 'gallery',
  interfaceName: 'GalleryBlockType',
  labels: { singular: 'Gallery', plural: 'Galleries' },
  fields: [
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Image', plural: 'Images' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          filterOptions: { mimeType: { contains: 'image' } },
        },
        { name: 'caption', type: 'text' },
      ],
    },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '2 columns', value: '2' },
        { label: '3 columns', value: '3' },
      ],
    },
  ],
}

export const EmbedBlock: Block = {
  slug: 'embed',
  interfaceName: 'EmbedBlockType',
  labels: { singular: 'Embed', plural: 'Embeds' },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: { description: 'YouTube or Vimeo URL; other URLs render as a link card.' },
    },
    { name: 'caption', type: 'text' },
  ],
}

export const Model3DBlock: Block = {
  slug: 'model3d',
  interfaceName: 'Model3DBlockType',
  labels: { singular: '3D Model', plural: '3D Models' },
  admin: {
    disableBlockName: false,
  },
  fields: [
    {
      name: 'model',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'A .glb file from the media library. Leave empty to show the placeholder monument.',
      },
      filterOptions: {
        or: [
          { mimeType: { contains: 'gltf' } },
          { mimeType: { equals: 'application/octet-stream' } },
        ],
      },
    },
    { name: 'caption', type: 'text' },
    {
      name: 'autoRotate',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Slowly rotate the model until the visitor interacts.' },
    },
  ],
}

/** Every block available in article/page content, in menu order. */
export const contentBlocks: Block[] = [
  CalloutBlock,
  QuoteBlock,
  ImageBlock,
  GalleryBlock,
  EmbedBlock,
  Model3DBlock,
]
