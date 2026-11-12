import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard';
import { renderMarkdown } from '../../lib/markdown';
import { CreatePostDto } from './dto/create-post.dto';
import { PreviewDto } from './dto/preview.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  /** 编辑器预览：Markdown 渲染统一走服务端（html:false 防 XSS） */
  @Post('preview')
  preview(@Body() dto: PreviewDto) {
    return { html: renderMarkdown(dto.content) };
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.posts.list(user.sub);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.posts.get(id, user.sub);
  }

  @Post()
  create(@Body() dto: CreatePostDto, @CurrentUser() user: JwtPayload) {
    return this.posts.create(user.sub, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.posts.update(id, user.sub, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.posts.remove(id, user.sub);
  }
}
