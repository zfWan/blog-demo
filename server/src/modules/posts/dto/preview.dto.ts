import { IsNotEmpty } from 'class-validator';

export class PreviewDto {
  @IsNotEmpty({ message: '内容不能为空' })
  content!: string;
}
