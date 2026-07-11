import path from 'path'
import { fileURLToPath } from 'url'
import type { CollectionConfig } from 'payload'

import { isAuthenticated, isEditorOrAdmin } from '../access'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
    description: 'Images and 3D models (.glb). Alt text is required for accessibility.',
  },
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  upload: {
    staticDir: path.resolve(dirname, '../../media'),
    // application/octet-stream is allowed because some browsers/OSes upload
    // .glb files with that generic type instead of model/gltf-binary.
    // application/gzip (+ x-gzip) is required for Litematica .litematic files:
    // they are gzip-compressed NBT, so Payload's content sniffing reports gzip
    // regardless of the generic type the browser sends.
    mimeTypes: [
      'image/*',
      'model/gltf-binary',
      'application/octet-stream',
      'application/gzip',
      'application/x-gzip',
    ],
    imageSizes: [
      { name: 'thumbnail', width: 480 },
      { name: 'card', width: 960 },
      { name: 'hero', width: 1920 },
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: {
        description: 'Describe the image for screen readers, or the model for its caption.',
      },
    },
  ],
}
