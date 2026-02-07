export const CampaignRequestSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string', maxLength: 200 },
    status: { type: 'string' },
    audience: {
      type: 'object',
      properties: {
        entity: { type: 'string' },
        match: { type: 'string' },
        conditions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              operator: { type: 'string' },
              value: { type: ['string', 'null'] },
            },
            required: ['field', 'operator'],
          },
        },
      },
      required: ['entity', 'match', 'conditions'],
    },
    template: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        html: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['subject', 'html'],
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          delayDays: { type: 'number' },
          template: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              html: { type: 'string' },
              text: { type: 'string' },
            },
            required: ['subject', 'html'],
          },
        },
        required: ['name', 'delayDays', 'template'],
      },
    },
    schedule: {
      type: 'object',
      properties: {
        sendAt: { type: 'string' },
        timeZone: { type: 'string' },
        recurring: {
          type: 'object',
          properties: {
            interval: { type: 'string' },
          },
          required: ['interval'],
        },
      },
    },
  },
  required: ['name', 'audience', 'template'],
  additionalProperties: false,
};
