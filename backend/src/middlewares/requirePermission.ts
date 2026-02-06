import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { PermissionHelper } from '../helpers/PermissionHelper.js';

export const requirePermission =
  (module: string, action: string) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await PermissionHelper.ensurePermission(req.jwt.user, module, action);
      return next();
    } catch (error) {
      return next(error);
    }
  };
