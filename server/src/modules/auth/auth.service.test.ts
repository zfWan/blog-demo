import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma.service';

const prismaMock = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: { signAsync: vi.fn().mockResolvedValue('jwt-token') } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    const dto = { email: 'a@b.com', username: 'alice', password: 'password123' };

    it('注册成功：密码被哈希存储，不返回明文', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockImplementation(async ({ data }: any) => data);

      const user = await service.register(dto);
      expect(user.username).toBe('alice');
      expect(user.passwordHash).not.toBe('password123');
    });

    it('邮箱重复 → 409', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ email: 'a@b.com', username: 'other' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('用户名重复 → 409', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ email: 'other@b.com', username: 'alice' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    let hash: string;

    beforeAll(async () => {
      hash = await bcrypt.hash('password123', 10);
    });

    it('账号或密码错误（用户不存在）→ 401，不区分原因', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      await expect(
        service.login({ account: 'nobody', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('密码错误 → 401', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        username: 'alice',
        passwordHash: hash,
      });
      await expect(
        service.login({ account: 'alice', password: 'wrong-pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('密码正确 → 返回 token 与用户信息', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        username: 'alice',
        passwordHash: hash,
      });
      const { token, user } = await service.login({ account: 'alice', password: 'password123' });
      expect(token).toBe('jwt-token');
      expect(user.id).toBe('u1');
    });
  });
});
