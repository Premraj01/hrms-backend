import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const user = (req as any).user;

    // Only audit authenticated requests
    if (!user) {
      return next();
    }

    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';

    // Determine action based on HTTP method
    const actionMap: Record<string, string> = {
      GET: 'READ',
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };

    const action = actionMap[method] || method;

    // Extract resource from URL (e.g., /api/users/123 -> users)
    const urlParts = originalUrl.split('/').filter(Boolean);
    const resource = urlParts[1] || 'unknown'; // Assuming /api/resource pattern

    res.on('finish', async () => {
      const { statusCode } = res;

      // Only log successful operations (2xx status codes)
      if (statusCode >= 200 && statusCode < 300) {
        try {
          await this.prisma.auditLog.create({
            data: {
              employeeId: user.id,
              action: `${action}_${resource.toUpperCase()}`,
              resource,
              details: {
                method,
                url: originalUrl,
                statusCode,
              },
              ipAddress: ip,
              userAgent,
            },
          });
        } catch (error) {
          // Silently fail - don't break the request if audit logging fails
          console.error('Failed to create audit log:', error);
        }
      }
    });

    next();
  }
}

