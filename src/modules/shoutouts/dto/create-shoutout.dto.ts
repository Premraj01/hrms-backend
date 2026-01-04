import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ShoutoutType } from '../schemas/shoutout.schema';

export class CreateShoutoutDto {
  @IsEnum(ShoutoutType)
  @IsNotEmpty()
  type: ShoutoutType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  // For employee shoutouts
  @IsString()
  @IsOptional()
  recipientId?: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsOptional()
  recipientPhoto?: string;

  // For team/project shoutouts
  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  projectName?: string;
}

