import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { JwtPayload } from '../../common/guards/jwt-auth.guard';
import { CreateShareDto } from './dto/create-share.dto';
import { UpdateShareDto } from './dto/update-share.dto';
import { SHARE_UNLOCK_COOKIE_OPTIONS, shareUnlockCookieName, SharesService } from './shares.service';

@Controller()
export class SharesController {
  constructor(private readonly shares: SharesService) {}

  // ── 管理接口（需登录，仅作者）──

  @Post('posts/:postId/shares')
  create(
    @Param('postId') postId: string,
    @Body() dto: CreateShareDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shares.create(postId, user.sub, dto);
  }

  @Get('posts/:postId/shares')
  listByPost(@Param('postId') postId: string, @CurrentUser() user: JwtPayload) {
    return this.shares.listByPost(postId, user.sub);
  }

  @Patch('shares/:id')
  setEnabled(
    @Param('id') id: string,
    @Body() dto: UpdateShareDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.shares.setEnabled(id, user.sub, dto.enabled);
  }

  @Delete('shares/:id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.shares.remove(id, user.sub);
  }

  // ── 公开访问（匿名可用）──

  @Public()
  @Get('share/:token')
  getPublic(@Param('token') token: string, @Req() req: Request) {
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    return this.shares.getPublic(token, cookies[shareUnlockCookieName(token)]);
  }

  @Public()
  @Post('share/:token/unlock')
  @HttpCode(200)
  async unlock(
    @Param('token') token: string,
    @Body() dto: { password?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const needCookie = await this.shares.unlock(token, dto.password ?? '');
    if (needCookie) {
      res.cookie(shareUnlockCookieName(token), token, {
        ...SHARE_UNLOCK_COOKIE_OPTIONS,
      } as CookieOptions);
    }
    return { ok: true };
  }
}
