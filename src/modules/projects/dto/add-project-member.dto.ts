import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsDateString, IsInt, Min, Max, IsIn } from 'class-validator';

export class AddProjectMemberDto {
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsOptional()
  @IsIn(['project-manager', 'tech-lead', 'developer', 'qa', 'member'])
  role?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  allocation?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateProjectMemberDto {
  @IsString()
  @IsOptional()
  @IsIn(['project-manager', 'tech-lead', 'developer', 'qa', 'member'])
  role?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  allocation?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

