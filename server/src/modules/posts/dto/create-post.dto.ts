import { MaxLength, MinLength, IsIn, IsOptional } from 'class-validator';

export class CreatePostDto {
  @MinLength(1, { message: '请输入标题' })
  @MaxLength(100, { message: '标题最多 100 字' })
  title!: string;

  @MinLength(1, { message: '正文不能为空' })
  content!: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'], { message: '状态不合法' })
  status?: 'DRAFT' | 'PUBLISHED';
}
