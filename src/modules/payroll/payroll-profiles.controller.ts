import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { UpsertPayrollProfileDto } from './dto/upsert-payroll-profile.dto';
import { GeneratePayslipsDto } from './dto/generate-payslips.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserData,
} from '../../common/decorators/current-user.decorator';

@Controller('payroll')
export class PayrollProfilesController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('profiles')
  @RequirePermissions('payroll.manage')
  getProfilesForEmployees(@Query('employeeIds') employeeIds?: string) {
    const ids = employeeIds
      ? employeeIds.split(',').filter((s) => s.length > 0)
      : [];
    return this.payrollService.getProfilesForEmployees(ids);
  }

  @Get('profiles/:employeeId')
  @RequirePermissions('payroll.manage')
  getProfile(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.payrollService.getProfile(employeeId);
  }

  @Post('profiles')
  @RequirePermissions('payroll.manage')
  upsertProfile(@Body() dto: UpsertPayrollProfileDto) {
    return this.payrollService.upsertProfile(dto);
  }

  @Post('generate')
  @RequirePermissions('payroll.manage')
  generatePayslips(
    @Body() dto: GeneratePayslipsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.payrollService.generateMonthlyPayslips(dto, user.id);
  }
}
