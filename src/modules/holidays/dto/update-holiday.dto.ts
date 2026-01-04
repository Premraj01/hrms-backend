import { PartialType } from '@nestjs/mapped-types';
import { CreateHolidayDto } from './create-holiday.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateHolidayDto extends PartialType(CreateHolidayDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

