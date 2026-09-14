import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTextTileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  text!: string;
}
