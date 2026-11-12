import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (exists) {
      throw new ConflictException(
        exists.email === dto.email ? '该邮箱已注册' : '该用户名已被占用',
      );
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      },
    });
    return { id: user.id, email: user.email, username: user.username };
  }

  /** 校验账号（用户名或邮箱）与密码，通过则签发 JWT */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.account }, { email: dto.account }] },
    });
    // 统一 401，不区分“账号不存在/密码错误”
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const token = await this.jwt.signAsync({ sub: user.id });
    return { token, user: { id: user.id, email: user.email, username: user.username } };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return { id: user.id, email: user.email, username: user.username };
  }
}
