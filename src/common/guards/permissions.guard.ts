import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.permissions) {
      this.logger.warn(`Access denied: User has no permissions assigned`);
      throw new ForbiddenException('You do not have the required permissions to access this resource');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      this.logger.warn(
        `Access denied: User ${user.email} attempted to access resource requiring permissions [${requiredPermissions.join(', ')}] but has [${user.permissions.join(', ')}]`,
      );
      throw new ForbiddenException(
        `You need the following permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

