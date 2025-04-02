import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SyncController],
  providers: [SyncService, PrismaService],
})
export class SyncModule {} 