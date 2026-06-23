import { Request, Response, NextFunction } from 'express';

// Augment Express Request to carry a request ID
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Honour a forwarded request ID from a gateway/proxy; otherwise generate one.
  const id =
    (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
