export const AppointmentUpdateRequestSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: 500 },
    description: { type: ['string', 'null'] },
    userId: { type: 'string' },
    leadId: { type: ['string', 'null'] },
    accountId: { type: ['string', 'null'] },
    cardId: { type: ['string', 'null'] },
    startAt: { type: 'string' },
    endAt: { type: 'string' },
    timeZone: { type: 'string' },
    status: { type: 'string' },
    googleEventId: { type: ['string', 'null'] },
    calendarLinked: { type: 'boolean' },
  },
  additionalProperties: false,
};
