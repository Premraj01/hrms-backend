import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
  message: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}

