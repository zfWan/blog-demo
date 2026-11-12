import { IsBoolean } from 'class-validator';

export class UpdateShareDto {
  @IsBoolean({ message: 'enabled 必须为布尔值' })
  enabled!: boolean;
}
