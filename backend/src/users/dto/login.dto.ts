import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  password!: string;
}
