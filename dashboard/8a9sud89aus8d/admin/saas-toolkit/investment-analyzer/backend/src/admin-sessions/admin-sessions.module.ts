import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSession } from '../database/entities';
import { AdminSessionsService } from './admin-sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminSession])],
  providers: [AdminSessionsService],
  exports: [AdminSessionsService],
})
export class AdminSessionsModule {}
