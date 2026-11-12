import { IsEmail, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  email!: string;

  @Matches(/^[a-zA-Z0-9_-]{2,20}$/, { message: '用户名需为 2-20 位字母、数字、下划线或中划线' })
  username!: string;

  @MinLength(8, { message: '密码至少 8 位' })
  @MaxLength(72, { message: '密码过长' })
  password!: string;
}
