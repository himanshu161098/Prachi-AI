import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { db } from '../database';
import { AuthenticatedUser } from '../types';
import { verifyToken } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token missing or invalid',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token, config.jwtSecret) as { id: string; email: string };
    
    // Look up user in database to ensure account is active and valid
    const user = db.prepare('SELECT id, email, phone, full_name, role FROM users WHERE id = ?').get(decoded.id) as {
      id: string;
      email: string;
      phone?: string;
      full_name: string;
      role: 'user' | 'admin';
    } | undefined;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User associated with token not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      full_name: user.full_name,
      role: user.role
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token expired or signature invalid',
      code: 'INVALID_TOKEN'
    });
  }
}
