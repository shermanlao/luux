import { Request, Response, NextFunction } from 'express';
import { UniqueConstraintError, ValidationError } from 'sequelize';

type ExpressHandler = (req: Request, res: Response, next?: NextFunction) => unknown;

function fieldError(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const named = error as {
    name?: string;
    errors?: Array<{ message?: string; path?: string; validatorKey?: string }>;
  };
  if (!named.name?.startsWith('Sequelize') || !Array.isArray(named.errors)) return '';
  const lines = named.errors
    .map((item) => {
      const column = item.path || 'A field';
      if (item.validatorKey === 'len') return `${column} is too long.`;
      if (item.validatorKey === 'not_unique' || String(item.message || '').includes('must be unique')) {
        return `${column} is already used.`;
      }
      const message = String(item.message || '').trim();
      if (!message || message === 'Validation error') return '';
      return message;
    })
    .filter(Boolean);
  return lines.join(' ');
}

export function clientError(error: unknown): string {
  const fields = fieldError(error);
  if (fields) return fields;
  if (error instanceof Error && error.message && error.message !== 'Validation error') return error.message;
  return 'Something went wrong';
}

export function asyncHandler(fn: ExpressHandler) {
  return (req: Request, res: Response, next?: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      if (res.headersSent) {
        next?.(error);
        return;
      }
      const status = error instanceof UniqueConstraintError ? 409 : error instanceof ValidationError || (error instanceof Error && error.name === 'MailRequestError') ? 400 : 500;
      res.status(status).json({ error: clientError(error) });
    });
  };
}

export function notFound(res: Response, label: string) {
  return res.status(404).json({ error: `${label} not found` });
}
