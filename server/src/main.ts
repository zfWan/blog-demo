import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

/** 生产模式下托管前端构建产物并做 SPA fallback（/api 除外） */
function mountWebDist(app: INestApplication) {
  const distDir = path.resolve(__dirname, '../../web/dist');
  const indexHtml = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtml)) return;

  app.use(express.static(distDir, { index: 'index.html' }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(indexHtml);
      return;
    }
    next();
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  mountWebDist(app);
  await app.listen(Number(process.env.PORT) || 3000);
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${process.env.PORT || 3000}`);
}

void bootstrap();
