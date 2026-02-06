export const DuplicateMergeRequestSchema = {
  type: 'object',
  properties: {
    primaryId: { type: 'string' },
    duplicateId: { type: 'string' },
    strategy: { type: 'string', enum: ['primary', 'duplicate', 'merge'] },
  },
  required: ['primaryId', 'duplicateId'],
  additionalProperties: false,
};
