import { StatusCodes } from 'http-status-codes';
import { ApplicationError } from './ApplicationError.js';

export class PermissionDeniedError extends ApplicationError {
  constructor(description?: string) {
    super('PermissionDeniedError', StatusCodes.FORBIDDEN, description);
  }
}
