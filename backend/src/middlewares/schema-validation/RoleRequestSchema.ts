export const RoleRequestSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string', maxLength: 200 },
    isDefault: { type: 'boolean' },
    permissions: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: {
          type: 'boolean',
        },
      },
    },
  },
  required: ['name', 'permissions'],
  additionalProperties: false,
};
