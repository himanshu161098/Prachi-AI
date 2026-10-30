import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[Error]', {
    method: req.method,
    url: req.originalUrl,
    error: err.message || err,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    error: isProduction && statusCode === 500 ? 'InternalServerError' : (err.name || 'InternalServerError'),
    message: isProduction && statusCode === 500 ? 'An unexpected error occurred' : (err.message || 'An unexpected error occurred'),
    code: err.code || 'INTERNAL_ERROR'
  });
}
