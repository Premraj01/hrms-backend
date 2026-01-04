import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
      include: {
        employeeRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        department: true,
        designation: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
          },
        },
      },
    });

    if (!employee || !employee.isActive) {
      throw new UnauthorizedException('Employee not found or inactive');
    }

    if (employee.status !== 'active') {
      throw new UnauthorizedException('Employee account is not active');
    }

    // Extract roles and permissions
    const roles = employee.employeeRoles.map((er) => er.role.name);
    const permissions = employee.employeeRoles.flatMap((er) =>
      er.role.rolePermissions.map((rp) => rp.permission.name),
    );

    // Remove duplicates from permissions
    const uniquePermissions = [...new Set(permissions)];

    return {
      id: employee.id,
      email: employee.officeEmail,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      profilePhoto: employee.profilePhoto,
      department: employee.department,
      designation: employee.designation,
      manager: employee.manager ? {
        id: employee.manager.id,
        firstName: employee.manager.firstName,
        lastName: employee.manager.lastName,
        email: employee.manager.officeEmail,
        employeeCode: employee.manager.employeeCode,
      } : null,
      roles,
      permissions: uniquePermissions,
    };
  }
}

