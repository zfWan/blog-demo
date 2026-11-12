import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { renderMarkdown } from '../../lib/markdown';
import { PrismaService } from '../../prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const LIST_SELECT = {
  id: true,
  title: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { username: true } },
} as const;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 列表 = 全部已发布 + 自己的草稿，按更新时间倒序 */
  list(viewerId: string) {
    return this.prisma.post.findMany({
      where: { OR: [{ status: 'PUBLISHED' }, { authorId: viewerId }] },
      orderBy: { updatedAt: 'desc' },
      select: LIST_SELECT,
    });
  }

  /** 详情：他人草稿按 404 处理（不泄露存在性）；返回服务端渲染的 contentHtml */
  async get(postId: string, viewerId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { author: { select: { username: true } } },
    });
    if (!post || (post.status === 'DRAFT' && post.authorId !== viewerId)) {
      throw new NotFoundException('文章不存在');
    }
    return { ...post, contentHtml: renderMarkdown(post.content) };
  }

  create(authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: {
        title: dto.title,
        content: dto.content,
        status: dto.status ?? 'DRAFT',
        authorId,
      },
    });
  }

  /** 仅作者可改，否则 404 */
  async update(postId: string, userId: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== userId) throw new NotFoundException('文章不存在');
    return this.prisma.post.update({ where: { id: postId }, data: dto });
  }

  /** 仅作者可删（分享链接随级联删除），否则 404 */
  async remove(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== userId) throw new NotFoundException('文章不存在');
    await this.prisma.post.delete({ where: { id: postId } });
    return { ok: true };
  }

  /** 校验“当前用户是文章作者”，不满足时按 404 处理（分享管理用） */
  async assertOwner(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== userId) throw new NotFoundException('文章不存在');
    return post;
  }
}
