import { IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateShareDto {
  /** 可选：6-72 位访问密码，不传 = 免密分享 */
  @IsOptional()
  @MinLength(6, { message: '分享密码至少 6 位' })
  @MaxLength(72, { message: '分享密码过长' })
  password?: string;
}
