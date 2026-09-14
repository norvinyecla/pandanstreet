import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateItemTileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  caption!: string;

  @IsIn(['red', 'yellow', 'green'])
  badgeColor!: 'red' | 'yellow' | 'green';
}
