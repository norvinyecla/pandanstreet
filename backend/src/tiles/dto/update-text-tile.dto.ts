import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateTextTileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  text!: string;
}
