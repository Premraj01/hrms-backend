import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      this.logger.warn(`Access denied: User has no roles assigned`);
      throw new ForbiddenException('You do not have the required roles to access this resource');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `Access denied: User ${user.email} attempted to access resource requiring roles [${requiredRoles.join(', ')}] but has [${user.roles.join(', ')}]`,
      );
      throw new ForbiddenException(
        `You need one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

