import { Module } from '@nestjs/common';
import { CompetitionController } from './competition.controller';
import { CompetitionService } from './competition.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CompetitionController],
  providers: [CompetitionService, PrismaService],
})
export class CompetitionModule {} 