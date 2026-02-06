export const BookLeadRequestSchema = {
  type: 'object',
  properties: {
    startAt: { type: 'string' },
    durationMinutes: { type: 'number' },
    timeZone: { type: 'string' },
    summary: { type: 'string' },
    description: { type: 'string' },
    attendees: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['startAt', 'durationMinutes'],
  additionalProperties: false,
};
