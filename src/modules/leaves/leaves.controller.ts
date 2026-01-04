import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto, UpdateLeaveDto, ApproveLeaveDto, RejectLeaveDto } from './dto';
import { RequirePermissions, CurrentUser, CurrentUserData } from '../../common/decorators';

@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  @RequirePermissions('leave.create')
  create(
    @Body() createLeaveDto: CreateLeaveDto,
    @CurrentUser('id') employeeId: string,
  ) {
    return this.leavesService.create(employeeId, createLeaveDto);
  }

  @Get()
  @RequirePermissions('leave.read')
  findAll(@Query('status') status?: string) {
    return this.leavesService.findAll(status);
  }

  @Get('todays-leaves')
  @RequirePermissions('leave.read')
  findTodaysLeaves() {
    return this.leavesService.findTodaysLeaves();
  }

  @Get('my-leaves')
  @RequirePermissions('leave.read')
  findMyLeaves(@CurrentUser('id') employeeId: string) {
    return this.leavesService.findByEmployee(employeeId);
  }

  @Get(':id')
  @RequirePermissions('leave.read')
  findOne(@Param('id') id: string) {
    return this.leavesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('leave.update')
  update(@Param('id') id: string, @Body() updateLeaveDto: UpdateLeaveDto) {
    return this.leavesService.update(id, updateLeaveDto);
  }

  @Patch(':id/my-leave')
  updateMyLeave(
    @Param('id') id: string,
    @CurrentUser('id') employeeId: string,
    @Body() updateLeaveDto: UpdateLeaveDto,
  ) {
    return this.leavesService.updateMyLeave(id, employeeId, updateLeaveDto);
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() approveLeaveDto?: ApproveLeaveDto,
  ) {
    // Check if user is manager or has leave.update permission
    const canApprove = await this.leavesService.canApproveLeave(id, user.id, user.permissions);
    if (!canApprove) {
      throw new ForbiddenException('You do not have permission to approve this leave request. You must be the employee\'s manager or have leave.update permission.');
    }
    return this.leavesService.approve(id, user.id, approveLeaveDto);
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Body() rejectLeaveDto: RejectLeaveDto,
  ) {
    // Check if user is manager or has leave.update permission
    const canReject = await this.leavesService.canApproveLeave(id, user.id, user.permissions);
    if (!canReject) {
      throw new ForbiddenException('You do not have permission to reject this leave request. You must be the employee\'s manager or have leave.update permission.');
    }
    return this.leavesService.reject(id, user.id, rejectLeaveDto);
  }

  @Delete(':id')
  @RequirePermissions('leave.delete')
  remove(@Param('id') id: string) {
    return this.leavesService.delete(id);
  }

  @Delete(':id/withdraw')
  withdrawMyLeave(
    @Param('id') id: string,
    @CurrentUser('id') employeeId: string,
  ) {
    return this.leavesService.withdrawMyLeave(id, employeeId);
  }

  // Leave Balance endpoints
  @Get('balances/all')
  @RequirePermissions('leave.read')
  getAllLeaveBalances(@Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.leavesService.getAllLeaveBalances(yearNum);
  }

  @Get('balances/my-balances')
  @RequirePermissions('leave.read')
  getMyLeaveBalances(
    @CurrentUser('id') employeeId: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.leavesService.getLeaveBalances(employeeId, yearNum);
  }

  @Get('balances/:employeeId')
  @RequirePermissions('leave.read')
  getEmployeeLeaveBalances(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.leavesService.getLeaveBalances(employeeId, yearNum);
  }

  @Get('balances/:employeeId/:leaveType')
  @RequirePermissions('leave.read')
  getEmployeeLeaveBalanceByType(
    @Param('employeeId') employeeId: string,
    @Param('leaveType') leaveType: string,
    @Query('year') year?: string,
  ) {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.leavesService.getLeaveBalanceByType(employeeId, leaveType, yearNum);
  }
}

