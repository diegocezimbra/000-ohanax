import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpsRedirectMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Check if in production and not HTTPS
    if (
      process.env.NODE_ENV === 'production' &&
      req.headers['x-forwarded-proto'] !== 'https' &&
      !req.secure
    ) {
      // Skip for health checks
      if (req.path === '/health' || req.path === '/live' || req.path === '/ready') {
        return next();
      }

      const httpsUrl = `https://${req.headers.host}${req.url}`;
      return res.redirect(301, httpsUrl);
    }
    next();
  }
}
