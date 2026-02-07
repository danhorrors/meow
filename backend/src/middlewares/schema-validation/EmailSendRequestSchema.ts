export const EmailSendRequestSchema = {
  type: 'object',
  properties: {
    to: {
      type: 'array',
      items: { type: 'string' },
    },
    subject: { type: 'string' },
    html: { type: 'string' },
    text: { type: 'string' },
    provider: { type: 'string' },
    entityType: { type: 'string' },
    entityId: { type: 'string' },
    campaignId: { type: 'string' },
  },
  required: ['to', 'subject'],
  additionalProperties: false,
};
