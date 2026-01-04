import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import {
  Public,
  Roles,
  RequirePermissions,
  CurrentUser,
  CurrentUserData
} from '../../common/decorators';

/**
 * Example Employee Controller demonstrating authentication and authorization
 * 
 * This controller shows how to:
 * 1. Protect routes with JWT authentication (default)
 * 2. Use role-based access control
 * 3. Use permission-based access control
 * 4. Access current user information
 * 5. Create public routes
 */
@Controller('employees')
export class EmployeesController {

  // ============================================
  // PUBLIC ROUTES (No authentication required)
  // ============================================

  @Public()
  @Get('public/count')
  async getPublicEmployeeCount() {
    return {
      message: 'This endpoint is public - no authentication required',
      count: 100,
    };
  }

  // ============================================
  // PROTECTED ROUTES (Authentication required)
  // ============================================

  @Get()
  async getAllEmployees(@CurrentUser() user: CurrentUserData) {
    return {
      message: 'This endpoint requires authentication',
      requestedBy: user.email,
      employees: [],
    };
  }

  @Get(':id')
  async getEmployeeById(
    @Param('id') id: string,
    @CurrentUser('email') userEmail: string,
  ) {
    return {
      message: 'Get employee by ID',
      requestedBy: userEmail,
      employee: { id },
    };
  }

  // ============================================
  // ROLE-BASED ACCESS CONTROL
  // ============================================

  @Roles('hr', 'admin', 'super_admin')
  @Post()
  async createEmployee(
    @Body() createEmployeeDto: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return {
      message: 'Only HR, Admin, or Super Admin can create employees',
      createdBy: user.email,
      roles: user.roles,
      employee: createEmployeeDto,
    };
  }

  @Roles('admin', 'super_admin')
  @Delete(':id')
  async deleteEmployee(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return {
      message: 'Only Admin or Super Admin can delete employees',
      deletedBy: user.email,
      employeeId: id,
    };
  }

  // ============================================
  // PERMISSION-BASED ACCESS CONTROL
  // ============================================

  @RequirePermissions('employees.create')
  @Post('with-permission')
  async createEmployeeWithPermission(
    @Body() createEmployeeDto: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return {
      message: 'This endpoint requires "employees.create" permission',
      createdBy: user.email,
      permissions: user.permissions,
      employee: createEmployeeDto,
    };
  }

  @RequirePermissions('employees.update')
  @Put(':id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() updateEmployeeDto: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return {
      message: 'This endpoint requires "employees.update" permission',
      updatedBy: user.email,
      employeeId: id,
      updates: updateEmployeeDto,
    };
  }

  // ============================================
  // MULTIPLE PERMISSIONS (ALL REQUIRED)
  // ============================================

  @RequirePermissions('employees.read', 'payroll.read')
  @Get(':id/payroll')
  async getEmployeePayroll(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return {
      message: 'This endpoint requires BOTH "employees.read" AND "payroll.read" permissions',
      requestedBy: user.email,
      permissions: user.permissions,
      employeeId: id,
      payroll: {},
    };
  }

  // ============================================
  // COMBINING ROLES AND PERMISSIONS
  // ============================================

  @Roles('hr', 'admin')
  @RequirePermissions('employees.delete')
  @Delete(':id/permanent')
  async permanentlyDeleteEmployee(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return {
      message: 'This endpoint requires HR or Admin role AND "employees.delete" permission',
      deletedBy: user.email,
      roles: user.roles,
      permissions: user.permissions,
      employeeId: id,
    };
  }
}

