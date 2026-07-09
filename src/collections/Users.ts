import type { CollectionConfig } from 'payload'

import { hasRole, isAdmin, isAdminField } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Administration',
  },
  auth: true,
  access: {
    create: isAdmin,
    delete: isAdmin,
    // Everyone can see who exists (needed for author bylines in the admin UI);
    // email stays visible only to admins and the account owner (field-level).
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => {
      if (hasRole(req.user, 'admin')) return true
      if (req.user) return { id: { equals: req.user.id } }
      return false
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'resident',
      options: [
        { label: 'Resident', value: 'resident' },
        { label: 'Editor', value: 'editor' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        // Only admins may grant or change roles.
        create: isAdminField,
        update: isAdminField,
      },
      saveToJWT: true,
      admin: {
        description:
          'Residents write drafts of their own articles. Editors publish anything. Admins manage users.',
      },
    },
  ],
}
