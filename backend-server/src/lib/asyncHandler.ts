import { Request, Response, NextFunction } from 'express';

type ExpressHandler = (req: Request, res: Response, next?: NextFunction) => unknown;

export function clientError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong';
}

export function asyncHandler(fn: ExpressHandler) {
  return (req: Request, res: Response, next?: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      if (res.headersSent) {
        next?.(error);
        return;
      }
      res.status(500).json({ error: clientError(error) });
    });
  };
}

export function notFound(res: Response, label: string) {
  return res.status(404).json({ error: `${label} not found` });
}
