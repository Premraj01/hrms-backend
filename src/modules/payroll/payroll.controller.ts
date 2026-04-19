import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PayrollService } from './payroll.service';
import { UploadPayslipDto } from './dto/upload-payslip.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentUser,
  CurrentUserData,
} from '../../common/decorators/current-user.decorator';

@Controller('employees')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  private isAdmin(user: CurrentUserData): boolean {
    const roles = user.roles || [];
    return ['super_admin', 'admin', 'hr'].some((r) => roles.includes(r));
  }

  @Post(':id/payslips')
  @RequirePermissions('payroll.manage')
  @UseInterceptors(FileInterceptor('file'))
  uploadPayslip(
    @Param('id', ParseUUIDPipe) employeeId: string,
    @Body() dto: UploadPayslipDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.payrollService.uploadPayslip(employeeId, dto, file, user.id);
  }

  @Get(':id/payslips')
  @RequirePermissions('payroll.view')
  findPayslips(
    @Param('id', ParseUUIDPipe) employeeId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    if (!this.isAdmin(user) && employeeId !== user.id) {
      throw new ForbiddenException('You can only view your own payslips');
    }

    const yearNum = year ? parseInt(year, 10) : undefined;
    const monthNum = month ? parseInt(month, 10) : undefined;

    return this.payrollService.findPayslipsForEmployee(
      employeeId,
      yearNum,
      monthNum,
    );
  }

  @Get(':id/payslips/:payslipId/download')
  @RequirePermissions('payroll.view')
  async downloadPayslip(
    @Param('id', ParseUUIDPipe) employeeId: string,
    @Param('payslipId', ParseUUIDPipe) payslipId: string,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ) {
    if (!this.isAdmin(user) && employeeId !== user.id) {
      throw new ForbiddenException('You can only download your own payslips');
    }

    const file = await this.payrollService.getPayslipFile(payslipId);
    res.set({
      'Content-Type': file.mimetype,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': file.size,
    });
    res.send(file.data);
  }
}
