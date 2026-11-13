import { HttpException, HttpStatus, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma.service';
import { CreateShareDto } from './dto/create-share.dto';

/** 解锁 cookie 名：取 token 前 8 位避免超长 cookie 名 */
export const shareUnlockCookieName = (token: string) => `share_${token.slice(0, 8)}`;

export const SHARE_UNLOCK_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/api/share',
  maxAge: 24 * 3600 * 1000, // 24 小时
} as const;

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 创建分享（仅作者）；token = 32 字节随机 hex */
  async create(postId: string, userId: string, dto: CreateShareDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== userId) throw new NotFoundException('文章不存在');

    const share = await this.prisma.shareLink.create({
      data: {
        postId,
        token: randomBytes(32).toString('hex'),
        passwordHash: dto.password ? await bcrypt.hash(dto.password, 10) : null,
      },
    });
    return this.toManageView(share.id, share.token, share.enabled, share.passwordHash, share.createdAt);
  }

  /** 某文章的分享列表（仅作者） */
  async listByPost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== userId) throw new NotFoundException('文章不存在');

    const shares = await this.prisma.shareLink.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map((s) =>
      this.toManageView(s.id, s.token, s.enabled, s.passwordHash, s.createdAt),
    );
  }

  /** 启停（仅作者） */
  async setEnabled(shareId: string, userId: string, enabled: boolean) {
    const share = await this.prisma.shareLink.findUnique({
      where: { id: shareId },
      include: { post: { select: { authorId: true } } },
    });
    if (!share || share.post.authorId !== userId) throw new NotFoundException('分享不存在');
    const updated = await this.prisma.shareLink.update({
      where: { id: shareId },
      data: { enabled },
    });
    return this.toManageView(updated.id, updated.token, updated.enabled, updated.passwordHash, updated.createdAt);
  }

  /** 删除（仅作者） */
  async remove(shareId: string, userId: string) {
    const share = await this.prisma.shareLink.findUnique({
      where: { id: shareId },
      include: { post: { select: { authorId: true } } },
    });
    if (!share || share.post.authorId !== userId) throw new NotFoundException('分享不存在');
    await this.prisma.shareLink.delete({ where: { id: shareId } });
    return { ok: true };
  }

  /**
   * 公开访问分享：token 不存在/停用 → 404；带密未解锁 → 401 { needPassword }；
   * 免密或已解锁 → 文章内容（渲染移至前端，返回 Markdown 原文）
   */
  async getPublic(token: string, unlockCookieValue: string | undefined) {
    const share = await this.prisma.shareLink.findUnique({
      where: { token },
      include: { post: { include: { author: { select: { username: true } } } } },
    });
    if (!share || !share.enabled) throw new NotFoundException('分享不存在或已停用');

    if (share.passwordHash && unlockCookieValue !== share.token) {
      throw new HttpException(
        { message: '该分享需要密码访问', needPassword: true, hasPassword: true },
        HttpStatus.UNAUTHORIZED,
      );
    }
    return {
      post: {
        id: share.post.id,
        title: share.post.title,
        content: share.post.content,
        authorUsername: share.post.author.username,
        updatedAt: share.post.updatedAt,
      },
      hasPassword: Boolean(share.passwordHash),
    };
  }

  /**
   * 带密分享解锁：密码正确时返回 true（由 controller 写解锁 cookie）；
   * 免密分享直接放行；密码错误 → 401
   */
  async unlock(token: string, password: string): Promise<boolean> {
    const share = await this.prisma.shareLink.findUnique({ where: { token } });
    if (!share || !share.enabled) throw new NotFoundException('分享不存在或已停用');
    if (!share.passwordHash) return false; // 免密，无需解锁
    if (!(await bcrypt.compare(password, share.passwordHash))) {
      throw new UnauthorizedException('密码错误');
    }
    return true;
  }

  private toManageView(
    id: string,
    token: string,
    enabled: boolean,
    passwordHash: string | null,
    createdAt: Date,
  ) {
    return {
      id,
      token,
      url: `/share/${token}`,
      enabled,
      hasPassword: Boolean(passwordHash),
      createdAt,
    };
  }
}
