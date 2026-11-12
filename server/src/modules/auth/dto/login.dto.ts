import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  /** 用户名或邮箱 */
  @IsNotEmpty({ message: '请输入账号' })
  account!: string;

  @MinLength(1, { message: '请输入密码' })
  @MaxLength(72)
  password!: string;
}
