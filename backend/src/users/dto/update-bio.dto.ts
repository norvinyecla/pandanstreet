import { IsString, MaxLength } from 'class-validator';

export class UpdateBioDto {
  @IsString()
  @MaxLength(140)
  bio!: string;
}
