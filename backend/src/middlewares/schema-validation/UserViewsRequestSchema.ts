export const UserViewsRequestSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    label: { type: 'string' },
    view: { type: 'object' },
  },
  required: ['name', 'label', 'view'],
  additionalProperties: false,
};
