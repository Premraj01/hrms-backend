import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { PrismaModule } from '../../database/prisma/prisma.module';
import { ProfilePhotosModule } from '../profile-photos/profile-photos.module';

@Module({
  imports: [PrismaModule, ProfilePhotosModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}

