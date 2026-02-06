import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';

const parseDatabaseName = (uri?: string): string | null => {
  if (!uri) return null;

  try {
    const parsed = new URL(uri);
    const name = parsed.pathname?.replace('/', '') ?? '';
    return name.length > 0 ? name : null;
  } catch (error) {
    return null;
  }
};

export const StackInfoController = {
  get: (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const dbName = parseDatabaseName(process.env.MONGODB_URI);

      const payload = {
        nodeEnv: process.env.NODE_ENV ?? 'unknown',
        port: process.env.PORT ?? '9000',
        ipAddress: process.env.IP_ADDRESS ?? '127.0.0.1',
        logLevel: process.env.LOG_LEVEL ?? 'info',
        dbName: dbName ?? 'unknown',
        processManager: process.env.PROCESS_MANAGER ?? 'unknown',
        publicDomain: process.env.PUBLIC_DOMAIN ?? 'unknown',
      };

      res.status(200).json(payload);
    } catch (error) {
      next(error);
    }
  },
};
