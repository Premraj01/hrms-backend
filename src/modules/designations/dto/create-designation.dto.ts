import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Max, MaxLength } from 'class-validator';

export class CreateDesignationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(10)
  level?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

