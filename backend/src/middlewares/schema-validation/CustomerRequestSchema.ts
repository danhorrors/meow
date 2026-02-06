export const CustomerRequestSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', maxLength: 500 },
    userId: { type: 'string' },
    attributes: {
      type: 'object',
      additionalProperties: {
        type: ['string', 'number', 'null', 'boolean'],
      },
    },
    contact: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        domain: { type: 'string' },
      },
    },
  },
  required: ['name'],
  additionalProperties: false,
};
