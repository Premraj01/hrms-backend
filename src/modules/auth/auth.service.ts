import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { ProfilePhotosService } from '../profile-photos/profile-photos.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private profilePhotosService: ProfilePhotosService,
  ) {}

  async register(registerDto: RegisterDto) {
    const {
      officeEmail,
      password,
      firstName,
      middleName,
      lastName,
      personalEmail,
      phone,
      joiningDate,
      designationId,
      departmentId,
      employeeCode,
      employmentType,
      dateOfBirth
    } = registerDto;

    // Check if employee already exists
    const existingEmployee = await this.prisma.employee.findUnique({
      where: { officeEmail },
    });

    if (existingEmployee) {
      throw new ConflictException('Employee with this office email already exists');
    }

    // Check if employee code already exists (if provided)
    if (employeeCode) {
      const existingCode = await this.prisma.employee.findUnique({
        where: { employeeCode },
      });

      if (existingCode) {
        throw new ConflictException('Employee with this employee code already exists');
      }
    }

    // Verify department exists (if provided)
    if (departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        throw new ConflictException('Department not found');
      }
    }

    // Verify designation exists (if provided)
    if (designationId) {
      const designation = await this.prisma.designation.findUnique({
        where: { id: designationId },
      });

      if (!designation) {
        throw new ConflictException('Designation not found');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create employee
    const employee = await this.prisma.employee.create({
      data: {
        officeEmail,
        password: hashedPassword,
        firstName,
        middleName,
        lastName,
        personalEmail,
        phone,
        joiningDate: new Date(joiningDate),
        designationId,
        departmentId,
        employeeCode,
        employmentType,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      include: {
        department: true,
        designation: true,
      },
    });

    // Assign default role (e.g., 'employee')
    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'employee' },
    });

    if (defaultRole) {
      await this.prisma.employeeRole.create({
        data: {
          employeeId: employee.id,
          roleId: defaultRole.id,
        },
      });
    }

    this.logger.log(`New employee registered: ${officeEmail}`);

    // Generate tokens
    const tokens = await this.generateTokens(employee.id, employee.officeEmail);

    return {
      employee: {
        id: employee.id,
        officeEmail: employee.officeEmail,
        firstName: employee.firstName,
        middleName: employee.middleName,
        lastName: employee.lastName,
        employeeCode: employee.employeeCode,
        department: employee.department,
        designation: employee.designation,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { officeEmail, password } = loginDto;

    // Find employee with roles and permissions
    const employee = await this.prisma.employee.findUnique({
      where: { officeEmail },
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
            middleName: true,
            lastName: true,
            officeEmail: true,
            employeeCode: true,
          },
        },
      },
    });

    if (!employee) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!employee.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (employee.status !== 'active') {
      throw new UnauthorizedException('Employee account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { lastLogin: new Date() },
    });

    this.logger.log(`Employee logged in: ${officeEmail}`);

    // Extract roles and permissions
    const roles = employee.employeeRoles.map((er) => er.role.name);
    const permissions = employee.employeeRoles.flatMap((er) =>
      er.role.rolePermissions.map((rp) => rp.permission.name),
    );

    // Generate tokens
    const tokens = await this.generateTokens(employee.id, employee.officeEmail);

    return {
      employee: {
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
        permissions: [...new Set(permissions)],
      },
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    // Verify refresh token exists and is not revoked
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { employee: true },
    });

    if (!storedToken || storedToken.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Verify JWT
    try {
      await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(
      storedToken.employee.id,
      storedToken.employee.officeEmail,
    );

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: new Date(),
        replacedBy: tokens.refreshToken,
      },
    });

    return tokens;
  }

  async logout(employeeId: string, refreshToken: string) {
    // Revoke the refresh token
    await this.prisma.refreshToken.updateMany({
      where: {
        employeeId,
        token: refreshToken,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Employee logged out: ${employeeId}`);

    return { message: 'Logged out successfully' };
  }

  async validateEmployee(officeEmail: string, password: string): Promise<any> {
    const employee = await this.prisma.employee.findUnique({
      where: { officeEmail },
    });

    if (employee && (await bcrypt.compare(password, employee.password))) {
      const { password, ...result } = employee;
      return result;
    }

    return null;
  }

  private async generateTokens(employeeId: string, officeEmail: string) {
    const payload = { sub: employeeId, email: officeEmail };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret') || 'default-secret-change-in-production',
        expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret') || 'default-refresh-secret-change-in-production',
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || '7d',
      }),
    ]);

    // Store refresh token in database
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn');
    if (!expiresIn) {
      throw new Error('jwt.refreshExpiresIn configuration is missing');
    }
    const expiresAt = this.calculateExpirationDate(expiresIn);

    await this.prisma.refreshToken.create({
      data: {
        employeeId,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private calculateExpirationDate(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new BadRequestException('Invalid expiration format');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        now.setSeconds(now.getSeconds() + value);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() + value);
        break;
      case 'h':
        now.setHours(now.getHours() + value);
        break;
      case 'd':
        now.setDate(now.getDate() + value);
        break;
    }

    return now;
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    // Find the employee
    const employee = await this.prisma.employee.findUnique({
      where: { id: userId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Store photo in MongoDB
    await this.profilePhotosService.uploadPhoto(userId, file);

    // Update employee profilePhoto field with the API path to fetch the photo
    const profilePhotoPath = `api/profile-photos/${userId}`;
    const updatedEmployee = await this.prisma.employee.update({
      where: { id: userId },
      data: { profilePhoto: profilePhotoPath },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        officeEmail: true,
        profilePhoto: true,
      },
    });

    this.logger.log(`Profile photo uploaded for employee: ${userId}`);

    return {
      message: 'Profile photo uploaded successfully',
      profilePhoto: updatedEmployee.profilePhoto,
    };
  }
}

