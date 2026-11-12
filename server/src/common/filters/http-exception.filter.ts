import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/**
 * 统一错误响应：
 * - HttpException + string body → { statusCode, message }
 * - HttpException + object body → { statusCode, ...body }（保留 needPassword 等自定义字段）
 * - 未知异常 → 记日志，返回 500 通用文案
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        res.status(status).json({ statusCode: status, message: body });
      } else {
        const { message, ...rest } = body as Record<string, unknown>;
        res.status(status).json({
          statusCode: status,
          message: Array.isArray(message) ? message.join('; ') : (message ?? exception.message),
          ...rest,
        });
      }
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack ?? exception.message : String(exception),
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误',
    });
  }
}
