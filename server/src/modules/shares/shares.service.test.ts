import { HttpException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shareUnlockCookieName, SharesService } from './shares.service';
import { PrismaService } from '../../prisma.service';

const prismaMock = {
  post: { findUnique: vi.fn() },
  shareLink: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const AUTHOR = 'user-a';
const OTHER = 'user-b';
const TOKEN = 'a'.repeat(64);

describe('SharesService', () => {
  let service: SharesService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [SharesService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(SharesService);
  });

  describe('create', () => {
    it('仅作者可创建，非作者 → 404', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 'p1', authorId: OTHER });
      await expect(service.create('p1', AUTHOR, {})).rejects.toThrow(NotFoundException);
    });

    it('创建成功：token 为 64 位 hex；带密码时存哈希不存明文', async () => {
      prismaMock.post.findUnique.mockResolvedValue({ id: 'p1', authorId: AUTHOR });
      prismaMock.shareLink.create.mockImplementation(async ({ data }: any) => data);

      const share = await service.create('p1', AUTHOR, { password: 'secret66' });
      expect(share.token).toMatch(/^[0-9a-f]{64}$/);
      expect(share.hasPassword).toBe(true);
      expect(share.url).toBe(`/share/${share.token}`);
      // 无法反向验证明文，但确认存的不是明文
      expect((prismaMock.shareLink.create as any).mock.calls[0][0].data.passwordHash).not.toBe(
        'secret66',
      );
    });
  });

  describe('getPublic', () => {
    function shareMock(overrides: Partial<{ enabled: boolean; passwordHash: string | null }>) {
      return {
        token: TOKEN,
        enabled: true,
        passwordHash: null,
        post: { id: 'p1', title: 't', content: '**md**', author: { username: 'alice' } },
        ...overrides,
      };
    }

    it('token 不存在 → 404', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue(null);
      await expect(service.getPublic(TOKEN, undefined)).rejects.toThrow(NotFoundException);
    });

    it('已停用 → 404', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue(shareMock({ enabled: false }));
      await expect(service.getPublic(TOKEN, undefined)).rejects.toThrow(NotFoundException);
    });

    it('免密分享：未登录（无 cookie）也可访问，返回 Markdown 原文（渲染移至前端）', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue(shareMock({}));
      const res = await service.getPublic(TOKEN, undefined);
      expect(res.post.content).toBe('**md**');
      expect(res.post).not.toHaveProperty('contentHtml');
      expect(res.hasPassword).toBe(false);
    });

    it('带密分享：未解锁 → 401 且 needPassword=true', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue(
        shareMock({ passwordHash: await bcrypt.hash('secret66', 10) }),
      );
      const err = await service.getPublic(TOKEN, undefined).catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(401);
      expect(err.getResponse().needPassword).toBe(true);
    });

    it('带密分享：解锁 cookie 值 = token → 可访问', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue(
        shareMock({ passwordHash: await bcrypt.hash('secret66', 10) }),
      );
      const res = await service.getPublic(TOKEN, TOKEN);
      expect(res.post.title).toBe('t');
    });
  });

  describe('unlock', () => {
    it('密码错误 → 401', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue({
        token: TOKEN,
        enabled: true,
        passwordHash: await bcrypt.hash('secret66', 10),
      });
      await expect(service.unlock(TOKEN, 'wrong-pw')).rejects.toThrow(UnauthorizedException);
    });

    it('密码正确 → 需要写解锁 cookie', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue({
        token: TOKEN,
        enabled: true,
        passwordHash: await bcrypt.hash('secret66', 10),
      });
      await expect(service.unlock(TOKEN, 'secret66')).resolves.toBe(true);
      expect(shareUnlockCookieName(TOKEN)).toBe(`share_${TOKEN.slice(0, 8)}`);
    });

    it('免密分享：直接放行，无需 cookie', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue({
        token: TOKEN,
        enabled: true,
        passwordHash: null,
      });
      await expect(service.unlock(TOKEN, '')).resolves.toBe(false);
    });
  });

  describe('setEnabled / remove', () => {
    it('非作者的分享 → 404', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue({
        id: 's1',
        token: TOKEN,
        post: { authorId: OTHER },
      });
      await expect(service.setEnabled('s1', AUTHOR, false)).rejects.toThrow(NotFoundException);
      await expect(service.remove('s1', AUTHOR)).rejects.toThrow(NotFoundException);
    });

    it('作者可停用', async () => {
      prismaMock.shareLink.findUnique.mockResolvedValue({
        id: 's1',
        token: TOKEN,
        passwordHash: null,
        post: { authorId: AUTHOR },
      });
      prismaMock.shareLink.update.mockResolvedValue({
        id: 's1',
        token: TOKEN,
        enabled: false,
        passwordHash: null,
        createdAt: new Date(),
      });
      const view = await service.setEnabled('s1', AUTHOR, false);
      expect(view.enabled).toBe(false);
    });
  });
});
