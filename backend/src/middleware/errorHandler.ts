import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[Error]', {
    method: req.method,
    url: req.originalUrl,
    error: err.message || err,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    code: err.code || 'INTERNAL_ERROR'
  });
}
