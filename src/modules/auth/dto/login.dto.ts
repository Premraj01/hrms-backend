import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid office email address' })
  officeEmail: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

