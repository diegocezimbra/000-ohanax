import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project, ApiKey } from '../database/entities';
import { AdminSessionsModule } from '../admin-sessions/admin-sessions.module';
import { AuthGuard } from '../common/guards';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ApiKey]), AdminSessionsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, AuthGuard],
  exports: [ProjectsService],
})
export class ProjectsModule {}
