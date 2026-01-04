import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { PolicyCategory } from './create-policy.dto';

export class UpdatePolicyDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PolicyCategory)
  @IsOptional()
  category?: PolicyCategory;

  @IsString()
  @IsOptional()
  version?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

