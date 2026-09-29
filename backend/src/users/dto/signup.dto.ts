import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @Matches(/^[a-z0-9_]{3,30}$/, {
    message:
      'Username must be 3–30 characters: lowercase letters, numbers, or underscores',
  })
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @IsString()
  @Length(8, 20, { message: 'Password must be 8–20 characters' })
  password!: string;
}
