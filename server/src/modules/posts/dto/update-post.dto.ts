import { IsIn, IsOptional, MaxLength, MinLength } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(100, { message: '标题最多 100 字' })
  title?: string;

  @IsOptional()
  @MinLength(1, { message: '正文不能为空' })
  content?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'], { message: '状态不合法' })
  status?: 'DRAFT' | 'PUBLISHED';
}
