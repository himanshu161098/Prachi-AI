import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Administrative privileges required for this resource',
      code: 'ADMIN_ACCESS_REQUIRED'
    });
    return;
  }
  next();
}
