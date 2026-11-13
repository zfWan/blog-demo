import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostsService } from './posts.service';
import { PrismaService } from '../../prisma.service';

const prismaMock = {
  post: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const AUTHOR = 'user-a';
const OTHER = 'user-b';

function post(overrides: Partial<{ id: string; authorId: string; status: string }>) {
  return {
    id: 'p1',
    authorId: AUTHOR,
    status: 'PUBLISHED',
    title: 't',
    content: '# hi',
    ...overrides,
  };
}

describe('PostsService 权限规则', () => {
  let service: PostsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [PostsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    service = moduleRef.get(PostsService);
  });

  it('列表：已发布 + 自己的草稿（查询条件）', async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    await service.list(AUTHOR);
    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ status: 'PUBLISHED' }, { authorId: AUTHOR }] },
      }),
    );
  });

  it('详情：他人草稿 → 404', async () => {
    prismaMock.post.findUnique.mockResolvedValue(post({ status: 'DRAFT', authorId: OTHER }));
    await expect(service.get('p1', AUTHOR)).rejects.toThrow(NotFoundException);
  });

  it('详情：自己草稿可见，且返回 Markdown 原文（渲染移至前端）', async () => {
    prismaMock.post.findUnique.mockResolvedValue(post({ status: 'DRAFT', authorId: AUTHOR }));
    const result = await service.get('p1', AUTHOR);
    expect(result.content).toBe('# hi');
    expect(result).not.toHaveProperty('contentHtml');
  });

  it('详情：不存在 → 404', async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);
    await expect(service.get('p1', AUTHOR)).rejects.toThrow(NotFoundException);
  });

  it('更新：非作者 → 404', async () => {
    prismaMock.post.findUnique.mockResolvedValue(post({ authorId: OTHER }));
    await expect(service.update('p1', AUTHOR, { title: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('更新：作者本人成功', async () => {
    prismaMock.post.findUnique.mockResolvedValue(post({ authorId: AUTHOR }));
    prismaMock.post.update.mockResolvedValue(post({ title: 'x' }));
    await expect(service.update('p1', AUTHOR, { title: 'x' })).resolves.toMatchObject({
      title: 'x',
    });
  });

  it('删除：非作者 → 404 且不执行删除', async () => {
    prismaMock.post.findUnique.mockResolvedValue(post({ authorId: OTHER }));
    await expect(service.remove('p1', AUTHOR)).rejects.toThrow(NotFoundException);
    expect(prismaMock.post.delete).not.toHaveBeenCalled();
  });
});
