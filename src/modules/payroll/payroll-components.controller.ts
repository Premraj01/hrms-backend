import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import {
  CreatePayrollComponentDto,
  UpdatePayrollComponentDto,
} from './dto/payroll-component.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('payroll/components')
export class PayrollComponentsController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @RequirePermissions('payroll.manage')
  list() {
    return this.payrollService.listComponents();
  }

  @Post()
  @RequirePermissions('payroll.manage')
  create(@Body() dto: CreatePayrollComponentDto) {
    return this.payrollService.createComponent(dto);
  }

  @Patch(':id')
  @RequirePermissions('payroll.manage')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePayrollComponentDto,
  ) {
    return this.payrollService.updateComponent(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('payroll.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.payrollService.deleteComponent(id);
  }
}
